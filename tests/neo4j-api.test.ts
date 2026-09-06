import "dotenv/config";
import test, { before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import neo4j from "neo4j-driver";
import { createApp, errorHandler } from "../server/app.ts";
import { pool, tx } from "../server/db.ts";
import { closeNeo4jDrivers } from "../server/neo4j.ts";
import { openSecret } from "../server/providers.ts";

type Client = { cookie: string; csrf: string; user: any; company: string };
let server: Server,
  base = "",
  driverCalls = 0;
const credentials = {
  uri: "neo4j+s://synthetic-test.databases.neo4j.io",
  username: "neo4j",
  database: "neo4j",
  password: "Synthetic Aura password!",
};
async function request(
  c: Client | null,
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(c ? { Cookie: c.cookie, "X-CSRF-Token": c.csrf } : {}),
      "Idempotency-Key": randomUUID(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
const prefix = (c: Client) => `/api/v1/companies/${c.company}`,
  path = (c: Client) => prefix(c) + "/neo4j";
async function register(): Promise<Client> {
  const r = await request(null, "/api/auth/register", "POST", {
    name: "Neo4j test advisor",
    email: randomUUID() + "@test.invalid",
    password: "Synthetic test password 124!",
    companyName: "Neo4j fixture " + randomUUID(),
    scope: "Test graph isolation",
    goal: "Verify settings with a fake driver",
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const c = {
    cookie: r.cookie,
    csrf: r.data.csrf,
    user: r.data.user,
    company: "",
  };
  c.company = (await request(c, "/api/v1/companies")).data[0].id;
  return c;
}
before(async () => {
  // Real Aura calls are impossible in this suite, including unexpected code paths.
  mock.method(neo4j, "driver", () => {
    driverCalls++;
    return {
      verifyConnectivity: async () => {},
      close: async () => {},
      session: () => ({
        close: async () => {},
        executeRead: async (fn: any) =>
          fn({ run: async () => ({ records: [{ get: () => 1 }] }) }),
      }),
    } as any;
  });
  const app = createApp({ authRequestsPerWindow: 1000, hostedRouting: true });
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + (server.address() as any).port;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closeNeo4jDrivers();
  mock.restoreAll();
  await pool.end();
});

test("Neo4j settings require advisor auth and CSRF, are account-scoped, and do not return secrets", async () => {
  const c = await register(),
    other = await register();
  assert.equal((await request(null, path(c))).status, 401);
  assert.equal((await request(null, path(c), "PUT", credentials)).status, 401);
  assert.equal(
    (await request(c, path(c), "PUT", credentials, { "X-CSRF-Token": "wrong" }))
      .status,
    403,
  );
  assert.equal(
    (
      await request(c, path(c), "PUT", {
        ...credentials,
        uri: "neo4j+s://127.0.0.1",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await request(c, path(c), "PUT", {
        ...credentials,
        cypher: "MATCH (n) RETURN n",
      })
    ).status,
    422,
  );
  assert.equal((await request(c, path(c), "PUT", credentials)).status, 200);
  assert.equal(
    driverCalls,
    0,
    "Saving credentials must not invoke the driver in the request.",
  );
  const status = await request(c, path(c));
  assert.equal(status.data.configured, true);
  assert.equal(status.data.connected, false);
  assert.equal(status.data.projection, null);
  assert.equal(
    JSON.stringify(status.data).includes(credentials.password),
    false,
  );
  const stored = await tx(
    c.user.tenant_id,
    async (db) =>
      (await db.query("SELECT * FROM provider_settings WHERE provider='neo4j'"))
        .rows[0],
  );
  assert.equal(JSON.stringify(stored).includes(credentials.password), false);
  assert.deepEqual(
    JSON.parse(openSecret(stored.encrypted_key, `${c.user.tenant_id}:neo4j`)),
    credentials,
  );
  await tx(other.user.tenant_id, async (db) => {
    assert.equal(
      (await db.query("SELECT * FROM provider_settings WHERE provider='neo4j'"))
        .rowCount,
      0,
    );
    assert.equal(
      (await db.query("SELECT * FROM neo4j_projection_state")).rowCount,
      0,
    );
  });
  for (const method of ["GET", "PUT", "DELETE"])
    assert.equal(
      (
        await request(
          other,
          path(c),
          method,
          method === "PUT" ? credentials : method === "DELETE" ? {} : undefined,
        )
      ).status,
      404,
    );
  for (const suffix of ["/test", "/rebuild"])
    assert.equal(
      (await request(other, path(c) + suffix, "POST", {})).status,
      404,
    );
  assert.equal(
    (await request(c, path(c) + "/test", "POST", { cypher: "RETURN 1" }))
      .status,
    422,
  );
  const tested = await request(c, path(c) + "/test", "POST", {});
  assert.equal(tested.status, 200);
  assert.equal(tested.data.connected, true);
  assert.equal(driverCalls, 1);
  const providers = await request(c, prefix(c) + "/providers");
  assert.equal(providers.data.neo4j.connected, true);
  assert.equal(
    JSON.stringify(providers.data).includes(credentials.password),
    false,
  );
  const audit = await tx(
    c.user.tenant_id,
    async (db) =>
      (
        await db.query(
          "SELECT detail FROM audit_events WHERE type LIKE 'neo4j.%'",
        )
      ).rows,
  );
  assert.equal(JSON.stringify(audit).includes(credentials.password), false);
  assert.equal(JSON.stringify(audit).includes(stored.encrypted_key), false);
  await pool.query(
    "UPDATE users SET role='participant',company_id=$2 WHERE id=$1",
    [other.user.id, other.company],
  );
  for (const method of ["GET", "PUT", "DELETE"])
    assert.equal(
      (
        await request(
          other,
          path(other),
          method,
          method === "PUT" ? credentials : method === "DELETE" ? {} : undefined,
        )
      ).status,
      403,
    );
  for (const suffix of ["/test", "/rebuild"])
    assert.equal(
      (await request(other, path(other) + suffix, "POST", {})).status,
      403,
    );
  assert.equal((await request(c, path(c), "DELETE", {})).status, 200);
  assert.equal((await request(c, path(c))).data.configured, false);
  assert.equal(
    driverCalls,
    1,
    "Removing settings must not delete data from Aura.",
  );
});
test("Neo4j save receipts are idempotent and an unconfigured graph uses PostgreSQL", async () => {
  const c = await register(),
    idempotency = randomUUID();
  assert.equal((await request(c, path(c) + "/test", "POST", {})).status, 422);
  assert.equal(
    (await request(c, path(c) + "/rebuild", "POST", {})).status,
    422,
  );
  const first = await request(c, path(c), "PUT", credentials, {
    "Idempotency-Key": idempotency,
  });
  const config = () =>
    tx(
      c.user.tenant_id,
      async (db) =>
        (
          await db.query(
            "SELECT config FROM provider_settings WHERE provider='neo4j'",
          )
        ).rows[0].config,
    );
  const original = await config();
  const repeated = await request(c, path(c), "PUT", credentials, {
    "Idempotency-Key": idempotency,
  });
  assert.deepEqual(repeated.data, first.data);
  assert.equal((await config()).connectionId, original.connectionId);
  assert.equal(
    (
      await request(
        c,
        path(c),
        "PUT",
        { ...credentials, password: "Changed synthetic password" },
        { "Idempotency-Key": idempotency },
      )
    ).status,
    409,
  );
  await request(c, path(c), "DELETE", {});
  const graph = await request(c, prefix(c) + "/graph");
  assert.equal(graph.status, 200);
  assert.equal(graph.data.engine, "Authoritative PostgreSQL fallback");
  assert.equal(graph.data.neo4jCurrent, false);
});
