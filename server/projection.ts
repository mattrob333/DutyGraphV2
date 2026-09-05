import { pool, tx } from "./db.ts";
export function linksFor(r: any) {
  const d = r.data,
    links: any[] = [];
  const add = (
    id: string | undefined,
    relationship: string,
    inbound = false,
  ) => {
    if (id) links.push({ target: id, relationship, inbound });
  };
  if (r.kind === "task") {
    add(d.ownerId, "ACCOUNTABLE_FOR", true);
    add(d.performerId, "PERFORMS", true);
    for (const id of d.evidenceIds || []) add(id, "SUPPORTED_BY");
  }
  if (r.kind === "person") add(d.managerId, "REPORTS_TO");
  if (r.kind === "candidate")
    for (const id of d.evidenceIds || []) add(id, "SUPPORTED_BY");
  if (r.kind === "agent") {
    add(d.ownerId, "ACCOUNTABLE_FOR", true);
    for (const id of d.taskIds || []) add(id, "BOUND_TO");
  }
  if (r.kind === "intervention") {
    add(d.candidateId, "PROPOSES_CHANGE_TO");
    add(d.metricId, "MEASURED_BY");
    add(d.ownerId, "ACCOUNTABLE_FOR", true);
  }
  return links;
}
export async function projectTenant(tenant: string) {
  return tx(tenant, async (db) => {
    const events = await db.query(
      "SELECT * FROM outbox WHERE processed_at IS NULL ORDER BY sequence LIMIT 100 FOR UPDATE SKIP LOCKED",
    );
    for (const event of events.rows) {
      const result = await db.query(
        "SELECT * FROM records WHERE company_id=$1 AND id=$2",
        [event.company_id, event.record_id],
      );
      const r = result.rows[0];
      if (r)
        await db.query(
          `INSERT INTO projection_nodes(tenant_id,company_id,record_id,version,kind,title,state,links) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(tenant_id,company_id,record_id) DO UPDATE SET version=$4,kind=$5,title=$6,state=$7,links=$8,updated_at=now() WHERE projection_nodes.version<=$4`,
          [
            tenant,
            r.company_id,
            r.id,
            r.version,
            r.kind,
            r.title,
            r.state,
            JSON.stringify(linksFor(r)),
          ],
        );
      await db.query("UPDATE outbox SET processed_at=now() WHERE id=$1", [
        event.id,
      ]);
    }
    return events.rowCount;
  });
}
let running = false;
export async function projectAll() {
  if (running) return;
  running = true;
  try {
    for (const t of (await pool.query("SELECT id FROM tenants")).rows)
      await projectTenant(t.id);
  } finally {
    running = false;
  }
}
