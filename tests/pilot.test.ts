import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createApp, errorHandler } from "../server/app.ts";
import { pool } from "../server/db.ts";

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
  } finally {
    await admin.query("DELETE FROM pilot_applications WHERE email=$1", [email]);
    await admin.end();
    await pool.end();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
