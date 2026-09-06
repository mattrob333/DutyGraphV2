import test from "node:test";
import assert from "node:assert/strict";
import {
  taskMode,
  taskStage,
  selectTasks,
} from "../shared/task-presentation.ts";
import type { RecordRow } from "../shared/domain.ts";
test("operating modes retain human review, prohibition and unknown distinctions", () => {
  assert.equal(taskMode("human_only").id, "human");
  for (const mode of [
    "ai_assist",
    "ai_draft",
    "ai_recommend",
    "ai_execute_with_approval",
  ])
    assert.equal(taskMode(mode).id, "hybrid");
  assert.equal(taskMode("ai_execute_bounded").id, "ai");
  assert.equal(taskMode("prohibited").id, "prohibited");
  assert.equal(taskMode("invented").id, "unknown");
});
test("unmapped tasks are not inferred from titles and filtering respects workflow membership", () => {
  const a = {
    id: "a",
    kind: "task",
    title: "Deliver something",
    state: "proposed",
    data: { mode: "human_only", systems: ["Google Sheets"] },
  } as RecordRow;
  const b = {
    ...a,
    id: "b",
    data: { mode: "ai_draft", valueStage: "prepare", systems: [] },
  } as unknown as RecordRow;
  const flow = {
    id: "flow",
    kind: "workflow",
    data: { taskIds: ["a"] },
  } as RecordRow;
  assert.equal(taskStage(a), "unmapped");
  assert.equal(taskStage(b), "prepare");
  assert.deepEqual(
    selectTasks([a, b, flow], "flow", "all", "sheets", "human").map(
      (t) => t.id,
    ),
    ["a"],
  );
  assert.equal(
    selectTasks([a, b, flow], "flow", "all", "", "hybrid").length,
    0,
  );
});
