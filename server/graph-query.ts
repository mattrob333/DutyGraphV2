import { z } from "zod";
import { graphEdges, graphKinds } from "./graph-shape.ts";
export { graphEdges } from "./graph-shape.ts";
import { projectionFingerprint, readNeo4jSnapshot } from "./neo4j.ts";
import { confirmationStatus } from "../shared/domain.ts";
import { fail } from "./db.ts";
const relations = [
  "ACCOUNTABLE_FOR",
  "PERFORMS",
  "SUPPORTED_BY",
  "REPORTS_TO",
  "BOUND_TO",
  "PROPOSES_CHANGE_TO",
  "MEASURED_BY",
  "CONTAINS",
  "HANDS_OFF_TO",
];
export const graphQuerySchema = z
  .object({
    focus: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(150).default(150),
    depth: z.coerce.number().int().min(0).max(4).default(2),
    relationships: z.string().max(500).optional(),
    kinds: z.string().max(250).optional(),
    states: z
      .string()
      .regex(/^[a-z_,]+$/)
      .max(250)
      .optional(),
  })
  .strict();
export function boundedGraph(
  records: any[],
  query: z.infer<typeof graphQuerySchema>,
  projectedEdges?: ReturnType<typeof graphEdges>,
) {
  const kinds = query.kinds?.split(",") || graphKinds,
    rels = query.relationships?.split(",") || relations;
  if (
    kinds.some((k) => !graphKinds.includes(k)) ||
    rels.some((r) => !relations.includes(r))
  )
    fail(
      422,
      "INVALID_GRAPH_FILTER",
      "Choose supported graph types and relationships.",
    );
  const states = query.states?.split(",");
  const visible = records.filter(
    (r) =>
      kinds.includes(r.kind) &&
      (states ? states.includes(r.state) : r.state !== "retracted"),
  );
  const allowed = new Set(visible.map((r) => r.id));
  const edges = (projectedEdges || graphEdges(records)).filter(
    (e) =>
      allowed.has(e.source) &&
      allowed.has(e.target) &&
      rels.includes(e.relationship),
  );
  let ids = new Set<string>(),
    truncated = false;
  if (query.focus) {
    if (!allowed.has(query.focus))
      fail(
        404,
        "FOCUS_UNAVAILABLE",
        "The focus record is unavailable under these graph filters.",
      );
    ids.add(query.focus);
    let frontier = new Set([query.focus]);
    for (let hop = 0; hop < query.depth; hop++) {
      const adjacent = new Set(
        edges
          .filter((e) => frontier.has(e.source) || frontier.has(e.target))
          .flatMap((e) => [e.source, e.target])
          .filter((id) => !ids.has(id)),
      );
      frontier = new Set();
      for (const id of adjacent) {
        if (ids.size >= query.limit) {
          truncated = true;
          break;
        }
        ids.add(id);
        frontier.add(id);
      }
      if (!frontier.size) break;
    }
  } else {
    ids = new Set(visible.slice(0, query.limit).map((r) => r.id));
    truncated = visible.length > query.limit;
  }
  return {
    nodes: visible
      .filter((r) => ids.has(r.id))
      .map((r) => ({
        id: r.id,
        title: r.title,
        kind: r.kind,
        state: r.state,
        version: r.version,
      })),
    edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
    truncated,
  };
}
export async function readGraph(db: any, company: any, input: unknown) {
  const query = graphQuerySchema.parse(input);
  await db.query("SET LOCAL statement_timeout='3000ms'");
  const rows = (
    await db.query(
      "SELECT * FROM records WHERE company_id=$1 AND kind=ANY($2::text[]) ORDER BY created_at,id LIMIT 5001",
      [company.id, graphKinds],
    )
  ).rows;
  const scanTruncated = rows.length > 5000,
    records = rows.slice(0, 5000);
  const cs = (
    await db.query("SELECT * FROM confirmations WHERE company_id=$1", [
      company.id,
    ])
  ).rows;
  for (const r of records)
    if (r.kind === "task") r.state = confirmationStatus(r, cs);
  const status = (
    await db.query(
      "SELECT count(*) FILTER(WHERE processed_at IS NULL)::int AS pending,max(sequence) FILTER(WHERE processed_at IS NOT NULL) AS projected_through,extract(epoch from now()-min(created_at) FILTER(WHERE processed_at IS NULL)) AS lag_seconds FROM outbox WHERE company_id=$1",
      [company.id],
    )
  ).rows[0];
  const projected = !scanTruncated
    ? await readNeo4jSnapshot(
        company.tenant_id,
        company.id,
        Number(company.revision),
        projectionFingerprint(records),
        db,
      )
    : null;
  return {
    ...boundedGraph(projected?.nodes || records, query, projected?.edges),
    sourceRevision: company.revision,
    pending: status.pending,
    projectedThrough: status.projected_through,
    projectionLagSeconds: Number(status.lag_seconds || 0),
    projectionState: status.pending ? "catching_up" : "current",
    coverageState: scanTruncated ? "partial_scan" : "bounded",
    scanTruncated,
    focus: query.focus || null,
    depth: query.depth,
    nodeBudget: query.limit,
    engine: projected ? "Neo4j Aura" : "Authoritative PostgreSQL fallback",
    neo4jCurrent: !!projected,
  };
}
