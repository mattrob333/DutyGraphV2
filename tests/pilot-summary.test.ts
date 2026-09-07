import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { pilotSummary } from "../scripts/pilot-summary.ts";

test("operator summary counts distinct interests, current stages, overdue work and delivery gaps without contacts", async () => {
  const db = new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  await db.connect();
  try {
    // Session-local fixtures shadow public tables; no real inbox data is touched.
    await db.query(`CREATE TEMP TABLE pilot_applications (
      id int PRIMARY KEY, inquiry_type text, stage text, created_at timestamptz,
      next_action_at date, email text);
      CREATE TEMP TABLE pilot_notifications (application_id int PRIMARY KEY, state text);
      INSERT INTO pilot_applications VALUES
      (1,'pilot','qualified',now(),CURRENT_DATE-2,'private@test.invalid'),
      (2,'pilot','completed',now()-interval '40 days',CURRENT_DATE-2,'other@test.invalid'),
      (3,'advisor','new',now(),NULL,'private@test.invalid');
      INSERT INTO pilot_notifications VALUES (1,'review'),(2,'sent');`);
    const report = await pilotSummary(db);
    assert.equal(report.byInterest.length, 2);
    const pilot = report.byInterest.find(
      (r: any) => r.inquiry_type === "pilot",
    )!;
    assert.equal(pilot.saved_inquiries, 2);
    assert.equal(pilot.saved_last_30_days, 1);
    assert.equal(pilot.qualified, 1);
    assert.equal(pilot.completed, 1);
    assert.equal(pilot.overdue_followups, 1);
    assert.equal(pilot.notification_needs_review, 1);
    assert.equal(pilot.notification_provider_accepted, 1);
    const advisor = report.byInterest.find(
      (r: any) => r.inquiry_type === "advisor",
    )!;
    assert.equal(advisor.saved_inquiries, 1);
    assert.equal(advisor.followup_date_missing, 1);
    assert.equal(advisor.notification_not_queued, 1);
    assert.doesNotMatch(JSON.stringify(report), /private@|other@/);
    await db.query("TRUNCATE pilot_applications, pilot_notifications");
    assert.deepEqual((await pilotSummary(db)).byInterest, []);
  } finally {
    await db.end();
  }
});
