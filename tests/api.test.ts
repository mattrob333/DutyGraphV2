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
import { normalizeResearch } from "../server/research.ts";
let researchCalls = 0,
  aiCalls = 0;
const emailMessages: any[] = [];
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
test("provider keys save without passwords and remain encrypted, session-gated and tenant-scoped", async () => {
  const c = await register(),
    other = await register(),
    key = "synthetic-provider-key-not-a-real-secret";
  const path = prefix(c) + "/providers/exa",
    body = { key, enabled: true };
  assert.equal((await request(null, path, "PUT", body)).status, 401);
  assert.equal(
    (await request(c, path, "PUT", body, { "X-CSRF-Token": "wrong" })).status,
    403,
  );
  assert.equal((await request(c, path, "PUT", body)).status, 200);
  const status = await request(c, prefix(c) + "/providers");
  assert.equal(
    status.data.providers.find((p: any) => p.provider === "exa").configured,
    true,
  );
  assert.ok(!JSON.stringify(status.data).includes(key));
  const rows = await tx(
    c.user.tenant_id,
    async (db) =>
      (await db.query("SELECT encrypted_key FROM provider_settings")).rows,
  );
  assert.equal(rows.length, 1);
  assert.ok(!rows[0].encrypted_key.includes(key));
  assert.equal(
    await tx(
      other.user.tenant_id,
      async (db) =>
        (await db.query("SELECT * FROM provider_settings")).rowCount,
    ),
    0,
  );
  assert.equal((await request(other, path, "PUT", body)).status, 404);
  await pool.query(
    "UPDATE users SET role='participant',company_id=$2 WHERE id=$1",
    [other.user.id, other.company],
  );
  assert.equal(
    (await request(other, prefix(other) + "/providers")).status,
    403,
  );
  assert.equal((await request(c, path, "DELETE", {})).status, 200);
  assert.equal(
    (await request(c, prefix(c) + "/providers")).data.providers.find(
      (p: any) => p.provider === "exa",
    ).configured,
    false,
  );
});
async function create(c: Client, kind: string, data: any) {
  const r = await request(c, prefix(c) + "/records", "POST", { kind, data });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data;
}
test("an unresolved task saves as proposed but cannot advance to confirmation", async () => {
  const c = await register(),
    f = await fixture(c);
  const incomplete = await create(c, "task", {
    ...f.data,
    title: "Unresolved draft",
    ownerId: "",
    performerId: "",
    evidenceIds: [],
  });
  assert.equal(incomplete.state, "proposed");
  const review = await action(c, incomplete, "review");
  assert.equal(review.status, 422);
  assert.equal(review.data.code, "WORK_INCOMPLETE");
});
test("duty review is independent and a changed task invalidates its pinned work", async () => {
  const c = await register(),
    f = await fixture(c);
  const duty = await create(c, "duty", {
    title: "Supplier intake duty",
    ownerId: f.p.id,
    purpose: "Keep intake complete",
    scope: "Draft preparation",
    taskIds: [f.task.id],
    evidenceIds: [f.e.id],
    reviewDue: "2099-01-01",
    reason: "Record standing accountability",
  });
  assert.equal(
    (await action(c, duty, "review", { note: "Reviewed scope and source" }))
      .status,
    200,
  );
  let workspace = (await request(c, prefix(c) + "/workspace")).data;
  assert.equal(
    workspace.records.find((r: any) => r.id === duty.id).state,
    "reviewed",
  );
  assert.notEqual(
    workspace.records.find((r: any) => r.id === f.task.id).state,
    "confirmed",
  );
  assert.equal(
    (
      await request(c, prefix(c) + "/records/" + f.task.id, "PATCH", {
        expectedVersion: f.task.version,
        data: { ...f.data, output: "New required output" },
      })
    ).status,
    200,
  );
  workspace = (await request(c, prefix(c) + "/workspace")).data;
  assert.equal(
    workspace.records.find((r: any) => r.id === duty.id).state,
    "stale",
  );
  assert.equal(
    (await action(c, duty, "review", { note: "Attempt old review" })).status,
    409,
  );
});
test("handoff contracts pin both tasks and reject foreign-company references", async () => {
  const c = await register(),
    f = await fixture(c),
    target = await create(c, "task", {
      ...f.data,
      title: "Receive complete packet",
    });
  const data = {
    title: "Packet to review",
    sourceTaskId: f.task.id,
    targetTaskId: target.id,
    condition: "Packet complete",
    outputMapping: "Draft with required fields",
    requiredInput: "Complete packet",
    acceptanceCheck: "Receiver checks required fields",
    exceptionOwnerId: f.p.id,
    timeoutHours: 24,
    maxRetries: 1,
    failureAction: "Escalate to owner",
    evidenceIds: [f.e.id],
    reason: "Make boundary explicit",
  };
  const handoff = await create(c, "handoff", data);
  assert.equal(handoff.data.taskBindings.length, 2);
  assert.equal(
    (
      await action(c, handoff, "review", {
        note: "Reviewed the input and output contract",
      })
    ).status,
    200,
  );
  const foreign = await register(),
    foreignFixture = await fixture(foreign);
  const denied = await request(c, prefix(c) + "/records", "POST", {
    kind: "handoff",
    data: { ...data, targetTaskId: foreignFixture.task.id },
  });
  assert.equal(denied.status, 404);
});
test("outcome reviews freeze predictions, require measurements and reopen falsified candidates", async () => {
  const c = await register(),
    f = await fixture(c);
  const candidate = await create(c, "candidate", {
    title: "Intake boundary hypothesis",
    flow: "Supplier intake",
    pressure: "Unmeasured waiting",
    alternative: "Missing packet inputs",
    counterfactual: "Approval could remain limiting",
    discriminator: "Measure each queue",
    evidenceIds: [f.e.id],
    disconfirmingEvidenceIds: [],
    ownerId: f.p.id,
    throughputUnit: "Approved suppliers per week",
  });
  const metric = await create(c, "metric", {
    title: "Waiting hours",
    question: "Does waiting fall?",
    formula: "Elapsed hours from complete receipt to review",
    unit: "hours",
    population: "Complete packets",
    source: "Timestamp log",
    ownerId: f.p.id,
    baseline: null,
    target: null,
    missingReason: "Collect a baseline",
    window: "Two weeks",
    guardrail: "No increase in rejected packets",
  });
  const intervention = await create(c, "intervention", {
    title: "Clarify receiver check",
    candidateId: candidate.id,
    ownerId: f.p.id,
    metricId: metric.id,
    change: "Add a receiving checklist",
    prediction: "Waiting falls after complete packets arrive",
    stopConditions: "Stop if controls weaken",
    reviewDate: "2099-01-01",
  });
  const data = {
    title: "First outcome review",
    interventionId: intervention.id,
    ownerId: f.p.id,
    result: "supported",
    observationWindow: "First two weeks",
    coverage: "All five complete packets",
    confounders: "Small sample and changing demand",
    interpretation: "Evaluate the predicted reduction",
    nextAction: "Collect a longer series",
    evidenceIds: [f.e.id],
    reason: "Compare observed result",
  };
  const noMeasurement = await request(c, prefix(c) + "/records", "POST", {
    kind: "outcome",
    data,
  });
  assert.equal(noMeasurement.status, 422);
  assert.equal(noMeasurement.data.code, "MEASUREMENTS_REQUIRED");
  assert.equal(
    (
      await action(c, metric, "observe", {
        value: 42,
        observedAt: new Date().toISOString(),
        note: "Synthetic timestamp log, row 1",
      })
    ).status,
    200,
  );
  const outcome = await create(c, "outcome", { ...data, result: "falsified" });
  assert.equal(
    outcome.data.predictionSnapshot.prediction,
    intervention.data.prediction,
  );
  assert.equal(outcome.data.measurementSnapshot.observations[0].value, 42);
  assert.equal(
    (
      await action(c, outcome, "review", {
        note: "The measured observation contradicts the original prediction",
      })
    ).status,
    200,
  );
  const workspace = (await request(c, prefix(c) + "/workspace")).data;
  assert.equal(
    workspace.records.find((r: any) => r.id === candidate.id).state,
    "review_required",
  );
  assert.equal(
    workspace.records.find((r: any) => r.id === intervention.id).data
      .prediction,
    intervention.data.prediction,
  );
});
async function action(c: Client, r: any, name: string, extra: any = {}) {
  return request(c, prefix(c) + "/records/" + r.id + "/actions", "POST", {
    expectedVersion: r.version,
    action: name,
    ...extra,
  });
}
test("graph queries enforce bounded filters and rebuild without replaying source commands", async () => {
  const c = await register(),
    f = await fixture(c),
    other = await register();
  const graph = await request(
    c,
    prefix(c) + `/graph?focus=${f.p.id}&depth=1&limit=2`,
  );
  assert.equal(graph.status, 200, JSON.stringify(graph.data));
  assert.ok(graph.data.nodes.length <= 2);
  assert.ok(graph.data.nodes.some((n: any) => n.id === f.p.id));
  assert.equal((await request(other, prefix(c) + "/graph")).status, 404);
  assert.equal((await request(c, prefix(c) + "/graph?depth=5")).status, 422);
  assert.equal(
    (await request(c, prefix(c) + "/graph?cypher=MATCH")).status,
    422,
  );
  const revision = (await request(c, prefix(c) + "/workspace")).data.company
    .revision;
  const before = await tx(
    c.user.tenant_id,
    async (db) =>
      (
        await db.query(
          "SELECT count(*)::int n FROM outbox WHERE company_id=$1",
          [c.company],
        )
      ).rows[0].n,
  );
  const rebuilt = await request(c, prefix(c) + "/graph/rebuild", "POST", {
    expectedRevision: revision,
  });
  assert.equal(rebuilt.status, 200);
  assert.equal(rebuilt.data.sideEffectsReplayed, false);
  const after = await tx(
    c.user.tenant_id,
    async (db) =>
      (
        await db.query(
          "SELECT count(*)::int n FROM outbox WHERE company_id=$1",
          [c.company],
        )
      ).rows[0].n,
  );
  assert.equal(before, after);
});
test("case deadlines reject completion, enforce retry ceilings and permit explicit closure", async () => {
  const c = await register(),
    f = await fixture(c);
  const flow = await create(c, "workflow", {
    title: "One human checkpoint",
    purpose: "Review a single packet",
    ownerId: f.p.id,
    taskIds: [f.task.id],
    handoffIds: [],
    joinPolicy: "all",
    timeoutHours: 1,
    maxAttempts: 1,
    reason: "Bound the human step",
  });
  assert.equal(
    (
      await action(c, flow, "review", {
        note: "Current task and owner reviewed",
      })
    ).status,
    200,
  );
  const started = (
    await request(c, prefix(c) + `/workflows/${flow.id}/cases`, "POST", {
      expectedVersion: flow.version,
      title: "Expired checkpoint test",
      inputReference: "Synthetic packet reference",
    })
  ).data;
  const expired = await tx(c.user.tenant_id, (db) =>
    putRecord(
      db,
      c.user,
      c.company,
      "case",
      started.title,
      {
        ...started.data,
        steps: started.data.steps.map((s: any) => ({
          ...s,
          dueAt: "2000-01-01T00:00:00Z",
        })),
      },
      "in_progress",
      started,
      "Synthetic deadline fixture",
    ),
  );
  const path = prefix(c) + `/workflows/cases/${started.id}/actions`,
    body = {
      expectedVersion: expired.version,
      stepId: f.task.id,
      note: "Deadline requires explicit review",
    };
  const complete = await request(c, path, "POST", {
    ...body,
    action: "complete",
  });
  assert.equal(complete.status, 409);
  assert.equal(complete.data.code, "STEP_TIMEOUT");
  const retry = await request(c, path, "POST", { ...body, action: "retry" });
  assert.equal(retry.status, 409);
  assert.equal(retry.data.code, "RETRY_LIMIT");
  const closed = await request(c, path, "POST", { ...body, action: "cancel" });
  assert.equal(closed.status, 200);
  assert.equal(closed.data.state, "cancelled");
});
test("a durable workflow case gates steps, stores observations and rejects duplicate completion", async () => {
  const c = await register(),
    f = await fixture(c);
  let target = await create(c, "task", {
    ...f.data,
    title: "Check the prepared draft",
  });
  target = (await action(c, target, "review")).data;
  const h = await create(c, "handoff", {
    title: "Draft to receiving check",
    sourceTaskId: f.task.id,
    targetTaskId: target.id,
    condition: "Draft has all fields",
    outputMapping: "Prepared draft",
    requiredInput: "Prepared draft",
    acceptanceCheck: "Receiver checks each field",
    exceptionOwnerId: f.p.id,
    timeoutHours: 24,
    maxRetries: 1,
    failureAction: "Escalate",
    evidenceIds: [f.e.id],
    reason: "Define receiving boundary",
  });
  assert.equal(
    (await action(c, h, "review", { note: "Reviewed receiving check" })).status,
    200,
  );
  const flow = await create(c, "workflow", {
    title: "Supplier draft workflow",
    purpose: "Track a manual prepared draft",
    ownerId: f.p.id,
    taskIds: [f.task.id, target.id],
    handoffIds: [h.id],
    joinPolicy: "all",
    timeoutHours: 24,
    maxAttempts: 2,
    reason: "Define a reviewed manual case",
  });
  const start = () =>
    request(c, prefix(c) + `/workflows/${flow.id}/cases`, "POST", {
      expectedVersion: flow.version,
      title: "Synthetic packet 001",
      inputReference: "Synthetic packet source 001",
    });
  assert.equal((await start()).status, 409);
  assert.equal(
    (
      await action(c, flow, "review", {
        note: "Reviewed the current steps and handoff",
      })
    ).status,
    200,
  );
  const started = await start();
  assert.equal(started.status, 201, JSON.stringify(started.data));
  const run = started.data;
  const route = prefix(c) + `/workflows/cases/${run.id}/actions`;
  assert.equal(
    (
      await request(c, route, "POST", {
        expectedVersion: run.version,
        stepId: target.id,
        action: "complete",
        note: "Trying out of order",
      })
    ).status,
    409,
  );
  const body = {
    expectedVersion: run.version,
    stepId: f.task.id,
    action: "complete",
    note: "Human completed draft, receipt synthetic-001",
    routeIds: [h.id],
  };
  const key = randomUUID(),
    completed = await request(c, route, "POST", body, {
      "Idempotency-Key": key,
    });
  assert.equal(completed.status, 200, JSON.stringify(completed.data));
  const duplicate = await request(c, route, "POST", body, {
    "Idempotency-Key": key,
  });
  assert.equal(duplicate.data.version, completed.data.version);
  const restored = (
    await request(c, prefix(c) + "/workspace")
  ).data.records.find((r: any) => r.id === run.id);
  assert.equal(restored.data.steps[1].state, "ready");
  assert.equal(restored.data.events.length, 1);
  assert.equal((await request(c, route, "POST", body)).status, 409);
  const finished = await request(c, route, "POST", {
    expectedVersion: restored.version,
    stepId: target.id,
    action: "complete",
    note: "Human receiving check passed, receipt synthetic-002",
  });
  assert.equal(finished.status, 200);
  assert.equal(finished.data.state, "complete");
  assert.equal(finished.data.data.executionMode, "human_observation_only");
});
test("authentication throttle returns a structured error without weakening production defaults", async () => {
  const app = createApp({ authRequestsPerWindow: 2 });
  app.use(errorHandler);
  const limited = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => limited.once("listening", resolve));
  try {
    const url = `http://127.0.0.1:${(limited.address() as any).port}/api/auth/login`;
    const login = () =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "missing@test.invalid",
          password: "Not a valid password",
        }),
      });
    assert.equal((await login()).status, 401);
    assert.equal((await login()).status, 401);
    const denied = await login();
    assert.equal(denied.status, 429);
    assert.equal((await denied.json()).code, "RATE_LIMITED");
  } finally {
    await new Promise<void>((resolve, reject) =>
      limited.close((e) => (e ? reject(e) : resolve())),
    );
  }
});
test("client report approval binds audience and content; ZIP excludes private source text", async () => {
  const c = await register(),
    f = await fixture(c);
  const workspace = (await request(c, prefix(c) + "/workspace")).data;
  const report = await request(c, prefix(c) + "/reports", "POST", {
    title: "Client executive review",
    kind: "executive",
    audience: ["Named executive sponsor"],
    purpose: "Review the agreed supplier scope",
    summary:
      "A synthetic review of the current draft work record. Further confirmation is required.",
    decisions: "Assign a receiver for the complete packet.",
    nextSteps: "Named owner reviews the task this week.",
    limitations: "One synthetic source, no measured impact or authority grant.",
    recordIds: [f.task.id],
    expectedRevision: workspace.company.revision,
  });
  assert.equal(report.status, 201, JSON.stringify(report.data));
  const path = prefix(c) + "/reports/" + report.data.id;
  assert.equal((await request(c, path + "/download")).status, 409);
  const forged = await request(c, path + "/review", "POST", {
    expectedVersion: report.data.version,
    contentHash: "wrong",
    decision: "approve",
    note: "Reviewed exact audience",
  });
  assert.equal(forged.status, 409);
  assert.equal(
    (
      await request(c, path + "/review", "POST", {
        expectedVersion: report.data.version,
        contentHash: report.data.hash,
        decision: "approve",
        note: "Reviewed exact audience and the printable client preview",
      })
    ).status,
    200,
  );
  const downloaded = await request(c, path + "/download");
  assert.equal(downloaded.status, 200, JSON.stringify(downloaded.data));
  const zip = await JSZip.loadAsync(downloaded.data);
  assert.ok(zip.file("client-report.html"));
  const json = await zip.file("report.json")!.async("string");
  assert.ok(!json.includes(f.e.data.text));
  assert.ok(!json.includes(f.p.data.email));
  assert.ok(json.includes("Named executive sponsor"));
  const checks = JSON.parse(await zip.file("checksums.json")!.async("string"));
  for (const [name, digest] of Object.entries(checks.files))
    assert.equal(
      createHash("sha256")
        .update(await zip.file(name)!.async("nodebuffer"))
        .digest("hex"),
      digest,
    );
  assert.equal(
    (
      await request(c, path + "/review", "POST", {
        expectedVersion: report.data.version,
        contentHash: report.data.hash,
        decision: "withdraw",
        note: "Audience no longer needs this report",
      })
    ).status,
    200,
  );
  assert.equal((await request(c, path + "/download")).status, 409);
});
test("a report cannot export raw evidence or survive selected-source retraction", async () => {
  const c = await register(),
    f = await fixture(c);
  const build = async (recordIds: string[]) =>
    request(c, prefix(c) + "/reports", "POST", {
      title: "Evidence scope review",
      kind: "audit",
      audience: ["Client review group"],
      purpose: "Review a selected task",
      summary:
        "The selected task is a proposal with one accepted supporting source.",
      decisions: "",
      nextSteps: "Confirm the current task with its owner.",
      limitations: "No external activity logs collected.",
      recordIds,
      expectedRevision: (await request(c, prefix(c) + "/workspace")).data
        .company.revision,
    });
  assert.equal((await build([f.e.id])).status, 422);
  const report = (await build([f.task.id])).data;
  const path = prefix(c) + "/reports/" + report.id;
  const other = await register();
  assert.equal((await request(other, path + "/preview")).status, 404);
  assert.equal(
    (
      await action(c, f.e, "retract", {
        note: "The source is no longer reliable",
      })
    ).status,
    200,
  );
  const approval = await request(c, path + "/review", "POST", {
    expectedVersion: report.version,
    contentHash: report.hash,
    decision: "approve",
    note: "Attempt to publish old sources",
  });
  assert.equal(approval.status, 409);
  assert.equal(approval.data.code, "REPORT_STALE");
});
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
  const app = createApp({
    authRequestsPerWindow: 1000,
    hostedRouting: true,
    emailProvider: async (message, key, id) => {
      emailMessages.push({ message, id });
      if (message.subject.includes("UnknownEmail"))
        throw new Error("private diagnostic");
      return { id: "synthetic-resend-id" };
    },
    aiProvider: async (input) => {
      aiCalls++;
      return {
        draft: {
          summary: "Synthetic draft",
          claims: [
            {
              text: "Source suggests a preparation task.",
              basis: "Inferred",
              sourceIds: [input.sources[0].id],
            },
          ],
          questions: ["Who approves the supplier?"],
          tasks: [],
          hypotheses: [],
        },
        responseId: "synthetic-openai-id",
        usage: { input_tokens: 10, output_tokens: 10 },
      };
    },
    researchProvider: async (query) => {
      researchCalls++;
      if (query.startsWith("FailureTest"))
        throw new Error("synthetic private provider diagnostic");
      return normalizeResearch({
        requestId: "synthetic-provider-request",
        results: [
          {
            title: "Example public company",
            url: "https://example.com/about",
            text: "A synthetic public statement about products. It does not establish internal ownership.",
          },
        ],
      });
    },
  });
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

test("research commands reserve before provider calls, replay safely and import only unreviewed evidence", async () => {
  const c = await register(),
    other = await register(),
    start = researchCalls,
    key = randomUUID();
  const data = {
    publicName: "Example Public Company",
    website: "https://example.com",
    acknowledgePublicQuery: true,
  };
  const first = await request(c, prefix(c) + "/research", "POST", data, {
    "Idempotency-Key": key,
  });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.equal(first.data.state, "complete");
  const replay = await request(c, prefix(c) + "/research", "POST", data, {
    "Idempotency-Key": key,
  });
  assert.equal(replay.data.id, first.data.id);
  assert.equal(researchCalls, start + 1);
  assert.equal(
    (
      await request(
        c,
        prefix(c) + "/research",
        "POST",
        { ...data, publicName: "Changed" },
        { "Idempotency-Key": key },
      )
    ).status,
    409,
  );
  const route = prefix(c) + "/research/" + first.data.id + "/sources/0/import";
  assert.equal((await request(other, route, "POST", {})).status, 404);
  const imported = await request(c, route, "POST", {}),
    again = await request(c, route, "POST", {});
  assert.equal(imported.status, 200, JSON.stringify(imported.data));
  assert.equal(imported.data.id, again.data.id);
  assert.equal(imported.data.state, "pending_review");
  assert.equal(imported.data.data.type, "Public research");
  assert.equal(imported.data.data.originId, "https://example.com/about");
  const foreign = await tx(other.user.tenant_id, (db) =>
    db.query("SELECT id FROM research_runs WHERE id=$1", [first.data.id]),
  );
  assert.equal(foreign.rowCount, 0);
  const f = await fixture(c),
    enrolled = await invite(c, f);
  assert.equal(
    (await request(enrolled.participant, prefix(c) + "/research")).status,
    403,
  );
});
test("failed research never auto-retries and persistent account budgets cap new requests", async () => {
  const c = await register(),
    key = randomUUID(),
    data = {
      publicName: "FailureTest Company",
      website: "",
      acknowledgePublicQuery: true,
    },
    start = researchCalls;
  const failed = await request(c, prefix(c) + "/research", "POST", data, {
    "Idempotency-Key": key,
  });
  assert.equal(failed.data.state, "failed");
  assert.ok(
    !JSON.stringify(failed.data).includes("private provider diagnostic"),
  );
  await request(c, prefix(c) + "/research", "POST", data, {
    "Idempotency-Key": key,
  });
  assert.equal(researchCalls, start + 1);
  for (let i = 1; i < 10; i++)
    assert.equal(
      (
        await request(c, prefix(c) + "/research", "POST", {
          ...data,
          publicName: "Budget test " + i,
        })
      ).status,
      200,
    );
  assert.equal(
    (
      await request(c, prefix(c) + "/research", "POST", {
        ...data,
        publicName: "Over budget",
      })
    ).status,
    429,
  );
  assert.equal((await request(c, prefix(c) + "/research")).data.used, 10);
  assert.equal(researchCalls, start + 10);
});

async function saveProvider(c: Client, provider: string) {
  return request(c, prefix(c) + "/providers/" + provider, "PUT", {
    key: "synthetic-key-never-a-live-credential",
    enabled: true,
    ...(provider === "resend" ? { from: "advisor@test.invalid" } : {}),
  });
}
test("private sample is isolated, repeatable and does not send email", async () => {
  const a = await register(),
    b = await register(),
    before = emailMessages.length;
  const first = await request(a, "/api/v1/sample-company", "POST", {}),
    again = await request(a, "/api/v1/sample-company", "POST", {});
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.equal(first.data.id, again.data.id);
  assert.equal(
    (await request(b, "/api/v1/companies/" + first.data.id + "/workspace"))
      .status,
    404,
  );
  const workspace = await request(
    a,
    "/api/v1/companies/" + first.data.id + "/workspace",
  );
  assert.equal(workspace.status, 200);
  assert.ok(workspace.data.records.length >= 25);
  const flows = workspace.data.records.filter(
    (r: any) => r.kind === "workflow",
  );
  assert.equal(flows.length, 2);
  assert.equal(
    workspace.data.records.filter((r: any) => r.kind === "handoff").length,
    16,
  );
  assert.ok(workspace.data.records.some((r: any) => r.kind === "duty"));
  const examples = workspace.data.records.filter(
    (r: any) =>
      r.kind === "case" && r.data.executionMode === "illustrative_snapshot",
  );
  assert.equal(examples.length, 2);
  assert.ok(examples.every((r: any) => r.state === "illustrative"));
  const forbidden = await request(
    a,
    `/api/v1/companies/${first.data.id}/workflows/cases/${examples[0].id}/actions`,
    "POST",
    {
      expectedVersion: examples[0].version,
      action: "cancel",
      note: "Do not mutate an illustrative case.",
    },
  );
  assert.equal(forbidden.status, 409);
  const snapshots = workspace.data.records.map((r: any) => [
    r.id,
    r.version,
    r.hash,
  ]);
  await request(a, "/api/v1/sample-company", "POST", {});
  const reopened = await request(
    a,
    "/api/v1/companies/" + first.data.id + "/workspace",
  );
  assert.deepEqual(
    reopened.data.records.map((r: any) => [r.id, r.version, r.hash]),
    snapshots,
  );
  const flow = flows[0];
  const changed = Object.fromEntries(
    [
      "title",
      "purpose",
      "ownerId",
      "taskIds",
      "handoffIds",
      "joinPolicy",
      "timeoutHours",
      "maxAttempts",
      "reason",
    ].map((key) => [key, flow.data[key]]),
  );
  changed.title = "My customized sample workflow";
  const edited = await request(
    a,
    `/api/v1/companies/${first.data.id}/records/${flow.id}`,
    "PATCH",
    { expectedVersion: flow.version, data: changed },
  );
  assert.equal(edited.status, 200, JSON.stringify(edited.data));
  await request(a, "/api/v1/sample-company", "POST", {});
  const afterEdit = await request(
    a,
    `/api/v1/companies/${first.data.id}/workspace`,
  );
  assert.equal(
    afterEdit.data.records.filter((r: any) => r.kind === "workflow").length,
    2,
  );
  assert.equal(
    afterEdit.data.records.find((r: any) => r.id === flow.id).title,
    changed.title,
  );
  assert.equal(emailMessages.length, before);
});
test("Resend invitation calls once, keeps tokens out of receipts and opens participant page", async () => {
  const c = await register(),
    f = await fixture(c),
    other = await register();
  const r = await create(c, "request", {
    title: "Work questions",
    personId: f.p.id,
    type: "work",
    questions: ["What do you do?"],
    taskIds: [],
    dueDate: "2099-01-01",
    notice: "Synthetic test only.",
  });
  const path = prefix(c) + "/requests/" + r.id + "/email",
    body = { expectedVersion: r.version, confirmSend: true },
    id = randomUUID();
  assert.equal((await request(c, path, "POST", body)).status, 503);
  await saveProvider(c, "resend");
  assert.equal((await request(other, path, "POST", body)).status, 404);
  const before = emailMessages.length;
  const sent = await request(c, path, "POST", body, { "Idempotency-Key": id });
  assert.equal(sent.status, 200, JSON.stringify(sent.data));
  assert.equal(sent.data.state, "accepted");
  await request(c, path, "POST", body, { "Idempotency-Key": id });
  assert.equal(emailMessages.length, before + 1);
  const message = emailMessages.at(-1).message;
  assert.deepEqual(message.to, [f.p.data.email]);
  const token = message.text.match(/invite\/([a-f0-9]{64})/)[1];
  assert.equal((await request(null, "/api/invitations/" + token)).status, 200);
  const jobs = await request(c, prefix(c) + "/requests/" + r.id + "/emails");
  assert.ok(!JSON.stringify(jobs.data).includes(token));
  const stored = await tx(
    c.user.tenant_id,
    async (db) =>
      (await db.query("SELECT input,result FROM provider_jobs")).rows,
  );
  assert.ok(!JSON.stringify(stored).includes(token));
  const enroll = await request(
    null,
    "/api/invitations/" + token + "/enroll",
    "POST",
    { password: "Synthetic participant password 123!", acknowledged: true },
  );
  assert.equal(enroll.status, 200);
  const participant = {
    cookie: enroll.cookie,
    csrf: enroll.data.csrf,
    user: enroll.data.user,
    company: c.company,
  };
  assert.equal(
    (await request(participant, prefix(c) + "/providers")).status,
    403,
  );
  assert.equal(
    (await request(participant, "/api/v1/participant/requests")).data.requests
      .length,
    1,
  );
});
test("ambiguous email failures remain unknown and are not retried", async () => {
  const c = await register(),
    f = await fixture(c);
  await saveProvider(c, "resend");
  await tx(c.user.tenant_id, async (db) => {
    await db.query(
      "UPDATE companies SET name='UnknownEmail fixture' WHERE id=$1",
      [c.company],
    );
  });
  const r = await create(c, "request", {
    title: "Questions",
    personId: f.p.id,
    type: "work",
    questions: ["What do you do?"],
    taskIds: [],
    dueDate: "2099-01-01",
    notice: "Synthetic test only.",
  });
  const path = prefix(c) + "/requests/" + r.id + "/email",
    body = { expectedVersion: r.version, confirmSend: true },
    headers = { "Idempotency-Key": randomUUID() },
    before = emailMessages.length;
  const response = await request(c, path, "POST", body, headers);
  assert.equal(response.data.state, "unknown");
  assert.ok(!response.data.message.includes("private diagnostic"));
  await request(c, path, "POST", body, headers);
  assert.equal(emailMessages.length, before + 1);
});
test("AI drafts bind sources, require consent, isolate tenants and do not create authoritative records", async () => {
  const c = await register(),
    other = await register(),
    f = await fixture(c),
    path = prefix(c) + "/ai",
    body = { mode: "brief", sourceIds: [f.e.id], consent: true };
  assert.equal((await request(c, path, "POST", body)).status, 503);
  await saveProvider(c, "openai");
  assert.equal(
    (await request(c, path, "POST", { ...body, consent: false })).status,
    422,
  );
  assert.equal((await request(other, path, "POST", body)).status, 404);
  const before = aiCalls,
    headers = { "Idempotency-Key": randomUUID() };
  const result = await request(c, path, "POST", body, headers);
  assert.equal(result.status, 200, JSON.stringify(result.data));
  await request(c, path, "POST", body, headers);
  assert.equal(aiCalls, before + 1);
  const jobs = (await request(c, path)).data.jobs;
  assert.equal(jobs[0].state, "complete");
  assert.equal(jobs[0].input.model, "gpt-5.6-sol");
  assert.equal(jobs[0].input.reasoning, "medium");
  assert.equal(jobs[0].stale, false);
  assert.equal(jobs[0].input.sources[0].text, undefined);
  await tx(c.user.tenant_id, async (db) => {
    await db.query("UPDATE records SET state='retracted' WHERE id=$1", [
      f.e.id,
    ]);
  });
  assert.equal((await request(c, path)).data.jobs[0].stale, true);
  assert.equal((await request(c, path, "POST", body)).status, 422);
});

test("hosted rewrite metadata is omitted without weakening graph query validation", async () => {
  const c = await register();
  await fixture(c);
  const good = await request(
    c,
    prefix(c) + "/graph?path=v1%2Fcompanies%2Fexample%2Fgraph&limit=1",
  );
  assert.equal(good.status, 200, JSON.stringify(good.data));
  assert.equal(
    (await request(c, prefix(c) + "/graph?path=internal&limit=99999")).status,
    422,
  );
  assert.equal(
    (await request(c, prefix(c) + "/graph?path=internal&arbitrary=true"))
      .status,
    422,
  );
});

test("all provider keys save and remove without account passwords; current models and effort roundtrip", async () => {
  const c = await register();
  for (const model of [
    "gpt-6-astra",
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
  ]) {
    const saved = await request(c, prefix(c) + "/providers/openai", "PUT", {
      key: "synthetic-not-a-live-key",
      enabled: true,
      model,
      reasoning: "high",
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    const p = (await request(c, prefix(c) + "/providers")).data.providers.find(
      (p: any) => p.provider === "openai",
    );
    assert.equal(p.config.model, model);
    assert.equal(p.config.reasoning, "high");
  }
  assert.equal(
    (
      await request(c, prefix(c) + "/providers/openai", "PUT", {
        key: "synthetic-not-a-live-key",
        enabled: true,
        model: "invented-model",
      })
    ).status,
    422,
  );
  for (const provider of ["openai", "exa", "resend"]) {
    assert.equal((await saveProvider(c, provider)).status, 200);
    assert.equal(
      (await request(c, prefix(c) + "/providers/" + provider, "DELETE", {}))
        .status,
      200,
    );
  }
});
