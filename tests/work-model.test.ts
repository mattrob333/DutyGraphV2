import test from "node:test";
import assert from "node:assert/strict";
import {
  coverageSummary,
  kickoffQuestions,
  workSchemas,
} from "../shared/work-model.ts";
import {
  confirmationStatus,
  schemas,
  type RecordRow,
} from "../shared/domain.ts";
test("coverage uses unique roster people, never company headcount or duplicate requests", () => {
  const coverage = coverageSummary(
    [{ id: "a" }, { id: "b" }],
    [],
    [
      { data: { personId: "a" }, state: "returned" },
      { data: { personId: "a" }, state: "accepted" },
      { data: { personId: "outside" }, state: "accepted" },
    ],
  );
  assert.equal(coverage.participants, 2);
  assert.equal(coverage.responded, 1);
});
test("kickoff question IDs are stable and the plan separates demand from the leader's hypothesis", () => {
  assert.equal(
    new Set(kickoffQuestions.map((q) => q.id)).size,
    kickoffQuestions.length,
  );
  assert.ok(kickoffQuestions.some((q) => q.id === "demand"));
  assert.ok(kickoffQuestions.some((q) => q.id === "alternatives"));
});
test("incomplete ownership cannot be confirmed even with reviewed content", () => {
  const task = {
    data: {
      ownerId: "",
      performerId: "p",
      reviewed: true,
      reviewDue: "2099-01-01",
    },
    state: "confirmed",
  } as RecordRow;
  assert.equal(confirmationStatus(task, []), "proposed");
});
test("handoffs reject self-links and unbounded retry counts", () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const data = {
    title: "Handoff",
    sourceTaskId: id,
    targetTaskId: id,
    condition: "Ready",
    outputMapping: "Packet",
    requiredInput: "Packet",
    acceptanceCheck: "Check completeness",
    exceptionOwnerId: id,
    timeoutHours: 24,
    maxRetries: 0,
    failureAction: "Escalate",
    evidenceIds: [],
    reason: "Define boundary",
  };
  assert.equal(workSchemas.handoff.safeParse(data).success, false);
  assert.equal(
    workSchemas.handoff.safeParse({
      ...data,
      targetTaskId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      maxRetries: 100,
    }).success,
    false,
  );
});
test("record schema rejects unknown operative fields", () => {
  assert.equal(
    schemas.duty.safeParse({
      title: "Duty",
      ownerId: "",
      purpose: "Purpose",
      scope: "Scope",
      taskIds: [],
      evidenceIds: [],
      reviewDue: "2099-01-01",
      reason: "Draft",
      approvedGrant: true,
    }).success,
    false,
  );
});
