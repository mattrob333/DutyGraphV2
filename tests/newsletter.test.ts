import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createApp, errorHandler } from "../server/app.ts";
import { pool } from "../server/db.ts";
test("newsletter interest requires separate consent, deduplicates, stays pending, and has no public read", async () => {
  const app = createApp({ authRequestsPerWindow: 100 });
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/newsletter-interest`,
    email = `${randomUUID()}@test.invalid`;
  const admin = new pg.Pool({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  const post = (body: any, origin?: string) =>
    fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await post({ email, consent: false })).status, 422);
    assert.equal(
      (await post({ email, consent: true }, "https://untrusted.invalid"))
        .status,
      403,
    );
    const first = await post({ email, consent: true }),
      second = await post({ email: email.toUpperCase(), consent: true });
    assert.equal(first.status, 202);
    assert.deepEqual(await first.json(), await second.json());
    const rows = (
      await admin.query(
        "SELECT state,consent_version FROM newsletter_interest WHERE email=$1",
        [email],
      )
    ).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].state, "pending_confirmation");
    assert.equal(rows[0].consent_version, "governance-brief-interest-v1");
    assert.equal(
      (
        await pool.query("SELECT * FROM newsletter_interest WHERE email=$1", [
          email,
        ])
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await admin.query("SELECT * FROM pilot_applications WHERE email=$1", [
          email,
        ])
      ).rowCount,
      0,
    );
    assert.notEqual((await fetch(base)).status, 200);
    await admin.query(
      "UPDATE newsletter_interest SET state='unsubscribed' WHERE email=$1",
      [email],
    );
    await post({ email, consent: true });
    assert.equal(
      (
        await admin.query(
          "SELECT state FROM newsletter_interest WHERE email=$1",
          [email],
        )
      ).rows[0].state,
      "unsubscribed",
    );
  } finally {
    await admin.query("DELETE FROM newsletter_interest WHERE email=$1", [
      email,
    ]);
    await admin.end();
    await pool.end();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
