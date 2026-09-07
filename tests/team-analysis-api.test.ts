import "dotenv/config";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createApp, errorHandler } from "../server/app.ts";
import { pool, tx, putRecord } from "../server/db.ts";
import { openAiTeam } from "../server/team-analysis.ts";
import { teamContext } from "../shared/team-analysis.ts";
let server: Server,
  base: string,
  calls = 0,
  behavior = "valid",
  release: (() => void) | undefined,
  entered: (() => void) | undefined;
type Client = { cookie: string; csrf: string; user: any; company: string };
async function request(
  c: Client | null,
  path: string,
  method = "GET",
  body?: unknown,
  key: string = randomUUID(),
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(c ? { Cookie: c.cookie, "X-CSRF-Token": c.csrf } : {}),
      "Idempotency-Key": key,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
async function register() {
  const r = await request(null, "/api/auth/register", "POST", {
    name: "Analysis tester",
    email: randomUUID() + "@test.invalid",
    password: "Synthetic test password 124!",
    companyName: "Synthetic team",
    scope: "Test review",
    goal: "No paid requests",
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const c = {
    cookie: r.cookie,
    csrf: r.data.csrf,
    user: r.data.user,
    company: "",
  };
  c.company = (await request(c, "/api/v1/companies")).data[0].id;
  return c;
}
const path = (c: Client) => "/api/v1/companies/" + c.company + "/team-analysis";
async function task(c: Client, title = "Packet check") {
  return tx(c.user.tenant_id, (db) =>
    putRecord(db, c.user, c.company, "task", title, {
      instructions:
        "Compare every supplied document to the approved checklist.",
      ownerId: "",
      performerId: "",
      mode: "human_only",
    }),
  );
}
async function connect(c: Client) {
  assert.equal(
    (
      await request(
        c,
        "/api/v1/companies/" + c.company + "/providers/openai",
        "PUT",
        { key: "synthetic-never-live", enabled: true },
      )
    ).status,
    200,
  );
}
async function start(c: Client, key?: string) {
  const s = await request(c, path(c));
  return request(
    c,
    path(c),
    "POST",
    { consent: true, fingerprint: s.data.fingerprint },
    key,
  );
}
before(async () => {
  const app = createApp({
    authRequestsPerWindow: 1000,
    teamProvider: async (input) => {
      calls++;
      if (behavior === "wait") {
        entered?.();
        await new Promise<void>((r) => (release = r));
      }
      if (behavior === "timeout") throw new Error("simulated network failure");
      const source = input.sources.find((s) => s.kind === "task")!;
      return {
        output: {
          summary: "Draft review of recorded work.",
          findings: [
            {
              id: "ownership",
              category: "ownership",
              title: "Confirm the owner",
              observation: "This task needs ownership review.",
              confidence: "low",
              citations: [
                {
                  sourceId: behavior === "invalid" ? "foreign" : source.id,
                  quote:
                    "Compare every supplied document to the approved checklist.",
                },
              ],
              nextAction: "Ask leadership.",
              validationQuestion: "Who owns the task?",
              proposedScope: "Investigate ownership only.",
              humanReview: "Advisor checks with leadership.",
            },
          ],
        },
        responseId: "synthetic-response",
        usage: { input_tokens: 1, output_tokens: 1 },
      };
    },
  });
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = "http://127.0.0.1:" + (server.address() as any).port;
});
after(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.end();
});
test("durable review, exact sources, idempotency/cache, freshness and isolation", async () => {
  const c = await register(),
    other = await register(),
    p = path(c);
  await connect(c);
  assert.equal((await request(null, p)).status, 401);
  assert.equal((await request(other, p)).status, 404);
  assert.equal((await start(c)).status, 422);
  const record = await task(c);
  const s = (await request(c, p)).data,
    body = { consent: true, fingerprint: s.fingerprint },
    key = randomUUID(),
    count = calls;
  assert.equal(
    (await request({ ...c, csrf: "wrong" }, p, "POST", body)).status,
    403,
  );
  const first = await request(c, p, "POST", body, key);
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.equal((await request(c, p, "POST", body, key)).data.id, first.data.id);
  assert.equal((await request(c, p, "POST", body)).data.id, first.data.id);
  assert.equal(calls, count + 1);
  let status = (await request(c, p)).data;
  assert.equal(status.jobs[0].state, "complete");
  assert.equal(status.jobs[0].stale, false);
  assert.ok(!JSON.stringify(status).includes("synthetic-never-live"));
  const sources = await request(c, p + "/" + first.data.id + "/sources");
  assert.equal(sources.data.sources[0].version, 1);
  assert.equal(
    (await request(other, p + "/" + first.data.id + "/sources")).status,
    404,
  );
  const reviewPath = p + "/" + first.data.id + "/review",
    reviewKey = randomUUID(),
    reviewBody = {
      findingId: "ownership",
      decision: "discuss",
      note: "Ask leadership to identify the accountable owner.",
      expectedReviewVersion: 0,
    };
  assert.equal(
    (await request(c, reviewPath, "POST", reviewBody, reviewKey)).data
      .reviewVersion,
    1,
  );
  assert.equal(
    (await request(c, reviewPath, "POST", reviewBody, reviewKey)).data
      .reviewVersion,
    1,
  );
  assert.equal((await request(c, reviewPath, "POST", reviewBody)).status, 409);
  assert.equal(
    (await request(other, reviewPath, "POST", reviewBody)).status,
    404,
  );
  const reviewed = (await request(c, p)).data.jobs[0];
  assert.equal(reviewed.result.reviews.ownership.decision, "discuss");
  assert.equal(reviewed.result.output.findings[0].id, "ownership");
  await tx(c.user.tenant_id, (db) =>
    putRecord(
      db,
      c.user,
      c.company,
      "task",
      record.title,
      { ...record.data, destination: "Finance" },
      "proposed",
      record,
    ),
  );
  status = (await request(c, p)).data;
  assert.equal(status.jobs[0].stale, true);
  assert.equal(
    (
      await request(c, reviewPath, "POST", {
        ...reviewBody,
        expectedReviewVersion: 1,
      })
    ).status,
    409,
  );
  assert.equal((await request(c, p, "POST", body)).status, 409);
  assert.ok(
    !(
      await request(c, p + "/" + first.data.id + "/sources")
    ).data.sources[0].text.includes("Finance"),
  );
  assert.equal((await start(c)).status, 200);
  assert.equal(calls, count + 2);
  await tx(other.user.tenant_id, (db) =>
    db.query("UPDATE users SET role='participant',company_id=$2 WHERE id=$1", [
      other.user.id,
      other.company,
    ]),
  );
  assert.equal((await request(other, path(other))).status, 403);
});
test("provider failures and invalid citations persist without accepting output", async () => {
  const c = await register();
  await connect(c);
  await task(c);
  behavior = "invalid";
  await start(c);
  let s = (await request(c, path(c))).data;
  assert.equal(s.jobs[0].state, "failed");
  assert.equal(s.jobs[0].result, null);
  behavior = "timeout";
  await start(c);
  s = (await request(c, path(c))).data;
  assert.equal(s.jobs[0].state, "unknown");
  assert.equal(s.jobs[0].result, null);
  behavior = "valid";
});
test("concurrent attempts reserve once and mid-run source changes mark results stale", async () => {
  const c = await register();
  await connect(c);
  await task(c);
  behavior = "wait";
  const began = new Promise<void>((r) => (entered = r)),
    pending = start(c);
  await began;
  assert.equal((await start(c)).status, 409);
  await task(c, "Another task");
  release?.();
  await pending;
  behavior = "valid";
  const s = (await request(c, path(c))).data;
  assert.equal(s.jobs[0].state, "complete");
  assert.equal(s.jobs[0].stale, true);
});
test("expired attempts remain unknown and caps count failed/unknown requests", async () => {
  const c = await register();
  await connect(c);
  await task(c);
  await tx(c.user.tenant_id, async (db) => {
    for (let i = 0; i < 12; i++)
      await db.query(
        "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input,created_at) VALUES($1,$2,$3,'team_analysis',$4,$5,now()-interval '10 minutes')",
        [
          randomUUID(),
          c.user.tenant_id,
          c.company,
          i === 0 ? "running" : "failed",
          { fingerprint: "old" },
        ],
      );
  });
  const s = (await request(c, path(c))).data;
  assert.ok(s.jobs.some((j: any) => j.state === "unknown"));
  assert.equal((await start(c)).status, 429);
});
test("provider transport is bounded, no-store, no redirects and rejects incomplete/refusal", async () => {
  const context = teamContext([], "Example");
  let sent: any;
  const transport: typeof fetch = async (_url, init) => {
    sent = init;
    return new Response(
      JSON.stringify({
        status: "completed",
        id: "test",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ summary: "No tasks.", findings: [] }),
              },
            ],
          },
        ],
      }),
      { status: 200 },
    );
  };
  const r = await openAiTeam(
    context,
    "fake",
    "gpt-4.1-mini",
    undefined,
    transport,
  );
  assert.equal((r.output as any).findings.length, 0);
  assert.equal(JSON.parse(sent.body).store, false);
  assert.equal(sent.redirect, "error");
  assert.ok(sent.signal);
  await assert.rejects(
    () =>
      openAiTeam(
        context,
        "fake",
        "gpt-4.1-mini",
        undefined,
        async () => new Response(JSON.stringify({ status: "incomplete" })),
      ),
    /did not complete/,
  );
  await assert.rejects(
    () =>
      openAiTeam(
        context,
        "fake",
        "gpt-4.1-mini",
        undefined,
        async () =>
          new Response(
            JSON.stringify({
              status: "completed",
              output: [{ content: [{ type: "refusal" }] }],
            }),
          ),
      ),
    /declined/,
  );
  await assert.rejects(
    () =>
      openAiTeam(
        context,
        "fake",
        "gpt-4.1-mini",
        undefined,
        async () => new Response("a".repeat(350001)),
      ),
    /Oversize/,
  );
});
