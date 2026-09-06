import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleAuthority,
  DemoAuthorityAdapter,
} from "../server/authority-demo.ts";
import { evaluateAuthority, demoScopes } from "../shared/authority-demo.ts";
const person = { id: "sample-person", title: "Tariq Ali", data: {} };
test("demo intersects owner access, delegation, task and runtime; never grants", () => {
  const c = sampleAuthority(person),
    r = evaluateAuthority(c, demoScopes);
  assert.equal(c.snapshots.length, 6);
  assert.equal(r.eligibleScopes.length, 2);
  assert.equal(r.decisions[2].allowed, false);
  assert.deepEqual(r.grantedScopes, []);
  c.runtimeScopes = [];
  assert.equal(evaluateAuthority(c, demoScopes).eligibleScopes.length, 0);
});
test("inactive, stale, conflicts, identity mismatch and unknown scopes fail closed", async () => {
  for (const scenario of ["inactive", "stale", "conflict"] as const) {
    const r = evaluateAuthority(sampleAuthority(person, scenario), demoScopes);
    assert.ok(r.blockers.length);
    assert.equal(r.eligibleScopes.length, 0);
  }
  assert.equal(
    evaluateAuthority(
      sampleAuthority({ ...person, title: "Another person" }),
      demoScopes,
    ).eligibleScopes.length,
    0,
  );
  assert.equal(
    evaluateAuthority(sampleAuthority(person), [
      { system: "*", resource: "*", action: "*" },
    ]).eligibleScopes.length,
    0,
  );
  await assert.rejects(
    new DemoAuthorityAdapter(person).collect("someone-else"),
  );
});
test("cached authority expires even when no source record has changed", () => {
  const now = new Date(),
    c = sampleAuthority(person, "standard", now);
  assert.equal(
    evaluateAuthority(c, demoScopes, now.getTime() + 86400001).eligibleScopes
      .length,
    0,
  );
});
