import "dotenv/config";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import type { Server } from "node:http";
import { createApp, errorHandler } from "../server/app.ts";
import { assetsRouter } from "../server/assets.ts";
import { pool, tx, command, putRecord } from "../server/db.ts";
import { projectTenant } from "../server/projection.ts";
import { purgeExpiredAudio } from "../server/retention.ts";
import JSZip from "jszip";
let server: Server, base: string;
type Client = { cookie: string; csrf: string; user: any; company: string };
async function request(
  client: Client | null,
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(client ? { Cookie: client.cookie, "X-CSRF-Token": client.csrf } : {}),
      "Idempotency-Key": randomUUID(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    data,
    cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
async function register(): Promise<Client> {
  const email = randomUUID() + "@test.invalid";
  const result = await request(null, "/api/auth/register", "POST", {
    name: "Test Advisor",
    email,
    password: "Synthetic test password 124!",
    companyName: "Isolated API Test",
    scope: "Synthetic supplier intake",
    goal: "Verify work versioning without real customer data",
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
const prefix = (c: Client) => "/api/v1/companies/" + c.company;
async function create(c: Client, kind: string, data: any) {
  const r = await request(c, prefix(c) + "/records", "POST", { kind, data });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data;
}
async function action(c: Client, r: any, name: string, extra: any = {}) {
  return request(c, prefix(c) + "/records/" + r.id + "/actions", "POST", {
    expectedVersion: r.version,
    action: name,
    ...extra,
  });
}
async function fixture(c: Client) {
  const p = await create(c, "person", {
    name: "Synthetic Participant",
    email: randomUUID() + "@test.invalid",
    role: "Owner",
    team: "Operations",
  });
  const e = await create(c, "evidence", {
    title: "Original account",
    type: "Employee account",
    personId: p.id,
    text: "I prepare draft supplier records; a human must approve every external change.",
    locator: "Test transcript, lines 1–2",
    bucket: "org",
  });
  assert.equal((await action(c, e, "accept")).status, 200);
  const data = {
    title: "Prepare supplier draft",
    duty: "Supplier onboarding",
    ownerId: p.id,
    performerId: p.id,
    purpose: "Prepare a complete record.",
    trigger: "A packet arrives.",
    inputs: "Supplier packet",
    instructions: "Check the packet and prepare a draft.",
    output: "Draft supplier record",
    systems: ["ERP"],
    allowed: ["Read packet"],
    denied: ["Release payment"],
    humanGate: "Human approval before any external write",
    evidenceIds: [e.id],
    reviewDue: "2099-01-01",
    reason: "Test fixture",
  };
  const task = await create(c, "task", data);
  const reviewed = await action(c, task, "review");
  assert.equal(reviewed.status, 200, JSON.stringify(reviewed.data));
  return { p, e, task: reviewed.data, data };
}
async function invite(c: Client, f: any, type = "confirmation") {
  const req = await create(c, "request", {
    title: "Please review your work",
    personId: f.p.id,
    type,
    questions: ["Does this accurately describe your work?"],
    taskIds: type === "confirmation" ? [f.task.id] : [],
    dueDate: "2099-01-01",
    notice:
      "Synthetic local test. Visible only to the assigned participant and advisor.",
  });
  const issued = await request(
    c,
    prefix(c) + "/requests/" + req.id + "/issue",
    "POST",
    { expectedVersion: req.version },
  );
  assert.equal(issued.status, 200, JSON.stringify(issued.data));
  const token = issued.data.url.split("/").at(-1);
  const before = await request(null, "/api/invitations/" + token);
  assert.equal(before.status, 200);
  const enroll = await request(
    null,
    "/api/invitations/" + token + "/enroll",
    "POST",
    { password: "Synthetic participant password 123!", acknowledged: true },
  );
  assert.equal(enroll.status, 200, JSON.stringify(enroll.data));
  const participant = {
    cookie: enroll.cookie,
    csrf: enroll.data.csrf,
    user: enroll.data.user,
    company: c.company,
  };
  return { req, participant, token };
}
before(async () => {
  const app = createApp();
  app.use("/api/v1/companies/:companyId/assets", assetsRouter());
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + (server.address() as any).port;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});
test("unauthenticated reads fail closed", async () =>
  assert.equal((await request(null, "/api/v1/companies")).status, 401));
test("session cookies require CSRF and reject cross-origin writes", async () => {
  const c = await register();
  assert.equal(
    (
      await request(
        c,
        prefix(c) + "/records",
        "POST",
        { kind: "person", data: {} },
        { "X-CSRF-Token": "wrong" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        c,
        prefix(c) + "/records",
        "POST",
        { kind: "person", data: {} },
        { Origin: "https://untrusted.invalid" },
      )
    ).status,
    403,
  );
});
test("application and forced database RLS both prevent tenant leakage", async () => {
  const a = await register(),
    b = await register();
  const f = await fixture(a);
  assert.equal((await request(b, prefix(a) + "/workspace")).status, 404);
  const rows = await tx(
    b.user.tenant_id,
    async (db) =>
      (await db.query("SELECT * FROM records WHERE id=$1", [f.task.id])).rows,
  );
  assert.equal(rows.length, 0);
  const role = (
    await pool.query(
      "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
    )
  ).rows[0];
  assert.equal(role.rolsuper, false);
  assert.equal(role.rolbypassrls, false);
});
test("cross-company references are rejected even within one tenant", async () => {
  const c = await register(),
    f = await fixture(c);
  const other = (
    await request(c, "/api/v1/companies", "POST", {
      name: "Second company",
      scope: "Another scope",
      goal: "Another bounded goal",
    })
  ).data;
  const r = await request(
    { ...c, company: other.id },
    "/api/v1/companies/" + other.id + "/records",
    "POST",
    { kind: "task", data: { ...f.data } },
  );
  assert.equal(r.status, 404);
});
test("idempotent commands return one record and reject changed payloads", async () => {
  const c = await register(),
    key = randomUUID(),
    data = {
      kind: "person",
      data: {
        name: "A Person",
        email: randomUUID() + "@test.invalid",
        role: "Analyst",
        team: "Ops",
      },
    };
  const [a, b] = await Promise.all([
    request(c, prefix(c) + "/records", "POST", data, {
      "Idempotency-Key": key,
    }),
    request(c, prefix(c) + "/records", "POST", data, {
      "Idempotency-Key": key,
    }),
  ]);
  assert.equal(a.status, 201);
  assert.equal(a.data.id, b.data.id);
  assert.equal(
    (
      await request(
        c,
        prefix(c) + "/records",
        "POST",
        { ...data, data: { ...data.data, name: "Changed" } },
        { "Idempotency-Key": key },
      )
    ).status,
    409,
  );
});
test("a failed command rolls back the record, version, audit, and outbox", async () => {
  const c = await register();
  await assert.rejects(
    command(c.user, randomUUID(), { test: "rollback" }, async (db) => {
      await putRecord(
        db,
        c.user,
        c.company,
        "person",
        "Never committed",
        { name: "Never committed" },
        "reported",
      );
      throw new Error("Expected failure");
    }),
  );
  const counts = await tx(
    c.user.tenant_id,
    async (db) =>
      (
        await db.query(
          "SELECT (SELECT count(*) FROM records) records,(SELECT count(*) FROM record_versions) versions,(SELECT count(*) FROM outbox) outbox,(SELECT count(*) FROM audit_events) audit",
        )
      ).rows[0],
  );
  for (const value of Object.values(counts)) assert.equal(value, "0");
});
test("concurrent stale edits cannot overwrite a newer task version", async () => {
  const c = await register(),
    f = await fixture(c);
  const body = {
    expectedVersion: f.task.version,
    data: { ...f.data, title: "Updated task", reason: "Material edit" },
  };
  const [a, b] = await Promise.all([
    request(c, prefix(c) + "/records/" + f.task.id, "PATCH", body),
    request(c, prefix(c) + "/records/" + f.task.id, "PATCH", body),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
});
test("participant enrollment is one-use and participant projection excludes raw peer evidence", async () => {
  const c = await register(),
    f = await fixture(c),
    i = await invite(c, f);
  assert.equal(
    (await request(null, "/api/invitations/" + i.token)).status,
    410,
  );
  const view = await request(i.participant, "/api/v1/participant/requests");
  assert.equal(view.status, 200);
  assert.equal(view.data.requests.length, 1);
  assert.equal(
    view.data.requests[0].data.taskSnapshots[0].data.evidenceIds,
    undefined,
  );
  assert.equal(
    (await request(i.participant, prefix(c) + "/workspace")).status,
    403,
  );
  assert.equal(
    (
      await request(i.participant, prefix(c) + "/records", "POST", {
        kind: "person",
        data: {},
      })
    ).status,
    403,
  );
});
test("late participant confirmation is historical and cannot confirm newer work", async () => {
  const c = await register(),
    f = await fixture(c),
    i = await invite(c, f);
  const edit = await request(c, prefix(c) + "/records/" + f.task.id, "PATCH", {
    expectedVersion: f.task.version,
    data: {
      ...f.data,
      instructions: "A materially changed instruction.",
      reason: "Work changed after the request",
    },
  });
  assert.equal(edit.status, 200);
  const submit = await request(
    i.participant,
    "/api/v1/participant/requests/" + i.req.id + "/submit",
    "POST",
    {
      expectedVersion: i.req.version,
      acknowledged: true,
      decisions: { [f.task.id]: "correct" },
    },
  );
  assert.equal(submit.status, 200);
  const workspace = (await request(c, prefix(c) + "/workspace")).data;
  const response = workspace.records.find(
    (r: any) => r.id === submit.data.responseId,
  );
  assert.equal((await action(c, response, "accept")).status, 200);
  const final = (await request(c, prefix(c) + "/workspace")).data.records.find(
    (r: any) => r.id === f.task.id,
  );
  assert.equal(final.state, "proposed");
  assert.equal(final.confirmations[0].version, f.task.version);
  assert.equal(final.confirmations[0].accepted, true);
});
test("current participant confirmation, advisor review, and frozen export work end to end", async () => {
  const c = await register(),
    f = await fixture(c),
    i = await invite(c, f);
  const submit = await request(
    i.participant,
    "/api/v1/participant/requests/" + i.req.id + "/submit",
    "POST",
    {
      expectedVersion: i.req.version,
      acknowledged: true,
      decisions: { [f.task.id]: "correct" },
    },
  );
  assert.equal(submit.status, 200);
  let w = (await request(c, prefix(c) + "/workspace")).data;
  assert.equal(
    w.records.find((r: any) => r.id === f.task.id).state,
    "awaiting_confirmation",
  );
  const response = w.records.find((r: any) => r.id === submit.data.responseId);
  await action(c, response, "accept");
  w = (await request(c, prefix(c) + "/workspace")).data;
  assert.equal(
    w.records.find((r: any) => r.id === f.task.id).state,
    "confirmed",
  );
  const exp = await request(c, prefix(c) + "/exports", "POST", {
    kind: "confirmed",
  });
  assert.equal(exp.status, 201);
  assert.equal(exp.data.data.packet.tasks.length, 1);
  assert.equal(exp.data.data.packet.authorization, "none");
  const zip = await request(
    c,
    prefix(c) + "/exports/" + exp.data.id + "/download",
  );
  assert.equal(zip.status, 200);
  assert.equal(zip.data.subarray(0, 2).toString(), "PK");
});
test("advisor cannot fabricate participant confirmation through a persona or payload", async () => {
  const c = await register(),
    f = await fixture(c);
  assert.equal(
    (await action(c, f.task, "confirm", { personId: f.p.id })).status,
    422,
  );
  const i = await invite(c, f);
  assert.equal(
    (
      await request(
        c,
        "/api/v1/participant/requests/" + i.req.id + "/submit",
        "POST",
        {
          expectedVersion: i.req.version,
          acknowledged: true,
          decisions: { [f.task.id]: "correct" },
        },
      )
    ).status,
    403,
  );
});
test("withdrawing a request revokes invitations and blocks new replies", async () => {
  const c = await register(),
    f = await fixture(c),
    i = await invite(c, f);
  assert.equal((await action(c, i.req, "withdraw")).status, 200);
  const submit = await request(
    i.participant,
    "/api/v1/participant/requests/" + i.req.id + "/submit",
    "POST",
    {
      expectedVersion: i.req.version,
      acknowledged: true,
      decisions: { [f.task.id]: "correct" },
    },
  );
  assert.equal(submit.status, 409);
});
test("retracting a source flags dependent work and invalidates old export download", async () => {
  const c = await register(),
    f = await fixture(c);
  const exp = (
    await request(c, prefix(c) + "/exports", "POST", { kind: "workspace" })
  ).data;
  assert.equal(
    (await action(c, f.e, "retract", { note: "Test source was withdrawn." }))
      .status,
    200,
  );
  const w = (await request(c, prefix(c) + "/workspace")).data;
  assert.equal(w.records.find((r: any) => r.id === f.task.id).state, "stale");
  assert.equal(
    (await request(c, prefix(c) + "/exports/" + exp.id + "/download")).status,
    409,
  );
});
test("projection replay is idempotent and contains no raw transcript text", async () => {
  const c = await register();
  await fixture(c);
  await projectTenant(c.user.tenant_id);
  const before = await tx(
    c.user.tenant_id,
    async (db) =>
      (await db.query("SELECT count(*) FROM projection_nodes")).rows[0].count,
  );
  await tx(c.user.tenant_id, async (db) => {
    await db.query("UPDATE outbox SET processed_at=NULL");
  });
  await projectTenant(c.user.tenant_id);
  const rows = await tx(
    c.user.tenant_id,
    async (db) => (await db.query("SELECT * FROM projection_nodes")).rows,
  );
  assert.equal(String(rows.length), before);
  assert.ok(rows.every((r) => !("data" in r) && !("text" in r)));
});
test("audio uploads verify chunks, reject corruption, resume, and deny peer access", async () => {
  const c = await register(),
    f = await fixture(c),
    i = await invite(c, f, "work");
  const bytes = Buffer.alloc(600000, 7),
    sum = (b: Buffer) => createHash("sha256").update(b).digest("hex");
  const asset = (
    await request(i.participant, prefix(c) + "/assets", "POST", {
      mime: "audio/webm",
      size: bytes.length,
      requestId: i.req.id,
    })
  ).data;
  assert.ok(asset.id);
  const path = prefix(c) + "/assets/" + asset.id;
  assert.equal(
    (
      await request(i.participant, path + "/chunks/0", "PUT", {
        base64: bytes.subarray(0, 524288).toString("base64"),
        checksum: "0".repeat(64),
      })
    ).status,
    422,
  );
  const first = {
    base64: bytes.subarray(0, 524288).toString("base64"),
    checksum: sum(bytes.subarray(0, 524288)),
  };
  assert.equal(
    (await request(i.participant, path + "/chunks/0", "PUT", first)).status,
    200,
  );
  assert.equal(
    (await request(i.participant, path + "/chunks/0", "PUT", first)).status,
    200,
  );
  assert.equal(
    (
      await request(i.participant, path + "/finalize", "POST", {
        checksum: sum(bytes),
      })
    ).status,
    409,
  );
  const status = await request(i.participant, path + "/status");
  assert.equal(status.data.chunks.length, 1);
  assert.equal(
    (
      await request(i.participant, path + "/chunks/1", "PUT", {
        base64: bytes.subarray(524288).toString("base64"),
        checksum: sum(bytes.subarray(524288)),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(i.participant, path + "/finalize", "POST", {
        checksum: sum(bytes),
      })
    ).status,
    200,
  );
  assert.equal(
    (await request(i.participant, path + "/chunks/0", "PUT", first)).status,
    409,
  );
  const other = await register();
  assert.equal((await request(other, path + "/content")).status, 404);
  const downloaded = await request(i.participant, path + "/content");
  assert.equal(sum(downloaded.data), sum(bytes));
});
test("frameworks preserve dependencies and refuse missing input completion", async () => {
  const c = await register(),
    f = await fixture(c),
    w = (await request(c, prefix(c) + "/workspace")).data;
  assert.equal(w.registry.frameworks.length, 16);
  const r = await request(c, prefix(c) + "/frameworks/toc/manual", "POST", {
    analysis:
      "This is only a draft analysis and has no completed upstream inputs.",
    evidenceIds: [f.e.id],
    expectedRevision: w.company.revision,
  });
  assert.equal(r.status, 422);
  assert.equal(r.data.code, "UPSTREAM_REQUIRED");
});
test("runtime preflight remains blocked when customer services are unconfigured", async () => {
  const c = await register();
  const r = await request(c, prefix(c) + "/runtime/preflight", "POST", {
    approve: true,
  });
  assert.equal(r.status, 503);
  assert.equal(r.data.decision, "blocked");
});
test("expired audio is inaccessible before purge and its chunks are removed", async () => {
  const c = await register();
  const asset = (
    await request(c, prefix(c) + "/assets", "POST", {
      mime: "audio/webm",
      size: 3,
    })
  ).data;
  const bytes = Buffer.from("abc"),
    sum = createHash("sha256").update(bytes).digest("hex");
  const path = prefix(c) + "/assets/" + asset.id;
  await request(c, path + "/chunks/0", "PUT", {
    base64: bytes.toString("base64"),
    checksum: sum,
  });
  await request(c, path + "/finalize", "POST", { checksum: sum });
  await tx(c.user.tenant_id, async (db) => {
    await db.query(
      "UPDATE assets SET created_at=now()-interval '31 days' WHERE id=$1",
      [asset.id],
    );
  });
  assert.equal((await request(c, path + "/content")).status, 410);
  assert.equal(await purgeExpiredAudio(c.user.tenant_id), 1);
  const count = await tx(
    c.user.tenant_id,
    async (db) =>
      (
        await db.query("SELECT count(*) FROM asset_chunks WHERE asset_id=$1", [
          asset.id,
        ])
      ).rows[0].count,
  );
  assert.equal(count, "0");
});
test("export checksums match actual archive file bytes and omit original source text", async () => {
  const c = await register();
  await fixture(c);
  const exp = (
    await request(c, prefix(c) + "/exports", "POST", { kind: "workspace" })
  ).data;
  const zipResult = await request(
    c,
    prefix(c) + "/exports/" + exp.id + "/download",
  );
  const zip = await JSZip.loadAsync(zipResult.data);
  const checks = JSON.parse(await zip.file("checksums.json")!.async("string"));
  for (const [name, expected] of Object.entries(checks.files)) {
    const bytes = await zip.file(name)!.async("nodebuffer");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
  }
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
  assert.ok(manifest.evidence.every((e: any) => e.text === undefined));
});
