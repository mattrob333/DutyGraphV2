import { teamLinkRouter } from "../server/team-link.ts";
import "dotenv/config";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp, errorHandler } from "../server/app.ts";
import { registerAccount } from "../server/auth.ts";
import { pool, tx, putRecord, tokenHash } from "../server/db.ts";
import { issueInvitation } from "../server/invitations.ts";

test("private team link is account-free, scoped, scanner-safe and single-submit", async () => {
  const app = createApp();
  app.use("/test-team", teamLinkRouter());
  let voiceCalls = 0;
  app.use(
    "/test-voice",
    teamLinkRouter(async () => {
      voiceCalls++;
      return { text: "We have three departments.", requestId: "synthetic" };
    }),
  );
  app.use(errorHandler);
  const server = app.listen(0);
  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  });
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const user = await registerAccount({
    name: "Link test",
    email: randomUUID() + "@test.invalid",
    password: "Synthetic password 123!",
    companyName: "Link test",
    scope: "Kickoff scope",
    goal: "Prepare kickoff",
  });
  const company = (
    await tx(user.tenant_id, (db) =>
      db.query("SELECT id FROM companies WHERE tenant_id=$1", [user.tenant_id]),
    )
  ).rows[0].id;
  async function invite(kind = "work") {
    return tx(user.tenant_id, async (db) => {
      const person = await putRecord(db, user, company, "person", "Contact", {
        email: user.email,
      });
      const r = await putRecord(
        db,
        user,
        company,
        "request",
        "Kickoff",
        {
          personId: person.id,
          type: kind,
          questionPlanVersion: "discovery-interview:v1",
          dueDate: "2099-01-01",
          questions: ["Goals?"],
          notice: "Private",
        },
        "draft",
      );
      const link = await issueInvitation(
        db,
        user,
        company,
        r,
        r.version,
        "manual_link",
      );
      return link.url.split("/").at(-1)!;
    });
  }
  const call = async (token: string, body?: unknown) => {
    const r = await fetch(base + "/test-team/" + token + "/team", {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie"),
    };
  };
  try {
    const token = await invite();
    const first = await call(token);
    assert.deepEqual(first.data.questions, ["Goals?"]);
    assert.equal("publicContext" in first.data, false);
    assert.equal(JSON.stringify(first.data).includes("password_hash"), false);
    const voice = () =>
      fetch(base + "/test-voice/" + token + "/team/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/webm" },
        body: Buffer.from("synthetic audio"),
      });
    for (let i = 0; i < 10; i++) assert.equal((await voice()).status, 200);
    assert.equal((await voice()).status, 429);
    assert.equal(voiceCalls, 10);
    assert.equal(first.status, 200);
    assert.equal(first.cookie, null);
    assert.equal((await call(token)).status, 200); // GET never consumes link
    assert.equal((await fetch(base + "/api/v1/companies")).status, 401);
    assert.equal((await call(await invite("confirmation"))).status, 403);
    const revoked = await invite();
    await pool.query(
      "UPDATE invitations SET revoked_at=now() WHERE token_hash=$1",
      [tokenHash(revoked)],
    );
    assert.equal((await call(revoked)).status, 410);
    const expired = await invite();
    await pool.query(
      "UPDATE invitations SET expires_at=now()-interval '1 day' WHERE token_hash=$1",
      [tokenHash(expired)],
    );
    assert.equal((await call(expired)).status, 410);
    const body = {
      expectedVersion: first.data.version,
      acknowledged: true,
      text: "  I prepare invoices. Sarah reviews them before I send them.\n",
    };
    assert.equal(
      (await call(token, { ...body, expectedVersion: 0 })).status,
      409,
    );
    assert.equal(
      (await call(token, { ...body, acknowledged: false })).status,
      422,
    );
    assert.equal((await call(token, { ...body, text: "   " })).status, 422);
    assert.equal(
      (await call(token, { ...body, personId: randomUUID() })).status,
      422,
    );
    assert.equal(
      (await call(token, { ...body, taskCards: [{ title: "Do work" }] }))
        .status,
      422,
    );
    const attempts = await Promise.all([call(token, body), call(token, body)]);
    assert.deepEqual(attempts.map((a) => a.status).sort(), [200, 410]);
    const result = attempts.find((a) => a.status === 200)!;
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(result.cookie, null);
    assert.equal((await call(token, body)).status, 410);
    assert.equal((await voice()).status, 410);
    const row = (
      await tx(user.tenant_id, (db) =>
        db.query("SELECT * FROM records WHERE id=$1", [result.data.responseId]),
      )
    ).rows[0];
    const sessionToken = randomUUID();
    await pool.query(
      "INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
      [tokenHash(sessionToken), user.id, randomUUID()],
    );
    const workspaceResponse = await fetch(
      base + "/api/v1/companies/" + company + "/workspace",
      {
        headers: { Cookie: "dg_session=" + sessionToken },
      },
    );
    assert.equal(workspaceResponse.status, 200);
    const workspace = await workspaceResponse.json();
    assert.ok(
      workspace.records.some(
        (r: any) => r.id === row.id && r.state === "returned",
      ),
    );
    assert.ok(
      workspace.records.some(
        (r: any) => r.id === row.data.requestId && r.state === "returned",
      ),
    );
    assert.equal(row.state, "returned");
    assert.equal(row.data.text, body.text);
    assert.deepEqual(row.data.taskCards, []);
    const responses = await tx(user.tenant_id, (db) =>
      db.query(
        "SELECT id FROM records WHERE company_id=$1 AND kind='response' AND data->>'requestId'=$2",
        [company, row.data.requestId],
      ),
    );
    assert.equal(responses.rows.length, 1);
    assert.equal(row.data.submissionIdentity.method, "private_link");
    assert.equal(
      (await pool.query("SELECT role FROM users WHERE email=$1", [user.email]))
        .rows[0].role,
      "advisor",
    );
    assert.equal(
      Number(
        (
          await pool.query("SELECT count(*) FROM users WHERE tenant_id=$1", [
            user.tenant_id,
          ])
        ).rows[0].count,
      ),
      1,
    );
  } finally {
    /* after hook closes resources even on setup failure */
  }
});
