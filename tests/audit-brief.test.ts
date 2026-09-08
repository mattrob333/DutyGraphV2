import "dotenv/config";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import { createApp, errorHandler } from "../server/app.ts";
import { registerAccount } from "../server/auth.ts";
import { pool, tx, hash, putRecord } from "../server/db.ts";
import { createOrEdit } from "../server/records.ts";
import { teamContext } from "../shared/team-analysis.ts";
import { auditBriefContext } from "../server/audit-brief.ts";
import { reportRecord } from "../server/reports.ts";
import type { AuditBrief } from "../shared/audit-brief.ts";
import type { RecordRow } from "../shared/domain.ts";

const app = createApp({ authRequestsPerWindow: 1000 });
app.use(errorHandler);
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});
const profile = {
  industry: "Synthetic wholesale",
  status: "advisor_reviewed",
  rationale: "Fictional brief testing",
  streams: [
    {
      id: "orders",
      name: "Orders",
      templateId: "custom",
      stages: [
        { id: "check", name: "Check orders", functionIds: ["produce"] },
        { id: "ship", name: "Ship orders", functionIds: ["deliver"] },
      ],
    },
  ],
};
const sourceText =
  "PRIVATE_SOURCE_SENTINEL: This original employee account must never appear in an audit brief or client report.";

async function fixture() {
  const user = await registerAccount({
    name: "Synthetic audit advisor",
    email: `${randomUUID()}@test.invalid`,
    password: "Synthetic password 123!",
    companyName: "Synthetic live brief",
    scope: "Order review only",
    goal: "Understand the recorded work",
  });
  const saved = await tx(user.tenant_id, async (db) => {
    const company = (
      await db.query("SELECT id FROM companies WHERE tenant_id=$1", [
        user.tenant_id,
      ])
    ).rows[0].id;
    await db.query(
      "UPDATE companies SET sandbox=true,settings=jsonb_set(settings,'{businessProfile}',$2::jsonb) WHERE id=$1",
      [company, profile],
    );
    const person = await createOrEdit(db, user, company, "person", {
      name: "Alex Example",
      email: `${randomUUID()}@test.invalid`,
      role: "Order clerk",
      team: "Orders",
    });
    await createOrEdit(db, user, company, "person", {
      name: "Casey Example",
      email: `${randomUUID()}@test.invalid`,
      role: "Operations",
      team: "Orders",
    });
    await putRecord(
      db,
      user,
      company,
      "person",
      "Withdrawn roster member",
      { email: "withdrawn@test.invalid", role: "Old role", team: "Old team" },
      "withdrawn",
    );
    const evidence = await putRecord(
      db,
      user,
      company,
      "evidence",
      "Original private account",
      {
        text: sourceText,
        type: "Employee account",
        personId: person.id,
        locator: "Internal account",
        classification: "Known",
      },
      "accepted",
    );
    let task = await createOrEdit(db, user, company, "task", {
      title: "Check order quantities",
      duty: "Order checking",
      ownerId: person.id,
      performerId: person.id,
      purpose: "Check incoming orders",
      trigger: "An order arrives",
      inputs: "Order details",
      instructions: "Compare ordered quantities",
      output: "Checked order",
      destination: "Shipping",
      humanGate: "Ask the manager about differences",
      systems: ["Ledger"],
      evidenceIds: [evidence.id],
      businessStageLinks: [{ streamId: "orders", stageId: "check" }],
      reviewDue: "2099-01-01",
      reason: "Synthetic reviewed work",
    });
    task = await putRecord(
      db,
      user,
      company,
      "task",
      task.title,
      { ...task.data, reviewed: true },
      "awaiting_confirmation",
      task,
    );
    const request = await putRecord(
      db,
      user,
      company,
      "request",
      "Returned work account",
      { personId: person.id, type: "work", dueDate: "2099-01-01" },
      "returned",
    );
    await putRecord(
      db,
      user,
      company,
      "response",
      "Private response",
      {
        requestId: request.id,
        personId: person.id,
        text: "PRIVATE_RESPONSE_SENTINEL",
        submissionIdentity: { method: "private_link" },
      },
      "returned",
    );
    await db.query(
      "INSERT INTO confirmations(id,tenant_id,company_id,record_id,version,hash,person_id,user_id,request_id,decision,accepted) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'correct',true)",
      [
        randomUUID(),
        user.tenant_id,
        company,
        task.id,
        task.version,
        task.hash,
        person.id,
        user.id,
        request.id,
      ],
    );
    const duty = await createOrEdit(db, user, company, "duty", {
      title: "Order checking",
      purpose: "Check the incoming order",
      scope: "New orders",
      ownerId: person.id,
      taskIds: [task.id],
      evidenceIds: [evidence.id],
      businessStageLinks: [{ streamId: "orders", stageId: "check" }],
      reviewDue: "2099-01-01",
      reason: "Synthetic duty",
    });
    const unmapped = await createOrEdit(db, user, company, "task", {
      title: "Unmapped incomplete work",
      duty: "Not reported.",
      purpose: "Not reported.",
      trigger: "Not reported.",
      inputs: "Not reported.",
      instructions: "Not reported.",
      output: "Not reported.",
      humanGate: "Not reported.",
      reviewDue: "2099-01-01",
      reason: "Synthetic gap",
    });
    await putRecord(
      db,
      user,
      company,
      "task",
      "Retracted work",
      { ...unmapped.data },
      "retracted",
    );
    const review = await createOrEdit(db, user, company, "review", {
      title: "Review account differences",
      ownerId: person.id,
      decision: "Discuss differences",
      nextAction: "Review the exception list",
      dueDate: "2000-01-01",
    });
    const metric = await createOrEdit(db, user, company, "metric", {
      title: "Order cycle time",
      question: "How long does checking take?",
      formula: "Elapsed minutes",
      unit: "minutes",
      population: "Checked orders",
      source: "Timing log",
      ownerId: person.id,
      baseline: 0,
      target: 5,
      missingReason: "",
      window: "One week",
      guardrail: "No skipped checks",
    });
    const missingMetric = await createOrEdit(db, user, company, "metric", {
      title: "Financial benefit",
      question: "What benefit has been observed?",
      formula: "Measured benefit",
      unit: "USD",
      population: "This engagement",
      source: "Not recorded",
      ownerId: person.id,
      baseline: null,
      target: null,
      missingReason: "No measured financial result",
      window: "Not recorded",
      guardrail: "No estimated savings claim",
    });
    return {
      company,
      person,
      task,
      duty,
      evidence,
      unmapped,
      review,
      metric,
      missingMetric,
    };
  });
  const response = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: "Synthetic password 123!",
    }),
  });
  assert.equal(response.status, 200);
  const auth = (await response.json()) as any;
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  return { user, ...saved, cookie, csrf: auth.csrf };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function call(f: Fixture, path: string, body?: unknown) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      Cookie: f.cookie,
      "X-CSRF-Token": f.csrf,
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const contentType = response.headers.get("content-type") || "";
  return {
    status: response.status,
    data: contentType.includes("application/zip")
      ? Buffer.from(await response.arrayBuffer())
      : contentType.includes("json")
        ? ((await response.json()) as any)
        : await response.text(),
  };
}
const path = (f: Fixture) => `/api/v1/companies/${f.company}`;
async function analysis(
  f: Fixture,
  options: {
    stale?: boolean;
    decision?: "discuss" | "dismissed";
    reviewed?: boolean;
  } = {},
) {
  return tx(f.user.tenant_id, async (db) => {
    const records = (
      await db.query("SELECT * FROM records WHERE company_id=$1 ORDER BY id", [
        f.company,
      ])
    ).rows;
    const context = teamContext(records, "Synthetic live brief");
    const finding = {
      id: "check-handoff",
      category: "handoff",
      title: "Discuss the receiving check",
      observation:
        "The receiving check needs discussion with the accountable person.",
      confidence: "medium",
      citations: [{ sourceId: f.task.id, quote: "Compare ordered quantities" }],
      nextAction: "Ask who accepts the checked order",
      validationQuestion: "Who accepts the checked order?",
      proposedScope: "Order checking only",
      humanReview: "The advisor and named owner review the finding",
    };
    const output = {
      summary: "Review the recorded order handoff",
      findings: [finding],
    };
    const result = {
      output,
      reviews:
        options.reviewed === false
          ? {}
          : {
              [finding.id]: {
                decision: options.decision || "discuss",
                note: "PRIVATE_REVIEW_NOTE_SENTINEL",
                actorId: f.user.id,
                at: new Date().toISOString(),
              },
            },
      reviewVersion: options.reviewed === false ? 0 : 1,
    };
    const id = randomUUID();
    await db.query(
      "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input,result) VALUES($1,$2,$3,'team_analysis','complete',$4,$5)",
      [
        id,
        f.user.tenant_id,
        f.company,
        {
          ...context,
          fingerprint: options.stale ? "old-fingerprint" : hash(context),
        },
        result,
      ],
    );
    return { id, result };
  });
}

test("live audit counts current roster and exact task confirmation without inventing coverage or financial values", async () => {
  const f = await fixture();
  const result = await call(f, path(f) + "/audit-brief");
  assert.equal(result.status, 200, JSON.stringify(result.data));
  const brief = result.data as AuditBrief;
  assert.equal(brief.coverage.people, 2);
  assert.equal(brief.coverage.respondedPeople, 1);
  assert.equal(brief.coverage.tasks, 2);
  assert.equal(brief.coverage.confirmedTasks, 1);
  assert.equal(brief.coverage.duties, 1);
  assert.equal(brief.coverage.stages, 2);
  assert.equal(brief.coverage.stagesWithWork, 1);
  assert.equal(brief.coverage.unmappedTasks, 1);
  assert.equal(brief.coverage.tasksWithAcceptedEvidence, 1);
  assert.equal(brief.stages.find((s) => s.stageId === "ship")!.tasks, 0);
  assert.ok(
    brief.priorities.some(
      (p) => p.kind === "ownership" && p.recordIds.includes(f.unmapped.id),
    ),
  );
  assert.equal(brief.metrics.find((m) => m.id === f.metric.id)!.baseline, 0);
  assert.equal(
    brief.metrics.find((m) => m.id === f.missingMetric.id)!.baseline,
    null,
  );
  assert.equal(
    brief.metrics.find((m) => m.id === f.missingMetric.id)!.target,
    null,
  );
  assert.equal(
    brief.commitments.find((c) => c.id === f.review.id)!.overdue,
    true,
  );
  const json = JSON.stringify(brief);
  assert.ok(!json.includes(sourceText));
  assert.ok(!json.includes("PRIVATE_RESPONSE_SENTINEL"));
  assert.ok(!json.includes(f.person.data.email));
  assert.match(brief.reportProposal.limitations, /No financial savings/);
  assert.equal(brief.reportProposal.expectedRevision, brief.sourceRevision);
  const again = await call(f, path(f) + "/audit-brief");
  assert.equal(again.data.sourceFingerprint, brief.sourceFingerprint);
  const rows = (
    await tx(f.user.tenant_id, (db) =>
      db.query("SELECT id FROM records WHERE company_id=$1 AND kind='brief'", [
        f.company,
      ]),
    )
  ).rows;
  assert.equal(
    rows.length,
    0,
    "Reading the live brief never creates a frozen report",
  );
});

test("tenant isolation and advisor authorization apply to live and prepare routes", async () => {
  const f = await fixture(),
    other = await fixture();
  assert.equal((await call(other, path(f) + "/audit-brief")).status, 404);
  const brief = (await call(f, path(f) + "/audit-brief")).data;
  assert.equal(
    (
      await call(other, path(f) + "/audit-brief/prepare", {
        ...brief.reportProposal,
        audience: ["Named sponsor"],
        sourceFingerprint: brief.sourceFingerprint,
      })
    ).status,
    404,
  );
  await pool.query(
    "UPDATE users SET role='participant',person_id=$2,company_id=$3 WHERE id=$1",
    [f.user.id, f.person.id, f.company],
  );
  assert.equal((await call(f, path(f) + "/audit-brief")).status, 403);
  assert.equal(
    (
      await call(f, path(f) + "/audit-brief/prepare", {
        ...brief.reportProposal,
        audience: ["Named sponsor"],
        sourceFingerprint: brief.sourceFingerprint,
      })
    ).status,
    403,
  );
});

test("only reviewed current supported analysis appears; stale, dismissed and unreviewed findings are excluded", async () => {
  const f = await fixture();
  await analysis(f, { stale: true });
  await analysis(f, { decision: "dismissed" });
  await analysis(f, { reviewed: false });
  let brief = (await call(f, path(f) + "/audit-brief")).data as AuditBrief;
  assert.equal(brief.analysis.currentReviewed, 0);
  assert.equal(brief.analysis.staleExcluded, 1);
  assert.equal(brief.analysis.dismissedExcluded, 1);
  assert.equal(brief.analysis.unreviewedExcluded, 1);
  const current = await analysis(f);
  brief = (await call(f, path(f) + "/audit-brief")).data;
  assert.equal(brief.analysis.currentReviewed, 1);
  const finding = brief.priorities.find(
    (p) => p.source === "reviewed_analysis",
  )!;
  assert.equal(finding.analysisRunId, current.id);
  assert.deepEqual(finding.recordIds, [f.task.id]);
  assert.ok(!JSON.stringify(brief).includes("PRIVATE_REVIEW_NOTE_SENTINEL"));
  assert.ok(
    !JSON.stringify(finding).includes("Compare ordered quantities"),
    "Citation passages are excluded",
  );
  await tx(f.user.tenant_id, (db) =>
    putRecord(
      db,
      f.user,
      f.company,
      "task",
      f.task.title,
      { ...f.task.data, trigger: "Changed incoming order" },
      f.task.state,
      f.task,
    ),
  );
  brief = (await call(f, path(f) + "/audit-brief")).data;
  assert.equal(brief.analysis.currentReviewed, 0);
  assert.equal(brief.coverage.confirmedTasks, 0);
  assert.ok(!brief.priorities.some((p) => p.source === "reviewed_analysis"));
});

test("analysis review changes invalidate report preparation even without a company revision change", async () => {
  const f = await fixture(),
    run = await analysis(f);
  const before = (await call(f, path(f) + "/audit-brief")).data;
  await tx(f.user.tenant_id, (db) =>
    db.query("UPDATE provider_jobs SET result=$2 WHERE id=$1", [
      run.id,
      {
        ...run.result,
        reviews: {
          "check-handoff": { decision: "dismissed", note: "Later decision" },
        },
        reviewVersion: 2,
      },
    ]),
  );
  const after = (await call(f, path(f) + "/audit-brief")).data;
  assert.equal(before.sourceRevision, after.sourceRevision);
  assert.notEqual(before.sourceFingerprint, after.sourceFingerprint);
  const prepared = await call(f, path(f) + "/audit-brief/prepare", {
    ...before.reportProposal,
    audience: ["Named client sponsor"],
    sourceFingerprint: before.sourceFingerprint,
  });
  assert.equal(prepared.status, 409);
  assert.equal(prepared.data.code, "AUDIT_BRIEF_STALE");
});

test("prepared audit preserves audience review and immutable source bindings; client ZIP excludes private sources and addresses", async () => {
  const f = await fixture();
  await analysis(f);
  const live = (await call(f, path(f) + "/audit-brief")).data;
  const body = {
    ...live.reportProposal,
    audience: ["Named client sponsor"],
    summary:
      live.reportProposal.summary +
      ` Contact ${f.person.data.email} to review.`,
    sourceFingerprint: live.sourceFingerprint,
  };
  assert.equal(
    (await call(f, path(f) + "/audit-brief/prepare", { ...body, audience: [] }))
      .status,
    422,
  );
  assert.equal(
    (
      await call(f, path(f) + "/audit-brief/prepare", {
        ...body,
        recordIds: [f.evidence.id],
      })
    ).status,
    422,
  );
  const created = await call(f, path(f) + "/audit-brief/prepare", body);
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const report = created.data as RecordRow;
  assert.equal(report.state, "draft");
  assert.equal(report.data.auditSource.fingerprint, live.sourceFingerprint);
  assert.ok(
    report.data.auditSource.records.some(
      (b: any) => b.id === f.evidence.id && b.hash === f.evidence.hash,
    ),
  );
  const reportPath = path(f) + "/reports/" + report.id;
  assert.equal((await call(f, reportPath + "/download")).status, 409);
  assert.equal(
    (
      await call(f, reportPath + "/review", {
        expectedVersion: report.version,
        contentHash: report.hash,
        decision: "approve",
        note: "Reviewed the exact client audience and report",
      })
    ).status,
    200,
  );
  const downloaded = await call(f, reportPath + "/download");
  assert.equal(downloaded.status, 200);
  const zip = await JSZip.loadAsync(downloaded.data),
    json = await zip.file("report.json")!.async("string");
  assert.ok(!json.includes(sourceText));
  assert.ok(!json.includes("PRIVATE_RESPONSE_SENTINEL"));
  assert.ok(!json.includes("PRIVATE_REVIEW_NOTE_SENTINEL"));
  assert.ok(!json.includes(f.person.data.email));
  assert.ok(json.includes("Named client sponsor"));
  assert.ok(json.includes("[contact address omitted]"));
  const frozenHash = report.hash;
  await tx(f.user.tenant_id, (db) =>
    putRecord(
      db,
      f.user,
      f.company,
      "evidence",
      f.evidence.title,
      { ...f.evidence.data, text: "A newer private original account" },
      "accepted",
      f.evidence,
    ),
  );
  const stale = await call(f, reportPath + "/download");
  assert.equal(stale.status, 409);
  assert.equal(stale.data.code, "REPORT_STALE");
  const saved = (
    await tx(f.user.tenant_id, (db) =>
      db.query("SELECT * FROM records WHERE id=$1", [report.id]),
    )
  ).rows[0];
  assert.equal(saved.hash, frozenHash);
  assert.equal(saved.state, "approved");
  assert.deepEqual(saved.data.packet, report.data.packet);
});

test("audit scope is bounded and returns no misleading partial coverage", async () => {
  const f = await fixture();
  await tx(f.user.tenant_id, (db) =>
    db.query(
      "INSERT INTO records(id,tenant_id,company_id,kind,title,version,state,data,hash) SELECT gen_random_uuid(),$1,$2,'review','Synthetic bounded record',1,'open','{}','synthetic-hash' FROM generate_series(1,5001)",
      [f.user.tenant_id, f.company],
    ),
  );
  const response = await call(f, path(f) + "/audit-brief");
  assert.equal(response.status, 422);
  assert.equal(response.data.code, "AUDIT_SCOPE");
});

test("recorded constraint hypotheses appear without AI findings, closed commitments are excluded and executive details stay bounded", async () => {
  const f = await fixture();
  const saved = await tx(f.user.tenant_id, async (db) => {
    const candidate = await createOrEdit(db, f.user, f.company, "candidate", {
      title: "Possible checking queue",
      flow: "Order checking",
      pressure: "Orders may wait before checking",
      alternative: "Order arrivals may be uneven",
      counterfactual: "Check whether fewer waits affect completed orders",
      discriminator: "Compare arrival times with checking start times",
      evidenceIds: [f.evidence.id],
      disconfirmingEvidenceIds: [],
      ownerId: f.person.id,
      throughputUnit: "checked orders",
    });
    const closed = await putRecord(
      db,
      f.user,
      f.company,
      "review",
      "Already completed review",
      {
        ownerId: f.person.id,
        nextAction: "Historical action",
        decision: "Done",
        dueDate: "2000-01-01",
      },
      "closed",
    );
    for (let i = 0; i < 42; i++)
      await createOrEdit(db, f.user, f.company, "review", {
        title: `Current review ${i}`,
        ownerId: f.person.id,
        decision: "Discuss the saved work",
        nextAction: "Review the current record",
        dueDate: "2099-01-01",
      });
    return { candidate, closed };
  });
  const brief = (await call(f, path(f) + "/audit-brief")).data as AuditBrief;
  const hypothesis = brief.priorities.find(
    (p) => p.kind === "constraint_hypothesis",
  )!;
  assert.equal(hypothesis.source, "record_finding");
  assert.match(hypothesis.detail, /not an established constraint/);
  assert.equal(hypothesis.nextAction, saved.candidate.data.discriminator);
  assert.ok(hypothesis.recordIds.includes(saved.candidate.id));
  assert.ok(!brief.commitments.some((c) => c.id === saved.closed.id));
  assert.equal(brief.reportProposal.kind, "executive");
  assert.match(brief.reportProposal.title, /audit findings$/);
  assert.equal(brief.reportProposal.recordIds.length, 40);
  assert.ok(brief.reportProposal.recordIds.includes(saved.candidate.id));
  assert.ok(!brief.reportProposal.recordIds.includes(saved.closed.id));
  assert.match(
    brief.reportProposal.limitations,
    /additional relevant detailed records/,
  );
  const report = await call(f, path(f) + "/audit-brief/prepare", {
    ...brief.reportProposal,
    recordIds: [],
    audience: ["Named client sponsor"],
    sourceFingerprint: brief.sourceFingerprint,
  });
  assert.equal(report.status, 201, JSON.stringify(report.data));
  assert.equal(report.data.data.packet.records.length, 0);
  assert.equal(
    report.data.data.packet.coverage.participants,
    brief.coverage.people,
  );
  assert.equal(
    report.data.data.packet.coverage.responded,
    brief.coverage.respondedPeople,
  );
  assert.equal(
    report.data.data.packet.coverage.totalTasks,
    brief.coverage.tasks,
  );
  assert.match(brief.reportProposal.summary, /Focus for review:/);
  assert.ok(brief.reportProposal.summary.includes(brief.priorities[0].title));
  assert.match(brief.reportProposal.summary, /not established bottlenecks/);
  assert.equal(
    report.data.data.packet.auditBrief.coverage.tasks,
    brief.coverage.tasks,
  );
  assert.ok(
    report.data.data.packet.auditBrief.priorities.some(
      (p: any) => p.kind === "constraint_hypothesis",
    ),
  );
  assert.equal("reportProposal" in report.data.data.packet.auditBrief, false);
  assert.equal("auditEvents" in report.data.data.packet, false);
});

test("a newer dismissed analysis finding cannot resurface from an older current run", async () => {
  const f = await fixture();
  await analysis(f);
  await analysis(f, { decision: "dismissed" });
  const brief = (await call(f, path(f) + "/audit-brief")).data as AuditBrief;
  assert.equal(brief.analysis.currentReviewed, 0);
  assert.ok(!brief.priorities.some((p) => p.source === "reviewed_analysis"));
});

test("latest recorded metric observation is dated, ordered and private without inventing a baseline", async () => {
  const f = await fixture();
  await tx(f.user.tenant_id, (db) =>
    putRecord(
      db,
      f.user,
      f.company,
      "metric",
      f.missingMetric.title,
      {
        ...f.missingMetric.data,
        observations: [
          {
            value: 0,
            observedAt: "2026-09-08T12:00:00Z",
            source: "PRIVATE_OBSERVATION_SENTINEL",
          },
          {
            value: 14,
            observedAt: "2026-09-01T12:00:00Z",
            source: "PRIVATE_OBSERVATION_SENTINEL",
          },
          { value: "200", observedAt: "2026-09-09T12:00:00Z" },
          { value: 900, observedAt: "invalid date" },
        ],
      },
      f.missingMetric.state,
      f.missingMetric,
    ),
  );
  const brief = (await call(f, path(f) + "/audit-brief")).data as AuditBrief;
  const metric = brief.metrics.find((m) => m.id === f.missingMetric.id)!;
  assert.equal(metric.owner, "Alex Example");
  assert.deepEqual(metric.latestObservation, {
    value: 0,
    observedAt: "2026-09-08T12:00:00.000Z",
  });
  assert.equal(metric.observationCount, 2);
  assert.equal(metric.baseline, null);
  assert.equal(metric.target, null);
  assert.equal(
    brief.metrics.find((m) => m.id === f.metric.id)!.latestObservation,
    undefined,
  );
  assert.ok(!JSON.stringify(brief).includes("PRIVATE_OBSERVATION_SENTINEL"));
  const report = await call(f, path(f) + "/audit-brief/prepare", {
    ...brief.reportProposal,
    audience: ["Named sponsor"],
    sourceFingerprint: brief.sourceFingerprint,
  });
  assert.equal(report.status, 201, JSON.stringify(report.data));
  assert.deepEqual(
    report.data.data.packet.auditBrief.metrics.find(
      (m: any) => m.id === metric.id,
    ),
    metric,
  );
  assert.ok(
    !JSON.stringify(report.data.data.packet).includes(
      "PRIVATE_OBSERVATION_SENTINEL",
    ),
  );
});

test("manual report coverage excludes inactive work and non-work responses; documentation handoffs hide execution placeholders", async () => {
  const f = await fixture();
  await tx(f.user.tenant_id, async (db) => {
    const casey = (
      await db.query(
        "SELECT id FROM records WHERE company_id=$1 AND title='Casey Example'",
        [f.company],
      )
    ).rows[0];
    await putRecord(
      db,
      f.user,
      f.company,
      "request",
      "Leadership account",
      { type: "leadership", personId: casey.id },
      "accepted",
    );
  });
  const brief = (await call(f, path(f) + "/audit-brief")).data as AuditBrief;
  const report = await call(f, path(f) + "/reports", {
    ...brief.reportProposal,
    recordIds: [],
    audience: ["Named sponsor"],
  });
  assert.equal(report.status, 201, JSON.stringify(report.data));
  assert.equal(report.data.data.packet.coverage.participants, 2);
  assert.equal(report.data.data.packet.coverage.responded, 1);
  assert.equal(report.data.data.packet.coverage.totalTasks, 2);
  const handoff = reportRecord(
    {
      ...f.task,
      kind: "handoff",
      data: { documentationOnly: true, timeoutHours: 1, maxRetries: 0 },
    },
    [],
  );
  assert.equal(handoff.fields["Escalation hours"], "Not configured");
  assert.equal(handoff.fields["Maximum retries"], "Not configured");
});

test("withdrawn confirmed tasks cannot enter a manual report or remain eligible for delivery", async () => {
  const f = await fixture();
  let brief = (await call(f, path(f) + "/audit-brief")).data as AuditBrief;
  const report = await call(f, path(f) + "/reports", {
    ...brief.reportProposal,
    recordIds: [f.task.id],
    audience: ["Named sponsor"],
  });
  assert.equal(report.status, 201, JSON.stringify(report.data));
  const reportPath = path(f) + "/reports/" + report.data.id;
  assert.equal(
    (
      await call(f, reportPath + "/review", {
        expectedVersion: report.data.version,
        contentHash: report.data.hash,
        decision: "approve",
        note: "Reviewed exact snapshot",
      })
    ).status,
    200,
  );
  for (const state of ["withdrawn", "superseded", "retracted"]) {
    await tx(f.user.tenant_id, (db) =>
      db.query("UPDATE records SET state=$2 WHERE id=$1", [f.task.id, state]),
    );
    brief = (await call(f, path(f) + "/audit-brief")).data as AuditBrief;
    const invalid = await call(f, path(f) + "/reports", {
      ...brief.reportProposal,
      recordIds: [f.task.id],
      audience: ["Named sponsor"],
    });
    assert.equal(invalid.status, 422, JSON.stringify(invalid.data));
    assert.equal(invalid.data.code, "INVALID_SELECTION");
    const download = await call(f, reportPath + "/download");
    assert.equal(download.status, 409);
    assert.equal(download.data.code, "REPORT_STALE");
  }
});

test("completed reviewed frameworks are selected only while exact evidence and upstream versions remain current", async () => {
  const f = await fixture();
  const framework = await tx(f.user.tenant_id, (db) =>
    putRecord(
      db,
      f.user,
      f.company,
      "framework",
      "Reviewed order framework",
      {
        analysis: "Reviewed order analysis",
        authorship: "Advisor",
        sourceBindings: [
          {
            id: f.evidence.id,
            version: f.evidence.version,
            hash: f.evidence.hash,
          },
        ],
        upstreamBindings: [
          { id: f.task.id, version: f.task.version, hash: f.task.hash },
        ],
      },
      "complete",
    ),
  );
  let brief = (await call(f, path(f) + "/audit-brief")).data as AuditBrief;
  assert.ok(brief.reportProposal.recordIds.includes(framework.id));
  const report = await call(f, path(f) + "/reports", {
    ...brief.reportProposal,
    recordIds: [framework.id],
    audience: ["Named sponsor"],
  });
  assert.equal(report.status, 201, JSON.stringify(report.data));
  assert.ok(report.data.data.bindings.some((b: any) => b.id === f.task.id));
  assert.ok(report.data.data.bindings.some((b: any) => b.id === f.evidence.id));
  await tx(f.user.tenant_id, (db) =>
    putRecord(
      db,
      f.user,
      f.company,
      "task",
      f.task.title,
      { ...f.task.data, purpose: "Updated current task purpose" },
      f.task.state,
      f.task,
    ),
  );
  brief = (await call(f, path(f) + "/audit-brief")).data as AuditBrief;
  assert.ok(!brief.reportProposal.recordIds.includes(framework.id));
  const invalid = await call(f, path(f) + "/reports", {
    ...brief.reportProposal,
    recordIds: [framework.id],
    audience: ["Named sponsor"],
  });
  assert.equal(invalid.status, 409, JSON.stringify(invalid.data));
  assert.equal(invalid.data.code, "SOURCE_STALE");
});
