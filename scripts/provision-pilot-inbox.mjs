import "dotenv/config";
import pg from "pg";
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@"))
  throw new Error(
    "Usage: node scripts/provision-pilot-inbox.mjs operator@example.com",
  );
if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error("Migration-owner database connection required.");
const pool = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
try {
  const user = (
    await pool.query(
      "SELECT id,tenant_id FROM users WHERE lower(email)=$1 AND role='advisor'",
      [email],
    )
  ).rows[0];
  if (!user)
    throw new Error(
      "Create the intended advisor account first. No matching advisor exists.",
    );
  await pool.query(
    "INSERT INTO pilot_inbox_operators(user_id,tenant_id) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id",
    [user.id, user.tenant_id],
  );
  console.log(
    "Existing advisor provisioned. Configure PILOT_INBOX_EMAILS on the application host to enable access.",
  );
} finally {
  await pool.end();
}
