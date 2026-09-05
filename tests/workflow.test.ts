import test from "node:test";
import assert from "node:assert/strict";
import {
  validateFlow,
  startCase,
  advanceCase,
  expireSteps,
  caseStatus,
  type FlowLink,
} from "../shared/workflow.ts";
const links: FlowLink[] = [
  { id: "ab", from: "a", to: "b", condition: "Normal" },
  { id: "ac", from: "a", to: "c", condition: "Exception" },
  { id: "bd", from: "b", to: "d", condition: "Ready" },
  { id: "cd", from: "c", to: "d", condition: "Ready" },
];
test("workflow validation rejects cycles, ambiguous duplicate edges and disconnected tasks", () => {
  assert.equal(validateFlow(["a", "b", "c", "d"], links).length, 0);
  assert.ok(
    validateFlow(
      ["a", "b", "c", "d"],
      [...links, { id: "da", from: "d", to: "a", condition: "Again" }],
    ).some((s) => s.includes("cycle")),
  );
  assert.ok(
    validateFlow(["a", "b"], [links[0], links[0]]).some((s) =>
      s.includes("Duplicate"),
    ),
  );
  assert.ok(
    validateFlow(["a", "b", "orphan"], [links[0]]).some((s) =>
      s.includes("Connect"),
    ),
  );
});
test("an explicit branch skips the untaken path and waits for the active join", () => {
  const steps = startCase(["a", "b", "c", "d"], links, 24, 0);
  steps[0].state = "completed";
  steps[0].routes = ["ab"];
  let next = advanceCase(steps, links, "all", 24, 1);
  assert.equal(next[1].state, "ready");
  assert.equal(next[2].state, "skipped");
  assert.equal(next[3].state, "blocked");
  next[1].state = "completed";
  next[1].routes = ["bd"];
  next = advanceCase(next, links, "all", 24, 2);
  assert.equal(next[3].state, "ready");
  next[3].state = "completed";
  assert.equal(caseStatus(next), "complete");
});
test("all and any joins have distinct readiness rules", () => {
  const steps = startCase(["a", "b", "c", "d"], links, 24, 0);
  steps[0].state = "completed";
  steps[0].routes = ["ab", "ac"];
  const ready = advanceCase(steps, links, "all", 24, 1);
  ready[1].state = "completed";
  ready[1].routes = ["bd"];
  assert.equal(advanceCase(ready, links, "all", 24, 2)[3].state, "blocked");
  assert.equal(advanceCase(ready, links, "any", 24, 2)[3].state, "ready");
});
test("expired human checkpoints escalate and never auto-complete", () => {
  const original = startCase(["a"], [], 1, 0),
    expired = expireSteps(original, 3600001);
  assert.equal(expired[0].state, "escalated");
  assert.equal(caseStatus(expired), "needs_attention");
  assert.equal(original[0].state, "ready");
});
