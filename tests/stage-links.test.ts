import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { schemas } from "../shared/domain.ts";
import { businessStageLinksSchema } from "../shared/work-model.ts";
import { createApp, errorHandler } from "../server/app.ts";
import { pool } from "../server/db.ts";

const taskInput = {
  title: "Check the supplier packet",
  duty: "Supplier intake",
  purpose: "Prepare a complete packet",
  trigger: "A supplier sends a packet",
  inputs: "Supplier packet",
  instructions: "Check the required fields",
  output: "Checked packet",
  humanGate: "Approval is recorded separately",
  reviewDue: "2099-01-01",
  reason: "Synthetic stage-map test",
};
const dutyInput = {
  title: "Prepare supplier records",
  purpose: "Keep supplier records complete",
  scope: "Supplier intake",
  reviewDue: "2099-01-01",
  reason: "Synthetic stage-map test",
};
const links = [
  { streamId: "supply", stageId: "prepare" },
  { streamId: "sales", stageId: "prepare" },
];
const profile = {
  industry: "Synthetic supply business",
  status: "advisor_reviewed",
  rationale: "Test explicit mappings",
  streams: [
    {
      id: "supply",
      templateId: "custom",
      name: "Supplier work",
      stages: [
        { id: "prepare", name: "Prepare supplier", functionIds: ["shape"] },
      ],
    },
    {
      id: "sales",
      templateId: "custom",
      name: "Sales work",
      stages: [
        { id: "prepare", name: "Prepare order", functionIds: ["shape"] },
        { id: "dispatch", name: "Dispatch order", functionIds: ["do"] },
      ],
    },
  ],
};

test("stage links keep legacy tasks and duties valid and enforce bounded unique pairs", () => {
  assert.deepEqual(schemas.task.parse(taskInput).businessStageLinks, []);
  assert.deepEqual(schemas.duty.parse(dutyInput).businessStageLinks, []);
  assert.deepEqual(businessStageLinksSchema.parse(links), links);
  assert.equal(
    businessStageLinksSchema.safeParse([links[0], links[0]]).success,
    false,
  );
  assert.equal(
    businessStageLinksSchema.safeParse([{ ...links[0], inferred: true }])
      .success,
    false,
  );
  for (const id of ["", "UPPER", "space here", "colon:id", "x".repeat(101)]) {
    assert.equal(
      businessStageLinksSchema.safeParse([{ ...links[0], stageId: id }])
        .success,
      false,
    );
    assert.equal(
      businessStageLinksSchema.safeParse([{ ...links[0], streamId: id }])
        .success,
      false,
    );
  }
  const maximum = Array.from({ length: 128 }, (_, i) => ({
    streamId: "supply",
    stageId: `stage-${i}`,
  }));
  assert.equal(businessStageLinksSchema.safeParse(maximum).success, true);
  assert.equal(
    businessStageLinksSchema.safeParse([
      ...maximum,
      { streamId: "sales", stageId: "one-more" },
    ]).success,
    false,
  );
});

let server: Server, base: string;
type Client = { cookie: string; csrf: string; company: string };
before(async () => {
  const app = createApp();
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});
async function call(
  client: Client | null,
  path: string,
  method = "GET",
  body?: unknown,
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(client ? { Cookie: client.cookie, "X-CSRF-Token": client.csrf } : {}),
      "Idempotency-Key": randomUUID(),
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
const prefix = (client: Client) => `/api/v1/companies/${client.company}`;
async function register() {
  const result = await call(null, "/api/auth/register", "POST", {
    name: "Stage map tester",
    email: `${randomUUID()}@test.invalid`,
    password: "Synthetic password for stage map 124!",
    companyName: "Stage map fixture",
    scope: "Test work maps",
    goal: "Check explicit stage links",
  });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  const client: Client = {
    cookie: result.cookie,
    csrf: result.data.csrf,
    company: "",
  };
  client.company = (await call(client, "/api/v1/companies")).data[0].id;
  return client;
}
async function saveProfile(client: Client, next = profile) {
  const workspace = await call(client, prefix(client) + "/workspace");
  const result = await call(
    client,
    prefix(client) + "/business-profile",
    "PUT",
    {
      expectedRevision: workspace.data.company.revision,
      profile: next,
    },
  );
  assert.equal(result.status, 200, JSON.stringify(result.data));
}
async function create(client: Client, kind: "task" | "duty", data: unknown) {
  const result = await call(client, prefix(client) + "/records", "POST", {
    kind,
    data,
  });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data;
}

test("task and duty stage links persist through the versioned API and require current stream-stage pairs", async () => {
  const client = await register();
  await saveProfile(client);
  for (const [kind, input] of [
    ["task", taskInput],
    ["duty", dutyInput],
  ] as const) {
    const record = await create(client, kind, {
      ...input,
      businessStageLinks: links,
    });
    assert.deepEqual(record.data.businessStageLinks, links);
    const workspace = await call(client, prefix(client) + "/workspace");
    assert.deepEqual(
      workspace.data.records.find((r: any) => r.id === record.id).data
        .businessStageLinks,
      links,
    );
    const revised = await call(
      client,
      prefix(client) + `/records/${record.id}`,
      "PATCH",
      {
        expectedVersion: record.version,
        data: { ...input, businessStageLinks: [links[1]] },
      },
    );
    assert.equal(revised.status, 200, JSON.stringify(revised.data));
    assert.equal(revised.data.version, record.version + 1);
    assert.notEqual(revised.data.hash, record.hash);
    assert.deepEqual(revised.data.data.businessStageLinks, [links[1]]);
    const conflict = await call(
      client,
      prefix(client) + `/records/${record.id}`,
      "PATCH",
      {
        expectedVersion: record.version,
        data: { ...input, businessStageLinks: [] },
      },
    );
    assert.equal(conflict.status, 409);
    for (const invalid of [
      { streamId: "missing", stageId: "prepare" },
      { streamId: "supply", stageId: "dispatch" },
    ]) {
      const rejected = await call(client, prefix(client) + "/records", "POST", {
        kind,
        data: { ...input, businessStageLinks: [invalid] },
      });
      assert.equal(rejected.status, 422);
      assert.equal(rejected.data.code, "INVALID_BUSINESS_STAGE");
    }
  }
});

test("profile changes retain old mappings for review without blocking ordinary edits or removal", async () => {
  const client = await register();
  await saveProfile(client);
  for (const [kind, input] of [
    ["task", taskInput],
    ["duty", dutyInput],
  ] as const) {
    await saveProfile(client);
    let record = await create(client, kind, {
      ...input,
      businessStageLinks: links,
    });
    await saveProfile(client, { ...profile, streams: [profile.streams[1]] });
    const revised = await call(
      client,
      prefix(client) + `/records/${record.id}`,
      "PATCH",
      {
        expectedVersion: record.version,
        data: { ...input, title: "Revised description" },
      },
    );
    assert.equal(revised.status, 200, JSON.stringify(revised.data));
    assert.deepEqual(revised.data.data.businessStageLinks, links);
    record = revised.data;
    const removed = await call(
      client,
      prefix(client) + `/records/${record.id}`,
      "PATCH",
      {
        expectedVersion: record.version,
        data: { ...input, businessStageLinks: [links[1]] },
      },
    );
    assert.equal(removed.status, 200);
    const stale = await call(
      client,
      prefix(client) + `/records/${record.id}`,
      "PATCH",
      {
        expectedVersion: removed.data.version,
        data: { ...input, businessStageLinks: links },
      },
    );
    assert.equal(stale.status, 422);
    assert.equal(stale.data.code, "INVALID_BUSINESS_STAGE");
    const cleared = await call(
      client,
      prefix(client) + `/records/${record.id}`,
      "PATCH",
      {
        expectedVersion: removed.data.version,
        data: { ...input, businessStageLinks: [] },
      },
    );
    assert.equal(cleared.status, 200);
    assert.deepEqual(cleared.data.data.businessStageLinks, []);
  }
});

test("stage mappings use only the selected workspace profile and retain tenant isolation", async () => {
  const client = await register(),
    other = await register();
  await saveProfile(other);
  const path = prefix(client) + "/records";
  const body = {
    kind: "task",
    data: { ...taskInput, businessStageLinks: links },
  };
  assert.equal((await call(null, path, "POST", body)).status, 401);
  assert.equal((await call(other, path, "POST", body)).status, 404);
  // A valid pair in another tenant must not become valid in this workspace.
  const absent = await call(client, path, "POST", body);
  assert.equal(absent.status, 422);
  assert.equal(absent.data.code, "INVALID_BUSINESS_STAGE");
  await saveProfile(client);
  const record = await create(client, "task", body.data);
  assert.equal(
    (
      await call(other, prefix(other) + `/records/${record.id}`, "PATCH", {
        expectedVersion: record.version,
        data: body.data,
      })
    ).status,
    404,
  );
  const sibling = await call(client, "/api/v1/companies", "POST", {
    name: "Second stage workspace",
    scope: "Separate work",
    goal: "Keep mappings separate",
  });
  assert.equal(sibling.status, 201);
  const siblingResult = await call(
    client,
    `/api/v1/companies/${sibling.data.id}/records`,
    "POST",
    body,
  );
  assert.equal(siblingResult.status, 422);
  assert.equal(siblingResult.data.code, "INVALID_BUSINESS_STAGE");
});
