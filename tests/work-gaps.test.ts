import test from "node:test";
import assert from "node:assert/strict";
import type { RecordRow } from "../shared/domain.ts";
import type { BusinessProfile } from "../shared/business-types.ts";
import {
  assessWorkGaps,
  buildGapFollowups,
  detailMissing,
  realRecipientEmail,
  type WorkGap,
} from "../shared/work-gaps.ts";

const profile: BusinessProfile = {
  industry: "Fictional",
  status: "proposed",
  rationale: "Synthetic",
  streams: [
    {
      id: "advisory",
      name: "Advisory",
      templateId: "custom",
      stages: [
        {
          id: "deliver",
          name: "Deliver advice",
          functionIds: ["do"],
          provenance: {
            status: "proposed",
            rationale: "An AI grouping, not client evidence.",
            citations: [],
            unknowns: ["Company practice is unknown."],
          },
        },
      ],
    },
  ],
};
const record = (id: string, kind: string, data: any = {}, state = "reported") =>
  ({ id, kind, title: id, data, state, version: 1 }) as RecordRow;
const completeTask = () =>
  record("task", "task", {
    ownerId: "owner",
    performerId: "worker",
    trigger: "A client calls.",
    inputs: "Client notes",
    instructions: "Review the notes.",
    output: "Advice",
    destination: "The client",
    businessStageLinks: [{ streamId: "advisory", stageId: "deliver" }],
  });
const gap = (key: string, changes: Partial<WorkGap> = {}): WorkGap => ({
  key,
  streamId: "advisory",
  stageId: "deliver",
  stageLabel: "Deliver advice",
  code: "task_detail",
  title: "Need detail",
  detail: "Description missing",
  recordIds: [key],
  personIds: ["worker"],
  questions: ["What starts it?", "What do you do?", "Who needs the result?"],
  ...changes,
});

test("empty proposed stages remain applicability questions without assigning people from titles or peer hypotheses", () => {
  const gaps = assessWorkGaps(
    [record("chief", "person", { role: "CEO" })],
    profile,
  );
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].code, "stage_unexplained");
  assert.match(gaps[0].detail, /does not prove work is missing/);
  assert.deepEqual(gaps[0].personIds, []);
  assert.deepEqual(buildGapFollowups(gaps, ["chief"]), []);
});

test("short useful task descriptions satisfy detail while explicit unknowns remain gaps", () => {
  for (const text of [
    "",
    "   ",
    "Unknown",
    "Not yet documented",
    "Not reported.",
    "Not specified",
    "TBD",
    "Missing: ask the team",
  ])
    assert.equal(detailMissing(text), true, text);
  for (const text of ["Email", "Approve", "The client", "One task."])
    assert.equal(detailMissing(text), false, text);
  const task = completeTask();
  const records = [
    record("owner", "person"),
    record("worker", "person"),
    task,
    record("flow", "workflow", { taskIds: [task.id] }),
  ];
  assert.deepEqual(assessWorkGaps(records, profile), []);
  task.data.instructions = "Not yet documented";
  assert.deepEqual(
    assessWorkGaps(records, profile).map((g) => g.code),
    ["task_detail"],
  );
});

test("missing and withdrawn assignment targets remain ownership gaps", () => {
  for (const owner of [undefined, record("owner", "person", {}, "withdrawn")]) {
    const task = completeTask();
    const records = [
      record("worker", "person"),
      task,
      record("flow", "workflow", { taskIds: [task.id] }),
      ...(owner ? [owner] : []),
    ];
    assert.equal(
      assessWorkGaps(records, profile).some((g) => g.code === "owner_missing"),
      true,
    );
  }
});

test("followup preview uses only selected linked people and does not claim unasked gaps", () => {
  const sequence = gap("sequence", {
    code: "work_sequence",
    questions: [
      "Walk through the work.",
      "What did each person receive?",
      "How did it end?",
    ],
  });
  const details = gap("detail");
  const followups = buildGapFollowups(
    [details, sequence],
    ["worker", "unlinked-chief"],
  );
  assert.deepEqual(followups, [
    {
      personId: "worker",
      gapKeys: ["sequence"],
      questions: sequence.questions,
    },
  ]);
  assert.deepEqual(buildGapFollowups([details], ["unlinked-chief"]), []);
});

test("a followup never exceeds the saved request's thirty-gap context bound", () => {
  const followups = buildGapFollowups(
    Array.from({ length: 40 }, (_, i) => gap(`same-question-${i}`)),
    ["worker"],
  );
  assert.equal(followups.length, 1);
  assert.ok(followups[0].gapKeys.length <= 30);
  assert.equal(followups[0].questions.length, 3);
});

test("real-recipient checks exclude reserved sample domains and their subdomains", () => {
  for (const email of [
    "bad",
    "worker@example.com",
    "worker@dept.example.com",
    "worker@branch.example.net",
    "worker@sample.invalid",
    "worker@example.test",
  ])
    assert.equal(realRecipientEmail(email), false, email);
  assert.equal(realRecipientEmail("worker@fictional-company.org"), true);
});
