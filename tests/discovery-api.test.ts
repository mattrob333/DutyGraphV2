import "dotenv/config";
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import type { Server } from "node:http";
import { createApp, errorHandler } from "../server/app.ts";
import { assetsRouter } from "../server/assets.ts";
import { pool, tx, hash, putRecord } from "../server/db.ts";
import {
  discoveryContext,
  validateDiscovery,
  type DiscoveryInput,
} from "../server/discovery.ts";

// Every account, source, address, provider and transport here is synthetic.
type Client = { cookie: string; csrf: string; user: any; company: string };
let server: Server,
  base = "";
const inputs: DiscoveryInput[] = [],
  emails: any[] = [];
const overrides = new Map<string, (input: DiscoveryInput) => unknown>();
let execEmail = "leader@discovery.test.invalid",
  staffEmail = "operations@discovery.test.invalid";
let contact = {
  name: "Alex Executive",
  email: execEmail,
  meetingAt: "2099-01-04 10:00 UTC",
};
const questions = [
  "What result matters most this year?",
  "Which teams should take part?",
  "What currently slows the work?",
];
function fakeDraft(input: DiscoveryInput): any {
  const override = overrides.get(input.company + ":" + input.stage);
  if (override) return override(input);
  switch (input.stage) {
    case "contact":
      return {
        summary:
          "Public research suggests the company sells repair services. Internal roles need confirmation.",
        emailSubject: "Prepare for our leadership meeting",
        emailBody:
          "Please bring the leadership team, departments, staff email list and goals for one month, six months and a year.",
        questions,
      };
    case "agenda":
      return {
        summary: "Review the public picture and leadership reply.",
        sections: [
          {
            title: "Goals and scope",
            purpose: "Confirm what matters and who should take part.",
            questions,
          },
        ],
        gaps: ["Confirm the department list."],
      };
    case "roster":
      return {
        summary: "Two people described in the executive kickoff.",
        people: [
          {
            name: contact.name,
            email: execEmail,
            role: "Managing director",
            department: "Leadership",
            managerEmail: "",
            duties: [
              {
                title: "Set the company direction",
                description: "Agree goals with the leadership team.",
              },
            ],
            sourceIds: [input.sources.find((s) => s.origin === "meeting")!.id],
          },
          {
            name: "Amina Operations",
            email: staffEmail,
            role: "Service coordinator",
            department: "Service",
            managerEmail: execEmail,
            duties: [
              {
                title: "Schedule repair visits",
                description:
                  "Match each repair request with an available technician.",
              },
            ],
            sourceIds: [input.sources.find((s) => s.origin === "meeting")!.id],
          },
        ],
        gaps: [],
      };
    case "interviews":
      return {
        summary: "Questions for the reviewed team.",
        interviews: input.people.map((p) => ({
          personId: p.id,
          title: "Describe your work: " + p.name,
          emailSubject: "Your work at " + input.company,
          emailBody:
            "Please explain your work in " +
            p.department +
            ". We will review your answers before creating task cards.",
          questions: [
            "What starts your work?",
            "Walk through " + (p.duties[0]?.split(":")[0] || p.role) + ".",
            "What do you produce and who receives it?",
          ],
        })),
      };
    case "tasks": {
      const p = input.people.find((p) => p.email === staffEmail)!;
      return {
        summary: "A task described by the service coordinator.",
        tasks: [
          {
            title: "Schedule a repair visit",
            duty: "Schedule repair visits",
            ownerId: p.id,
            performerId: p.id,
            purpose: "Give the customer a confirmed repair appointment.",
            trigger: "A repair request arrives.",
            inputs: "Customer address, equipment fault and availability.",
            instructions:
              "Check the calendar, agree a time and record the appointment.",
            output: "Confirmed appointment with an assigned technician.",
            systems: ["Service calendar"],
            humanGate: "Ask the coordinator to resolve missing details.",
            sourceIds: [input.sources.find((s) => s.origin === "team")!.id],
          },
        ],
        gaps: [],
      };
    }
  }
}
async function request(
  c: Client | null,
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(c ? { Cookie: c.cookie, "X-CSRF-Token": c.csrf } : {}),
      "Idempotency-Key": randomUUID(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
const prefix = (c: Client) => "/api/v1/companies/" + c.company;
const path = (c: Client) => prefix(c) + "/discovery";
async function register(): Promise<Client> {
  const r = await request(null, "/api/auth/register", "POST", {
    name: "Discovery test advisor",
    email: randomUUID() + "@test.invalid",
    password: "Synthetic discovery password 124!",
    companyName: "Discovery fixture " + randomUUID(),
    scope: "Repair service discovery",
    goal: "Test discovery without a real provider.",
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const c = {
    cookie: r.cookie,
    csrf: r.data.csrf,
    user: r.data.user,
    company: "",
  };
  c.company = (await request(c, "/api/v1/companies")).data[0].id;
  await saveProvider(c, "openai");
  return c;
}
async function saveProvider(c: Client, provider: string) {
  const r = await request(c, prefix(c) + "/providers/" + provider, "PUT", {
    key: "synthetic-never-a-real-credential",
    enabled: true,
    ...(provider === "resend"
      ? { from: "advisor@discovery.test.invalid" }
      : {}),
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
}
async function records(c: Client) {
  return (await request(c, prefix(c) + "/workspace")).data.records as any[];
}
async function company(c: Client) {
  return tx(
    c.user.tenant_id,
    async (db) =>
      (await db.query("SELECT * FROM companies WHERE id=$1", [c.company]))
        .rows[0],
  );
}
async function publicResearch(c: Client, count = 1, ageDays = 0) {
  return tx(c.user.tenant_id, async (db) => {
    const results = Array.from({ length: count }, (_, i) => ({
      title: `Research ${ageDays}:${i}`,
      url: `https://repair.test.invalid/${ageDays}/${i}`,
      text: `Public repair service research ${ageDays}:${i}. The company repairs equipment for local businesses.`,
      contentHash: hash({ ageDays, i }),
      publishedDate: "2099-01-01",
    }));
    const id = randomUUID();
    await db.query(
      "INSERT INTO research_runs(id,tenant_id,company_id,actor_id,query,state,results,created_at) VALUES($1,$2,$3,$4,'Synthetic research','complete',$5,now()-($6 * interval '1 day'))",
      [
        id,
        c.user.tenant_id,
        c.company,
        c.user.id,
        JSON.stringify(results),
        ageDays,
      ],
    );
    return id;
  });
}
async function draft(
  c: Client,
  stage: DiscoveryInput["stage"],
  extra: any = {},
) {
  const r = await request(c, path(c) + "/draft", "POST", {
    stage,
    consent: true,
    ...(stage === "contact" ? { contact } : {}),
    ...extra,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const status = await request(c, path(c));
  const job = status.data.jobs.find((j: any) => j.id === r.data.id);
  assert.ok(job, JSON.stringify(status.data));
  assert.equal(job.state, "complete", JSON.stringify(job));
  return job;
}
async function apply(c: Client, job: any, edited = job.result.draft) {
  return request(c, path(c) + "/" + job.id + "/apply", "POST", {
    reviewed: true,
    draft: edited,
    dueDate: "2099-01-10",
  });
}
async function meeting(
  c: Client,
  text = "Alex Executive is the managing director in Leadership. Amina Operations coordinates Service and reports to Alex. Amina schedules repair visits. Alex sets company direction. Emails: " +
    execEmail +
    ", " +
    staffEmail,
) {
  const r = await request(c, path(c) + "/meeting", "POST", {
    title: "Executive kickoff notes",
    text,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.data.type, "Leadership account");
  return r.data;
}
async function enrollAndSubmit(
  c: Client,
  req: any,
  text: string,
  email = false,
  audio = false,
) {
  let token: string;
  if (email) {
    await saveProvider(c, "resend");
    const r = await request(
      c,
      prefix(c) + "/requests/" + req.id + "/email",
      "POST",
      { expectedVersion: req.version, confirmSend: true },
    );
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.state, "accepted");
    token = emails.at(-1).text.match(/invite\/([a-f0-9]{64})/)[1];
  } else {
    const r = await request(
      c,
      prefix(c) + "/requests/" + req.id + "/issue",
      "POST",
      { expectedVersion: req.version },
    );
    assert.equal(r.status, 200, JSON.stringify(r.data));
    token = r.data.url.split("/").at(-1);
  }
  const preview = await request(null, "/api/invitations/" + token);
  assert.equal(preview.status, 200);
  const enrolled = await request(
    null,
    "/api/invitations/" + token + "/enroll",
    "POST",
    { password: "Synthetic participant password 124!", acknowledged: true },
  );
  assert.equal(enrolled.status, 200, JSON.stringify(enrolled.data));
  const participant = {
    cookie: enrolled.cookie,
    csrf: enrolled.data.csrf,
    user: enrolled.data.user,
    company: c.company,
  };
  const personalized = await request(
    participant,
    "/api/v1/participant/requests",
  );
  assert.equal(personalized.status, 200);
  assert.ok(personalized.data.requests.some((r: any) => r.id === req.id));
  let assetId = "";
  if (audio) {
    const bytes = Buffer.from("Synthetic audio-only service interview"),
      checksum = createHash("sha256").update(bytes).digest("hex");
    const upload = await request(participant, prefix(c) + "/assets", "POST", {
      mime: "audio/webm",
      size: bytes.length,
      requestId: req.id,
    });
    assert.equal(upload.status, 201, JSON.stringify(upload.data));
    assetId = upload.data.id;
    assert.equal(
      (
        await request(
          participant,
          prefix(c) + "/assets/" + assetId + "/chunks/0",
          "PUT",
          { base64: bytes.toString("base64"), checksum },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          participant,
          prefix(c) + "/assets/" + assetId + "/finalize",
          "POST",
          { checksum },
        )
      ).status,
      200,
    );
  }
  const submitted = await request(
    participant,
    "/api/v1/participant/requests/" + req.id + "/submit",
    "POST",
    { expectedVersion: req.version, text, assetId, acknowledged: true },
  );
  assert.equal(submitted.status, 200, JSON.stringify(submitted.data));
  return { participant, responseId: submitted.data.responseId, assetId };
}
async function reviewedRoster(c: Client) {
  await meeting(c);
  const job = await draft(c, "roster");
  const applied = await apply(c, job);
  assert.equal(applied.status, 200, JSON.stringify(applied.data));
  return { job, applied: applied.data };
}
beforeEach(() => {
  const id = randomUUID();
  execEmail = `leader-${id}@discovery.test.invalid`;
  staffEmail = `operations-${id}@discovery.test.invalid`;
  contact = {
    name: "Alex Executive",
    email: execEmail,
    meetingAt: "2099-01-04 10:00 UTC",
  };
});
before(async () => {
  const app = createApp({
    authRequestsPerWindow: 1000,
    hostedRouting: true,
    discoveryProvider: async (input) => {
      inputs.push(structuredClone(input));
      return fakeDraft(input);
    },
    emailProvider: async (message) => {
      emails.push(message);
      return { id: "synthetic-delivery-id" };
    },
  });
  app.use(
    "/api/v1/companies/:companyId/assets",
    assetsRouter(async () => ({
      text: "I schedule repair visits in the service calendar after confirming the customer address and equipment fault.",
      requestId: "synthetic-audio-recovery",
    })),
  );
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + (server.address() as any).port;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});

test("Discovery follows public research → contact email → agenda → kickoff → reviewed team → responses → unconfirmed task cards", async () => {
  const c = await register();
  await publicResearch(c);
  await tx(c.user.tenant_id, async (db) => {
    for (const title of [
      "Executive kickoff",
      "Procurement account",
      "Supplier role matrix",
    ])
      await putRecord(
        db,
        c.user,
        c.company,
        "evidence",
        title,
        {
          title,
          type: "Employee account",
          text: "Old seeded supplier account must never enter pre-meeting research.",
          originId: "old-demo",
          bucket: "org",
        },
        "accepted",
      );
  });
  const contactJob = await draft(c, "contact"),
    contactInput = inputs.at(-1)!;
  assert.equal(contactInput.sources.length, 1);
  assert.equal(contactInput.people.length, 0);
  assert.ok(!JSON.stringify(contactInput).includes("Supplier role matrix"));
  assert.ok(contactInput.sources.every((s) => s.kind === "public_research"));
  const prepared = await apply(c, contactJob);
  assert.equal(prepared.status, 200, JSON.stringify(prepared.data));
  assert.equal(prepared.data.requestIds.length, 1);
  const preparedRecords = await records(c),
    contactRequest = preparedRecords.find(
      (r) => r.id === prepared.data.requestIds[0],
    );
  assert.equal(contactRequest.state, "draft");
  assert.equal(contactRequest.data.taskIds.length, 0);
  assert.equal(emails.length, 0);
  const preview = await request(
    c,
    prefix(c) + "/requests/" + contactRequest.id + "/email-preview",
  );
  assert.equal(preview.data.subject, contactJob.result.draft.emailSubject);
  assert.ok(preview.data.html.includes("departments"));
  assert.ok(preview.data.html.includes(questions[0]));
  const contactReply = await enrollAndSubmit(
    c,
    contactRequest,
    "Please invite Alex and Amina. Amina leads service scheduling. We want shorter waits for repair appointments. Our roster will be confirmed in the kickoff.",
    true,
  );
  assert.equal(emails.length, 1);
  const agenda = await draft(c, "agenda"),
    agendaInput = inputs.at(-1)!;
  assert.ok(agendaInput.sources.some((s) => s.id === contactReply.responseId));
  assert.ok(agendaInput.sources.some((s) => s.kind === "public_research"));
  assert.ok(!JSON.stringify(agendaInput).includes("Old seeded"));
  assert.equal((await apply(c, agenda)).data.code, "AGENDA_ONLY");
  const { applied } = await reviewedRoster(c);
  assert.equal(applied.personIds.length, 2);
  assert.equal(applied.dutyIds.length, 2);
  const team = await records(c),
    amina = team.find(
      (r) => r.kind === "person" && r.data.email === staffEmail,
    ),
    alex = team.find((r) => r.kind === "person" && r.data.email === execEmail);
  assert.equal(amina.data.managerId, alex.id);
  assert.equal(team.filter((r) => r.kind === "person").length, 2);
  assert.equal(
    (
      await request(c, path(c) + "/draft", "POST", {
        stage: "tasks",
        consent: true,
      })
    ).data.code,
    "TEAM_RESPONSE_REQUIRED",
  );
  const interviewJob = await draft(c, "interviews"),
    interviewInput = inputs.at(-1)!;
  assert.equal(interviewInput.people.length, 2);
  assert.deepEqual(
    new Set(interviewInput.people.map((p) => p.id)),
    new Set(applied.personIds),
  );
  assert.ok(
    interviewInput.people
      .find((p) => p.id === amina.id)!
      .duties[0].includes("Schedule repair visits"),
  );
  const created = await apply(c, interviewJob);
  assert.equal(created.status, 200, JSON.stringify(created.data));
  assert.equal(created.data.requestIds.length, 2);
  const teamRequests = (await records(c)).filter((r) =>
    created.data.requestIds.includes(r.id),
  );
  assert.ok(teamRequests.every((r) => r.state === "draft"));
  assert.equal(emails.length, 1);
  const aminaRequest = teamRequests.find((r) => r.data.personId === amina.id);
  const response = await enrollAndSubmit(
    c,
    aminaRequest,
    "When a repair request comes in, I check the customer's address, equipment fault and availability. I check our service calendar, agree a time and record a confirmed appointment with an assigned technician.",
  );
  assert.equal((await request(response.participant, path(c))).status, 403);
  const taskJob = await draft(c, "tasks"),
    taskInput = inputs.at(-1)!;
  assert.ok(
    taskInput.sources.some(
      (s) => s.id === response.responseId && s.origin === "team",
    ),
  );
  const saved = await apply(c, taskJob);
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const final = await records(c),
    task = final.find(
      (r) => saved.data.recordIds.includes(r.id) && r.kind === "task",
    );
  assert.equal(task.state, "awaiting_confirmation");
  assert.equal(task.data.reviewed, true);
  assert.deepEqual(saved.data.confirmationReadyIds, [task.id]);
  assert.equal(task.data.mode, "human_only");
  assert.equal(task.data.ownerId, amina.id);
  assert.ok(task.data.evidenceIds.length);
  const evidence = final.find((r) => r.id === task.data.evidenceIds[0]);
  assert.equal(evidence.data.originId, response.responseId);
  assert.equal(evidence.state, "accepted");
  assert.ok(evidence.data.text.includes("service calendar"));
  const again = await apply(c, taskJob);
  assert.deepEqual(again.data, saved.data);
  assert.equal((await records(c)).filter((r) => r.kind === "task").length, 1);
  assert.equal(emails.length, 1);
});

test("Discovery keeps latest public sources and reserves space for contact replies", async () => {
  const c = await register();
  await publicResearch(c, 24, 2);
  await publicResearch(c, 24, 0);
  const job = await draft(c, "contact");
  const input = inputs.at(-1)!;
  assert.equal(input.sources.length, 24);
  assert.equal(input.omitted, 24);
  assert.ok(input.sources.every((s) => s.title.startsWith("Research 0:")));
  const applied = await apply(c, job),
    req = (await records(c)).find((r) => r.id === applied.data.requestIds[0]);
  const reply = await enrollAndSubmit(
    c,
    req,
    "Leadership asks for a review of customer repair response times and will provide the full roster at kickoff.",
  );
  await draft(c, "agenda");
  const agenda = inputs.at(-1)!;
  assert.equal(agenda.sources.length, 24);
  assert.equal(agenda.sources[0].id, reply.responseId);
  assert.equal(
    agenda.sources.filter((s) => s.kind === "public_research").length,
    23,
  );
});

test("Discovery rejects stale inputs, wrong tenants, missing stages and consent before producing or applying records", async () => {
  const c = await register(),
    other = await register();
  await publicResearch(c);
  const before = inputs.length;
  assert.equal((await request(null, path(c))).status, 401);
  assert.equal((await request(other, path(c))).status, 404);
  assert.equal(
    (
      await request(other, path(c) + "/draft", "POST", {
        stage: "contact",
        contact,
        consent: true,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(c, path(c) + "/draft", "POST", {
        stage: "contact",
        contact,
        consent: false,
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await request(c, path(c) + "/draft", "POST", {
        stage: "interviews",
        consent: true,
      })
    ).data.code,
    "ROSTER_REQUIRED",
  );
  assert.equal(
    (
      await request(c, path(c) + "/draft", "POST", {
        stage: "roster",
        consent: true,
      })
    ).data.code,
    "DISCOVERY_INPUT",
  );
  assert.equal(inputs.length, before);
  const job = await draft(c, "contact");
  await publicResearch(c, 2);
  assert.equal((await apply(c, job)).data.code, "DISCOVERY_STALE");
  assert.equal(
    (
      await request(other, path(c) + "/" + job.id + "/apply", "POST", {
        reviewed: true,
        draft: job.result.draft,
      })
    ).status,
    404,
  );
  assert.equal((await records(c)).length, 0);
  const status = await request(c, path(c));
  assert.equal(status.data.jobs.find((j: any) => j.id === job.id).stale, true);
  assert.ok(
    !JSON.stringify(status.data.jobs[0].input).includes(
      "Public repair service research",
    ),
  );
  const ready = await draft(c, "contact");
  assert.equal(
    (
      await request(c, path(c) + "/" + ready.id + "/apply", "POST", {
        reviewed: false,
        draft: ready.result.draft,
      })
    ).status,
    422,
  );
});

test("Revised dossiers reuse duties, clear changed managers, preserve exact team scope and apply once under concurrency", async () => {
  const c = await register();
  const first = await reviewedRoster(c);
  let list = await records(c),
    amina = list.find(
      (r) => r.kind === "person" && r.data.email === staffEmail,
    ),
    alex = list.find((r) => r.kind === "person" && r.data.email === execEmail);
  const originalDuty = list.find(
    (r) => r.kind === "duty" && r.data.ownerId === amina.id,
  );
  const second = await draft(c, "roster"),
    edited = structuredClone(second.result.draft);
  edited.people[1].managerEmail = "";
  edited.people[1].duties[0].description =
    "Confirm each visit with the customer.";
  const [a, b] = await Promise.all([
    apply(c, second, edited),
    apply(c, second, edited),
  ]);
  assert.equal(a.status, 200, JSON.stringify(a.data));
  assert.equal(b.status, 200, JSON.stringify(b.data));
  assert.deepEqual(a.data, b.data);
  list = await records(c);
  assert.equal(list.find((r) => r.id === amina.id).data.managerId, "");
  assert.equal(list.filter((r) => r.kind === "duty").length, 2);
  assert.equal(
    list.find((r) => r.id === originalDuty.id).data.purpose,
    "Confirm each visit with the customer.",
  );
  const third = await draft(c, "roster"),
    reduced = structuredClone(third.result.draft);
  reduced.people = reduced.people.filter((p: any) => p.email === staffEmail);
  reduced.people[0].managerEmail = "";
  reduced.people[0].duties = [];
  assert.equal((await apply(c, third, reduced)).status, 200);
  await draft(c, "interviews");
  const input = inputs.at(-1)!;
  assert.deepEqual(
    input.people.map((p) => p.id),
    [amina.id],
  );
  assert.deepEqual(input.people[0].duties, []);
  assert.ok(
    (await records(c)).some((r) => r.id === alex.id),
    "Existing records remain available outside this engagement roster.",
  );
});

test("Discovery rejects missing participants, foreign citations and tasks with no returned team source", async () => {
  const c = await register();
  await reviewedRoster(c);
  const co = await company(c);
  overrides.set(co.name + ":interviews", (input) => ({
    summary: "Incomplete output",
    interviews: [
      {
        personId: input.people[0].id,
        title: "Incomplete interview",
        emailSubject: "Test",
        emailBody: "Test",
        questions,
      },
    ],
  }));
  const result = await request(c, path(c) + "/draft", "POST", {
    stage: "interviews",
    consent: true,
  });
  assert.equal(result.status, 200);
  const status = await request(c, path(c)),
    bad = status.data.jobs.find((j: any) => j.id === result.data.id);
  assert.equal(bad.state, "failed");
  assert.match(bad.message, /exactly one question set/);
  assert.equal((await apply(c, bad, {})).data.code, "DRAFT_NOT_READY");
  overrides.delete(co.name + ":interviews");
  const roster = await draft(c, "roster"),
    wrong = structuredClone(roster.result.draft);
  wrong.people[0].sourceIds = [randomUUID()];
  assert.equal((await apply(c, roster, wrong)).data.code, "DISCOVERY_CITATION");
  const validInput = await tx(c.user.tenant_id, (db) =>
    discoveryContext(db, co, "tasks"),
  );
  assert.throws(
    () =>
      validateDiscovery(
        {
          summary: "Not grounded",
          tasks: [
            {
              title: "Invented task",
              duty: "Task",
              ownerId: "",
              performerId: "",
              purpose: "Purpose",
              trigger: "Trigger",
              inputs: "Inputs",
              instructions: "Instructions",
              output: "Output",
              systems: [],
              humanGate: "Check",
              sourceIds: [validInput.sources[0].id],
            },
          ],
          gaps: [],
        },
        validInput,
      ),
    /returned team interview/,
  );
});

test("Discovery provider calls are idempotent and its daily limit holds under concurrent requests", async () => {
  const c = await register();
  await publicResearch(c);
  const before = inputs.length,
    key = randomUUID(),
    body = { stage: "contact", contact, consent: true };
  const [a, b] = await Promise.all([
    request(c, path(c) + "/draft", "POST", body, { "Idempotency-Key": key }),
    request(c, path(c) + "/draft", "POST", body, { "Idempotency-Key": key }),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.deepEqual(a.data, b.data);
  assert.equal(inputs.length, before + 1);
  await tx(c.user.tenant_id, async (db) => {
    for (let i = 0; i < 28; i++)
      await db.query(
        "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'discovery_contact','failed',$4)",
        [
          randomUUID(),
          c.user.tenant_id,
          c.company,
          { stage: "contact", sources: [], fingerprint: "synthetic" },
        ],
      );
  });
  const countBefore = inputs.length;
  const outcomes = await Promise.all([
    request(c, path(c) + "/draft", "POST", body),
    request(c, path(c) + "/draft", "POST", body),
  ]);
  assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 429]);
  assert.equal(inputs.length, countBefore + 1);
  assert.equal(
    outcomes.find((r) => r.status === 429)!.data.code,
    "DISCOVERY_LIMIT",
  );
});

test("Roster validation rolls back duplicate emails and reporting cycles without partial records", async () => {
  const c = await register();
  await meeting(c);
  const job = await draft(c, "roster"),
    baseline = (await records(c)).length;
  const duplicate = structuredClone(job.result.draft);
  duplicate.people[1].email = duplicate.people[0].email;
  const duplicateResult = await apply(c, job, duplicate);
  assert.equal(duplicateResult.status, 422);
  assert.equal(duplicateResult.data.code, "DUPLICATE_PERSON");
  assert.equal((await records(c)).length, baseline);
  const cycle = structuredClone(job.result.draft);
  cycle.people[0].managerEmail = cycle.people[1].email;
  const cycleResult = await apply(c, job, cycle);
  assert.equal(cycleResult.status, 422);
  assert.equal(cycleResult.data.code, "REPORTING_CYCLE");
  assert.equal((await records(c)).length, baseline);
  const missing = structuredClone(job.result.draft);
  missing.people[1].managerEmail = "not-in-the-roster@test.invalid";
  assert.equal((await apply(c, job, missing)).data.code, "MANAGER_MISSING");
  assert.equal((await records(c)).length, baseline);
  const correct = await apply(c, job);
  assert.equal(correct.status, 200, JSON.stringify(correct.data));
  assert.equal(correct.data.personIds.length, 2);
});

test("Only responses from the current reviewed team can support new task drafts", async () => {
  const c = await register();
  await reviewedRoster(c);
  const interviews = await draft(c, "interviews"),
    applied = await apply(c, interviews);
  const all = await records(c),
    staff = all.find((r) => r.kind === "person" && r.data.email === staffEmail),
    req = all.find(
      (r) =>
        applied.data.requestIds.includes(r.id) && r.data.personId === staff.id,
    );
  const reply = await enrollAndSubmit(
    c,
    req,
    "I schedule the repair after checking our service calendar and confirming the customer's address and equipment fault.",
  );
  const task = await draft(c, "tasks");
  assert.ok(inputs.at(-1)!.sources.some((s) => s.id === reply.responseId));
  const revised = await draft(c, "roster"),
    edited = structuredClone(revised.result.draft);
  edited.people = edited.people.filter((p: any) => p.email === execEmail);
  assert.equal((await apply(c, revised, edited)).status, 200);
  assert.equal((await apply(c, task)).data.code, "DISCOVERY_STALE");
  assert.equal(
    (
      await request(c, path(c) + "/draft", "POST", {
        stage: "tasks",
        consent: true,
      })
    ).data.code,
    "TEAM_RESPONSE_REQUIRED",
  );
  const current = await tx(c.user.tenant_id, async (db) =>
    discoveryContext(db, await company(c), "tasks"),
  );
  assert.ok(!current.sources.some((s) => s.id === reply.responseId));
});

test("Malformed AI output creates no records and reports a recoverable draft failure", async () => {
  const c = await register(),
    co = await company(c);
  overrides.set(co.name + ":contact", () => ({
    summary: "Incomplete provider output",
  }));
  const result = await request(c, path(c) + "/draft", "POST", {
    stage: "contact",
    contact,
    consent: true,
  });
  assert.equal(result.status, 200);
  const status = await request(c, path(c)),
    job = status.data.jobs.find((j: any) => j.id === result.data.id);
  assert.equal(job.state, "failed");
  assert.match(job.message, /incomplete or invalid/);
  assert.equal((await records(c)).length, 0);
  overrides.delete(co.name + ":contact");
});

test("Audio-only response can become reviewed transcript evidence and support Discovery without rewriting the original", async () => {
  const c = await register();
  await reviewedRoster(c);
  const interviews = await draft(c, "interviews"),
    applied = await apply(c, interviews),
    list = await records(c),
    staff = list.find(
      (r) => r.kind === "person" && r.data.email === staffEmail,
    ),
    req = list.find(
      (r) =>
        applied.data.requestIds.includes(r.id) && r.data.personId === staff.id,
    );
  const returned = await enrollAndSubmit(c, req, "", false, true),
    assetPath = prefix(c) + "/assets/" + returned.assetId;
  const original = (await records(c)).find((r) => r.id === returned.responseId);
  assert.equal(original.data.text, "");
  assert.equal(original.data.assetId, returned.assetId);
  assert.equal(
    (
      await request(c, path(c) + "/draft", "POST", {
        stage: "tasks",
        consent: true,
      })
    ).data.code,
    "TEAM_RESPONSE_REQUIRED",
  );
  const transcribed = await request(c, assetPath + "/transcribe", "POST", {
    consent: true,
  });
  assert.equal(transcribed.status, 200, JSON.stringify(transcribed.data));
  assert.equal(transcribed.data.state, "complete");
  const body = {
    jobId: transcribed.data.id,
    text:
      transcribed.data.result.text +
      " The customer then receives a confirmed appointment.",
    reviewed: true,
  };
  assert.equal(
    (
      await request(
        returned.participant,
        assetPath + "/transcription-review",
        "POST",
        body,
      )
    ).status,
    403,
  );
  const other = await register();
  assert.equal(
    (await request(other, assetPath + "/transcription-review", "POST", body))
      .status,
    404,
  );
  const reviewed = await request(
    c,
    assetPath + "/transcription-review",
    "POST",
    body,
  );
  assert.equal(reviewed.status, 200, JSON.stringify(reviewed.data));
  assert.equal(reviewed.data.data.originId, returned.responseId);
  assert.equal(reviewed.data.data.responseHash, original.hash);
  assert.equal(reviewed.data.state, "accepted");
  assert.equal(
    (await request(c, assetPath + "/transcription-review", "POST", body)).data
      .id,
    reviewed.data.id,
  );
  assert.equal(
    (
      await request(c, assetPath + "/transcription-review", "POST", {
        ...body,
        text: "A different review",
      })
    ).data.code,
    "TRANSCRIPT_ALREADY_REVIEWED",
  );
  const current = (await records(c)).find((r) => r.id === original.id);
  assert.equal(current.hash, original.hash);
  assert.equal(current.data.text, "");
  assert.equal(current.version, 1);
  const task = await draft(c, "tasks"),
    source = inputs.at(-1)!.sources.find((s) => s.id === original.id)!;
  assert.ok(source.text.includes("confirmed appointment"));
  assert.notEqual(source.hash, original.hash);
  const result = await apply(c, task);
  assert.equal(result.status, 200, JSON.stringify(result.data));
  const record = (await records(c)).find(
    (r) => result.data.recordIds.includes(r.id) && r.kind === "task",
  );
  assert.deepEqual(record.data.evidenceIds, [reviewed.data.id]);
  const next = await draft(c, "tasks");
  const retracted = await request(
    c,
    prefix(c) + "/records/" + reviewed.data.id + "/actions",
    "POST",
    {
      action: "retract",
      expectedVersion: reviewed.data.version,
      note: "The transcript contains a material error.",
    },
  );
  assert.equal(retracted.status, 200, JSON.stringify(retracted.data));
  assert.equal((await apply(c, next)).data.code, "DISCOVERY_STALE");
});

test("Discovery rejects already expired request dates before creating records", async () => {
  const c = await register(),
    job = await draft(c, "contact");
  const result = await request(c, path(c) + "/" + job.id + "/apply", "POST", {
    reviewed: true,
    draft: job.result.draft,
    dueDate: "2000-01-01",
  });
  assert.equal(result.status, 422);
  assert.equal(result.data.code, "DUE_DATE_PAST");
  assert.equal((await records(c)).length, 0);
});

test("Reviewed Discovery edits persist and complete tasks are ready for exact-version confirmation without a second advisor review", async () => {
  const c = await register();
  await reviewedRoster(c);
  const interviews = await draft(c, "interviews"),
    applied = await apply(c, interviews),
    list = await records(c),
    staff = list.find(
      (r) => r.kind === "person" && r.data.email === staffEmail,
    ),
    req = list.find(
      (r) =>
        applied.data.requestIds.includes(r.id) && r.data.personId === staff.id,
    );
  await enrollAndSubmit(
    c,
    req,
    "I schedule repair visits, check the calendar and confirm the appointment with the customer.",
  );
  const generated = await draft(c, "tasks"),
    edited = structuredClone(generated.result.draft);
  edited.tasks[0].purpose = "Give the customer one verified appointment time.";
  const saved = await apply(c, generated, edited);
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const current = (await records(c)).find((r) =>
    saved.data.confirmationReadyIds.includes(r.id),
  );
  assert.equal(current.state, "awaiting_confirmation");
  assert.equal(current.data.reviewed, true);
  const jobs = (await request(c, path(c))).data.jobs,
    job = jobs.find((j: any) => j.id === generated.id);
  assert.equal(
    job.result.reviewedDraft.tasks[0].purpose,
    edited.tasks[0].purpose,
  );
  assert.equal(
    job.result.draft.tasks[0].purpose,
    generated.result.draft.tasks[0].purpose,
  );
  const confirmation = await request(c, prefix(c) + "/records", "POST", {
    kind: "request",
    data: {
      title: "Confirm your task card",
      personId: staff.id,
      type: "confirmation",
      questions: ["Does this describe your work?"],
      taskIds: [current.id],
      dueDate: "2099-01-10",
      notice: "Synthetic confirmation test.",
    },
  });
  assert.equal(confirmation.status, 201, JSON.stringify(confirmation.data));
  assert.equal(
    confirmation.data.data.taskSnapshots[0].version,
    current.version,
  );
  assert.equal(confirmation.data.data.taskSnapshots[0].hash, current.hash);
  const next = await draft(c, "tasks"),
    incomplete = structuredClone(next.result.draft);
  incomplete.tasks[0].ownerId = "";
  const result = await apply(c, next, incomplete);
  assert.equal(result.status, 200);
  const unresolved = (await records(c)).find((r) =>
    result.data.needsDetailsIds.includes(r.id),
  );
  assert.equal(unresolved.state, "proposed");
  assert.equal(unresolved.data.reviewed, false);
});

test("Reviewed Discovery accepts the source once and generic response acceptance reuses prior evidence", async () => {
  const c = await register();
  await reviewedRoster(c);
  const interviews = await draft(c, "interviews"),
    applied = await apply(c, interviews),
    list = await records(c),
    staff = list.find(
      (r) => r.kind === "person" && r.data.email === staffEmail,
    ),
    req = list.find(
      (r) =>
        applied.data.requestIds.includes(r.id) && r.data.personId === staff.id,
    );
  const returned = await enrollAndSubmit(
    c,
    req,
    "I check the service calendar and agree the appointment time with the customer.",
  );
  const job = await draft(c, "tasks");
  assert.equal((await apply(c, job)).status, 200);
  let current = await records(c);
  assert.equal(
    current.find((r) => r.id === returned.responseId).state,
    "accepted",
  );
  assert.equal(current.find((r) => r.id === req.id).state, "accepted");
  assert.equal(
    current.filter(
      (r) => r.kind === "evidence" && r.data.originId === returned.responseId,
    ).length,
    1,
  );
  assert.equal(
    (await request(c, path(c))).data.jobs.find((j: any) => j.id === job.id)
      .stale,
    false,
    "Accepting the source is not a change to its content.",
  );
  // Exercise the legacy state where accepted evidence already existed but the response remained returned.
  await tx(c.user.tenant_id, async (db) => {
    await db.query(
      "UPDATE records SET state='returned' WHERE company_id=$1 AND id=ANY($2::uuid[])",
      [c.company, [req.id, returned.responseId]],
    );
  });
  const original = current.find((r) => r.id === returned.responseId),
    accepted = await request(
      c,
      prefix(c) + "/records/" + original.id + "/actions",
      "POST",
      { action: "accept", expectedVersion: original.version },
    );
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  current = await records(c);
  assert.equal(
    current.filter(
      (r) => r.kind === "evidence" && r.data.originId === original.id,
    ).length,
    1,
  );
  assert.equal(current.find((r) => r.id === original.id).hash, original.hash);
});

test("business-specific kickoff context preserves long meeting notes and invalidates drafts when the model changes", async () => {
  const c = await register();
  const templates = (await import("../shared/business-types.ts"))
    .businessTemplates;
  const profile = {
    industry: "Industrial services",
    status: "advisor_reviewed",
    rationale: "Synthetic hybrid company",
    streams: templates
      .filter((t) => ["manufacturing", "saas"].includes(t.id))
      .map((t) => ({
        id: t.id,
        templateId: t.id,
        name: t.label,
        stages: t.stages,
      })),
  };
  await tx(c.user.tenant_id, (db) =>
    db.query(
      "UPDATE companies SET settings=jsonb_set(settings,'{businessProfile}',$2::jsonb) WHERE id=$1",
      [c.company, JSON.stringify(profile)],
    ),
  );
  const text =
    "Discussed the operating model. ".repeat(470) +
    "Final handoff: Amina sends the confirmed appointment to the technician in the service calendar.";
  assert.ok(text.length > 12000 && text.length < 20000);
  const saved = await request(c, path(c) + "/meeting", "POST", {
    title: "Hybrid kickoff",
    text,
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const context = await tx(c.user.tenant_id, async (db) =>
    discoveryContext(db, await company(c), "roster"),
  );
  assert.equal(context.captureGuide?.models.length, 2);
  assert.equal(context.sources.find((s) => s.origin === "meeting")?.text, text);
  assert.deepEqual(context.businessProfile, profile);
  const changed = { ...profile, streams: [profile.streams[0]] };
  await tx(c.user.tenant_id, (db) =>
    db.query(
      "UPDATE companies SET settings=jsonb_set(settings,'{businessProfile}',$2::jsonb) WHERE id=$1",
      [c.company, JSON.stringify(changed)],
    ),
  );
  const updated = await tx(c.user.tenant_id, async (db) =>
    discoveryContext(db, await company(c), "roster"),
  );
  assert.notEqual(updated.fingerprint, context.fingerprint);
  assert.equal(updated.captureGuide?.models.length, 1);
});
