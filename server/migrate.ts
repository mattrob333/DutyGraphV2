import "dotenv/config";
import pg from "pg";
import { readFile } from "node:fs/promises";
const pool = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
try {
  const password = process.env.APP_DATABASE_PASSWORD;
  if (!password || !/^[a-f0-9]{48}$/.test(password))
    throw new Error(
      "Run npm run setup to generate a local application database password.",
    );
  await pool.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  const exists = await pool.query(
    "SELECT 1 FROM pg_roles WHERE rolname='dutygraph_app'",
  );
  if (!exists.rowCount)
    await pool.query(
      `CREATE ROLE dutygraph_app LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS`,
    );
  await pool.query("GRANT USAGE ON SCHEMA public TO dutygraph_app");
  await pool.query(
    "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO dutygraph_app",
  );
  await pool.query(
    "REVOKE UPDATE,DELETE ON record_versions,audit_events FROM dutygraph_app",
  );
  await pool.query(
    "GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO dutygraph_app",
  );
  console.log(
    "Schema ready. Runtime role is not a superuser; tenant RLS is forced.",
  );
} finally {
  await pool.end();
}
