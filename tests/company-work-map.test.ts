import { test } from "node:test";
import assert from "node:assert/strict";
import { companyWorkMap } from "../shared/company-work-map.ts";
import type { RecordRow } from "../shared/domain.ts";
const r = (id: string, kind: string, data: any = {}, state = "draft") =>
  ({ id, kind, title: id, data, state }) as RecordRow;
test("map keeps branches, explicit cross-flow links, and missing owners separate", () => {
  const records = [
    r("person", "person"),
    r("a", "task", { ownerId: "person" }),
    r("b", "task", { ownerId: "deleted-person", mode: "ai_draft" }),
    r("c", "task", { ownerId: "" }),
    r("d", "task", { ownerId: "person" }),
    r("f", "workflow", { taskIds: ["c", "b", "a"], handoffIds: ["ab", "ac"] }),
    r("g", "workflow", { taskIds: ["d"], handoffIds: [] }),
    r("ab", "handoff", { sourceTaskId: "a", targetTaskId: "b" }),
    r("ac", "handoff", { sourceTaskId: "a", targetTaskId: "c" }),
    r("bd", "handoff", { sourceTaskId: "b", targetTaskId: "d" }),
    r("old", "task", {}, "withdrawn"),
  ];
  const m = companyWorkMap(records);
  assert.deepEqual(
    m.flows[0].layers.map((l) => l.map((t) => t.id)),
    [["a"], ["b", "c"]],
  );
  assert.deepEqual(
    m.missingOwners.map((t) => t.id),
    ["b", "c"],
  );
  assert.deepEqual(
    m.aiCandidates.map((t) => t.id),
    ["b"],
  );
  assert.deepEqual(
    m.crossFlowLinks.map((h) => h.id),
    ["bd"],
  );
  assert.equal(m.tasks.length, 4);
});
test("missing records and unlinked tasks never become invented handoffs", () => {
  const m = companyWorkMap([
    r("f", "workflow", { taskIds: ["a", "missing"], handoffIds: [] }),
    r("a", "task"),
    r("unlinked", "task"),
  ]);
  assert.deepEqual(m.flows[0].missingTaskIds, ["missing"]);
  assert.equal(m.flows[0].links.length, 0);
  assert.equal(m.crossFlowLinks.length, 0);
  assert.deepEqual(
    m.unassigned.map((t) => t.id),
    ["unlinked"],
  );
});
