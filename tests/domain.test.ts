import test from "node:test";
import assert from "node:assert/strict";
import { hash } from "../server/db.ts";
import {
  confirmationStatus,
  diagnosisReadiness,
  type RecordRow,
} from "../shared/domain.ts";
import { previewRoster } from "../server/roster.ts";
const task = {
  id: "task",
  version: 4,
  hash: "hash4",
  state: "awaiting_confirmation",
  data: {
    ownerId: "owner",
    performerId: "performer",
    reviewed: true,
    conflict: false,
    reviewDue: "2099-01-01",
  },
} as RecordRow;
const confirm = (id: string, version = 4) => ({
  record_id: "task",
  version,
  hash: "hash" + version,
  person_id: id,
  decision: "correct",
  accepted: true,
});
test("canonical hashing is independent of JSON property order", () =>
  assert.equal(
    hash({ z: 1, a: { c: 2, b: 3 } }),
    hash({ a: { b: 3, c: 2 }, z: 1 }),
  ));
test("old confirmations never confirm a newer version", () =>
  assert.equal(
    confirmationStatus(task, [confirm("owner", 3), confirm("performer", 3)]),
    "awaiting_confirmation",
  ));
test("owner and performer must both confirm current content", () => {
  assert.equal(
    confirmationStatus(task, [confirm("owner")]),
    "awaiting_confirmation",
  );
  assert.equal(
    confirmationStatus(task, [confirm("owner"), confirm("performer")]),
    "confirmed",
  );
});
test("one authenticated person can hold both recorded roles", () =>
  assert.equal(
    confirmationStatus(
      { ...task, data: { ...task.data, performerId: "owner" } },
      [confirm("owner")],
    ),
    "confirmed",
  ));
test("unreviewed participant reply is not a confirmed work record", () =>
  assert.equal(
    confirmationStatus(task, [
      { ...confirm("owner"), accepted: false },
      confirm("performer"),
    ]),
    "awaiting_confirmation",
  ));
test("conflict and source staleness override confirmation", () => {
  assert.equal(
    confirmationStatus({ ...task, state: "stale" }, [
      confirm("owner"),
      confirm("performer"),
    ]),
    "stale",
  );
  assert.equal(
    confirmationStatus({ ...task, data: { ...task.data, conflict: true } }, [
      confirm("owner"),
      confirm("performer"),
    ]),
    "conflicting",
  );
});
test("expired reviews cannot remain confirmed", () =>
  assert.equal(
    confirmationStatus(
      { ...task, data: { ...task.data, reviewDue: "2000-01-01" } },
      [confirm("owner"), confirm("performer")],
    ),
    "stale",
  ));
test("hash mismatch cannot satisfy confirmation", () =>
  assert.equal(
    confirmationStatus(task, [
      { ...confirm("owner"), hash: "forged" },
      confirm("performer"),
    ]),
    "awaiting_confirmation",
  ));
test("multiple derived sources with one origin remain one independent source", () => {
  const c = {
    data: {
      evidenceIds: ["a", "b"],
      ownerId: "owner",
      counterfactual: "Defined",
    },
  } as RecordRow;
  const sources = [
    { id: "a", state: "accepted", data: { originId: "one" } },
    { id: "b", state: "accepted", data: { originId: "one" } },
  ] as RecordRow[];
  const result = diagnosisReadiness(c, sources, []);
  assert.equal(result.independentSources, 1);
  assert.equal(result.ready, false);
  assert.ok(result.reasons.length >= 3);
});
test("roster import quarantines cycles, duplicate emails, and unresolved managers", () => {
  const csv =
    "name,email,role,team,manager_email\nA,a@ex.test,Owner,A,b@ex.test\nB,b@ex.test,Owner,A,a@ex.test\nC,c@ex.test,Owner,A,missing@ex.test\nD,d@ex.test,Owner,A,\nE,d@ex.test,Owner,A,";
  const p = previewRoster(csv);
  assert.equal(p.validCount, 0);
  assert.ok(p.rows[0].issues.some((i) => i.includes("cycle")));
  assert.ok(p.rows[2].issues.some((i) => i.includes("resolved")));
  assert.ok(p.rows[3].issues.some((i) => i.includes("Duplicate")));
});
test("roster import accepts ordinary names without guessing identity merges", () => {
  const p = previewRoster(
    "name,email,title,department\nAlex Smith,a@ex.test,Owner,Ops\nAlex Smith,b@ex.test,Analyst,Ops",
  );
  assert.equal(p.validCount, 2);
});
