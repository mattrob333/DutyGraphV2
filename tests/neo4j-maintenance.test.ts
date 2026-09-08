import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "../server/db.ts";
import { claimNeo4jTenant, syncNeo4jSweep } from "../server/neo4j.ts";
import { runMaintenance } from "../server/hosted.ts";

after(async () => pool.end());

test("Aura sweep stops after its time budget and resumes fairly in the next worker", async () => {
  const accounts = ["first", "second", "third", "fourth", "fifth"],
    visited: string[] = [];
  // This represents the committed cursor, shared by separate sweep invocations.
  let cursor = 0,
    clock = 0;
  const claimTenant = async () => accounts[cursor++ % accounts.length];
  const syncTenant = async (tenant: string) => {
    visited.push(tenant);
    clock += 15000;
    throw new Error("Synthetic outage; no network call");
  };
  assert.equal(
    await syncNeo4jSweep({ claimTenant, syncTenant, now: () => clock }),
    2,
  );
  assert.equal(clock, 30000);
  assert.equal(
    await syncNeo4jSweep({ claimTenant, syncTenant, now: () => clock }),
    2,
  );
  assert.deepEqual(visited, accounts.slice(0, 4));
});

test("Aura sweep caps fast account visits and does not revisit an account in one sweep", async () => {
  let claims = 0;
  assert.equal(
    await syncNeo4jSweep({
      claimTenant: async () => String(++claims),
      syncTenant: async () => {},
      now: () => 0,
    }),
    12,
  );
  assert.equal(claims, 12);
  const visited: string[] = [];
  assert.equal(
    await syncNeo4jSweep({
      claimTenant: async () => "only-account",
      syncTenant: async (tenant) => {
        visited.push(tenant);
      },
      now: () => 0,
    }),
    1,
  );
  assert.deepEqual(visited, ["only-account"]);
});

test("tenant claims persist before work and concurrent workers claim different accounts", async () => {
  const tenants = [randomUUID(), randomUUID()];
  for (const id of tenants)
    await pool.query("INSERT INTO tenants(id,name) VALUES($1,$2)", [
      id,
      "Synthetic maintenance fixture",
    ]);
  try {
    const ids = await Promise.all([claimNeo4jTenant(), claimNeo4jTenant()]);
    assert.ok(ids.every(Boolean));
    assert.notEqual(ids[0], ids[1]);
    const persisted = (
      await pool.query(
        "SELECT last_tenant_id FROM maintenance_cursors WHERE name='neo4j'",
      )
    ).rows[0].last_tenant_id;
    assert.ok(ids.includes(persisted));
    const next = await claimNeo4jTenant();
    assert.notEqual(next, persisted);
  } finally {
    for (const id of tenants)
      await pool.query("DELETE FROM tenants WHERE id=$1", [id]);
  }
});

test("retention and auth cleanup complete before projection failures", async () => {
  const steps: string[] = [];
  await assert.rejects(
    runMaintenance({
      gapFollowups: async () => {},
      gapReplies: async () => ({
        inspectedTenants: 0,
        processed: 0,
        results: [],
      }),
      retention: async () => {
        steps.push("retention");
      },
      cleanup: async () => {
        steps.push("cleanup");
      },
      projection: async () => {
        steps.push("projection");
        throw new Error("Synthetic projection timeout");
      },
    }),
    /Synthetic projection timeout/,
  );
  assert.deepEqual(steps, ["retention", "cleanup", "projection"]);
});
