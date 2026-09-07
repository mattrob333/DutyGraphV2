import { discoveryGenerationSchemas } from "../shared/discovery.ts";
import { z } from "zod";
import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyKickoffPreparation,
  validateKickoffPreparation,
  kickoffTimeboxes,
} from "../shared/kickoff-preparation.ts";

const pack = () => {
  const p = emptyKickoffPreparation();
  p.csv =
    "name,email,role,department,manager_email\nAlex,alex@example.com,CEO,Leadership,\nSam,sam@example.com,Lead,Operations,alex@example.com";
  p.executiveEmails = ["alex@example.com"];
  p.participantEmails = ["sam@example.com"];
  p.answers.goals =
    p.answers.departments =
    p.answers.streams =
      "Unknown; Alex to confirm.";
  return p;
};
test("kickoff rejects malformed hierarchy and invented attendee selections", () => {
  assert.equal(validateKickoffPreparation(pack()).preview.validCount, 2);
  for (const change of [
    (p: ReturnType<typeof pack>) => {
      p.executiveEmails = ["outsider@example.com"];
    },
    (p: ReturnType<typeof pack>) => {
      p.csv = p.csv.replace("Leadership,", "Leadership,sam@example.com");
    },
    (p: ReturnType<typeof pack>) => {
      p.participantEmails = [];
    },
    (p: ReturnType<typeof pack>) => {
      p.answers.streams = "";
    },
    (p: ReturnType<typeof pack>) => {
      p.csv += "\nDuplicate,sam@example.com,Lead,Operations,";
    },
  ]) {
    const p = pack();
    change(p);
    assert.throws(() => validateKickoffPreparation(p));
  }
});
test("missing roster remains an explicit follow-up, not an invented org chart", () => {
  const p = pack();
  p.csv = "";
  p.executiveEmails = [];
  p.participantEmails = [];
  assert.throws(() => validateKickoffPreparation(p));
  p.rosterUnavailableReason = "Alex will supply the team file tomorrow.";
  assert.equal(
    validateKickoffPreparation(p).data.rosterUnavailableReason,
    p.rosterUnavailableReason,
  );
});
test("every supported agenda length has contiguous timeboxes totaling 120 minutes", () => {
  for (let n = 1; n <= 8; n++) {
    const slots = kickoffTimeboxes(
      Array.from({ length: n }, (_, i) => ({ title: String(i) })),
    );
    assert.equal(slots[0].start, 0);
    assert.equal(slots.at(-1)!.start + slots.at(-1)!.minutes, 120);
    slots
      .slice(1)
      .forEach((s, i) =>
        assert.equal(s.start, slots[i].start + slots[i].minutes),
      );
  }
});

test("kickoff CSV checks email syntax and UTF-8 byte size before import", () => {
  const invalid = pack();
  invalid.csv = invalid.csv.replace("sam@example.com", "sam..bad@example.com");
  assert.throws(() => validateKickoffPreparation(invalid));
  const oversized = pack();
  oversized.csv = "é".repeat(260000);
  assert.throws(() => validateKickoffPreparation(oversized), /500 KB/);
});

test("AI roster contract cannot nominate an existing-duty merge", () => {
  assert.equal(
    JSON.stringify(z.toJSONSchema(discoveryGenerationSchemas.roster)).includes(
      "existingDutyId",
    ),
    false,
  );
});
