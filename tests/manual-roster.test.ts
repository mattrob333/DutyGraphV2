import test from "node:test";
import assert from "node:assert/strict";
import { writeManualRoster } from "../shared/manual-roster.ts";
import { previewRoster } from "../shared/roster.ts";
const leader = {
  name: 'Alex, "Example"',
  email: "alex@example.com",
  role: "CEO",
  team: "Leadership",
  managerEmail: "",
  externalId: "retained-id",
};
const report = {
  name: "Sam",
  email: "sam@example.com",
  role: "Lead",
  team: "Delivery",
  managerEmail: leader.email,
  externalId: "",
};
test("manual entries use the same valid CSV hierarchy and preserve quoted fields and external IDs", () => {
  const csv = writeManualRoster(writeManualRoster("", leader), report);
  const parsed = previewRoster(csv);
  assert.equal(parsed.validCount, 2);
  assert.equal(parsed.rows[0].data.name, leader.name);
  assert.equal(parsed.rows[0].data.externalId, "retained-id");
  assert.equal(parsed.rows[1].data.managerEmail, leader.email);
  const edited = previewRoster(
    writeManualRoster(csv, { ...report, role: "Director" }, 1),
  );
  assert.equal(edited.rows[1].data.role, "Director");
  const removed = previewRoster(writeManualRoster(csv, null, 0));
  assert.ok(removed.rows[0].issues.includes("Manager could not be resolved."));
});
test("manual entry rejects duplicate emails, self reports and malformed source CSV without replacing data", () => {
  const csv = writeManualRoster("", leader);
  assert.throws(
    () => writeManualRoster(csv, { ...leader, email: "ALEX@example.com" }),
    /already/,
  );
  assert.throws(
    () => writeManualRoster("", { ...leader, managerEmail: leader.email }),
    /themselves/,
  );
  assert.throws(
    () => writeManualRoster("name,email\nBroken,x", leader),
    /CSV format/,
  );
  assert.throws(() => writeManualRoster(csv, null, 5), /no longer/);
  assert.equal(writeManualRoster(csv, null, 0), "");
});
test("a manager can be added later and cycles still fail roster validation", () => {
  const partial = writeManualRoster("", report);
  assert.equal(previewRoster(partial).validCount, 0);
  const completed = writeManualRoster(partial, leader);
  assert.equal(previewRoster(completed).validCount, 2);
  const cycle = writeManualRoster(
    completed,
    { ...leader, managerEmail: report.email },
    1,
  );
  assert.equal(previewRoster(cycle).validCount, 0);
});
