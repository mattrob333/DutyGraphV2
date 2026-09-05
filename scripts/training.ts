import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createApp, errorHandler } from "../server/app.ts";
import { pool } from "../server/db.ts";
import { projectAll } from "../server/projection.ts";
import { kickoffQuestions } from "../shared/work-model.ts";

// A real local API journey with fictional actors. Creates a NEW sandbox company.
// No original company is updated, no emails are sent, and no credentials are saved.
if (process.env.ENABLE_DEMO !== "true")
  throw new Error(
    "Training requires ENABLE_DEMO=true on the dedicated local installation.",
  );
const app = createApp({ authRequestsPerWindow: 1000 });
app.use(errorHandler);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
type Session = { cookie: string; csrf: string };
const advisor: Session = { cookie: "", csrf: "" };
async function call(
  session: Session,
  path: string,
  method = "GET",
  body?: unknown,
  bytes = false,
): Promise<any> {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: session.cookie,
      "X-CSRF-Token": session.csrf,
      "Idempotency-Key": randomUUID(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `${method} ${path}: ${response.status} ${await response.text()}`,
    );
  const cookie = response.headers.get("set-cookie");
  if (cookie) session.cookie = cookie.split(";")[0];
  if (bytes) return Buffer.from(await response.arrayBuffer());
  const result = await response.json();
  if (result.csrf) session.csrf = result.csrf;
  return result;
}
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const output = "docs/examples";
try {
  await call(advisor, "/auth/demo", "POST", {});
  const company = await call(advisor, "/v1/companies", "POST", {
    name:
      "Northstar Parts — Advisor Training " +
      new Date().toISOString().slice(0, 16).replace("T", " "),
    scope: "Synthetic training: standard order intake through release",
    goal: "Practice evidence review, human confirmation, bounded work, measurement and client reporting.",
  });
  const prefix = `/v1/companies/${company.id}`;
  const workspace = () => call(advisor, prefix + "/workspace");
  const create = (kind: string, data: unknown) =>
    call(advisor, prefix + "/records", "POST", { kind, data });
  const current = async (id: string) =>
    (await workspace()).records.find((r: any) => r.id === id);
  const action = async (record: any, action: string, extra: any = {}) => {
    const r = await current(record.id);
    await call(advisor, prefix + `/records/${r.id}/actions`, "POST", {
      expectedVersion: r.version,
      action,
      note: "Synthetic training review; no business authority or real-world outcome is asserted.",
      ...extra,
    });
    return current(r.id);
  };
  const people: any[] = [];
  for (const [name, role, team, manager] of [
    ["Alex Morgan", "Executive sponsor", "Leadership", -1],
    ["Jamie Park", "Fulfillment lead", "Fulfillment", 0],
    ["Sam Rivera", "Order specialist", "Fulfillment", 1],
    ["Robin Ellis", "Credit reviewer", "Finance", 0],
  ] as const)
    people.push(
      await create("person", {
        name,
        role,
        team,
        managerId: manager < 0 ? "" : people[manager].id,
        email:
          name.toLowerCase().replace(" ", ".") +
          "." +
          company.id.slice(0, 8) +
          "@training.invalid",
      }),
    );
  const [alex, jamie, sam, robin] = people;
  const engagement = await create("engagement", {
    title: "Northstar order-flow training engagement",
    sponsorId: alex.id,
    totalHeadcount: 24,
    outcome:
      "Understand delays in standard order release and agree a bounded measurement plan.",
    startDate: future(0),
    endDate: future(60),
    systems: ["Training order register", "Training credit checklist"],
    locations: ["Fictional East depot"],
    inScope:
      "Four fictional participants; standard orders from intake to release.",
    outOfScope:
      "Payments, real customer data, production access and automated release.",
    sourcePolicy:
      "Synthetic typed accounts and invented execution observations only.",
    visibility: "Training advisor and assigned fictional participants.",
    retentionDays: 30,
    reviewCadence: "Weekly practice review",
    timezone: "America/New_York",
    successCriteria:
      "Three reviewed task cards, an explicit handoff contract, a manual case, and a reviewed client packet with limitations.",
  });
  await action(engagement, "review");
  async function submitAs(
    person: any,
    type: string,
    taskIds: string[],
    text: string,
  ) {
    const request = await create("request", {
      title:
        type === "leadership"
          ? "Northstar executive kickoff"
          : `${person.title}: confirm the described work`,
      personId: person.id,
      type,
      questions:
        type === "leadership"
          ? kickoffQuestions.slice(0, 5).map((q) => q.question)
          : ["Does each card accurately describe your part in this work?"],
      questionPlanVersion:
        type === "leadership" ? "kickoff-v1" : "training-confirmation-v1",
      questionIds:
        type === "leadership"
          ? kickoffQuestions.slice(0, 5).map((q) => q.id)
          : ["confirm-work"],
      taskIds,
      dueDate: future(30),
      notice:
        "Synthetic training only. The advisor will inspect this response. Confirming work does not grant permission to automate it.",
    });
    const invite = await call(
      advisor,
      prefix + `/requests/${request.id}/issue`,
      "POST",
      { expectedVersion: request.version },
    );
    const participant: Session = { cookie: "", csrf: "" };
    await call(
      participant,
      "/invitations/" + invite.url.split("/").pop() + "/enroll",
      "POST",
      { password: randomBytes(24).toString("hex"), acknowledged: true },
    );
    const assigned = (
      await call(participant, "/v1/participant/requests")
    ).requests.find((r: any) => r.id === request.id);
    const result = await call(
      participant,
      `/v1/participant/requests/${request.id}/submit`,
      "POST",
      {
        expectedVersion: assigned.version,
        acknowledged: true,
        text,
        decisions: Object.fromEntries(taskIds.map((id) => [id, "correct"])),
        note: "Scripted fictional participant response for training.",
      },
    );
    await action({ id: result.responseId }, "accept");
  }
  await submitAs(
    alex,
    "leadership",
    [],
    "Fictional kickoff: customers value accurate orders arriving on time. Our output is a released standard order. Demand is sufficient in this exercise. Work waits for missing order fields and a credit-check handoff. The fulfillment lead reviews exceptions; nobody may release orders automatically.",
  );
  const sources: any[] = [];
  for (const [title, type, text, locator] of [
    [
      "Training order checklist",
      "Policy document",
      "Synthetic policy: capture item, quantity and customer reference; credit reviewer records a result; fulfillment lead approves exceptions. Release requires a complete checked packet.",
      "Training workbook, exhibit A, steps 1–3",
    ],
    [
      "Training queue observations",
      "Execution record",
      "Invented practice data: median intake-to-release duration was 10 hours for 20 baseline orders and 8 hours for 20 practice orders. Credit review remained under one hour. Different product mix and a small sample prevent a causal conclusion.",
      "Training workbook, exhibit B, rows 1–40",
    ],
  ]) {
    const e = await create("evidence", {
      title,
      type,
      text,
      locator,
      classification: "Known",
      bucket: "biz",
      originId: randomUUID(),
    });
    sources.push(await action(e, "accept"));
  }
  const tasks: any[] = [];
  for (const [title, performer, trigger, input, outputText] of [
    [
      "Check the incoming order",
      sam.id,
      "A standard order arrives",
      "Customer reference, item and quantity",
      "Complete intake checklist",
    ],
    [
      "Record the credit-check result",
      robin.id,
      "The intake checklist is complete",
      "Complete intake checklist and customer reference",
      "Recorded pass or exception result",
    ],
    [
      "Release the checked order",
      sam.id,
      "A passing credit result is recorded",
      "Complete order packet and passing result",
      "Order released by a human in the training register",
    ],
  ]) {
    const t = await create("task", {
      title,
      duty: "Prepare standard orders for fulfillment",
      ownerId: jamie.id,
      performerId: performer,
      purpose:
        "Move complete, checked orders to fulfillment without bypassing credit review.",
      trigger,
      inputs: input,
      instructions:
        "Inspect the named inputs. Record the result and source reference. Stop and ask Jamie when information is incomplete or inconsistent.",
      output: outputText,
      systems: ["Training order register"],
      allowed: [
        "Read the fictional order",
        "Record a human-reviewed checklist result",
      ],
      denied: [
        "Change customer credit limits",
        "Release orders automatically",
        "Use production credentials",
      ],
      humanGate: "Jamie reviews exceptions before any human release.",
      evidenceIds: sources.map((s) => s.id),
      mode: "human_only",
      classification: "Inferred",
      reviewDue: future(60),
      reason: "Initial synthetic task definition",
    });
    tasks.push(await action(t, "review"));
  }
  await submitAs(
    jamie,
    "confirmation",
    tasks.map((t) => t.id),
    "",
  );
  await submitAs(sam, "confirmation", [tasks[0].id, tasks[2].id], "");
  await submitAs(robin, "confirmation", [tasks[1].id], "");
  assert.equal(
    (await workspace()).records.filter(
      (r: any) => r.kind === "task" && r.state === "confirmed",
    ).length,
    3,
  );
  const duty = await create("duty", {
    title: "Prepare standard orders for fulfillment",
    ownerId: jamie.id,
    purpose: "Maintain an accurate, complete release packet.",
    scope: "Standard orders in the fictional depot.",
    taskIds: tasks.map((t) => t.id),
    evidenceIds: [sources[0].id],
    reviewDue: future(60),
    reason: "Explicit duty claim separate from task confirmations",
  });
  await action(duty, "review");
  const handoffs: any[] = [];
  for (let i = 0; i < 2; i++) {
    const handoff = await create("handoff", {
      title: i ? "Credit result to release" : "Intake to credit review",
      sourceTaskId: tasks[i].id,
      targetTaskId: tasks[i + 1].id,
      condition: i
        ? "Credit result passes and no exception remains"
        : "Required order fields are complete",
      outputMapping: tasks[i].data.output,
      requiredInput: tasks[i + 1].data.inputs,
      acceptanceCheck:
        "Receiving person checks order reference and completed checklist.",
      exceptionOwnerId: jamie.id,
      timeoutHours: 24,
      maxRetries: 1,
      failureAction:
        "Stop this case and ask Jamie to resolve the missing information.",
      evidenceIds: [sources[0].id],
      reason: "Synthetic handoff contract",
    });
    handoffs.push(await action(handoff, "review"));
  }
  let workflow = await create("workflow", {
    title: "Standard order review and release",
    purpose: "Record the human sequence and receiving checks.",
    ownerId: jamie.id,
    taskIds: tasks.map((t) => t.id),
    handoffIds: handoffs.map((h) => h.id),
    joinPolicy: "all",
    timeoutHours: 24,
    maxAttempts: 2,
    reason: "Training workflow",
  });
  workflow = await action(workflow, "review");
  let workCase = await call(
    advisor,
    prefix + `/workflows/${workflow.id}/cases`,
    "POST",
    {
      expectedVersion: workflow.version,
      title: "TRAIN-001: completed standard order",
      inputReference: "Fictional order TRAIN-001; no external system action",
    },
  );
  for (let i = 0; i < tasks.length; i++)
    workCase = await call(
      advisor,
      prefix + `/workflows/cases/${workCase.id}/actions`,
      "POST",
      {
        expectedVersion: workCase.version,
        stepId: tasks[i].id,
        action: "complete",
        note: "Training observation: required checks completed by the fictional human performer.",
        routeIds: handoffs[i] ? [handoffs[i].id] : [],
      },
    );
  assert.equal(workCase.state, "complete");
  let exception = await call(
    advisor,
    prefix + `/workflows/${workflow.id}/cases`,
    "POST",
    {
      expectedVersion: workflow.version,
      title: "TRAIN-002: missing customer reference",
      inputReference: "Fictional order TRAIN-002; practice an exception",
    },
  );
  exception = await call(
    advisor,
    prefix + `/workflows/cases/${exception.id}/actions`,
    "POST",
    {
      expectedVersion: exception.version,
      stepId: tasks[0].id,
      action: "fail",
      note: "Customer reference is missing. Jamie must resolve this before another attempt.",
    },
  );
  const metric = await create("metric", {
    title: "Median order release duration",
    question: "Does complete intake reduce overall release time?",
    formula: "Median of release timestamp minus intake timestamp",
    unit: "hours",
    population: "20 standard orders per fictional cohort",
    source: "Training queue observations",
    ownerId: jamie.id,
    baseline: 10,
    target: 7,
    window: "One fictional practice week",
    guardrail: "No increase in credit exceptions or incorrect releases.",
  });
  await action(metric, "observe", {
    value: 8,
    observedAt: new Date().toISOString(),
    note: "Synthetic exhibit B, practice cohort of 20; invented median 8 hours.",
  });
  const candidate = await create("candidate", {
    title: "Incomplete intake may delay order release",
    flow: "Standard order intake to release",
    pressure:
      "Incomplete order packets may create waiting and repeated checks.",
    alternative: "Credit reviewer capacity may instead constrain release.",
    counterfactual:
      "If complete intake removes the longest wait, end-to-end release time should fall while credit quality remains unchanged.",
    discriminator:
      "Compare intake waiting with credit review duration in matched cohorts.",
    evidenceIds: sources.map((s) => s.id),
    disconfirmingEvidenceIds: [],
    ownerId: jamie.id,
    throughputUnit: "Standard orders released per week",
  });
  const intervention = await create("intervention", {
    title: "Try a complete-intake checklist",
    candidateId: candidate.id,
    ownerId: jamie.id,
    metricId: metric.id,
    change: "Use the checklist on the next matched practice cohort.",
    prediction:
      "Median release duration falls from 10 hours to at most 7 hours without more credit exceptions.",
    stopConditions: "Stop if incorrect releases or credit exceptions increase.",
    reviewDate: future(7),
  });
  const outcome = await create("outcome", {
    title: "Practice week outcome: inconclusive",
    interventionId: intervention.id,
    ownerId: jamie.id,
    result: "inconclusive",
    observationWindow: "One fictional practice week",
    coverage:
      "20 invented baseline orders and 20 invented practice orders; this is training data.",
    confounders:
      "Small sample, different product mix and unmeasured staffing differences.",
    interpretation:
      "The invented median improved to 8 hours but missed the 7-hour target. The exercise does not establish causation.",
    nextAction:
      "Collect a larger matched cohort and preserve the original prediction.",
    evidenceIds: [sources[1].id],
    reason: "Practice separating observations from causal claims",
  });
  await action(outcome, "review");
  const review = await create("review", {
    title: "Practice review: resolve TRAIN-002 and improve measurement",
    ownerId: jamie.id,
    decision:
      "Keep all release decisions human-controlled. The current hypothesis remains unproven.",
    nextAction:
      "Resolve the missing customer reference and collect matched observations.",
    dueDate: future(7),
  });
  const agent = await create("agent", {
    title: "Order checklist drafting proposal",
    ownerId: jamie.id,
    taskIds: [tasks[0].id],
    purpose:
      "Explore drafting a completeness checklist for human review. No permission or deployment is requested by this training artifact.",
  });
  await mkdir(output, { recursive: true });
  const packages: string[] = [];
  for (const kind of ["executive", "weekly", "audit"]) {
    const w = await workspace();
    const report = await call(advisor, prefix + "/reports", "POST", {
      title: `Northstar Parts — ${kind} training example`,
      kind,
      audience: [
        "Alex Morgan, fictional sponsor",
        "Jamie Park, fictional fulfillment lead",
      ],
      purpose:
        "Show the shape of a reviewed advisor-to-client deliverable using synthetic data.",
      summary:
        "TRAINING EXAMPLE — All people, accounts and measurements are fictional. Three task cards have completed the scripted local participant-confirmation flow. A reviewed manual workflow contains one completed case and one exception. The practice measurement is inconclusive; no automated release or production change occurred.",
      decisions:
        "Keep release decisions with people. Review the missing customer reference in TRAIN-002. Continue testing incomplete intake against the competing credit-capacity explanation.",
      nextSteps:
        "Jamie: resolve the exception and gather a matched cohort before the next review. Alex: review scope and the outcome limitations. Advisor: refresh evidence and regenerate the report when source records change.",
      limitations:
        "Entirely synthetic training data, not a client case study. Four people are in the engagement roster, not all 24 fictional employees. Local invitation assurance only. No independent authority verification, AI provider, email delivery, signed execution ledger or customer runtime is connected. A task confirmation describes work; it grants no permission.",
      recordIds: [
        engagement.id,
        duty.id,
        ...tasks.map((t) => t.id),
        ...handoffs.map((h) => h.id),
        candidate.id,
        metric.id,
        intervention.id,
        outcome.id,
        review.id,
        agent.id,
      ],
      expectedRevision: w.company.revision,
    });
    await call(advisor, prefix + `/reports/${report.id}/review`, "POST", {
      expectedVersion: report.version,
      contentHash: report.hash,
      decision: "approve",
      note: "Reviewed exact fictional content and named fictional audience for publication as training material; no real client distribution.",
    });
    const bytes = await call(
      advisor,
      prefix + `/reports/${report.id}/download`,
      "GET",
      undefined,
      true,
    );
    await writeFile(`${output}/${kind}-client-example.zip`, bytes);
    const zip = await JSZip.loadAsync(bytes);
    await writeFile(
      `${output}/${kind}-client-example.html`,
      await zip.file("client-report.html")!.async("string"),
    );
    packages.push(`${kind}-client-example.zip`);
  }
  for (const kind of ["confirmed", "agent"]) {
    const packet = await call(advisor, prefix + "/exports", "POST", {
      kind,
      ...(kind === "agent" ? { agentId: agent.id } : {}),
    });
    const bytes = await call(
      advisor,
      prefix + `/exports/${packet.id}/download`,
      "GET",
      undefined,
      true,
    );
    await writeFile(`${output}/${kind}-internal-example.zip`, bytes);
    packages.push(`${kind}-internal-example.zip`);
  }
  await projectAll();
  const w = await workspace();
  const manifest = {
    generatedAt: new Date().toISOString(),
    synthetic: true,
    companyId: company.id,
    companyName: company.name,
    recordCount: w.records.length,
    assertions: {
      confirmedTasks: 3,
      rosterPeople: 4,
      completedCases: 1,
      casesNeedingAttention: 1,
      reviewedOutcome: "inconclusive",
      externalActions: 0,
    },
    packages,
    records: w.records.map((r: any) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      state: r.state,
      version: r.version,
    })),
  };
  await writeFile(
    `${output}/training-manifest.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        companyId: company.id,
        name: company.name,
        records: w.records.length,
        packages,
        checks: "API journey passed; synthetic participants only",
      },
      null,
      2,
    ),
  );
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
}
