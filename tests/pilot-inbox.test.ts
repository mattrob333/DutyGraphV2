import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import pg from "pg";
import { registerPilotInboxRoutes } from "../server/pilot-inbox.ts";
import { applyForPilot, pilotSchema } from "../server/pilot.ts";
import { errorHandler } from "../server/app.ts";
import { pool, tx } from "../server/db.ts";
import type { User } from "../shared/domain.ts";

test("public URL normalizes separately from spam trap and legacy intake remains valid", () => {
  const input = {
    name: "Test Person",
    email: "person@test.invalid",
    company: "Test Company",
    role: "Owner",
    teamSize: "11–50",
    consent: true,
  };
  assert.equal(pilotSchema.parse(input).companyUrl, "");
  assert.equal(
    pilotSchema.parse({ ...input, companyUrl: "example.com" }).companyUrl,
    "https://example.com/",
  );
  assert.equal(
    pilotSchema.parse({ ...input, website: "spam", companyUrl: "example.com" })
      .website,
    "spam",
  );
  assert.equal(
    pilotSchema.safeParse({
      ...input,
      companyUrl: "https://user:pass@example.com",
    }).success,
    false,
  );
  for (const companyUrl of [
    "not a website",
    "javascript:alert(1)",
    "ftp://example.com",
    "https://",
  ])
    assert.equal(
      pilotSchema.safeParse({ ...input, companyUrl }).success,
      false,
      companyUrl,
    );
});

test("operator inbox denies other accounts and converts once with retained contact and intake", async () => {
  const admin = new pg.Pool({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  const previous = process.env.PILOT_INBOX_EMAILS;
  const tenant = randomUUID(),
    otherTenant = randomUUID(),
    userId = randomUUID(),
    otherId = randomUUID(),
    leadId = randomUUID();
  const user: User = {
    id: userId,
    tenant_id: tenant,
    email: `${userId}@test.invalid`,
    name: "Synthetic Operator",
    role: "advisor",
    company_id: null,
    person_id: null,
  };
  let actor: User = user;
  const app = express();
  app.use(express.json());
  app.post("/public-intake", applyForPilot);
  // Exercise handlers with explicit synthetic actors; no cookies or real identity providers.
  app.use((req, _res, next) => {
    Object.assign(req, { actor });
    next();
  });
  registerPilotInboxRoutes(app);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const open = (key = randomUUID()) =>
    fetch(`${base}/pilot-inbox/${leadId}/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: "{}",
    });
  try {
    const spam = await fetch(base + "/public-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Spam Fixture",
        email: `${leadId}@test.invalid`,
        company: "Synthetic Company",
        role: "Owner",
        teamSize: "11–50",
        consent: true,
        website: "filled trap",
        companyUrl: "example.com",
      }),
    });
    assert.equal(spam.status, 202);
    assert.equal(
      (
        await admin.query(
          "SELECT count(*) FROM pilot_applications WHERE email=$1",
          [`${leadId}@test.invalid`],
        )
      ).rows[0].count,
      "0",
      "honeypot returns receipt without saving",
    );
    await admin.query(
      "INSERT INTO tenants(id,name) VALUES($1,'Synthetic inbox'),($2,'Synthetic outsider')",
      [tenant, otherTenant],
    );
    await admin.query(
      "INSERT INTO users(id,tenant_id,email,name,password_hash,role) VALUES($1,$2,$3,'Synthetic Operator','unused','advisor'),($4,$5,$6,'Synthetic outsider','unused','advisor')",
      [
        userId,
        tenant,
        user.email,
        otherId,
        otherTenant,
        `${otherId}@test.invalid`,
      ],
    );
    await admin.query(
      "INSERT INTO pilot_applications(id,email,name,company,role,team_size,goal,consent_version,company_url) VALUES($1,$2,'Test Contact','Test Company','Owner','11–50','Understand the business','test','https://example.com/')",
      [leadId, `${leadId}@test.invalid`],
    );
    process.env.PILOT_INBOX_EMAILS = user.email;
    assert.equal(
      (await fetch(base + "/pilot-inbox")).status,
      403,
      "allowlisted email alone is insufficient",
    );
    await assert.rejects(
      () =>
        tx(tenant, async (db) => {
          await db.query("SELECT set_config('app.actor_id',$1,true)", [userId]);
          await db.query(
            "INSERT INTO pilot_inbox_operators(user_id,tenant_id) VALUES($1,$2)",
            [userId, tenant],
          );
        }),
      "runtime cannot provision itself",
    );
    await admin.query(
      "INSERT INTO pilot_inbox_operators(user_id,tenant_id) VALUES($1,$2)",
      [userId, tenant],
    );
    actor = { ...user, tenant_id: otherTenant };
    assert.equal(
      (await fetch(base + "/pilot-inbox")).status,
      403,
      "spoofed tenant fails mapping",
    );
    actor = { ...user, role: "participant" };
    assert.equal((await open()).status, 403);
    actor = {
      ...user,
      id: otherId,
      tenant_id: otherTenant,
      email: `${otherId}@test.invalid`,
    };
    assert.equal((await fetch(base + "/pilot-inbox")).status, 403);
    actor = user;
    const inbox = await fetch(base + "/pilot-inbox");
    assert.equal(inbox.status, 200);
    assert.ok((await inbox.json()).some((l: any) => l.id === leadId));
    const results = await Promise.all([open(), open()]);
    const responseDetails = (
      await Promise.all(results.map((r) => r.clone().text()))
    ).join("\n");
    assert.ok(
      results.every((r) => r.status === 200),
      responseDetails,
    );
    const converted = await Promise.all(results.map((r) => r.json()));
    assert.equal(converted[0].companyId, converted[1].companyId);
    const companyId = converted[0].companyId;
    const update = (expectedStage: string, expectedNextAction: string) =>
      fetch(`${base}/pilot-inbox/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": randomUUID(),
        },
        body: JSON.stringify({
          stage: "contacted",
          nextAction: "Agree kickoff time",
          expectedStage,
          expectedNextAction,
        }),
      });
    assert.equal(
      (await update("qualified", "Research company and prepare kickoff"))
        .status,
      200,
    );
    assert.equal(
      (await update("qualified", "Research company and prepare kickoff"))
        .status,
      409,
      "concurrent follow-up edits cannot overwrite newer work",
    );
    const company = (
      await admin.query("SELECT * FROM companies WHERE id=$1", [companyId])
    ).rows[0];
    assert.equal(
      company.settings.businessIntake.website,
      "https://example.com/",
    );
    assert.equal(company.settings.demoApplicationId, leadId);
    assert.equal(company.settings.demoContact.name, "Test Contact");
    assert.equal(
      (
        await admin.query(
          "SELECT count(*) FROM records WHERE company_id=$1 AND kind='person'",
          [companyId],
        )
      ).rows[0].count,
      "1",
    );
    assert.equal(
      (
        await tx(otherTenant, (db) =>
          db.query("SELECT * FROM companies WHERE id=$1", [companyId]),
        )
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await pool.query("SELECT * FROM pilot_applications WHERE id=$1", [
          leadId,
        ])
      ).rowCount,
      0,
      "public runtime cannot read leads",
    );
    const key = randomUUID();
    assert.equal((await open(key)).status, 200);
    await admin.query("DELETE FROM pilot_inbox_operators WHERE user_id=$1", [
      userId,
    ]);
    assert.equal(
      (await open(key)).status,
      403,
      "revocation blocks receipt replay",
    );
  } finally {
    if (previous === undefined) delete process.env.PILOT_INBOX_EMAILS;
    else process.env.PILOT_INBOX_EMAILS = previous;
    await admin.query("DELETE FROM pilot_applications WHERE id=$1", [leadId]);
    await admin.query("DELETE FROM pilot_inbox_operators WHERE user_id=$1", [
      userId,
    ]);
    for (const table of [
      "command_receipts",
      "outbox",
      "audit_events",
      "record_versions",
      "records",
      "companies",
      "users",
    ])
      await admin.query(
        `DELETE FROM ${table} WHERE tenant_id=ANY($1::uuid[])`,
        [[tenant, otherTenant]],
      );
    await admin.query("DELETE FROM tenants WHERE id=ANY($1::uuid[])", [
      [tenant, otherTenant],
    ]);
    await admin.end();
    await pool.end();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
