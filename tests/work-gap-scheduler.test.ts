import "dotenv/config";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { pool, tx, hash, putRecord } from "../server/db.ts";
import { publicUser, defaultSettings } from "../server/auth.ts";
import { errorHandler } from "../server/app.ts";
import { createOrEdit } from "../server/records.ts";
import { sealSecret } from "../server/providers.ts";
import { runGapFollowups, workGapsRouter } from "../server/work-gaps.ts";
import type {
  EmailProvider,
  InvitationMessage,
} from "../server/invitations.ts";

process.env.PROVIDER_ENCRYPTION_KEY ||= "11".repeat(32);
const accounts: string[] = [];
const profile = {
  industry: "Synthetic wholesale",
  status: "advisor_reviewed",
  rationale: "Scheduler tests only",
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
async function clean(tenant: string) {
  await tx(tenant, async (db) => {
    await db.query(
      "UPDATE companies SET settings=jsonb_set(settings,'{gapFollowups}','{\"enabled\":false,\"recipients\":[]}'::jsonb)",
    );
    await db.query(
      "UPDATE provider_jobs SET state='cancelled' WHERE kind IN ('gap_outreach','gap_reply') AND state IN ('queued','running','waiting_configuration','paused')",
    );
    await db.query("UPDATE provider_settings SET enabled=false");
  });
}
after(async () => {
  for (const tenant of accounts) await clean(tenant);
  await pool.end();
});
async function fixture(tenant: string = randomUUID()) {
  await pool.query(
    "INSERT INTO tenants(id,name) VALUES($1,'Synthetic scheduler fixture')",
    [tenant],
  );
  accounts.push(tenant);
  return tx(tenant, async (db) => {
    const user = publicUser(
      (
        await db.query(
          "INSERT INTO users(id,tenant_id,email,name,password_hash,role) VALUES($1,$2,$3,'Synthetic scheduler advisor','unused-test-hash','advisor') RETURNING *",
          [randomUUID(), tenant, `${randomUUID()}@test.invalid`],
        )
      ).rows[0],
    );
    const company = randomUUID();
    await db.query(
      "INSERT INTO companies(id,tenant_id,name,scope,goal,settings,sandbox) VALUES($1,$2,'Synthetic scheduler company','Fictional tests','Verify bounded cron',$3,false)",
      [company, tenant, { ...defaultSettings(), businessProfile: profile }],
    );
    for (const provider of ["resend", "openai"])
      await db.query(
        "INSERT INTO provider_settings(tenant_id,provider,encrypted_key,enabled,config) VALUES($1,$2,$3,true,$4)",
        [
          tenant,
          provider,
          sealSecret("synthetic-never-real-key", `${tenant}:${provider}`),
          {
            from: "advisor@synthetic-dutygraph-fixture.net",
            model: "gpt-5-mini",
          },
        ],
      );
    const person = await createOrEdit(db, user, company, "person", {
      name: "Alex Scheduler",
      email: `${randomUUID()}@synthetic-dutygraph-fixture.net`,
      role: "Order clerk",
      team: "Orders",
    });
    const task = await createOrEdit(db, user, company, "task", {
      title: "Check the order",
      duty: "Order checking",
      purpose: "Check orders",
      trigger: "Not reported.",
      inputs: "Not reported.",
      instructions: "Not reported.",
      output: "Not reported.",
      humanGate: "Not reported.",
      ownerId: person.id,
      performerId: person.id,
      businessStageLinks: [{ streamId: "orders", stageId: "check" }],
      reviewDue: "2099-01-01",
      reason: "Synthetic missing work",
    });
    const recipients = [{ personId: person.id, email: person.data.email }];
    await db.query(
      "UPDATE companies SET settings=jsonb_set(settings,'{gapFollowups}',$2::jsonb) WHERE id=$1",
      [company, { enabled: true, recipients, actorId: user.id }],
    );
    return { tenant, user, company, person, task, recipients };
  });
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function beforeTenant(tenant: string) {
  const previous =
    (
      await pool.query(
        "SELECT id FROM tenants WHERE id<$1 ORDER BY id DESC LIMIT 1",
        [tenant],
      )
    ).rows[0]?.id || null;
  await pool.query(
    "UPDATE maintenance_cursors SET last_tenant_id=$1 WHERE name='gap_scan'",
    [previous],
  );
}
async function sweep(f: Fixture, provider: EmailProvider) {
  await beforeTenant(f.tenant);
  await runGapFollowups({ provider, maxTenants: 1 });
}
async function requests(f: Fixture) {
  return (
    await tx(f.tenant, (db) =>
      db.query(
        "SELECT * FROM records WHERE company_id=$1 AND kind='request' AND data->>'questionPlanVersion'='work-gap:v1' ORDER BY created_at,id",
        [f.company],
      ),
    )
  ).rows;
}
async function jobs(f: Fixture) {
  return (
    await tx(f.tenant, (db) =>
      db.query(
        "SELECT * FROM provider_jobs WHERE company_id=$1 AND kind='gap_outreach' ORDER BY created_at,id",
        [f.company],
      ),
    )
  ).rows;
}
async function policyApi(f: Fixture) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = f.user;
    next();
  });
  app.use(
    "/companies/:companyId/work-gaps",
    workGapsRouter(async () => {
      throw new Error("Policy endpoints must not email");
    }),
  );
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return {
    async save(enabled: boolean, recipients = f.recipients) {
      const res = await fetch(
        `http://127.0.0.1:${(server.address() as any).port}/companies/${f.company}/work-gaps/policy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": randomUUID(),
          },
          body: JSON.stringify({
            enabled,
            recipients,
            profileHash: hash(profile),
          }),
        },
      );
      return { status: res.status, data: (await res.json()) as any };
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

test("cron works without an open UI, permits one open weekly request, then progresses to a newly reported stage after cooldown", async () => {
  const f = await fixture(),
    messages: InvitationMessage[] = [];
  const provider: EmailProvider = async (m) => {
    messages.push(m);
    return { id: "synthetic-cron" };
  };
  try {
    await sweep(f, provider);
    await sweep(f, provider);
    assert.equal(messages.length, 1);
    assert.deepEqual(messages[0].to, [f.person.data.email]);
    const first = (await requests(f))[0];
    assert.equal(first.state, "sent");
    assert.equal(first.data.gapContext.stageId, "check");
    await tx(f.tenant, async (db) => {
      await db.query("UPDATE records SET state='accepted' WHERE id=$1", [
        first.id,
      ]);
      const { reviewed: _reviewed, ...data } = f.task.data;
      const updated = await createOrEdit(
        db,
        f.user,
        f.company,
        "task",
        {
          ...data,
          trigger: "An order arrives",
          inputs: "Order details",
          instructions: "Check quantities",
          output: "Checked order",
          destination: "Shipping",
          reason: "Synthetic answered task",
        },
        f.task,
      );
      await createOrEdit(db, f.user, f.company, "workflow", {
        title: "Standalone order check",
        purpose: "Record where checking ends",
        ownerId: f.person.id,
        documentationOnly: true,
        taskIds: [updated.id],
        handoffIds: [],
        joinPolicy: "all",
        timeoutHours: 1,
        maxAttempts: 1,
        reason: "Synthetic documented boundary",
      });
      await createOrEdit(db, f.user, f.company, "task", {
        ...data,
        title: "Ship checked orders",
        duty: "Shipping",
        businessStageLinks: [{ streamId: "orders", stageId: "ship" }],
        reason: "Synthetic new stage work",
      });
    });
    await sweep(f, provider);
    assert.equal(
      messages.length,
      1,
      "Answered requests still enforce a week between questions",
    );
    await tx(f.tenant, (db) =>
      db.query(
        "UPDATE records SET created_at=now()-interval '8 days' WHERE id=$1",
        [first.id],
      ),
    );
    await tx(f.tenant, (db) =>
      db.query(
        "UPDATE provider_jobs SET input=jsonb_set(input,'{sendStartedAt}',to_jsonb((now()-interval '8 days')::text)) WHERE company_id=$1 AND kind='gap_outreach'",
        [f.company],
      ),
    );
    await sweep(f, provider);
    assert.equal(messages.length, 2);
    assert.equal((await requests(f))[1].data.gapContext.stageId, "ship");
  } finally {
    await clean(f.tenant);
  }
});

test("legacy and manual open work interviews suppress automatic questions until returned", async () => {
  const f = await fixture();
  let sends = 0;
  const provider: EmailProvider = async () => {
    sends++;
    return { id: "synthetic" };
  };
  try {
    const legacy = await tx(f.tenant, (db) =>
      putRecord(
        db,
        f.user,
        f.company,
        "request",
        "Existing manual work interview",
        {
          personId: f.person.id,
          type: "work",
          questionPlanVersion: "custom-v1",
          dueDate: "2099-01-01",
        },
        "draft",
      ),
    );
    await sweep(f, provider);
    assert.equal(sends, 0);
    assert.equal((await requests(f)).length, 0);
    await tx(f.tenant, (db) =>
      db.query("UPDATE records SET state='sent' WHERE id=$1", [legacy.id]),
    );
    await sweep(f, provider);
    assert.equal(sends, 0);
    await tx(f.tenant, (db) =>
      db.query("UPDATE records SET state='returned' WHERE id=$1", [legacy.id]),
    );
    await sweep(f, provider);
    assert.equal(sends, 1);
  } finally {
    await clean(f.tenant);
  }
});

test("cron retains queued questions while configuration is absent and resumes the same request once configured", async () => {
  const f = await fixture();
  let sends = 0;
  const provider: EmailProvider = async () => {
    sends++;
    return { id: "synthetic-resume" };
  };
  try {
    await tx(f.tenant, (db) =>
      db.query(
        "UPDATE provider_settings SET enabled=false WHERE provider='openai'",
      ),
    );
    await sweep(f, provider);
    const waiting = (await jobs(f))[0];
    assert.equal(waiting.state, "waiting_configuration");
    assert.equal(sends, 0);
    await tx(f.tenant, (db) =>
      db.query(
        "UPDATE provider_settings SET enabled=true WHERE provider='openai'",
      ),
    );
    await sweep(f, provider);
    await sweep(f, provider);
    assert.equal(sends, 1);
    assert.equal((await requests(f)).length, 1);
    assert.equal((await jobs(f))[0].id, waiting.id);
    assert.equal((await jobs(f))[0].state, "accepted");
  } finally {
    await clean(f.tenant);
  }
});

test("policy recipients must match exact current people and addresses, including queued delivery rechecks", async () => {
  const f = await fixture(),
    api = await policyApi(f);
  let sends = 0;
  const provider: EmailProvider = async () => {
    sends++;
    return { id: "synthetic" };
  };
  try {
    assert.equal(
      (
        await api.save(true, [
          {
            personId: f.person.id,
            email: "different@synthetic-dutygraph-fixture.net",
          },
        ])
      ).status,
      409,
    );
    assert.equal(
      (
        await api.save(true, [
          { personId: randomUUID(), email: f.person.data.email },
        ])
      ).status,
      409,
    );
    assert.equal(
      (await api.save(true, [f.recipients[0], f.recipients[0]])).status,
      422,
    );
    assert.equal((await api.save(true)).status, 200);
    await tx(f.tenant, (db) =>
      db.query(
        "UPDATE provider_settings SET enabled=false WHERE provider='openai'",
      ),
    );
    await sweep(f, provider);
    assert.equal((await jobs(f))[0].state, "waiting_configuration");
    await tx(f.tenant, async (db) => {
      await putRecord(
        db,
        f.user,
        f.company,
        "person",
        f.person.title,
        { ...f.person.data, email: "changed@synthetic-dutygraph-fixture.net" },
        "reported",
        f.person,
      );
      await db.query(
        "UPDATE provider_settings SET enabled=true WHERE provider='openai'",
      );
    });
    await sweep(f, provider);
    assert.equal(sends, 0);
    assert.equal((await jobs(f))[0].state, "needs_review");
    assert.equal((await requests(f)).length, 1);
  } finally {
    await api.close();
    await clean(f.tenant);
  }
});

test("pause and resume never retry an unknown provider send", async () => {
  const f = await fixture(),
    api = await policyApi(f);
  let sends = 0;
  try {
    await sweep(f, async () => {
      sends++;
      throw new Error("Synthetic lost provider response");
    });
    assert.equal((await jobs(f))[0].state, "unknown");
    assert.equal((await api.save(false)).status, 200);
    assert.equal((await api.save(true)).status, 200);
    assert.equal((await jobs(f))[0].state, "unknown");
    await sweep(f, async () => {
      sends++;
      return { id: "must-not-send" };
    });
    assert.equal(sends, 1);
    assert.equal((await requests(f)).length, 1);
  } finally {
    await api.close();
    await clean(f.tenant);
  }
});

test("durable tenant cursor resumes after the two-send bound and reaches later accounts", async () => {
  const prefix = randomUUID().slice(0, -4),
    fixtures: Fixture[] = [],
    recipients: string[] = [];
  try {
    for (const suffix of ["0001", "0002", "0003"])
      fixtures.push(await fixture(prefix + suffix));
    await beforeTenant(fixtures[0].tenant);
    const provider: EmailProvider = async (m) => {
      recipients.push(m.to[0]);
      return { id: "synthetic-fairness" };
    };
    await runGapFollowups({ provider, maxTenants: 20 });
    assert.equal(recipients.length, 2);
    assert.equal(
      (
        await pool.query(
          "SELECT last_tenant_id FROM maintenance_cursors WHERE name='gap_scan'",
        )
      ).rows[0].last_tenant_id,
      fixtures[1].tenant,
    );
    await runGapFollowups({ provider, maxTenants: 1 });
    assert.equal(recipients.length, 3);
    assert.deepEqual(
      recipients,
      fixtures.map((f) => f.person.data.email),
    );
    assert.equal((await jobs(fixtures[2]))[0].state, "accepted");
  } finally {
    for (const f of fixtures) await clean(f.tenant);
  }
});

test("an oversized stage preserves policy and scan progress while a healthy sibling company still sends", async () => {
  const f = await fixture(),
    messages: InvitationMessage[] = [];
  const originalPolicy = {
    enabled: true,
    recipients: f.recipients,
    actorId: f.user.id,
    updatedAt: "2026-09-01T00:00:00.000Z",
    selectionMarker: "Preserve this exact policy",
  };
  let healthyCompany = "",
    healthyEmail = "";
  try {
    await tx(f.tenant, async (db) => {
      await db.query(
        "UPDATE companies SET settings=jsonb_set(settings,'{gapFollowups}',$2::jsonb) WHERE id=$1",
        [f.company, originalPolicy],
      );
      // More than 300 context snapshots must fail before creating a request.
      await db.query(
        "INSERT INTO records(id,tenant_id,company_id,kind,title,version,state,data,hash) SELECT gen_random_uuid(),$1,$2,'person','Synthetic context person',1,'reported',jsonb_build_object('name','Synthetic context person','email','context@test.invalid'),'synthetic-context-hash' FROM generate_series(1,301)",
        [f.tenant, f.company],
      );
      healthyCompany = randomUUID();
      await db.query(
        "INSERT INTO companies(id,tenant_id,name,scope,goal,settings,sandbox) VALUES($1,$2,'Healthy synthetic sibling','Fictional tests','Check company isolation',$3,false)",
        [
          healthyCompany,
          f.tenant,
          { ...defaultSettings(), businessProfile: profile },
        ],
      );
      const person = await createOrEdit(db, f.user, healthyCompany, "person", {
        name: "Healthy Sibling",
        email: `${randomUUID()}@synthetic-dutygraph-fixture.net`,
        role: "Order clerk",
        team: "Orders",
      });
      healthyEmail = person.data.email;
      const { reviewed: _reviewed, ...taskData } = f.task.data;
      await createOrEdit(db, f.user, healthyCompany, "task", {
        ...taskData,
        ownerId: person.id,
        performerId: person.id,
      });
      await db.query(
        "UPDATE companies SET settings=jsonb_set(settings,'{gapFollowups}',$2::jsonb) WHERE id=$1",
        [
          healthyCompany,
          {
            enabled: true,
            recipients: [{ personId: person.id, email: person.data.email }],
            actorId: f.user.id,
            checkedAt: "2000-01-01T00:00:00.000Z",
          },
        ],
      );
    });
    await sweep(f, async (message) => {
      messages.push(message);
      return { id: "synthetic-healthy-sibling" };
    });
    assert.deepEqual(
      messages.map((m) => m.to),
      [[healthyEmail]],
    );
    assert.equal((await requests(f)).length, 0);
    const companies = (
      await tx(f.tenant, (db) =>
        db.query("SELECT id,settings FROM companies WHERE tenant_id=$1", [
          f.tenant,
        ]),
      )
    ).rows;
    const failedPolicy = companies.find((c) => c.id === f.company).settings
      .gapFollowups;
    const { checkedAt, lastError, ...preservedPolicy } = failedPolicy;
    assert.deepEqual(preservedPolicy, originalPolicy);
    assert.ok(Number.isFinite(Date.parse(checkedAt)));
    assert.match(lastError, /too much work for one short follow-up/);
    assert.ok(
      Date.parse(
        companies.find((c) => c.id === healthyCompany).settings.gapFollowups
          .checkedAt,
      ) > Date.parse("2000-01-01"),
    );
    const siblingRequests = (
      await tx(f.tenant, (db) =>
        db.query(
          "SELECT state FROM records WHERE company_id=$1 AND kind='request'",
          [healthyCompany],
        ),
      )
    ).rows;
    assert.equal(siblingRequests.length, 1);
    assert.equal(siblingRequests[0].state, "sent");
  } finally {
    await clean(f.tenant);
  }
});

test("a pause committed after company selection survives the scheduler's checkedAt update", async () => {
  const f = await fixture();
  const blocker = await pool.connect();
  let running: Promise<void> | undefined,
    sends = 0,
    committed = false;
  const pausedPolicy = {
    enabled: false,
    recipients: [],
    actorId: f.user.id,
    selectionMarker: "Pause must remain current",
  };
  try {
    await beforeTenant(f.tenant);
    await blocker.query("BEGIN");
    await blocker.query("SELECT set_config('app.tenant_id',$1,true)", [
      f.tenant,
    ]);
    const pid = (await blocker.query("SELECT pg_backend_pid() AS pid")).rows[0]
      .pid;
    await blocker.query(
      "UPDATE companies SET settings=jsonb_set(settings,'{gapFollowups}',$2::jsonb) WHERE id=$1",
      [f.company, pausedPolicy],
    );
    running = runGapFollowups({
      maxTenants: 1,
      provider: async () => {
        sends++;
        return { id: "must-not-send-after-pause" };
      },
    });
    let waiting = false;
    for (let i = 0; i < 100; i++) {
      const waiters = await pool.query(
        "SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))",
        [pid],
      );
      if (waiters.rowCount) {
        waiting = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(
      waiting,
      true,
      "Scheduler must reach its checkedAt write while the pause is uncommitted",
    );
    await blocker.query("COMMIT");
    committed = true;
    await running;
    assert.equal(sends, 0);
    assert.equal((await requests(f)).length, 0);
    const policy = (
      await tx(f.tenant, (db) =>
        db.query(
          "SELECT settings->'gapFollowups' AS policy FROM companies WHERE id=$1",
          [f.company],
        ),
      )
    ).rows[0].policy;
    const { checkedAt, ...preservedPolicy } = policy;
    assert.deepEqual(preservedPolicy, pausedPolicy);
    assert.ok(Number.isFinite(Date.parse(checkedAt)));
  } finally {
    if (!committed) await blocker.query("ROLLBACK");
    blocker.release();
    await running;
    await clean(f.tenant);
  }
});

test("a delayed configured send starts a full new week of cooldown after the reply", async () => {
  const f = await fixture();
  let sends = 0;
  const provider: EmailProvider = async () => {
    sends++;
    return { id: "synthetic-delayed" };
  };
  try {
    await tx(f.tenant, (db) =>
      db.query(
        "UPDATE provider_settings SET enabled=false WHERE provider='openai'",
      ),
    );
    await sweep(f, provider);
    const queued = (await requests(f))[0];
    assert.equal((await jobs(f))[0].state, "waiting_configuration");
    await tx(f.tenant, async (db) => {
      // Simulate a request that was created long ago but still has a valid deadline.
      await db.query(
        "UPDATE records SET created_at=now()-interval '14 days',data=jsonb_set(data,'{dueDate}','\"2099-01-01\"'::jsonb) WHERE id=$1",
        [queued.id],
      );
      await db.query(
        "UPDATE provider_settings SET enabled=true WHERE provider='openai'",
      );
    });
    await sweep(f, provider);
    assert.equal(sends, 1);
    assert.ok(
      Date.parse((await jobs(f))[0].input.sendStartedAt) > Date.now() - 60000,
    );
    await tx(f.tenant, (db) =>
      db.query("UPDATE records SET state='accepted' WHERE id=$1", [queued.id]),
    );
    await sweep(f, provider);
    assert.equal(
      sends,
      1,
      "Old creation time must not allow another send immediately after a delayed send",
    );
    assert.equal((await requests(f)).length, 1);
    await tx(f.tenant, (db) =>
      db.query(
        "UPDATE provider_jobs SET input=jsonb_set(input,'{sendStartedAt}',to_jsonb((now()-interval '8 days')::text)) WHERE company_id=$1 AND kind='gap_outreach'",
        [f.company],
      ),
    );
    await sweep(f, provider);
    assert.equal(
      sends,
      2,
      "Unasked work can receive a follow-up after seven days from the actual send",
    );
  } finally {
    await clean(f.tenant);
  }
});

test("expired queued questions require review before reserving an invitation or calling a provider", async () => {
  const f = await fixture();
  let sends = 0;
  const provider: EmailProvider = async () => {
    sends++;
    return { id: "must-not-send-expired" };
  };
  try {
    await tx(f.tenant, (db) =>
      db.query(
        "UPDATE provider_settings SET enabled=false WHERE provider='openai'",
      ),
    );
    await sweep(f, provider);
    const queued = (await requests(f))[0];
    await tx(f.tenant, async (db) => {
      await db.query(
        "UPDATE records SET data=jsonb_set(data,'{dueDate}','\"2000-01-01\"'::jsonb) WHERE id=$1",
        [queued.id],
      );
      await db.query(
        "UPDATE provider_settings SET enabled=true WHERE provider='openai'",
      );
    });
    await sweep(f, provider);
    assert.equal(sends, 0);
    const job = (await jobs(f))[0];
    assert.equal(job.state, "needs_review");
    assert.match(job.message, /past their response deadline/);
    const reserved = await tx(f.tenant, (db) =>
      db.query(
        "SELECT id FROM provider_jobs WHERE company_id=$1 AND kind='invitation_email'",
        [f.company],
      ),
    );
    assert.equal(reserved.rowCount, 0);
    assert.equal((await requests(f))[0].state, "draft");
  } finally {
    await clean(f.tenant);
  }
});
