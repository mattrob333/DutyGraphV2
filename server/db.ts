import "dotenv/config";
import pg from "pg";
import { createHash, randomUUID } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import type { RecordRow, User } from "../shared/domain.ts";
import { attachDatabasePool } from "@vercel/functions";
export const pool = new pg.Pool({
  connectionString: process.env.VERCEL
    ? process.env.APP_DATABASE_URL
    : process.env.DATABASE_URL,
  max: process.env.VERCEL ? 3 : 12,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
});
if (process.env.VERCEL) {
  if (!process.env.APP_DATABASE_URL)
    throw new Error("Hosted application database is not configured.");
  attachDatabasePool(pool);
}
export const hash = (data: unknown) =>
  createHash("sha256").update(canonicalize(data)).digest("hex");
export const tokenHash = (data: string) =>
  createHash("sha256").update(data).digest("hex");
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (status: number, code: string, message: string): never => {
  throw new AppError(status, code, message);
};
export async function tx<T>(
  tenant: string,
  fn: (db: pg.PoolClient) => Promise<T>,
) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT set_config('app.tenant_id',$1,true)", [tenant]);
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
export async function companyCheck(
  db: pg.PoolClient,
  user: User,
  companyId: string,
) {
  if (user.role === "participant" && user.company_id !== companyId)
    fail(404, "NOT_FOUND", "Workspace not found.");
  const { rows } = await db.query("SELECT * FROM companies WHERE id=$1", [
    companyId,
  ]);
  return rows[0] || fail(404, "NOT_FOUND", "Workspace not found.");
}
export async function getRecord(
  db: pg.PoolClient,
  companyId: string,
  id: string,
  lock = false,
): Promise<RecordRow> {
  const { rows } = await db.query(
    "SELECT * FROM records WHERE company_id=$1 AND id=$2" +
      (lock ? " FOR UPDATE" : ""),
    [companyId, id],
  );
  return (
    rows[0] || fail(404, "NOT_FOUND", "Record not found in this workspace.")
  );
}
export async function audit(
  db: pg.PoolClient,
  user: User,
  companyId: string,
  type: string,
  id: string | null,
  detail: unknown = {},
) {
  await db.query(
    "INSERT INTO audit_events(id,tenant_id,company_id,actor_id,type,record_id,detail) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [randomUUID(), user.tenant_id, companyId, user.id, type, id, detail],
  );
}
export async function putRecord(
  db: pg.PoolClient,
  user: User,
  companyId: string,
  kind: string,
  title: string,
  data: any,
  state = "proposed",
  existing?: RecordRow,
  reason = "Created record",
) {
  const id = existing?.id || randomUUID(),
    version = (existing?.version || 0) + 1;
  const contentHash = hash({
    tenantId: user.tenant_id,
    companyId,
    id,
    kind,
    version,
    title,
    data,
  });
  const { rows } = await db.query(
    `INSERT INTO records(id,tenant_id,company_id,kind,title,version,state,data,hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(tenant_id,company_id,id) DO UPDATE SET title=$5,version=$6,state=$7,data=$8,hash=$9,updated_at=now() RETURNING *`,
    [
      id,
      user.tenant_id,
      companyId,
      kind,
      title,
      version,
      state,
      data,
      contentHash,
    ],
  );
  await db.query(
    "INSERT INTO record_versions(tenant_id,company_id,record_id,version,title,data,hash,actor_id,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      user.tenant_id,
      companyId,
      id,
      version,
      title,
      data,
      contentHash,
      user.id,
      reason,
    ],
  );
  await db.query("UPDATE companies SET revision=revision+1 WHERE id=$1", [
    companyId,
  ]);
  await db.query(
    "INSERT INTO outbox(id,tenant_id,company_id,record_id,version,type) VALUES($1,$2,$3,$4,$5,$6)",
    [
      randomUUID(),
      user.tenant_id,
      companyId,
      id,
      version,
      kind + "." + (existing ? "revised" : "created"),
    ],
  );
  await audit(
    db,
    user,
    companyId,
    kind + "." + (existing ? "revised" : "created"),
    id,
    { version, reason },
  );
  return rows[0] as RecordRow;
}
export async function setState(
  db: pg.PoolClient,
  user: User,
  companyId: string,
  r: RecordRow,
  state: string,
  type: string,
) {
  await db.query(
    "UPDATE records SET state=$1,updated_at=now() WHERE company_id=$2 AND id=$3",
    [state, companyId, r.id],
  );
  await db.query("UPDATE companies SET revision=revision+1 WHERE id=$1", [
    companyId,
  ]);
  await db.query(
    "INSERT INTO outbox(id,tenant_id,company_id,record_id,version,type) VALUES($1,$2,$3,$4,$5,$6)",
    [randomUUID(), user.tenant_id, companyId, r.id, r.version, type],
  );
  await audit(db, user, companyId, type, r.id, { version: r.version, state });
}
export async function command<T>(
  user: User,
  key: string | undefined,
  input: unknown,
  fn: (db: pg.PoolClient) => Promise<T>,
) {
  if (!key || key.length > 128)
    fail(400, "IDEMPOTENCY_REQUIRED", "A bounded Idempotency-Key is required.");
  return tx(user.tenant_id, async (db) => {
    // Commands can affect several related records and a company revision. Serialize
    // tenant writes before taking row locks so reviews and source invalidation
    // cannot race. Read queries remain concurrent in this bounded local service.
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "tenant-command:" + user.tenant_id,
    ]);
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      user.tenant_id + user.id + key,
    ]);
    const fingerprint = hash(input),
      old = await db.query(
        "SELECT * FROM command_receipts WHERE actor_id=$1 AND key=$2",
        [user.id, key],
      );
    if (old.rowCount) {
      if (old.rows[0].hash !== fingerprint)
        fail(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This command key was already used with different content.",
        );
      return old.rows[0].result as T;
    }
    const result = await fn(db);
    // Bearer invitation URLs must not be retained in plaintext receipts.
    const receipt =
      result &&
      typeof result === "object" &&
      "url" in result &&
      "emailSent" in result
        ? {
            ...result,
            url: null,
            message:
              "Link already issued. Issue a replacement to rotate the invitation.",
          }
        : result;
    await db.query(
      "INSERT INTO command_receipts(tenant_id,actor_id,key,hash,result) VALUES($1,$2,$3,$4,$5)",
      [user.tenant_id, user.id, key, fingerprint, receipt],
    );
    return result;
  });
}
