import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createApp, errorHandler } from "../server/app.ts";
import { pool } from "../server/db.ts";
import { sendPilotNotifications } from "../server/pilot-notifications.ts";

test("pilot intake saves once, requires consent, and exposes no applicant data", async () => {
  const app = createApp({ authRequestsPerWindow: 100 });
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/pilot-applications`;
  const email = `${randomUUID()}@test.invalid`;
  const admin = new pg.Pool({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  const payload = {
    name: "Pilot Test",
    email,
    company: "Synthetic Company",
    role: "Owner",
    teamSize: "11–50",
    goal: "Understand handoffs between teams",
    consent: true,
  };
  const post = (body: unknown, origin?: string) =>
    fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await post({ ...payload, consent: false })).status, 422);
    assert.equal(
      (await post(payload, "https://untrusted.invalid")).status,
      403,
    );
    const first = await post(payload);
    assert.equal(first.status, 202, await first.clone().text());
    const duplicate = await post(payload);
    assert.equal(duplicate.status, 202);
    assert.deepEqual(await first.json(), await duplicate.json());
    assert.equal(
      (
        await admin.query(
          "SELECT count(*) FROM pilot_applications WHERE email=$1",
          [email],
        )
      ).rows[0].count,
      "1",
    );
    assert.equal(
      (
        await pool.query("SELECT * FROM pilot_applications WHERE email=$1", [
          email,
        ])
      ).rowCount,
      0,
    );
    assert.notEqual((await fetch(base)).status, 200);
    const id = (
      await admin.query("SELECT id FROM pilot_applications WHERE email=$1", [
        email,
      ])
    ).rows[0].id;
    assert.equal(
      (
        await admin.query(
          "SELECT count(*) FROM pilot_notifications WHERE application_id=$1",
          [id],
        )
      ).rows[0].count,
      "1",
    );
    // No provider settings means no send, while the durable queue remains pending.
    const prior = [
      "PILOT_NOTIFY_RESEND_KEY",
      "PILOT_NOTIFY_FROM",
      "PILOT_NOTIFY_TO",
    ].map((k) => process.env[k]);
    delete process.env.PILOT_NOTIFY_RESEND_KEY;
    let calls = 0;
    await sendPilotNotifications(async () => {
      calls++;
      throw new Error("Must not send");
    });
    assert.equal(calls, 0);
    try {
      process.env.PILOT_NOTIFY_RESEND_KEY = "synthetic-key";
      process.env.PILOT_NOTIFY_FROM = "pilot@test.invalid";
      process.env.PILOT_NOTIFY_TO = "owner@test.invalid";
      const envelopes: string[] = [];
      const keys: string[] = [];
      const fake: typeof fetch = async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        if (body.reply_to !== email) throw new Error("Not this fixture");
        calls++;
        envelopes.push(String(init?.body));
        keys.push(
          (init?.headers as Record<string, string>)["Idempotency-Key"]!,
        );
        if (calls === 1) throw new Error("Synthetic timeout");
        return new Response(JSON.stringify({ id: "synthetic-receipt" }), {
          status: 200,
        });
      };
      await sendPilotNotifications(fake);
      assert.equal(
        (
          await admin.query(
            "SELECT state FROM pilot_notifications WHERE application_id=$1",
            [id],
          )
        ).rows[0].state,
        "sending",
      );
      assert.equal(
        (
          await admin.query(
            "SELECT count(*) FROM pilot_applications WHERE id=$1",
            [id],
          )
        ).rows[0].count,
        "1",
      );
      await admin.query(
        "UPDATE pilot_notifications SET next_attempt_at=now() WHERE application_id=$1",
        [id],
      );
      process.env.PILOT_NOTIFY_TO = "changed@test.invalid";
      await sendPilotNotifications(fake);
      assert.equal(calls, 2);
      assert.equal(envelopes[0], envelopes[1]);
      assert.equal(keys[0], keys[1]);
      assert.equal(
        (
          await admin.query(
            "SELECT state FROM pilot_notifications WHERE application_id=$1",
            [id],
          )
        ).rows[0].state,
        "sent",
      );
      // An uncertain delivery beyond the provider deduplication window is not retried.
      await admin.query(
        "UPDATE pilot_notifications SET state='sending',first_attempt_at=now()-interval '25 hours',next_attempt_at=now() WHERE application_id=$1",
        [id],
      );
      await sendPilotNotifications(fake);
      assert.equal(calls, 2);
      assert.equal(
        (
          await admin.query(
            "SELECT state FROM pilot_notifications WHERE application_id=$1",
            [id],
          )
        ).rows[0].state,
        "review",
      );
    } finally {
      [
        "PILOT_NOTIFY_RESEND_KEY",
        "PILOT_NOTIFY_FROM",
        "PILOT_NOTIFY_TO",
      ].forEach((k, i) => {
        if (prior[i] === undefined) delete process.env[k];
        else process.env[k] = prior[i];
      });
    }
  } finally {
    await admin.query("DELETE FROM pilot_applications WHERE email=$1", [email]);
    await admin.end();
    await pool.end();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
