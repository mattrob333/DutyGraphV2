import "dotenv/config";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createApp, errorHandler } from "../server/app.ts";
import { pool, tx, putRecord } from "../server/db.ts";
import { syntheticFramework } from "./framework-fixtures.ts";
let server: Server,
  base: string,
  calls = 0;
type Client = { cookie: string; csrf: string; user: any; company: string };
async function request(
  client: Client | null,
  path: string,
  method = "GET",
  body?: unknown,
  key = randomUUID(),
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(client ? { Cookie: client.cookie, "X-CSRF-Token": client.csrf } : {}),
      "Idempotency-Key": key,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
async function register() {
  const result = await request(null, "/api/auth/register", "POST", {
    name: "Framework Tester",
    email: randomUUID() + "@test.invalid",
    password: "Synthetic test password 124!",
    companyName: "Synthetic Framework Company",
    scope: "Synthetic framework integration",
    goal: "Verify analyses without paid calls",
  });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  const client = {
    cookie: result.cookie,
    csrf: result.data.csrf,
    user: result.data.user,
    company: "",
  };
  client.company = (await request(client, "/api/v1/companies")).data[0].id;
  return client;
}
const prefix = (c: Client) => `/api/v1/companies/${c.company}`;
before(async () => {
  const app = createApp({
    authRequestsPerWindow: 1000,
    frameworkProvider: async (input) => {
      calls++;
      const output = syntheticFramework(input);
      if (input.company.includes("Invalid citation"))
        output.sections[0].items[0].sourceIds = ["foreign-source"];
      return {
        output,
        responseId: "synthetic-framework-response",
        usage: { input_tokens: 1, output_tokens: 1 },
      };
    },
  });
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + (server.address() as any).port;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});
test("framework run API saves exact versions, honors dependencies, is idempotent and isolates tenants", async () => {
  const c = await register(),
    other = await register(),
    p = prefix(c);
  assert.equal((await request(null, p + "/framework-runs")).status, 401);
  assert.equal((await request(other, p + "/framework-runs/bmc")).status, 404);
  await request(c, p + "/providers/openai", "PUT", {
    key: "synthetic-key-never-a-live-credential",
    enabled: true,
  });
  const empty = await request(c, p + "/framework-runs/bmc", "POST", {
    consent: true,
  });
  assert.equal(empty.status, 422);
  const source = await tx(c.user.tenant_id, (db) =>
    putRecord(
      db,
      c.user,
      c.company,
      "evidence",
      "Synthetic public research",
      {
        text: "The synthetic company sells components to manufacturers. Leadership wants shorter order lead times.",
        bucket: "biz",
        locator: "https://example.com",
      },
      "accepted",
    ),
  );
  const status = await request(c, p + "/framework-runs");
  assert.equal(status.data.frameworks.length, 16);
  assert.equal(
    status.data.frameworks.find((f: any) => f.key === "bmc").ready,
    true,
  );
  assert.equal(
    status.data.frameworks.find((f: any) => f.key === "industrymap").ready,
    true,
  );
  const blocked = await request(c, p + "/framework-runs/fiveforces", "POST", {
    consent: true,
  });
  assert.equal(blocked.status, 422);
  assert.equal(blocked.data.code, "FRAMEWORK_UPSTREAM");
  const key = randomUUID(),
    start = calls;
  const first = await request(
    c,
    p + "/framework-runs/bmc",
    "POST",
    { consent: true },
    key,
  );
  assert.equal(first.status, 200, JSON.stringify(first.data));
  const duplicate = await request(
    c,
    p + "/framework-runs/bmc",
    "POST",
    { consent: true },
    key,
  );
  assert.equal(duplicate.data.id, first.data.id);
  assert.equal(calls, start + 1);
  const history = (await request(c, p + "/framework-runs/bmc")).data;
  assert.equal(history.jobs[0].state, "complete");
  assert.equal(history.jobs[0].input.version, 1);
  assert.equal(history.jobs[0].result.output.sections.length, 9);
  assert.ok(!history.jobs[0].input.sources[0].text);
  assert.ok(!JSON.stringify(history).includes("synthetic-key-never"));
  const next = await request(c, p + "/framework-runs/industrymap", "POST", {
    consent: true,
  });
  assert.equal(next.status, 200);
  assert.equal(
    (await request(c, p + "/framework-runs/industrymap")).data.jobs[0].state,
    "complete",
  );
  await tx(c.user.tenant_id, (db) =>
    putRecord(
      db,
      c.user,
      c.company,
      "evidence",
      source.title,
      { ...source.data, text: "Changed company context" },
      "accepted",
      source,
    ),
  );
  const changed = (await request(c, p + "/framework-runs")).data;
  assert.equal(
    changed.frameworks.find((f: any) => f.key === "bmc").stale,
    true,
  );
  assert.equal(
    changed.frameworks.find((f: any) => f.key === "industrymap").stale,
    true,
  );
  const second = await request(c, p + "/framework-runs/bmc", "POST", {
    consent: true,
  });
  assert.equal(second.data.version, 2);
  const exact = (
    await request(c, p + `/framework-runs/bmc?version=${first.data.id}`)
  ).data;
  assert.ok(exact.jobs.some((j: any) => j.id === first.data.id && j.stale));
  const excerptPath =
    p + `/framework-runs/bmc/${first.data.id}/source?sourceId=${source.id}`;
  const excerpt = await request(c, excerptPath);
  assert.equal(excerpt.status, 200);
  assert.equal(
    excerpt.data.source.text,
    source.data.text,
    "Historical source text must remain the original input after record edits.",
  );
  assert.equal(excerpt.data.source.version, 1);
  assert.equal((await request(other, excerptPath)).status, 404);
  assert.equal(
    (
      await request(
        c,
        p +
          `/framework-runs/industrymap/${first.data.id}/source?sourceId=${source.id}`,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        c,
        p +
          `/framework-runs/bmc/${first.data.id}/source?sourceId=${randomUUID()}`,
      )
    ).status,
    404,
  );
  const missing = await request(
    c,
    p + `/framework-runs/bmc?version=${randomUUID()}`,
  );
  assert.equal(missing.status, 404);
  await pool.query(
    "UPDATE users SET role='participant',company_id=$2 WHERE id=$1",
    [other.user.id, other.company],
  );
  assert.equal(
    (await request(other, prefix(other) + "/framework-runs")).status,
    403,
  );
});
test("framework API records rejected model output without accepting a forged source", async () => {
  const c = await register();
  await tx(c.user.tenant_id, (db) =>
    db.query(
      "UPDATE companies SET name='Invalid citation synthetic test' WHERE id=$1",
      [c.company],
    ),
  );
  await request(c, prefix(c) + "/providers/openai", "PUT", {
    key: "synthetic-key-not-real",
    enabled: true,
  });
  await tx(c.user.tenant_id, (db) =>
    putRecord(
      db,
      c.user,
      c.company,
      "evidence",
      "Test evidence",
      { bucket: "biz", text: "Synthetic context" },
      "accepted",
    ),
  );
  const run = await request(c, prefix(c) + "/framework-runs/bmc", "POST", {
    consent: true,
  });
  assert.equal(run.status, 200);
  const job = (await request(c, prefix(c) + "/framework-runs/bmc")).data
    .jobs[0];
  assert.equal(job.state, "failed");
  assert.equal(job.result, null);
  assert.match(job.message, /valid source/);
});

test("business profile saves with tenant isolation, optimistic locking and current framework context", async () => {
  const c = await register(),
    other = await register(),
    p = prefix(c);
  const company = (await request(c, "/api/v1/companies")).data.find(
    (r: any) => r.id === c.company,
  );
  const profile = {
    industry: "Industrial products",
    status: "proposed",
    rationale: "Proposed hybrid",
    streams: [
      {
        id: "products",
        templateId: "manufacturing",
        name: "Physical products",
        stages: [{ id: "build", name: "Make products", functionIds: ["do"] }],
      },
    ],
  };
  const payload = { expectedRevision: company.revision, profile };
  assert.equal(
    (await request(other, p + "/business-profile", "PUT", payload)).status,
    404,
  );
  const saved = await request(c, p + "/business-profile", "PUT", payload);
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.equal(
    saved.data.settings.businessProfile.streams[0].templateId,
    "manufacturing",
  );
  assert.equal(
    (await request(c, p + "/business-profile", "PUT", payload)).status,
    409,
  );
  const context = (await request(c, p + "/framework-runs/industrymap")).data;
  assert.ok(
    context.sources.some((s: any) => s.id === `business-profile:${c.company}`),
  );
  const invalid = await request(c, p + "/business-profile", "PUT", {
    expectedRevision: saved.data.revision,
    profile: {
      ...profile,
      streams: [{ ...profile.streams[0], templateId: "unknown" }],
    },
  });
  assert.equal(invalid.status, 422);
});
