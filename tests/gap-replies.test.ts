import "dotenv/config";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { registerAccount } from "../server/auth.ts";
import { pool, tx, hash, putRecord } from "../server/db.ts";
import { createOrEdit } from "../server/records.ts";
import {
  enqueueGapReply,
  processGapReply,
  validateGapReply,
  type GapReplyInput,
} from "../server/gap-replies.ts";
import type { GapReplyPlan } from "../shared/gap-reply.ts";
import { checkWorkflow } from "../server/workflows.ts";
import express from "express";
import { errorHandler } from "../server/app.ts";
import { teamLinkRouter } from "../server/team-link.ts";
import { issueInvitation } from "../server/invitations.ts";

after(() => pool.end());
const empty = (): GapReplyPlan => ({
  summary: "Saved the employee's report.",
  unresolved: [],
  tasks: [],
  duties: [],
  handoffs: [],
  workflows: [],
});
const text =
  "I check the order in Ledger when it arrives, using the order details. I compare quantities and send the checked order to shipping. I am responsible for checking orders. I ask the manager about differences.";
function task(personId: string) {
  return {
    ref: "check-order",
    id: "",
    title: "Check the order",
    duty: "Order checking",
    purpose: "Check order quantities",
    trigger: "An order arrives",
    inputs: "Order details",
    instructions: "Compare the quantities",
    output: "Checked order",
    destination: "Shipping",
    systems: ["Ledger"],
    humanGate: "Ask the manager about differences",
    ownerId: personId,
    performerId: personId,
    quotes: [text],
  };
}
async function fixture(
  options: { existing?: boolean; reviewed?: boolean; text?: string } = {},
) {
  const user = await registerAccount({
    name: "Gap advisor",
    email: `${randomUUID()}@test.invalid`,
    password: "Synthetic password 123!",
    companyName: "Fictional reply test",
    scope: "Synthetic gap replies",
    goal: "Check durable processing",
  });
  return tx(user.tenant_id, async (db) => {
    const companyId = (
      await db.query("SELECT id FROM companies WHERE tenant_id=$1", [
        user.tenant_id,
      ])
    ).rows[0].id;
    const profile = {
      streams: [
        {
          id: "orders",
          label: "Orders",
          stages: [{ id: "check", label: "Check orders" }],
        },
      ],
    };
    await db.query(
      "UPDATE companies SET sandbox=true,settings=jsonb_set(settings,'{businessProfile}',$2::jsonb) WHERE id=$1",
      [companyId, JSON.stringify(profile)],
    );
    const person = await createOrEdit(db, user, companyId, "person", {
      name: "Alex Example",
      email: user.email,
      role: "Order clerk",
      team: "Orders",
    });
    let existing;
    if (options.existing) {
      const { ref: _ref, id: _id, quotes: _quotes, ...data } = task(person.id);
      existing = await createOrEdit(db, user, companyId, "task", {
        ...data,
        trigger: "Not reported.",
        performerId: "",
        systems: [],
        reviewDue: "2099-01-01",
        reason: "Synthetic manual work",
      });
      if (options.reviewed)
        existing = await putRecord(
          db,
          user,
          companyId,
          "task",
          existing.title,
          { ...existing.data, reviewed: true },
          "proposed",
          existing,
        );
    }
    const request = await putRecord(
      db,
      user,
      companyId,
      "request",
      "Order detail questions",
      {
        type: "work",
        questionPlanVersion: "work-gap:v1",
        personId: person.id,
        dueDate: "2099-01-01",
        questions: ["What happens when an order arrives?"],
        notice: "Private synthetic response",
        gapContext: {
          version: 1,
          streamId: "orders",
          stageId: "check",
          stageLabel: "Check orders",
          gapKeys: ["tasks"],
          recordSnapshots: [person, ...(existing ? [existing] : [])].map(
            (r) => ({ id: r.id, version: r.version, hash: r.hash }),
          ),
          profileHash: hash(profile),
        },
      },
      "returned",
    );
    const response = await putRecord(
      db,
      user,
      companyId,
      "response",
      "Reply",
      {
        requestId: request.id,
        personId: person.id,
        text: options.text || text,
      },
      "returned",
    );
    const job = (await enqueueGapReply(
      db,
      user,
      companyId,
      request,
      response,
    ))!;
    return { user, companyId, person, request, response, job, existing };
  });
}

test("reply enqueue is idempotent and concurrent workers apply once with exact evidence", async () => {
  const f = await fixture();
  let calls = 0;
  const duplicate = await tx(f.user.tenant_id, (db) =>
    enqueueGapReply(db, f.user, f.companyId, f.request, f.response),
  );
  assert.equal(duplicate!.id, f.job.id);
  const provider = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 30));
    return {
      ...empty(),
      tasks: [task(f.person.id)],
      duties: [
        {
          ref: "duty",
          id: "",
          title: "Order checking",
          purpose: "Check order quantities",
          scope: "Incoming orders",
          ownerId: f.person.id,
          taskRefs: ["check-order"],
          quotes: [text],
        },
      ],
    };
  };
  const results = await Promise.all([
    processGapReply(f.user.tenant_id, f.job.id, provider),
    processGapReply(f.user.tenant_id, f.job.id, provider),
  ]);
  assert.equal(calls, 1);
  assert.equal(results.find(Boolean)?.state, "complete");
  const records = (
    await tx(f.user.tenant_id, (db) =>
      db.query("SELECT * FROM records WHERE company_id=$1", [f.companyId]),
    )
  ).rows;
  const saved = records.find((r) => r.kind === "task"),
    duty = records.find((r) => r.kind === "duty"),
    evidence = records.find((r) => r.kind === "evidence");
  assert.equal(saved.state, "proposed");
  assert.equal(saved.data.reviewed, false);
  assert.equal(saved.data.mode, "human_only");
  assert.deepEqual(duty.data.taskIds, [saved.id]);
  assert.deepEqual(saved.data.businessStageLinks, [
    { streamId: "orders", stageId: "check" },
  ]);
  assert.equal(evidence.data.responseHash, f.response.hash);
  assert.equal(evidence.data.responseVersion, f.response.version);
  assert.deepEqual(saved.data.evidenceIds, [evidence.id]);
  assert.equal(records.find((r) => r.id === f.response.id).state, "accepted");
  await processGapReply(f.user.tenant_id, f.job.id, provider);
  assert.equal(calls, 1);
});

test("unsupported quotes or people cannot become work records", async () => {
  const f = await fixture();
  const r = await processGapReply(f.user.tenant_id, f.job.id, async () => ({
    ...empty(),
    tasks: [
      {
        ...task(f.person.id),
        quotes: ["A competitor processes orders this way."],
      },
    ],
  }));
  assert.equal(r?.state, "needs_review");
  const rows = (
    await tx(f.user.tenant_id, (db) =>
      db.query("SELECT kind,state FROM records WHERE company_id=$1", [
        f.companyId,
      ]),
    )
  ).rows;
  assert.equal(
    rows.some((r) => r.kind === "task"),
    false,
  );
  assert.equal(rows.find((r) => r.kind === "response").state, "returned");
  const input: GapReplyInput = {
    response: {
      id: f.response.id,
      version: 1,
      hash: f.response.hash,
      text,
      personId: f.person.id,
    },
    stage: f.request.data.gapContext,
    records: [f.person],
  };
  assert.throws(
    () =>
      validateGapReply(
        { ...empty(), tasks: [{ ...task(randomUUID()) }] },
        input,
      ),
    /named team member/,
  );
});

test("changed profile prevents paid work and preserves response", async () => {
  const f = await fixture();
  let calls = 0;
  await tx(f.user.tenant_id, (db) =>
    db.query(
      "UPDATE companies SET settings=jsonb_set(settings,'{businessProfile}','{}') WHERE id=$1",
      [f.companyId],
    ),
  );
  await processGapReply(f.user.tenant_id, f.job.id, async () => {
    calls++;
    return empty();
  });
  const job = (
    await tx(f.user.tenant_id, (db) =>
      db.query("SELECT state,result FROM provider_jobs WHERE id=$1", [
        f.job.id,
      ]),
    )
  ).rows[0];
  assert.equal(job.state, "needs_review");
  assert.equal(calls, 0);
  assert.deepEqual(job.result.appliedRecordIds, []);
});

test("changes while AI runs are preserved and its proposal needs review", async () => {
  const f = await fixture();
  const r = await processGapReply(f.user.tenant_id, f.job.id, async () => {
    await tx(f.user.tenant_id, (db) =>
      putRecord(
        db,
        f.user,
        f.companyId,
        "person",
        f.person.title,
        { ...f.person.data, role: "Updated manually" },
        f.person.state,
        f.person,
      ),
    );
    return { ...empty(), tasks: [task(f.person.id)] };
  });
  assert.equal(r?.state, "needs_review");
  assert.deepEqual(r?.result.appliedRecordIds, []);
  assert.ok(r?.result.draft.tasks.length);
});

test("synthetic companies wait for an injected provider, then resume once", async () => {
  const f = await fixture();
  await processGapReply(f.user.tenant_id, f.job.id);
  const waiting = (
    await tx(f.user.tenant_id, (db) =>
      db.query("SELECT state FROM provider_jobs WHERE id=$1", [f.job.id]),
    )
  ).rows[0];
  assert.equal(waiting.state, "waiting_configuration");
  const done = await processGapReply(f.user.tenant_id, f.job.id, async () =>
    empty(),
  );
  assert.equal(done?.state, "complete");
});

test("unknown outcomes never retry, stale running recovers to unknown, and other tenants cannot claim", async () => {
  const f = await fixture();
  let calls = 0;
  const provider = async () => {
    calls++;
    throw new Error("Simulated lost response");
  };
  assert.equal(
    (await processGapReply(f.user.tenant_id, f.job.id, provider))?.state,
    "unknown",
  );
  await processGapReply(f.user.tenant_id, f.job.id, provider);
  assert.equal(calls, 1);
  const other = await fixture();
  assert.equal(
    await processGapReply(other.user.tenant_id, f.job.id, provider),
    null,
  );
  await tx(other.user.tenant_id, (db) =>
    db.query(
      "UPDATE provider_jobs SET state='running',created_at=now()-interval '10 minutes' WHERE id=$1",
      [other.job.id],
    ),
  );
  await processGapReply(other.user.tenant_id, other.job.id, provider);
  const job = (
    await tx(other.user.tenant_id, (db) =>
      db.query("SELECT state FROM provider_jobs WHERE id=$1", [other.job.id]),
    )
  ).rows[0];
  assert.equal(job.state, "unknown");
  assert.equal(calls, 1);
});

test("reported sequences become documentation without fabricated execution policy", async () => {
  const f = await fixture();
  const r = await processGapReply(f.user.tenant_id, f.job.id, async () => ({
    ...empty(),
    tasks: [
      task(f.person.id),
      {
        ...task(f.person.id),
        ref: "send-order",
        title: "Send checked order",
        trigger: "Order is checked",
        instructions: "Send the checked order to shipping",
      },
    ],
    handoffs: [
      {
        ref: "handoff",
        title: "Give order to shipping",
        sourceTaskRef: "check-order",
        targetTaskRef: "send-order",
        condition: "The order is checked",
        outputMapping: "Checked order",
        requiredInput: "Checked order",
        acceptanceCheck: "",
        exceptionOwnerId: f.person.id,
        timeoutHours: null,
        maxRetries: null,
        failureAction: "",
        quotes: [text],
      },
    ],
    workflows: [
      {
        ref: "flow",
        title: "Check and send orders",
        purpose: "Check the order then send it to shipping",
        ownerId: f.person.id,
        taskRefs: ["check-order", "send-order"],
        handoffRefs: ["handoff"],
        joinPolicy: "all",
        timeoutHours: null,
        maxAttempts: null,
        quotes: [text],
      },
    ],
  }));
  assert.equal(r?.state, "complete");
  assert.equal(r?.result.appliedRecordIds.length, 4);
  assert.match(r?.result.notes.join(" "), /unconfigured/);
  assert.deepEqual(r?.result.unresolved, []);
  const flow = (
    await tx(f.user.tenant_id, (db) =>
      db.query(
        "SELECT * FROM records WHERE company_id=$1 AND kind='workflow'",
        [f.companyId],
      ),
    )
  ).rows[0];
  assert.equal(flow.data.documentationOnly, true);
  await assert.rejects(
    checkWorkflow(null, f.companyId, { ...flow, state: "reviewed" }),
    /Configure and review/,
  );
});

test("existing gaps fill without replacing populated manual fields or granting approval", async () => {
  const f = await fixture({ existing: true });
  const r = await processGapReply(f.user.tenant_id, f.job.id, async () => ({
    ...empty(),
    tasks: [
      {
        ...task(f.person.id),
        ref: f.existing!.id,
        id: f.existing!.id,
        purpose: "New conflicting purpose",
      },
    ],
  }));
  assert.equal(r?.state, "needs_review");
  assert.deepEqual(r?.result.appliedRecordIds, [f.existing!.id]);
  const saved = (
    await tx(f.user.tenant_id, (db) =>
      db.query("SELECT * FROM records WHERE id=$1", [f.existing!.id]),
    )
  ).rows[0];
  assert.equal(saved.data.purpose, f.existing!.data.purpose);
  assert.equal(saved.data.trigger, "An order arrives");
  assert.equal(saved.data.performerId, f.person.id);
  assert.equal(saved.data.reviewed, false);
  assert.equal(saved.version, f.existing!.version + 1);
});

test("reviewed work is preserved even when its version matches the original request", async () => {
  const f = await fixture({ existing: true, reviewed: true });
  const r = await processGapReply(f.user.tenant_id, f.job.id, async () => ({
    ...empty(),
    tasks: [{ ...task(f.person.id), ref: f.existing!.id, id: f.existing!.id }],
  }));
  assert.equal(r?.state, "needs_review");
  assert.deepEqual(r?.result.appliedRecordIds, []);
  const saved = (
    await tx(f.user.tenant_id, (db) =>
      db.query("SELECT * FROM records WHERE id=$1", [f.existing!.id]),
    )
  ).rows[0];
  assert.equal(saved.hash, f.existing!.hash);
  assert.equal(saved.data.reviewed, true);
});

test("a private typed gap reply commits its queue before automatic processing and stays single use", async () => {
  const f = await fixture();
  const link = await tx(f.user.tenant_id, async (db) => {
    const request = await putRecord(
      db,
      f.user,
      f.companyId,
      "request",
      "Private gap followup",
      f.request.data,
      "draft",
    );
    return issueInvitation(
      db,
      f.user,
      f.companyId,
      request,
      request.version,
      "manual_link",
    );
  });
  const token = link.url.split("/").at(-1)!;
  let sawCommittedResponse = false,
    calls = 0;
  const app = express();
  app.use(express.json());
  app.use(
    "/test",
    teamLinkRouter(undefined, async (input) => {
      calls++;
      const rows = await tx(f.user.tenant_id, (db) =>
        db.query(
          "SELECT r.id FROM records r JOIN provider_jobs j ON j.input->>'responseId'=r.id::text WHERE r.id=$1 AND r.state='returned' AND j.kind='gap_reply' AND j.state='running'",
          [input.response.id],
        ),
      );
      sawCommittedResponse = rows.rowCount === 1;
      return { ...empty(), tasks: [task(f.person.id)] };
    }),
  );
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}/test/${token}/team`;
  try {
    const page = (await (await fetch(url)).json()) as any;
    assert.equal(page.gapFollowup, true);
    assert.equal(page.stageLabel, "Check orders");
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedVersion: page.version,
        acknowledged: true,
        text,
      }),
    };
    const submitted = (await (await fetch(url, options)).json()) as any;
    assert.equal(submitted.processing, true);
    assert.equal(submitted.ok, true);
    assert.equal("gapTenantId" in submitted, false);
    let jobState = "";
    for (let i = 0; i < 100; i++) {
      const job = (
        await tx(f.user.tenant_id, (db) =>
          db.query(
            "SELECT state FROM provider_jobs WHERE kind='gap_reply' AND input->>'responseId'=$1",
            [submitted.responseId],
          ),
        )
      ).rows[0];
      jobState = job?.state || "";
      if (job?.state === "complete") break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(jobState, "complete");
    assert.equal(sawCommittedResponse, true);
    assert.equal(calls, 1);
    const repeat = await fetch(url, options);
    assert.equal(repeat.status, 410);
    assert.equal(calls, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("an old queued response receives a fresh claim timestamp and is not recovered as an unknown call", async () => {
  const f = await fixture();
  await tx(f.user.tenant_id, (db) =>
    db.query(
      "UPDATE provider_jobs SET created_at=now()-interval '1 day' WHERE id=$1",
      [f.job.id],
    ),
  );
  const result = await processGapReply(f.user.tenant_id, f.job.id, async () => {
    const reentrant = await processGapReply(
      f.user.tenant_id,
      f.job.id,
      async () => {
        throw new Error("Must not call twice");
      },
    );
    assert.equal(reentrant, null);
    return empty();
  });
  assert.equal(result?.state, "complete");
});

test("an explicitly standalone step is documented without inventing an accountable owner", async () => {
  const end =
    "This check is standalone work and ends here. There is no next task or handoff.";
  const f = await fixture({ text: text + " " + end });
  const result = await processGapReply(
    f.user.tenant_id,
    f.job.id,
    async () => ({
      ...empty(),
      tasks: [task(f.person.id)],
      workflows: [
        {
          ref: "standalone",
          title: "Standalone order check",
          purpose: "Document the standalone order check",
          ownerId: "",
          taskRefs: ["check-order"],
          handoffRefs: [],
          joinPolicy: "all",
          timeoutHours: null,
          maxAttempts: null,
          quotes: [end],
        },
      ],
    }),
  );
  assert.equal(result?.result.appliedRecordIds.length, 2);
  const flow = (
    await tx(f.user.tenant_id, (db) =>
      db.query(
        "SELECT data FROM records WHERE company_id=$1 AND kind='workflow'",
        [f.companyId],
      ),
    )
  ).rows[0];
  assert.equal(flow.data.documentationOnly, true);
  assert.equal(flow.data.ownerId, "");
  assert.equal(flow.data.taskIds.length, 1);
  assert.deepEqual(flow.data.handoffIds, []);
});

test("a sponsoring account that loses advisor access cannot automatically apply company work", async () => {
  const f = await fixture();
  let calls = 0;
  await pool.query(
    "UPDATE users SET role='participant',person_id=$2,company_id=$3 WHERE id=$1",
    [f.user.id, f.person.id, f.companyId],
  );
  await processGapReply(f.user.tenant_id, f.job.id, async () => {
    calls++;
    return empty();
  });
  assert.equal(calls, 0);
  const job = (
    await tx(f.user.tenant_id, (db) =>
      db.query("SELECT state FROM provider_jobs WHERE id=$1", [f.job.id]),
    )
  ).rows[0];
  assert.equal(job.state, "needs_review");
});
