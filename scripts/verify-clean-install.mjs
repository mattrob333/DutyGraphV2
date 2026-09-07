// Isolated install regression. Never reads or changes an existing database.
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import pg from "pg";
const name = "dutygraph-clean-" + randomUUID(),
  password = randomBytes(24).toString("hex"),
  appPassword = randomBytes(24).toString("hex");
const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env,
    timeout: 60000,
  });
  if (result.status !== 0)
    throw new Error(
      `${command} failed: ${result.stderr || result.error?.message || "nonzero exit"}`,
    );
  return result.stdout.trim();
};
let created = false,
  db;
try {
  run(
    "docker",
    [
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--label",
      "dutygraph.clean-install=true",
      "--tmpfs",
      "/var/lib/postgresql/data",
      "-e",
      "POSTGRES_PASSWORD",
      "-e",
      "POSTGRES_DB=dutygraph",
      "-p",
      "127.0.0.1::5432",
      "postgres:17-alpine",
    ],
    { ...process.env, POSTGRES_PASSWORD: password },
  );
  created = true;
  const port = run("docker", ["port", name, "5432/tcp"]).match(
    /^127\.0\.0\.1:(\d+)$/,
  )?.[1];
  assert.ok(port, "Expected a loopback-only ephemeral port");
  const url = `postgres://postgres:${password}@127.0.0.1:${port}/dutygraph`;
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const r = spawnSync(
      "docker",
      ["exec", name, "pg_isready", "-U", "postgres", "-d", "dutygraph"],
      { encoding: "utf8", timeout: 3000 },
    );
    if (r.status === 0) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, "Fresh database did not become ready");
  const env = {
    ...process.env,
    MIGRATION_DATABASE_URL: url,
    APP_DATABASE_PASSWORD: appPassword,
  };
  const first = run(
    process.execPath,
    ["--import", "tsx", "server/migrate.ts"],
    env,
  );
  assert.ok(first.includes("Applied migration 0008-pilot-notifications"));
  assert.ok(first.includes("Applied migration 0010-newsletter-interest"));
  const second = run(
    process.execPath,
    ["--import", "tsx", "server/migrate.ts"],
    env,
  );
  assert.ok(
    !second.includes("Applied migration"),
    "Second run should preserve migration history",
  );
  db = new pg.Client({ connectionString: url });
  await db.connect();
  const role = (
    await db.query(
      "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname='dutygraph_app'",
    )
  ).rows[0];
  assert.deepEqual(role, { rolsuper: false, rolbypassrls: false });
  assert.equal(
    (await db.query("SELECT count(*)::int n FROM schema_migrations")).rows[0].n,
    10,
  );
  assert.equal(
    (
      await db.query(
        "SELECT has_table_privilege('dutygraph_app','record_versions','DELETE') ok",
      )
    ).rows[0].ok,
    false,
  );
  assert.equal(
    (
      await db.query(
        "SELECT has_function_privilege('dutygraph_app','pilot_notification_details(uuid)','EXECUTE') ok",
      )
    ).rows[0].ok,
    true,
  );
  assert.equal(
    (
      await db.query(
        "SELECT relforcerowsecurity FROM pg_class WHERE oid='records'::regclass",
      )
    ).rows[0].relforcerowsecurity,
    true,
  );
  console.log(
    "PASS: fresh PostgreSQL install, all migrations, repeat migration, restricted role, immutable-version grants and RLS. Existing databases untouched.",
  );
} finally {
  if (db) await db.end();
  // Exact random name created by this invocation; no shared containers or volumes.
  if (created) run("docker", ["stop", name]);
}
