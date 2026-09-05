import "dotenv/config";
import pg from "pg";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const pool = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const db = await pool.connect();
try {
  const password = process.env.APP_DATABASE_PASSWORD;
  if (!password || !/^[a-f0-9]{48}$/.test(password))
    throw new Error(
      "Run npm run setup to generate a local application database password.",
    );
  await db.query(
    "SELECT pg_advisory_lock(hashtext('dutygraph-schema-migrations'))",
  );
  await db.query("BEGIN");
  await db.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(id text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const files = [
    { id: "0001-baseline", url: new URL("./schema.sql", import.meta.url) },
    ...(await readdir(new URL("./migrations/", import.meta.url)))
      .filter((name) => /^\d{4}-.+\.sql$/.test(name))
      .sort()
      .map((name) => ({
        id: name.slice(0, -4),
        url: new URL("./migrations/" + name, import.meta.url),
      })),
  ];
  for (const file of files) {
    const raw = await readFile(file.url, "utf8"),
      sql = raw.replaceAll("\r\n", "\n"),
      checksum = createHash("sha256").update(sql).digest("hex");
    const prior = (
      await db.query("SELECT checksum FROM schema_migrations WHERE id=$1", [
        file.id,
      ])
    ).rows[0];
    if (prior) {
      if (
        prior.checksum !== checksum &&
        prior.checksum === createHash("sha256").update(raw).digest("hex")
      )
        await db.query("UPDATE schema_migrations SET checksum=$2 WHERE id=$1", [
          file.id,
          checksum,
        ]);
      else if (prior.checksum !== checksum)
        throw new Error(
          `Applied migration ${file.id} changed. Add a new migration instead.`,
        );
      continue;
    }
    await db.query(sql);
    await db.query("INSERT INTO schema_migrations(id,checksum) VALUES($1,$2)", [
      file.id,
      checksum,
    ]);
    console.log("Applied migration", file.id);
  }
  const exists = await db.query(
    "SELECT 1 FROM pg_roles WHERE rolname='dutygraph_app'",
  );
  if (!exists.rowCount)
    await db.query(
      `CREATE ROLE dutygraph_app LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS`,
    );
  await db.query("GRANT USAGE ON SCHEMA public TO dutygraph_app");
  await db.query(
    "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO dutygraph_app",
  );
  await db.query(
    "REVOKE UPDATE,DELETE ON record_versions,audit_events FROM dutygraph_app",
  );
  await db.query("REVOKE ALL ON schema_migrations FROM dutygraph_app");
  await db.query(
    "GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO dutygraph_app",
  );
  await db.query("COMMIT");
  console.log(
    "Schema ready. Runtime role is not a superuser; tenant RLS is forced.",
  );
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally {
  await db.query(
    "SELECT pg_advisory_unlock(hashtext('dutygraph-schema-migrations'))",
  );
  db.release();
  await pool.end();
}
