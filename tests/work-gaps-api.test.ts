import "dotenv/config";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp, errorHandler } from "../server/app.ts";
import { registerAccount } from "../server/auth.ts";
import { pool, tx, hash } from "../server/db.ts";
import { createOrEdit } from "../server/records.ts";
import { sealSecret } from "../server/providers.ts";
import {
  sendGapQuestions,
  runGapFollowups,
  workGapSnapshot,
} from "../server/work-gaps.ts";
import type {
  InvitationMessage,
  EmailProvider,
} from "../server/invitations.ts";
import {
  processGapReplies,
  type GapReplyProvider,
} from "../server/gap-replies.ts";

process.env.PROVIDER_ENCRYPTION_KEY ||= "11".repeat(32);
const accounts: string[] = [];
after(async () => {
  for (const tenant of accounts)
    await tx(tenant, async (db) => {
      await db.query(
        "UPDATE companies SET settings=jsonb_set(settings,'{gapFollowups}','{\"enabled\":false,\"recipients\":[]}'::jsonb)",
      );
      await db.query(
        "UPDATE provider_jobs SET state='cancelled' WHERE kind IN ('gap_outreach','gap_reply') AND state IN ('queued','running','waiting_configuration')",
      );
      await db.query("UPDATE provider_settings SET enabled=false");
    });
  await pool.end();
});
const profile = {
  industry: "Synthetic wholesale",
  status: "advisor_reviewed",
  rationale: "Fictional tests only",
  streams: [
    {
      id: "wholesale",
      name: "Wholesale",
      templateId: "custom",
      stages: [
        { id: "accounts", name: "Develop accounts", functionIds: ["attract"] },
      ],
    },
  ],
};
async function fixture(sandbox = false) {
  const user = await registerAccount({
    name: "Synthetic advisor",
    email: `${randomUUID()}@test.invalid`,
    password: "Synthetic password 123!",
    companyName: "Synthetic gap API",
    scope: "Fictional test",
    goal: "Verify private follow-ups",
  });
  accounts.push(user.tenant_id);
  return tx(user.tenant_id, async (db) => {
    const company = (
      await db.query("SELECT * FROM companies WHERE tenant_id=$1", [
        user.tenant_id,
      ])
    ).rows[0];
    await db.query(
      "UPDATE companies SET sandbox=$2,settings=jsonb_set(settings,'{businessProfile}',$3::jsonb) WHERE id=$1",
      [company.id, sandbox, profile],
    );
    for (const provider of ["resend", "openai"])
      await db.query(
        "INSERT INTO provider_settings(tenant_id,provider,encrypted_key,enabled,config) VALUES($1,$2,$3,true,$4)",
        [
          user.tenant_id,
          provider,
          sealSecret("synthetic-key", `${user.tenant_id}:${provider}`),
          {
            from: "advisor@synthetic-dutygraph-fixture.net",
            model: "gpt-5-mini",
          },
        ],
      );
    const person = await createOrEdit(db, user, company.id, "person", {
      name: "Alex Example",
      email: `alex-${randomUUID()}@synthetic-dutygraph-fixture.net`,
      role: "Account coordinator",
      team: "Sales",
    });
    const task = await createOrEdit(db, user, company.id, "task", {
      title: "Document account needs",
      duty: "Develop business accounts",
      ownerId: person.id,
      performerId: person.id,
      purpose: "Not reported.",
      trigger: "Not reported.",
      inputs: "Not reported.",
      instructions: "Not reported.",
      output: "Not reported.",
      humanGate: "Not reported.",
      businessStageLinks: [{ streamId: "wholesale", stageId: "accounts" }],
      reviewDue: "2099-01-01",
      reason: "Synthetic missing details",
    });
    const duty = await createOrEdit(db, user, company.id, "duty", {
      title: "Develop business accounts",
      purpose: "Understand a new account",
      scope: "New accounts",
      ownerId: person.id,
      taskIds: [task.id],
      businessStageLinks: [{ streamId: "wholesale", stageId: "accounts" }],
      reviewDue: "2099-01-01",
      reason: "Synthetic duty",
    });
    return { user, company: company.id, person, task, duty };
  });
}
async function serverFor(
  f: Awaited<ReturnType<typeof fixture>>,
  emailProvider: EmailProvider,
  gapReplyProvider?: GapReplyProvider,
) {
  const app = createApp({
    emailProvider,
    gapReplyProvider,
    authRequestsPerWindow: 500,
  });
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: f.user.email,
      password: "Synthetic password 123!",
    }),
  });
  assert.equal(login.status, 200);
  const auth = (await login.json()) as any,
    cookie = login.headers.get("set-cookie")!.split(";")[0];
  const call = async (path: string, body?: unknown, key = randomUUID()) => {
    const response = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        Cookie: cookie,
        "X-CSRF-Token": auth.csrf,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: (await response.json()) as any };
  };
  return {
    base,
    call,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
const runBody = (
  f: Awaited<ReturnType<typeof fixture>>,
  automatic = false,
) => ({
  streamId: "wholesale",
  stageId: "accounts",
  recipients: [{ personId: f.person.id, email: f.person.data.email }],
  automatic,
  profileHash: hash(profile),
});

test("gap status and work detail come from the same snapshot during reply completion", async () => {
  const f = await fixture();
  const jobId = randomUUID();
  await tx(f.user.tenant_id, async (db) => {
    const request = await createOrEdit(db, f.user, f.company, "request", {
      title: "Describe the account work",
      personId: f.person.id,
      type: "work",
      questions: ["How do you record account needs?"],
      taskIds: [],
      dueDate: "2099-01-01",
      notice: "Synthetic consistency check.",
      questionPlanVersion: "work-gap:v1",
    });
    await db.query(
      "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'gap_reply','queued',$4)",
      [jobId, f.user.tenant_id, f.company, { requestId: request.id }],
    );
  });
  let completed = false;
  const before = await tx(f.user.tenant_id, async (db) => {
    const snapshotDb = Object.create(db);
    snapshotDb.query = async (sql: string, values: unknown[]) => {
      const result = await db.query(sql, values);
      // Complete on a separate connection immediately after the work read.
      // Separate work/job reads would now return old gaps with a complete job.
      if (!completed && /FROM records\b/.test(sql)) {
        completed = true;
        await tx(f.user.tenant_id, async (worker) => {
          await worker.query(
            "UPDATE records SET data=data||$2::jsonb WHERE id=$1",
            [
              f.task.id,
              {
                trigger: "A prospect asks for supplies",
                inputs: "The product list",
                instructions:
                  "Record each product and quantity in Ledger. Confirm the list with the prospect.",
                output: "A checked account note",
                destination: "Ledger for the account coordinator",
              },
            ],
          );
          await worker.query(
            "UPDATE provider_jobs SET state='complete' WHERE id=$1",
            [jobId],
          );
        });
      }
      return result;
    };
    return workGapSnapshot(snapshotDb, f.user, f.company);
  });
  assert.equal(completed, true);
  assert.equal(before.requests[0].replyState, "queued");
  assert.equal(
    before.gaps.some((g) => g.code === "task_detail"),
    true,
  );
  const after = await tx(f.user.tenant_id, (db) =>
    workGapSnapshot(db, f.user, f.company),
  );
  assert.equal(after.requests[0].replyState, "complete");
  assert.equal(
    after.gaps.some((g) => g.code === "task_detail"),
    false,
  );
});

test("gap email -> password-free reply -> automatic mapped task and standalone flow; reads/replays never resend", async () => {
  const f = await fixture(),
    messages: InvitationMessage[] = [];
  let aiCalls = 0;
  const answer =
    "I document account needs. A prospect asks for supplies. I use their product list to understand the account. I type the product names and quantities in Ledger, check the list with the prospect, and save an account note. I am responsible for this work. The note stays in Ledger for me. This is one standalone task and ends here.";
  const provider: GapReplyProvider = async (input) => {
    aiCalls++;
    return {
      summary: "Recorded the account task and where it ends.",
      unresolved: [],
      tasks: [
        {
          ref: f.task.id,
          id: f.task.id,
          title: f.task.title,
          duty: f.task.data.duty,
          purpose: "Understand the account",
          trigger: "A prospect asks for supplies",
          inputs: "The prospect's product list",
          instructions:
            "Type the product names and quantities in Ledger. Check the list with the prospect. Save the account note.",
          output: "An account note",
          destination: "The note stays in Ledger for Alex",
          systems: ["Ledger"],
          humanGate: "Check the list with the prospect",
          ownerId: f.person.id,
          performerId: f.person.id,
          quotes: [input.response.text],
        },
      ],
      duties: [],
      handoffs: [],
      workflows: [
        {
          ref: "account-needs",
          title: "Record account needs",
          purpose: "Understand a new account's supply needs",
          ownerId: f.person.id,
          taskRefs: [f.task.id],
          handoffRefs: [],
          joinPolicy: "all",
          timeoutHours: null,
          maxAttempts: null,
          quotes: [input.response.text],
        },
      ],
    };
  };
  const s = await serverFor(
    f,
    async (message) => {
      messages.push(message);
      return { id: "synthetic-email" };
    },
    provider,
  );
  try {
    const path = `/api/v1/companies/${f.company}/work-gaps`;
    const before = await s.call(path);
    assert.equal(before.status, 200);
    assert.equal(before.data.policy.enabled, false);
    assert.equal(messages.length, 0);
    assert.ok(before.data.gaps.some((g: any) => g.code === "task_detail"));
    const key = randomUUID();
    const [one, two] = await Promise.all([
      s.call(path + "/run", runBody(f), key),
      s.call(path + "/run", runBody(f), key),
    ]);
    assert.equal(one.status, 200, JSON.stringify(one.data));
    assert.equal(two.status, 200);
    assert.equal(messages.length, 1);
    const snapshot = (await s.call(path)).data;
    assert.equal(snapshot.requests.length, 1);
    assert.equal(snapshot.requests[0].emailState, "accepted");
    assert.deepEqual(messages[0].to, [f.person.data.email]);
    assert.match(messages[0].html!, /max-width:600px/);
    assert.doesNotMatch(messages[0].html!, /#94b8a4|#edf3ef/);
    const token = messages[0].text.match(/\/invite\/([a-f0-9]{64})/)![1];
    assert.equal(JSON.stringify(snapshot).includes(token), false);
    const read = await fetch(s.base + `/api/invitations/${token}/team`);
    const request = (await read.json()) as any;
    assert.equal(read.status, 200);
    assert.equal(read.headers.get("set-cookie"), null);
    assert.equal(request.gapFollowup, true);
    assert.ok(request.questions.length <= 3);
    const submit = await fetch(s.base + `/api/invitations/${token}/team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedVersion: request.version,
        acknowledged: true,
        text: answer,
      }),
    });
    assert.equal(submit.status, 200);
    assert.equal(((await submit.json()) as any).processing, true);
    let after: any;
    for (let i = 0; i < 50; i++) {
      after = (await s.call(path)).data;
      if (
        ["complete", "needs_review", "unknown"].includes(
          after.requests[0].replyState,
        )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(
      after.requests[0].replyState,
      "complete",
      JSON.stringify(after.requests),
    );
    assert.equal(aiCalls, 1);
    const rows = (
      await tx(f.user.tenant_id, (db) =>
        db.query("SELECT * FROM records WHERE company_id=$1", [f.company]),
      )
    ).rows;
    assert.match(
      rows.find((r) => r.id === f.task.id).data.instructions,
      /Ledger/,
    );
    assert.equal(
      rows.find((r) => r.kind === "workflow").data.documentationOnly,
      true,
    );
    assert.equal(
      after.gaps.some((g: any) =>
        ["task_detail", "work_sequence"].includes(g.code),
      ),
      false,
      JSON.stringify(after.gaps),
    );
    const used = await fetch(s.base + `/api/invitations/${token}/team`);
    assert.equal(used.status, 410);
    await sendGapQuestions(f.user.tenant_id, f.company, async () => {
      throw new Error("must not resend");
    });
    assert.equal(messages.length, 1);
  } finally {
    await s.close();
  }
});

test("gap sends block sample data, changed addresses, foreign company, and unknown outcomes never retry", async () => {
  const f = await fixture(),
    other = await fixture(true);
  let attempts = 0;
  const s = await serverFor(f, async () => {
    attempts++;
    throw new Error("synthetic lost connection");
  });
  const sample = await serverFor(other, async () => {
    throw new Error("must never send sample");
  });
  try {
    const path = `/api/v1/companies/${f.company}/work-gaps`;
    assert.equal(
      (await s.call(`/api/v1/companies/${other.company}/work-gaps`)).status,
      404,
    );
    const bad = {
      ...runBody(f),
      recipients: [
        {
          personId: f.person.id,
          email: "someone@synthetic-dutygraph-fixture.net",
        },
      ],
    };
    assert.equal((await s.call(path + "/run", bad)).status, 409);
    const sampleSend = await sample.call(
      `/api/v1/companies/${other.company}/work-gaps/run`,
      runBody(other),
    );
    assert.equal(sampleSend.status, 409);
    const unknown = await s.call(path + "/run", runBody(f));
    assert.equal(unknown.status, 200);
    assert.equal(unknown.data.requests[0].emailState, "unknown");
    await sendGapQuestions(f.user.tenant_id, f.company, async () => {
      attempts++;
      return { id: "wrong" };
    });
    await s.call(path + "/run", runBody(f));
    assert.equal(attempts, 1);
  } finally {
    await s.close();
    await sample.close();
  }
});

test("automatic policy pause/resume preserves exact recipient; old queued jobs use send start time", async () => {
  const f = await fixture();
  let attempts = 0;
  const s = await serverFor(f, async () => {
    attempts++;
    return { id: "synthetic" };
  });
  try {
    const path = `/api/v1/companies/${f.company}/work-gaps`;
    // Reserve a real queued request while keeping all provider calls synthetic.
    const first = await s.call(path + "/run", runBody(f, true));
    assert.equal(first.status, 200);
    assert.equal(attempts, 1);
    const requestId = first.data.requests[0].id;
    await tx(f.user.tenant_id, async (db) => {
      await db.query(
        "UPDATE records SET state='draft' WHERE company_id=$1 AND id=$2",
        [f.company, requestId],
      );
      await db.query(
        "UPDATE provider_jobs SET state='queued',input=input-'sendStartedAt',created_at=now()-interval '1 hour' WHERE company_id=$1 AND kind='gap_outreach'",
        [f.company],
      );
    });
    const policy = {
      enabled: false,
      recipients: runBody(f).recipients,
      profileHash: hash(profile),
    };
    assert.equal(
      (await s.call(path + "/policy", policy)).data.requests[0].emailState,
      "paused",
    );
    assert.equal(
      await sendGapQuestions(f.user.tenant_id, f.company, async () => {
        throw new Error("paused");
      }),
      0,
    );
    assert.equal(
      (await s.call(path + "/policy", { ...policy, enabled: true })).data
        .requests[0].emailState,
      "queued",
    );
    let unblock!: () => void;
    const blocked = new Promise<void>((resolve) => (unblock = resolve));
    const sending = sendGapQuestions(f.user.tenant_id, f.company, async () => {
      await blocked;
      return { id: "synthetic-late" };
    });
    for (let i = 0; i < 40; i++) {
      if ((await s.call(path)).data.requests[0].emailState === "running") break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await sendGapQuestions(f.user.tenant_id, f.company, async () => {
      throw new Error("duplicate");
    });
    assert.equal((await s.call(path)).data.requests[0].emailState, "running");
    unblock();
    await sending;
    await s.call(path + "/policy", policy);
  } finally {
    await s.close();
  }
});
