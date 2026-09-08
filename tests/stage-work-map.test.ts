import { test } from "node:test";
import assert from "node:assert/strict";
import type { BusinessProfile } from "../shared/business-types.ts";
import type { RecordRow } from "../shared/domain.ts";
import { selectStageWork, stageWorkMap } from "../shared/stage-work-map.ts";
import { cobaltStageExample } from "../shared/stage-work-map-example.ts";

const r = (
  id: string,
  kind: string,
  data: any = {},
  state = "reported",
  version = 1,
) => ({ id, kind, title: id, data, state, version }) as RecordRow;
const link = (streamId = "advisory", stageId = "deliver") => ({
  streamId,
  stageId,
});
const profile: BusinessProfile = {
  industry: "Fictional services",
  status: "advisor_reviewed",
  rationale: "Test only",
  streams: [
    {
      id: "advisory",
      name: "Advisory",
      templateId: "custom",
      stages: [
        { id: "shape", name: "Diagnose", functionIds: ["shape"] },
        { id: "deliver", name: "Deliver advice", functionIds: ["do"] },
      ],
    },
    {
      id: "software",
      name: "Custom software",
      templateId: "custom",
      stages: [{ id: "deliver", name: "Build software", functionIds: ["do"] }],
    },
  ],
};

test("stage map keeps task-level stages, titles and reporting lines out of business membership", () => {
  const records = [
    r("manager", "person", { role: "CEO", team: "Advisory" }),
    r("worker", "person", {
      managerId: "manager",
      role: "Consultant",
      team: "Advisory",
    }),
    r("duty", "duty", {
      title: "Deliver advice",
      ownerId: "worker",
      taskIds: ["task"],
    }),
    r("task", "task", {
      valueStage: "deliver",
      duty: "Deliver advice",
      ownerId: "worker",
      performerId: "worker",
    }),
  ];
  const m = stageWorkMap(records, profile);
  assert.deepEqual(selectStageWork(m, "advisory", "deliver").taskIds, []);
  assert.deepEqual(m.unmapped.taskIds, ["task"]);
  assert.deepEqual(m.unmapped.dutyIds, ["duty"]);
  assert.deepEqual(m.all.personIds, ["worker"]);
  const noProfile = stageWorkMap(records);
  assert.deepEqual(noProfile.streams, []);
  assert.deepEqual(noProfile.unmapped.taskIds, ["task"]);
});

test("duty links inherit through recorded task IDs; task links override them", () => {
  const records = [
    r("owner", "person"),
    r("worker", "person"),
    r("duty", "duty", {
      ownerId: "owner",
      taskIds: ["inherited", "explicit"],
      businessStageLinks: [link()],
    }),
    r("inherited", "task", {
      ownerId: "owner",
      performerId: "worker",
      businessStageLinks: [],
    }),
    r("explicit", "task", {
      ownerId: "owner",
      performerId: "worker",
      businessStageLinks: [link("software")],
    }),
    r("same-title", "task", {
      duty: "duty",
      ownerId: "owner",
      performerId: "worker",
    }),
  ];
  const m = stageWorkMap(records, profile);
  assert.deepEqual(selectStageWork(m, "advisory", "deliver").taskIds, [
    "inherited",
  ]);
  assert.deepEqual(selectStageWork(m, "software", "deliver").taskIds, [
    "explicit",
  ]);
  assert.deepEqual(selectStageWork(m, "software").dutyIds, ["duty"]);
  assert.deepEqual(m.unmapped.taskIds, ["same-title"]);
});

test("shared work is deduplicated and responsibility stays separate from performance", () => {
  const records = [
    r("manager", "person"),
    r("owner", "person", { managerId: "manager" }),
    r("worker", "person"),
    r("a", "duty", {
      ownerId: "owner",
      taskIds: ["task", "task"],
      businessStageLinks: [link(), link()],
    }),
    r("b", "duty", {
      ownerId: "owner",
      taskIds: ["task"],
      businessStageLinks: [link("software")],
    }),
    r("task", "task", { ownerId: "worker", performerId: "worker" }),
    r("flow", "workflow", { taskIds: ["task", "task"] }),
  ];
  const m = stageWorkMap(records, profile);
  for (const stream of m.streams) assert.deepEqual(stream.taskIds, ["task"]);
  assert.deepEqual(m.all.taskIds, ["task"]);
  const owner = m.all.people.find((p) => p.personId === "owner")!;
  const worker = m.all.people.find((p) => p.personId === "worker")!;
  assert.deepEqual(owner.ownedDutyIds, ["a", "b"]);
  assert.deepEqual(owner.taskIds, []);
  assert.deepEqual(worker.taskIds, ["task"]);
  assert.deepEqual(worker.dutyIds, ["a", "b"]);
  assert.deepEqual(worker.ownedTaskIds, ["task"]);
  assert.deepEqual(worker.performedTaskIds, ["task"]);
  assert.deepEqual(worker.ownedDutyIds, []);
  assert.deepEqual(m.all.personIds, ["owner", "worker"]);
  assert.deepEqual(m.all.flows[0].taskIds, ["task"]);
});

test("stale explicit assignments are visible and do not fall back to inherited stages", () => {
  const m = stageWorkMap(
    [
      r("person", "person"),
      r("duty", "duty", {
        ownerId: "person",
        taskIds: ["task"],
        businessStageLinks: [link()],
      }),
      r("task", "task", {
        ownerId: "person",
        businessStageLinks: [link("removed"), link("removed")],
      }),
    ],
    profile,
  );
  assert.deepEqual(m.unmapped.taskIds, ["task"]);
  assert.deepEqual(selectStageWork(m, "advisory", "deliver").taskIds, []);
  assert.deepEqual(m.invalidStageLinks, [
    { recordId: "task", ...link("removed") },
  ]);
});

test("withdrawn records and missing references remain gaps rather than invented participants", () => {
  const m = stageWorkMap(
    [
      r("removed-person", "person", {}, "withdrawn"),
      r("owner", "person"),
      r("task", "task", {
        ownerId: "removed-person",
        performerId: "absent",
        businessStageLinks: [link()],
      }),
      r("removed-task", "task", { businessStageLinks: [link()] }),
      r(
        "removed-task",
        "task",
        { businessStageLinks: [link()] },
        "withdrawn",
        2,
      ),
      r("duty", "duty", {
        ownerId: "absent",
        taskIds: ["task", "removed-task", "missing"],
        businessStageLinks: [link()],
      }),
      r(
        "removed-duty",
        "duty",
        { ownerId: "owner", taskIds: ["task"] },
        "retracted",
      ),
      r("flow", "workflow", { taskIds: ["task", "removed-task", "missing"] }),
      r("removed-flow", "workflow", { taskIds: ["task"] }, "superseded"),
    ],
    profile,
  );
  const scope = selectStageWork(m, "advisory", "deliver");
  assert.deepEqual(scope.taskIds, ["task"]);
  assert.deepEqual(scope.dutyIds, ["duty"]);
  assert.deepEqual(scope.people, []);
  assert.deepEqual(scope.unownedTaskIds, ["task"]);
  assert.deepEqual(scope.unperformedTaskIds, ["task"]);
  assert.deepEqual(scope.unownedDutyIds, ["duty"]);
  assert.deepEqual(m.missingTaskIds, ["removed-task", "missing"]);
  assert.deepEqual(
    scope.flows.map((f) => f.workflow.id),
    ["flow"],
  );
  assert.deepEqual(scope.flows[0].taskIds, ["task"]);
});

test("all, stream and exact stage selection preserve scope with duplicate stage IDs across streams", () => {
  const m = stageWorkMap(
    [
      r("a", "task", { businessStageLinks: [link()] }),
      r("b", "task", { businessStageLinks: [link("advisory", "shape")] }),
      r("c", "task", { businessStageLinks: [link("software")] }),
      r("unmapped", "task"),
    ],
    profile,
  );
  assert.deepEqual(selectStageWork(m).taskIds, ["a", "b", "c", "unmapped"]);
  assert.deepEqual(selectStageWork(m, "advisory").taskIds, ["a", "b"]);
  assert.deepEqual(selectStageWork(m, "advisory", "deliver").taskIds, ["a"]);
  assert.deepEqual(selectStageWork(m, "software", "deliver").taskIds, ["c"]);
  assert.deepEqual(selectStageWork(m, "missing").taskIds, []);
  assert.deepEqual(selectStageWork(m, "advisory", "missing").taskIds, []);
  assert.deepEqual(selectStageWork(m, undefined, "deliver").taskIds, []);
  assert.equal(m.streams[0].primary, true);
  assert.equal(m.streams[1].primary, false);
});

test("duties without tasks still identify their recorded owner at the assigned stage", () => {
  const m = stageWorkMap(
    [
      r("owner", "person"),
      r("duty", "duty", {
        ownerId: "owner",
        taskIds: [],
        businessStageLinks: [link()],
      }),
    ],
    profile,
  );
  const stage = selectStageWork(m, "advisory", "deliver");
  assert.deepEqual(stage.dutyIds, ["duty"]);
  assert.deepEqual(stage.people[0].ownedDutyIds, ["duty"]);
  assert.deepEqual(stage.people[0].taskIds, []);
  assert.deepEqual(m.unmapped.dutyIds, []);
});

test("Cobalt example overlays explicit fixture keys without saving or classifying customer work", () => {
  const evidence = r("example-source", "evidence", {
    locator: "Synthetic V2 example · full excerpt",
  });
  const task = r("known", "task", {
    sampleKey: "order-stock",
    sampleVersion: "cobalt-guided-v3",
  });
  const other = r("other", "task", {
    title: "Check stock and delivery date",
    valueStage: "check",
  });
  const saved = r("saved", "task", {
    sampleKey: "order-intake",
    sampleVersion: "cobalt-guided-v3",
    businessStageLinks: [link()],
  });
  const records = [task, other, saved, evidence];
  const example = cobaltStageExample(records, undefined, true);
  assert.ok(example.illustrative);
  assert.equal(
    example.records[0].data.businessStageLinks[0].stageId,
    "wholesale-2",
  );
  assert.equal(task.data.businessStageLinks, undefined);
  assert.equal(example.records[1], other);
  assert.equal(example.records[2], saved);
  const map = stageWorkMap(example.records, example.profile);
  assert.deepEqual(map.streams[0].stages[1].taskIds, ["known"]);
  assert.deepEqual(map.streams[0].stages[0].taskIds, []);
  assert.equal(cobaltStageExample(records).records, records);
  assert.equal(
    cobaltStageExample([task, other, saved], undefined, true).illustrative,
    false,
  );
  const existing = cobaltStageExample(records, profile, true);
  assert.equal(existing.profile, profile);
  assert.equal(existing.records, records);
  assert.equal(existing.illustrative, false);
  assert.equal(
    cobaltStageExample([other, evidence], undefined, true).illustrative,
    false,
  );
});
