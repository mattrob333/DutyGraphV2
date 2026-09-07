import { briefCategories } from "../shared/business-brief.ts";
import "dotenv/config";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createApp, errorHandler } from "../server/app.ts";
import { pool, tx } from "../server/db.ts";
import {
  classificationDraft,
  validateClassification,
  profileFromClassification,
  type ClassificationInput,
} from "../shared/business-classification.ts";
import { businessTemplates } from "../shared/business-types.ts";
import { frameworkInputs } from "../server/frameworks.ts";
import { discoveryContext } from "../server/discovery.ts";

const draft = {
  brief: {
    facts: Object.keys(briefCategories).map((category) => ({
      category,
      label: "Not established",
      value: "No public evidence in this fixture.",
      basis: "Not established",
      asOf: "",
      citations: [],
    })),
    monitoring: [],
  },
  alternatives: [],
  industry: "Business advisory",
  summary: "The description fits a consulting business.",
  recommendations: [
    {
      templateId: "advisory",
      reason: "The company advises clients on improving their operations.",
      confidence: "Medium",
      sourceIds: ["description"],
    },
  ],
  questions: ["Do you also sell recurring managed services?"],
};
let server: Server,
  base = "",
  calls = 0;
const received: ClassificationInput[] = [];
before(async () => {
  server = createApp({
    authRequestsPerWindow: 1000,
    classificationProvider: async (input) => {
      calls++;
      received.push(input);
      if (input.description === "invalid result")
        return {
          ...draft,
          recommendations: [
            { ...draft.recommendations[0], sourceIds: ["foreign"] },
          ],
        };
      return {
        ...draft,
        recommendations: [
          {
            ...draft.recommendations[0],
            sourceIds: input.description
              ? ["description"]
              : [input.sources[0].id],
          },
        ],
      };
    },
    researchProvider: async (_query, domain) => ({
      requestId: "synthetic",
      sources:
        domain === "unreadable.test.invalid"
          ? []
          : [
              {
                title: "Synthetic offer",
                url: `https://${domain}/services`,
                text: "We advise companies on their operations.",
                contentHash: "fixture",
                retrievedAt: "2026-09-07",
                publishedDate: "",
                excerpted: false,
              },
            ],
    }),
  })
    .use(errorHandler)
    .listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});
async function request(
  c: any,
  path: string,
  method = "GET",
  body?: any,
  key = randomUUID(),
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(c ? { Cookie: c.cookie, "X-CSRF-Token": c.csrf } : {}),
      "Idempotency-Key": key,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
async function account() {
  const r = await request(null, "/api/auth/register", "POST", {
    name: "Fictional advisor",
    email: `${randomUUID()}@test.invalid`,
    password: "Synthetic classification password 123!",
    companyName: "Synthetic consulting",
    scope: "Business discovery",
    goal: "Test an inferred business profile.",
  });
  assert.equal(r.status, 201);
  const c = {
    cookie: r.cookie,
    csrf: r.data.csrf,
    user: r.data.user,
    company: "",
    revision: 0,
  };
  const company = (await request(c, "/api/v1/companies")).data[0];
  c.company = company.id;
  c.revision = company.revision;
  assert.equal(
    (
      await request(
        c,
        `/api/v1/companies/${c.company}/providers/openai`,
        "PUT",
        { key: "synthetic-never-real", enabled: true },
      )
    ).status,
    200,
  );
  return c;
}
const path = (c: any) =>
  `/api/v1/companies/${c.company}/business-classification`;
const body = (c: any, changes = {}) => ({
  name: "Synthetic consulting",
  website: "",
  description: "We advise clients on improving business operations.",
  expectedRevision: c.revision,
  consent: true,
  ...changes,
});

test("classification validates all catalog IDs and rejects invented templates, duplicate models and foreign citations", () => {
  const input = {
    ...body({ revision: 0 }),
    sources: [],
    revision: 0,
    promptVersion: "v1",
    websiteRead: false,
    lookupNote: "",
  };
  for (const t of businessTemplates) {
    const valid = validateClassification(
      {
        ...draft,
        recommendations: [{ ...draft.recommendations[0], templateId: t.id }],
      },
      input,
    );
    const profile = profileFromClassification(valid);
    assert.deepEqual(profile.streams[0].stages, t.stages);
    assert.equal(profile.status, "proposed");
  }
  assert.equal(
    classificationDraft.safeParse({
      ...draft,
      recommendations: [
        { ...draft.recommendations[0], templateId: "invented" },
      ],
    }).success,
    false,
  );
  assert.throws(() =>
    validateClassification(
      {
        ...draft,
        recommendations: [draft.recommendations[0], draft.recommendations[0]],
      },
      input,
    ),
  );
  assert.throws(() =>
    validateClassification(
      {
        ...draft,
        recommendations: [
          { ...draft.recommendations[0], sourceIds: ["foreign"] },
        ],
      },
      input,
    ),
  );
});

test("description produces a recoverable draft once; saving adapts profile and retains intake for downstream context", async () => {
  const c = await account(),
    key = randomUUID(),
    count = calls;
  const result = await request(c, path(c), "POST", body(c), key);
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(
    (await request(c, path(c), "POST", body(c), key)).data.id,
    result.data.id,
  );
  assert.equal(calls, count + 1);
  const job = (await request(c, path(c))).data.jobs[0];
  assert.equal(job.state, "complete", JSON.stringify(job));
  assert.equal(job.input.websiteRead, false);
  const profile = profileFromClassification(job.result.draft);
  const original = await tx(
    c.user.tenant_id,
    async (db) =>
      (
        await db.query("SELECT settings FROM companies WHERE id=$1", [
          c.company,
        ])
      ).rows[0],
  );
  assert.equal(original.settings.businessProfile, undefined);
  const intake = {
    name: body(c).name,
    website: "",
    description: body(c).description,
  };
  const saved = await request(
    c,
    `/api/v1/companies/${c.company}/business-profile`,
    "PUT",
    { expectedRevision: c.revision, profile, intake },
  );
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.deepEqual(saved.data.settings.businessIntake, intake);
  assert.equal((await request(c, path(c), "POST", body(c))).status, 409);
  await tx(c.user.tenant_id, async (db) => {
    const inputs = await frameworkInputs(db, c.company);
    assert.ok(
      inputs.records
        .find((r: any) => r.id.startsWith("business-profile:"))
        .data.text.includes(intake.description),
    );
    const context = await discoveryContext(db, saved.data, "contact");
    assert.ok(context.sources.some((s) => s.text.includes(intake.description)));
    assert.ok(context.sources.some((s) => s.id === `business-brief:${job.id}`));
    const changed = await discoveryContext(
      db,
      {
        ...saved.data,
        settings: {
          ...saved.data.settings,
          businessIntake: { ...intake, description: "A different business" },
        },
      },
      "contact",
    );
    assert.ok(!changed.sources.some((s) => s.id.startsWith("business-brief:")));
  });
});

test("URL lookup creates cited research reusable by frameworks and supports URL-only intake", async () => {
  const c = await account();
  assert.equal(
    (
      await request(
        c,
        path(c),
        "POST",
        body(c, {
          website: "https://consulting.test.invalid",
          description: "",
        }),
      )
    ).status,
    200,
  );
  const job = (await request(c, path(c))).data.jobs[0];
  assert.equal(job.state, "complete", JSON.stringify(job));
  assert.equal(job.input.websiteRead, true);
  assert.deepEqual(job.result.draft.recommendations[0].sourceIds, [
    "website-1",
  ]);
  const inputs = await tx(c.user.tenant_id, (db) =>
    frameworkInputs(db, c.company),
  );
  assert.equal(
    inputs.research[0].results[0].url,
    "https://consulting.test.invalid/services",
  );
});

test("unreadable sites use supplied description and do not invent a classification for a bare URL", async () => {
  const c = await account();
  await request(
    c,
    path(c),
    "POST",
    body(c, { website: "https://unreadable.test.invalid" }),
  );
  let job = (await request(c, path(c))).data.jobs[0];
  assert.equal(job.state, "complete");
  assert.equal(job.input.websiteRead, false);
  const count = calls;
  await request(
    c,
    path(c),
    "POST",
    body(c, { website: "https://unreadable.test.invalid", description: "" }),
  );
  job = (await request(c, path(c))).data.jobs[0];
  assert.equal(job.state, "failed");
  assert.equal(calls, count);
  assert.equal(job.result, null);
});

test("classification rejects invalid provider data and isolates account reads/writes", async () => {
  const c = await account(),
    other = await account();
  await request(c, path(c), "POST", body(c, { description: "invalid result" }));
  assert.notEqual((await request(c, path(c))).data.jobs[0].state, "complete");
  assert.equal((await request(other, path(c))).status, 404);
  assert.equal((await request(other, path(c), "POST", body(c))).status, 404);
  assert.equal((await request(null, path(c))).status, 401);
  assert.equal(
    (
      await request(
        c,
        path(c),
        "POST",
        body(c, { website: "http://127.0.0.1" }),
      )
    ).status,
    422,
  );
  assert.equal(
    (await request(c, path(c), "POST", body(c, { consent: false }))).status,
    422,
  );
});

test("daily classification quota prevents additional provider calls", async () => {
  const c = await account();
  await tx(c.user.tenant_id, (db) =>
    db.query(
      "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) SELECT gen_random_uuid(),$1,$2,'business_classification','failed','{}'::jsonb FROM generate_series(1,10)",
      [c.user.tenant_id, c.company],
    ),
  );
  const count = calls;
  assert.equal((await request(c, path(c), "POST", body(c))).status, 429);
  assert.equal(calls, count);
});

test("classification reuses a completed research pass without a fifth search and rejects another company's run", async () => {
  const c = await account(),
    other = await account();
  const research = await request(
    c,
    `/api/v1/companies/${c.company}/research`,
    "POST",
    {
      publicName: "Synthetic consulting",
      website: "https://consulting.test.invalid",
      focus: "company",
      acknowledgePublicQuery: true,
    },
  );
  assert.equal(research.data.state, "complete");
  const forbiddenContext = await request(
    other,
    `/api/v1/companies/${other.company}/research`,
    "POST",
    {
      publicName: "Other",
      website: "",
      description: "Advisory",
      focus: "competitors",
      contextRunIds: [research.data.id],
      acknowledgePublicQuery: true,
    },
  );
  assert.equal(forbiddenContext.status, 422);
  const contextual = await request(
    c,
    `/api/v1/companies/${c.company}/research`,
    "POST",
    {
      publicName: "Synthetic",
      website: "https://consulting.test.invalid",
      description: "We build custom software",
      focus: "competitors",
      contextRunIds: [research.data.id],
      acknowledgePublicQuery: true,
    },
  );
  assert.equal(contextual.data.state, "complete");
  assert.match(
    contextual.data.query,
    /We advise companies on their operations/,
  );
  assert.match(contextual.data.query, /We build custom software/);
  const input = body(c, {
    description: "",
    website: "https://consulting.test.invalid",
    researchRunIds: [research.data.id],
  });
  assert.equal((await request(c, path(c), "POST", input)).status, 200);
  const job = (await request(c, path(c))).data.jobs[0];
  assert.equal(job.state, "complete", JSON.stringify(job));
  assert.equal(job.input.sources[0].id, `research:${research.data.id}:0`);
  assert.equal(
    (await request(c, `/api/v1/companies/${c.company}/research`)).data.runs
      .length,
    2,
  );
  assert.equal(
    (
      await request(
        other,
        path(other),
        "POST",
        body(other, { researchRunIds: [research.data.id] }),
      )
    ).status,
    422,
  );
});

test("company profile survives newer incomplete jobs and advisor updates are isolated and versioned", async () => {
  const c = await account();
  const made = await request(c, path(c), "POST", body(c));
  assert.equal(made.status, 200);
  const jobId = made.data.id;
  await tx(c.user.tenant_id, async (db) => {
    for (let i = 0; i < 6; i++)
      await db.query(
        "INSERT INTO provider_jobs (id,tenant_id,company_id,kind,state,input) SELECT $1,tenant_id,company_id,kind,'failed',input FROM provider_jobs WHERE id=$2",
        [randomUUID(), jobId],
      );
  });
  const loaded = await request(c, path(c));
  assert.equal(loaded.data.latestBrief.id, jobId);
  const review = {
    expectedRevision: c.revision,
    jobId,
    summary: "Advisor confirmed consulting and custom delivery.",
    industry: "Business advisory",
    updates:
      "Leadership reports 12 employees as of kickoff; confirm payroll roster.",
  };
  const saved = await request(c, path(c) + "/review", "PUT", review);
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.equal(
    saved.data.settings.companyResearchReview.updates,
    review.updates,
  );
  assert.equal(
    (await request(c, path(c) + "/review", "PUT", review)).status,
    409,
  );
  const other = await account();
  assert.equal(
    (
      await request(other, path(other) + "/review", "PUT", {
        ...review,
        expectedRevision: other.revision,
      })
    ).status,
    404,
  );
  const reloaded = await request(c, path(c));
  assert.equal(reloaded.data.latestBrief.result.draft.summary, draft.summary);
});
