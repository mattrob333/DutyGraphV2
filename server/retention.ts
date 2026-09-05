import { pool, tx } from "./db.ts";
export async function purgeExpiredAudio(tenant: string) {
  return tx(tenant, async (db) => {
    const expired = await db.query(
      `SELECT a.* FROM assets a JOIN companies c ON c.id=a.company_id AND c.tenant_id=a.tenant_id WHERE a.state<>'expired' AND a.created_at < now() - (LEAST(365,GREATEST(1,(c.settings->>'retentionDays')::int)) * interval '1 day') FOR UPDATE OF a`,
    );
    for (const a of expired.rows) {
      await db.query(
        "DELETE FROM asset_chunks WHERE company_id=$1 AND asset_id=$2",
        [a.company_id, a.id],
      );
      await db.query(
        "UPDATE assets SET state='expired' WHERE company_id=$1 AND id=$2",
        [a.company_id, a.id],
      );
    }
    return expired.rowCount;
  });
}
export async function runRetention() {
  for (const tenant of (await pool.query("SELECT id FROM tenants")).rows)
    await purgeExpiredAudio(tenant.id);
  await pool.query("DELETE FROM sessions WHERE expires_at<now()");
}
