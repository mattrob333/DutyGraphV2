import { Router } from "express";
import { randomUUID } from "node:crypto";
import neo4j, {
  type Driver,
  type Session,
  type ManagedTransaction,
} from "neo4j-driver";
import { z } from "zod";
import type pg from "pg";
import { advisor, type AuthRequest } from "./auth.ts";
import { audit, command, companyCheck, fail, hash, pool, tx } from "./db.ts";
import { openSecret, sealSecret } from "./providers.ts";
import { confirmationStatus } from "../shared/domain.ts";
import { graphEdges, graphKinds } from "./graph-shape.ts";

export function isAuraUri(uri: string) {
  // Accept exactly Aura's verified TLS routing scheme and database host shape.
  // Credentials, paths, query strings, IPs, arbitrary ports and self-signed TLS are never accepted.
  return /^neo4j\+s:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.databases\.neo4j\.io(?::7687)?\/?$/.test(
    uri,
  );
}
export const neo4jCredentialsSchema = z
  .object({
    uri: z
      .string()
      .trim()
      .max(220)
      .refine(
        isAuraUri,
        "Use the neo4j+s://…databases.neo4j.io URI from Aura.",
      ),
    username: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9_.@-]+$/),
    database: z
      .string()
      .trim()
      .min(1)
      .max(63)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/)
      .default("neo4j"),
    password: z
      .string()
      .min(1)
      .max(512)
      .refine(
        (s) => !/[\x00-\x1f\x7f]/.test(s),
        "The database password contains an unsupported character.",
      ),
  })
  .strict();
type Credentials = z.infer<typeof neo4jCredentialsSchema>;
type Connection = { credentials: Credentials; id: string; tenant: string };
type ProjectionNode = {
  id: string;
  kind: string;
  title: string;
  state: string;
  version: number;
  hash: string;
  ordinal: number;
};
export type ProjectionSnapshot = {
  tenantId: string;
  companyId: string;
  revision: number;
  fingerprint: string;
  nodes: ProjectionNode[];
  edges: ReturnType<typeof graphEdges>;
};
const MAX_NODES = 5000,
  MAX_EDGES = 40000;
const cache = new Map<
  string,
  { driver: Driver; created: number; constraints?: boolean }
>();
const circuits = new Map<string, number>();
const retryAfter = new Map<string, number>();
const key = (c: Connection) => `${c.tenant}:${c.id}`;

export function projectionData(records: any[]) {
  const nodes: ProjectionNode[] = records
    .filter((r) => graphKinds.includes(r.kind))
    .map((r, ordinal) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      state: r.state,
      version: Number(r.version),
      hash: r.hash,
      ordinal,
    }));
  const ids = new Set(nodes.map((n) => n.id));
  const edges = graphEdges(records).filter(
    (e) => ids.has(e.source) && ids.has(e.target),
  );
  return { nodes, edges };
}
function payloadFingerprint(
  nodes: ProjectionNode[],
  edges: ReturnType<typeof graphEdges>,
) {
  return hash({
    nodes: [...nodes].sort((a, b) => a.id.localeCompare(b.id)),
    // Preserve relationship order: it also controls which neighbors fit a bounded view.
    edges,
  });
}
function payloadMatches(
  nodes: ProjectionNode[],
  edges: ReturnType<typeof graphEdges>,
  fingerprint: string,
) {
  try {
    return payloadFingerprint(nodes, edges) === fingerprint;
  } catch {
    // Deleted identity properties or malformed externally edited data must be
    // repaired by a rebuild, not prevent the repair itself from running.
    return false;
  }
}
export function projectionFingerprint(records: any[]) {
  const { nodes, edges } = projectionData(records);
  return payloadFingerprint(nodes, edges);
}
export function snapshotFor(
  tenantId: string,
  companyId: string,
  revision: number,
  records: any[],
): ProjectionSnapshot {
  z.uuid().parse(tenantId);
  z.uuid().parse(companyId);
  z.number().int().nonnegative().parse(revision);
  if (
    records.some(
      (r) =>
        (r.company_id && r.company_id !== companyId) ||
        (r.tenant_id && r.tenant_id !== tenantId),
    )
  )
    throw new Error(
      "Projection records must belong to the requested company and account.",
    );
  const { nodes, edges } = projectionData(records);
  if (nodes.length > MAX_NODES || edges.length > MAX_EDGES)
    fail(
      422,
      "NEO4J_GRAPH_LIMIT",
      "This company exceeds the current Neo4j projection limit. The PostgreSQL graph remains available.",
    );
  return {
    tenantId,
    companyId,
    revision,
    nodes,
    edges,
    fingerprint: payloadFingerprint(nodes, edges),
  };
}
export function neo4jPublicStatus(row: any) {
  return {
    configured: !!row?.enabled,
    connected: !!row?.enabled && !!row?.config?.verifiedAt,
    store: "PostgreSQL",
    endpoint: row?.config?.endpoint || "",
    username: row?.config?.username || "",
    database: row?.config?.database || "neo4j",
    verifiedAt: row?.config?.verifiedAt || null,
  };
}
async function connection(
  tenant: string,
  client?: pg.PoolClient,
): Promise<Connection | null> {
  const read = async (db: pg.PoolClient) =>
    (
      await db.query(
        "SELECT encrypted_key,enabled,config FROM provider_settings WHERE provider='neo4j'",
      )
    ).rows[0];
  const row = client ? await read(client) : await tx(tenant, read);
  if (!row?.enabled) return null;
  return {
    tenant,
    id: z.uuid().parse(row.config.connectionId),
    credentials: neo4jCredentialsSchema.parse(
      JSON.parse(openSecret(row.encrypted_key, `${tenant}:neo4j`)),
    ),
  };
}
function getDriver(c: Connection) {
  const now = Date.now();
  for (const [id, item] of cache)
    if (now - item.created > 60000 || cache.size > 20) {
      cache.delete(id);
      void item.driver.close().catch(() => {});
    }
  const existing = cache.get(key(c));
  if (existing) return existing;
  const driver = neo4j.driver(
    c.credentials.uri,
    neo4j.auth.basic(c.credentials.username, c.credentials.password),
    {
      maxConnectionPoolSize: 2,
      connectionTimeout: 1500,
      connectionAcquisitionTimeout: 2000,
      maxTransactionRetryTime: 0,
      maxConnectionLifetime: 60000,
      disableLosslessIntegers: true,
      logging: { level: "error", logger: () => {} },
    },
  );
  const entry = { driver, created: now, constraints: false };
  cache.set(key(c), entry);
  return entry;
}
async function dropDriver(c: Connection) {
  const entry = cache.get(key(c));
  cache.delete(key(c));
  if (entry) await entry.driver.close().catch(() => {});
}
async function deadline<T>(
  promise: Promise<T>,
  ms: number,
  cancel: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          cancel();
          reject(new Error("Neo4j operation timed out."));
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}
async function withSession<T>(
  c: Connection,
  timeout: number,
  fn: (session: Session) => Promise<T>,
) {
  const { driver } = getDriver(c),
    session = driver.session({ database: c.credentials.database });
  try {
    return await deadline(fn(session), timeout, () => {
      void dropDriver(c);
    });
  } finally {
    void session.close().catch(() => {});
  }
}
function safeFailure(error: unknown) {
  const code = (error as any)?.code || "";
  if (String(code).includes("Unauthorized"))
    return "Neo4j could not verify the database username and password. Check the Aura credentials.";
  return "Neo4j is unavailable or the connection could not be verified. Check that the Aura instance is running and the connection details are correct. Current company records remain available.";
}
async function ensureConstraints(c: Connection, session: Session) {
  const entry = getDriver(c);
  if (entry.constraints) return;
  await session.run(
    "CREATE CONSTRAINT dutygraph_company_scope IF NOT EXISTS FOR (c:DGCompany) REQUIRE c.scope IS UNIQUE",
    {},
    { timeout: 5000 },
  );
  await session.run(
    "CREATE CONSTRAINT dutygraph_record_key IF NOT EXISTS FOR (n:DGRecord) REQUIRE n.key IS UNIQUE",
    {},
    { timeout: 5000 },
  );
  entry.constraints = true;
}

async function readProjectionPayload(
  transaction: Pick<ManagedTransaction, "run">,
  scope: string,
) {
  const nr = await transaction.run(
    "MATCH (n:DGRecord {scope:$scope}) RETURN n.id AS id,n.kind AS kind,n.title AS title,n.state AS state,n.version AS version,n.hash AS hash,n.ordinal AS ordinal ORDER BY n.ordinal LIMIT 5001",
    { scope },
  );
  const er = await transaction.run(
    "MATCH (a:DGRecord {scope:$scope})-[r:DG_LINK {scope:$scope}]->(b:DGRecord {scope:$scope}) RETURN a.id AS source,b.id AS target,r.relationship AS relationship,r.sourceRecordId AS sourceRecordId,r.sourceVersion AS sourceVersion,r.sourceHash AS sourceHash,r.validation AS validation ORDER BY r.ordinal LIMIT 40001",
    { scope },
  );
  return {
    nodes: nr.records.map((r) => r.toObject()) as ProjectionNode[],
    edges: er.records.map((r) => r.toObject()) as ReturnType<typeof graphEdges>,
  };
}

// Exported for deterministic transaction tests. Every query is fixed and every data value is a parameter.
export async function writeProjection(
  transaction: Pick<ManagedTransaction, "run">,
  snapshot: ProjectionSnapshot,
) {
  const scope = `${snapshot.tenantId}:${snapshot.companyId}`;
  const base = {
    scope,
    tenantId: snapshot.tenantId,
    companyId: snapshot.companyId,
  };
  const result = await transaction.run(
    "MERGE (c:DGCompany {scope:$scope}) ON CREATE SET c.revision=-1 SET c.tenantId=$tenantId,c.companyId=$companyId,c.writeLock=coalesce(c.writeLock,0)+1 RETURN c.revision AS revision,c.fingerprint AS fingerprint,c.nodeCount AS nodes,c.edgeCount AS edges",
    base,
  );
  const prior = result.records[0];
  if (Number(prior.get("revision")) > snapshot.revision)
    return { written: false, reason: "newer_revision" };
  if (
    Number(prior.get("revision")) === snapshot.revision &&
    prior.get("fingerprint") === snapshot.fingerprint
  ) {
    // Matching metadata is insufficient after an operator changes the Aura copy.
    // Inspect the actual payload while holding the same company write lock.
    const stored = await readProjectionPayload(transaction, scope);
    if (
      stored.nodes.length === Number(prior.get("nodes")) &&
      stored.edges.length === Number(prior.get("edges")) &&
      stored.nodes.length === snapshot.nodes.length &&
      stored.edges.length === snapshot.edges.length &&
      payloadMatches(stored.nodes, stored.edges, snapshot.fingerprint)
    )
      return { written: false, reason: "already_current" };
  }
  await transaction.run(
    "MATCH (a:DGRecord {scope:$scope})-[r:DG_LINK {scope:$scope}]->(b:DGRecord {scope:$scope}) DELETE r",
    base,
  );
  const nodes = snapshot.nodes.map((n) => ({ ...n, key: `${scope}:${n.id}` }));
  // DELETE (not DETACH DELETE) deliberately refuses unexpected foreign relationships.
  await transaction.run(
    "MATCH (n:DGRecord {scope:$scope}) WHERE NOT n.key IN $keys DELETE n",
    { ...base, keys: nodes.map((n) => n.key) },
  );
  await transaction.run(
    "UNWIND $nodes AS item MERGE (n:DGRecord {key:item.key}) SET n=item,n.scope=$scope,n.tenantId=$tenantId,n.companyId=$companyId",
    { ...base, nodes },
  );
  await transaction.run(
    "UNWIND $edges AS item MATCH (a:DGRecord {key:item.sourceKey,scope:$scope}),(b:DGRecord {key:item.targetKey,scope:$scope}) CREATE (a)-[r:DG_LINK]->(b) SET r=item,r.scope=$scope,r.tenantId=$tenantId,r.companyId=$companyId",
    {
      ...base,
      edges: snapshot.edges.map((e, ordinal) => ({
        ...e,
        ordinal,
        sourceKey: `${scope}:${e.source}`,
        targetKey: `${scope}:${e.target}`,
      })),
    },
  );
  await transaction.run(
    "MATCH (c:DGCompany {scope:$scope}) SET c.revision=$revision,c.fingerprint=$fingerprint,c.updatedAt=datetime(),c.nodeCount=$nodeCount,c.edgeCount=$edgeCount",
    {
      ...base,
      revision: snapshot.revision,
      fingerprint: snapshot.fingerprint,
      nodeCount: nodes.length,
      edgeCount: snapshot.edges.length,
    },
  );
  return { written: true, reason: "updated" };
}
async function snapshotFromPostgres(tenant: string, companyId: string) {
  return tx(tenant, async (db) => {
    const company = (
      await db.query(
        "SELECT id,revision FROM companies WHERE id=$1 FOR SHARE",
        [companyId],
      )
    ).rows[0];
    if (!company) fail(404, "NOT_FOUND", "Company not found.");
    const records = (
      await db.query(
        "SELECT * FROM records WHERE company_id=$1 AND kind=ANY($2::text[]) ORDER BY created_at,id LIMIT 5001",
        [companyId, graphKinds],
      )
    ).rows;
    const confirmations = (
      await db.query("SELECT * FROM confirmations WHERE company_id=$1", [
        companyId,
      ])
    ).rows;
    for (const record of records)
      if (record.kind === "task")
        record.state = confirmationStatus(record, confirmations);
    return snapshotFor(tenant, companyId, Number(company.revision), records);
  });
}
async function saveProjectionState(
  c: Connection,
  companyId: string,
  snapshot: ProjectionSnapshot | null,
  status: string,
  message = "",
) {
  await tx(c.tenant, async (db) => {
    // A rejected oversized snapshot still needs a visible failure state at the current revision.
    const revision =
      snapshot?.revision ??
      Number(
        (
          await db.query("SELECT revision FROM companies WHERE id=$1", [
            companyId,
          ])
        ).rows[0]?.revision ?? -1,
      );
    await db.query(
      "INSERT INTO neo4j_projection_state(tenant_id,company_id,connection_id,source_revision,fingerprint,status,message) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(tenant_id,company_id) DO UPDATE SET connection_id=$3,source_revision=$4,fingerprint=$5,status=$6,message=$7,updated_at=now() WHERE neo4j_projection_state.connection_id<>$3 OR neo4j_projection_state.source_revision<=$4",
      [
        c.tenant,
        companyId,
        c.id,
        revision,
        snapshot?.fingerprint || "",
        status,
        message,
      ],
    );
  });
}
export async function projectCompanyToNeo4j(tenant: string, companyId: string) {
  const c = await connection(tenant);
  if (!c) return { configured: false, projected: false };
  let snapshot: ProjectionSnapshot | null = null;
  try {
    snapshot = await snapshotFromPostgres(tenant, companyId);
    const result = await withSession(c, 15000, async (session) => {
      await ensureConstraints(c, session);
      return session.executeWrite((t) => writeProjection(t, snapshot!), {
        timeout: 10000,
      });
    });
    if (result.reason !== "newer_revision")
      await saveProjectionState(c, companyId, snapshot, "current");
    circuits.delete(key(c));
    return {
      configured: true,
      projected: result.reason !== "newer_revision",
      revision: snapshot.revision,
      nodes: snapshot.nodes.length,
      edges: snapshot.edges.length,
    };
  } catch (error) {
    circuits.set(key(c), Date.now() + 30000);
    const message =
      (error as any)?.code === "NEO4J_GRAPH_LIMIT"
        ? (error as Error).message
        : safeFailure(error);
    await saveProjectionState(
      c,
      companyId,
      snapshot,
      (error as any)?.code === "NEO4J_GRAPH_LIMIT" ? "oversized" : "error",
      message,
    );
    return { configured: true, projected: false, message };
  }
}

export async function readNeo4jSnapshot(
  tenant: string,
  companyId: string,
  revision: number,
  fingerprint: string,
  client?: pg.PoolClient,
) {
  let c: Connection | null = null;
  try {
    c = await connection(tenant, client);
    if (!c || (circuits.get(key(c)) || 0) > Date.now()) return null;
    const current = c;
    const scope = `${tenant}:${companyId}`;
    return await withSession(current, 2200, (session) =>
      session.executeRead(
        async (transaction) => {
          const meta = await transaction.run(
            "MATCH (c:DGCompany {scope:$scope}) WHERE c.revision=$revision AND c.fingerprint=$fingerprint RETURN c.nodeCount AS nodes,c.edgeCount AS edges",
            { scope, revision, fingerprint },
          );
          if (
            !meta.records.length ||
            Number(meta.records[0].get("nodes")) > MAX_NODES ||
            Number(meta.records[0].get("edges")) > MAX_EDGES
          )
            return null;
          const { nodes, edges } = await readProjectionPayload(
            transaction,
            scope,
          );
          if (
            nodes.length !== Number(meta.records[0].get("nodes")) ||
            edges.length !== Number(meta.records[0].get("edges")) ||
            !payloadMatches(nodes, edges, fingerprint)
          )
            return null;
          return { nodes, edges };
        },
        { timeout: 1600 },
      ),
    );
  } catch {
    if (c) circuits.set(key(c), Date.now() + 30000);
    return null;
  }
}
export async function syncNeo4jTenant(tenant: string) {
  const id = tenant;
  if ((retryAfter.get(id) || 0) > Date.now()) return;
  retryAfter.set(id, Date.now() + 15000);
  const companies = await tx(tenant, (db) =>
    db.query(
      "SELECT c.id FROM companies c JOIN provider_settings p ON p.tenant_id=c.tenant_id AND p.provider='neo4j' AND p.enabled=true LEFT JOIN neo4j_projection_state s ON s.tenant_id=c.tenant_id AND s.company_id=c.id WHERE s.company_id IS NULL OR s.connection_id::text<>p.config->>'connectionId' OR s.source_revision<>c.revision OR s.status<>'current' OR s.updated_at<now()-interval '5 minutes' ORDER BY coalesce(s.updated_at,'1970-01-01') LIMIT 1",
    ),
  );
  for (const company of companies.rows)
    await projectCompanyToNeo4j(tenant, company.id);
}

export async function claimNeo4jTenant() {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SET LOCAL statement_timeout='2000ms'");
    const cursor = (
      await db.query(
        "SELECT last_tenant_id FROM maintenance_cursors WHERE name='neo4j' FOR UPDATE",
      )
    ).rows[0];
    if (!cursor) throw new Error("Neo4j maintenance migration is required.");
    const next = (
      await db.query(
        "SELECT id FROM tenants ORDER BY CASE WHEN $1::uuid IS NULL OR id>$1::uuid THEN 0 ELSE 1 END,id LIMIT 1",
        [cursor.last_tenant_id],
      )
    ).rows[0];
    if (next)
      await db.query(
        "UPDATE maintenance_cursors SET last_tenant_id=$1,updated_at=now() WHERE name='neo4j'",
        [next.id],
      );
    // Persist progress before external work so a timeout or cold start cannot
    // repeatedly strand the accounts later in the sweep.
    await db.query("COMMIT");
    return (next?.id as string | undefined) || null;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

export async function syncNeo4jSweep({
  claimTenant = claimNeo4jTenant,
  syncTenant = syncNeo4jTenant,
  now = () => performance.now(),
} = {}) {
  const started = now(),
    seen = new Set<string>();
  // Reserve fifteen seconds for the final Aura attempt. Even an all-outage
  // sweep spends at most 45 seconds on external work, visiting at most 12 accounts.
  while (seen.size < 12 && now() - started < 30000) {
    const tenant = await claimTenant();
    if (!tenant || seen.has(tenant)) break;
    seen.add(tenant);
    await syncTenant(tenant).catch(() => {});
  }
  return seen.size;
}
export async function closeNeo4jDrivers() {
  const entries = [...cache.values()];
  cache.clear();
  await Promise.allSettled(entries.map((e) => e.driver.close()));
}

export function neo4jRouter() {
  const router = Router({ mergeParams: true });
  router.use(advisor);
  const actor = (req: any) => (req as AuthRequest).actor;
  const companyId = (req: any) => z.uuid().parse(req.params.companyId);
  router.get("/", async (req, res) => {
    const u = actor(req),
      id = companyId(req);
    const result = await tx(u.tenant_id, async (db) => {
      const company = await companyCheck(db, u, id);
      const row = (
        await db.query(
          "SELECT enabled,config FROM provider_settings WHERE provider='neo4j'",
        )
      ).rows[0];
      const state = (
        await db.query(
          "SELECT source_revision,status,message,updated_at FROM neo4j_projection_state WHERE company_id=$1 AND connection_id=$2",
          [id, row?.config?.connectionId || null],
        )
      ).rows[0];
      return {
        ...neo4jPublicStatus(row),
        sourceRevision: Number(company.revision),
        projection: state
          ? {
              ...state,
              source_revision: Number(state.source_revision),
              status:
                state.status === "current" &&
                Number(state.source_revision) !== Number(company.revision)
                  ? "pending"
                  : state.status,
            }
          : null,
        storageReady: /^[a-f0-9]{64}$/.test(
          process.env.PROVIDER_ENCRYPTION_KEY || "",
        ),
      };
    });
    res.json(result);
  });
  router.put("/", async (req, res) => {
    const u = actor(req),
      id = companyId(req),
      d = neo4jCredentialsSchema
        .extend({ enabled: z.boolean().default(true) })
        .parse(req.body);
    const credentials = neo4jCredentialsSchema.parse({
      uri: d.uri,
      username: d.username,
      database: d.database,
      password: d.password,
    });
    const encrypted = sealSecret(
      JSON.stringify(credentials),
      `${u.tenant_id}:neo4j`,
    );
    res.json(
      await command(
        u,
        req.header("Idempotency-Key"),
        { path: req.originalUrl, body: req.body },
        async (db) => {
          await companyCheck(db, u, id);
          const config = {
            connectionId: randomUUID(),
            endpoint: credentials.uri,
            username: credentials.username,
            database: credentials.database,
            verifiedAt: null,
          };
          await db.query(
            "INSERT INTO provider_settings(tenant_id,provider,encrypted_key,enabled,config) VALUES($1,'neo4j',$2,$3,$4) ON CONFLICT(tenant_id,provider) DO UPDATE SET encrypted_key=$2,enabled=$3,config=$4,updated_at=now()",
            [u.tenant_id, encrypted, d.enabled, config],
          );
          await audit(db, u, id, "neo4j.settings_saved", null, {
            enabled: d.enabled,
          });
          return {
            ok: true,
            message:
              "Connection saved securely. Test the connection, then build the company graph.",
          };
        },
      ),
    );
  });
  router.post("/test", async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body || {});
    const u = actor(req),
      id = companyId(req);
    await tx(u.tenant_id, (db) => companyCheck(db, u, id));
    const c =
      (await connection(u.tenant_id)) ||
      fail(
        422,
        "NEO4J_NOT_CONFIGURED",
        "Save and enable your Aura connection first.",
      );
    try {
      await withSession(c, 8000, async (session) => {
        await getDriver(c).driver.verifyConnectivity({
          database: c.credentials.database,
        });
        await session.executeRead((t) => t.run("RETURN 1 AS connected"), {
          timeout: 3000,
        });
      });
      const verifiedAt = new Date().toISOString();
      await tx(u.tenant_id, async (db) => {
        await db.query(
          "UPDATE provider_settings SET config=config||$1::jsonb,updated_at=now() WHERE provider='neo4j' AND config->>'connectionId'=$2",
          [JSON.stringify({ verifiedAt }), c.id],
        );
        await audit(db, u, id, "neo4j.connection_tested", null, {
          connected: true,
        });
      });
      circuits.delete(key(c));
      res.json({
        connected: true,
        verifiedAt,
        message:
          "Aura connection verified. Build the company graph to copy its current relationships.",
      });
    } catch (error) {
      circuits.set(key(c), Date.now() + 30000);
      await tx(u.tenant_id, (db) =>
        db.query(
          "UPDATE provider_settings SET config=config||'{\"verifiedAt\":null}'::jsonb WHERE provider='neo4j' AND config->>'connectionId'=$1",
          [c.id],
        ),
      );
      res
        .status(502)
        .json({ code: "NEO4J_CONNECTION_FAILED", message: safeFailure(error) });
    }
  });
  router.post("/rebuild", async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body || {});
    const u = actor(req),
      id = companyId(req);
    await tx(u.tenant_id, (db) => companyCheck(db, u, id));
    const result = await projectCompanyToNeo4j(u.tenant_id, id);
    await tx(u.tenant_id, (db) =>
      audit(db, u, id, "neo4j.projection_requested", null, {
        projected: result.projected,
      }),
    );
    if (!result.configured)
      fail(
        422,
        "NEO4J_NOT_CONFIGURED",
        "Save and enable your Aura connection first.",
      );
    res.status(result.projected ? 200 : 503).json(
      result.projected
        ? result
        : {
            code: "NEO4J_PROJECTION_FAILED",
            message:
              result.message ||
              "A newer graph is already being prepared. Refresh its status.",
          },
    );
  });
  router.delete("/", async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body || {});
    const u = actor(req),
      id = companyId(req);
    res.json(
      await command(
        u,
        req.header("Idempotency-Key"),
        { path: req.originalUrl, body: req.body },
        async (db) => {
          await companyCheck(db, u, id);
          await db.query(
            "DELETE FROM provider_settings WHERE provider='neo4j'",
          );
          await audit(db, u, id, "neo4j.settings_removed", null);
          return {
            ok: true,
            message:
              "Connection removed. Company records remain in PostgreSQL. Existing copies in Aura are not deleted.",
          };
        },
      ),
    );
  });
  return router;
}
