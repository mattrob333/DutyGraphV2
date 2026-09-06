import "dotenv/config";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createApp, errorHandler } from "../server/app.ts";
import { pool, tx } from "../server/db.ts";
let server: Server, base: string;
async function call(
  c: any,
  path: string,
  method = "GET",
  body?: any,
  key = randomUUID(),
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(c ? { Cookie: c.cookie, "X-CSRF-Token": c.csrf } : {}),
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
async function account() {
  const r = await call(null, "/api/auth/register", "POST", {
    name: "Agent test",
    email: randomUUID() + "@test.invalid",
    password: "Synthetic password 124!",
    companyName: "Agent test",
    scope: "Test",
    goal: "Verify requests",
  });
  assert.equal(r.status, 201);
  return { cookie: r.cookie, csrf: r.data.csrf, user: r.data.user };
}
before(async () => {
  const app = createApp({ authRequestsPerWindow: 1000, hostedRouting: true });
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = "http://127.0.0.1:" + (server.address() as any).port;
});
after(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.end();
});
test("demo request, manifest, trimmed simulated review and issuance are isolated and versioned", async () => {
  const c = await account(),
    other = await account();
  const co = await call(c, "/api/v1/sample-company", "POST", {});
  assert.equal(co.status, 200);
  const p = `/api/v1/companies/${co.data.id}/agent-requests`;
  assert.equal((await call(null, p)).status, 401);
  assert.equal((await call(other, p)).status, 404);
  const key = randomUUID(),
    created = await call(c, p + "/demo", "POST", { scenario: "standard" }, key);
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(
    (await call(c, p + "/demo", "POST", { scenario: "standard" }, key)).data.id,
    created.data.id,
  );
  const id = created.data.id;
  let r = await call(c, p + `/${id}/manifest`, "POST", {
    expectedVersion: created.data.version,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.data.manifest.scopeEvaluation.eligibleScopes.length, 2);
  const manifestHash = r.data.data.manifestHash;
  assert.equal(
    (
      await call(c, p + `/${id}/simulate`, "POST", {
        expectedVersion: r.data.version,
        manifestHash,
        action: "issue",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await call(c, p + `/${id}/review`, "POST", {
        expectedVersion: r.data.version,
        manifestHash,
        decision: "reviewed",
        note: "Review",
      })
    ).status,
    403,
  );
  r = await call(c, p + `/${id}/simulate`, "POST", {
    expectedVersion: r.data.version,
    manifestHash,
    action: "review",
  });
  assert.equal(r.status, 200);
  r = await call(c, p + `/${id}/simulate`, "POST", {
    expectedVersion: r.data.version,
    manifestHash,
    action: "issue",
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.state, "demo_issued");
  assert.equal(r.data.data.demoIssuance.credential, null);
  assert.equal((await call(c, p + `/${id}/issue`, "POST", {})).status, 503);
  await tx(c.user.tenant_id, async (db) => {
    await db.query("UPDATE records SET version=version+1 WHERE id=$1", [
      r.data.data.personId,
    ]);
  });
  assert.equal(
    (
      await call(c, p + `/${id}/simulate`, "POST", {
        expectedVersion: r.data.version,
        manifestHash,
        action: "review",
      })
    ).status,
    409,
  );
});
test("real company cannot create demo and failed authority cannot advance", async () => {
  const c = await account(),
    companies = (await call(c, "/api/v1/companies")).data;
  assert.equal(
    (
      await call(
        c,
        `/api/v1/companies/${companies[0].id}/agent-requests/demo`,
        "POST",
        { scenario: "standard" },
      )
    ).status,
    403,
  );
  const co = (await call(c, "/api/v1/sample-company", "POST", {})).data,
    p = `/api/v1/companies/${co.id}/agent-requests`;
  for (const scenario of ["inactive", "stale", "conflict"]) {
    const created = await call(c, p + "/demo", "POST", { scenario });
    let r = await call(c, p + `/${created.data.id}/manifest`, "POST", {
      expectedVersion: created.data.version,
    });
    assert.equal(r.status, 200);
    assert.equal(
      (
        await call(c, p + `/${created.data.id}/simulate`, "POST", {
          expectedVersion: r.data.version,
          manifestHash: r.data.data.manifestHash,
          action: "review",
        })
      ).status,
      422,
    );
  }
});
