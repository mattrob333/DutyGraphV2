import test from "node:test";
import assert from "node:assert/strict";
import { frameworkOrder } from "../shared/framework-specs.ts";
import {
  frameworkInputStatus,
  nextStrategyFramework,
  weeklyStrategyEvidence,
  type FrameworkReadiness,
} from "../shared/strategy-readiness.ts";
import type { RecordRow } from "../shared/domain.ts";

const status = (
  key: string,
  changes: Partial<FrameworkReadiness> = {},
): FrameworkReadiness => ({
  key,
  current: false,
  stale: false,
  ready: false,
  missingUpstream: [],
  sourceCount: 0,
  ...changes,
});
const record = (id: string, kind: string, data: any = {}, state = "proposed") =>
  ({ id, kind, title: id, state, data }) as RecordRow;

test("strategy continuation follows server readiness in dependency order, not the most sources", () => {
  const [first, second, third] = frameworkOrder;
  const states = [
    status(third, { ready: true, sourceCount: 200 }),
    status(second, { ready: true, sourceCount: 1 }),
    status(first, { current: true, ready: true }),
  ];
  assert.equal(nextStrategyFramework(states), second);
  assert.equal(
    nextStrategyFramework([
      status(first, { stale: true, ready: true }),
      ...states.slice(0, 2),
    ]),
    first,
  );
});

test("unmet upstream dependencies never become a recommended runnable framework from source counts", () => {
  const [first, second] = frameworkOrder;
  assert.equal(
    nextStrategyFramework([
      status(second, { sourceCount: 99, missingUpstream: [first] }),
      status(first),
    ]),
    first,
  );
  assert.equal(nextStrategyFramework([]), first);
  assert.equal(
    nextStrategyFramework(
      frameworkOrder.map((key) => status(key, { current: true, ready: true })),
    ),
    first,
  );
});

test("available excerpts stay sources to assess and never certify required variables", () => {
  assert.equal(frameworkInputStatus(undefined), "Checking sources");
  assert.equal(frameworkInputStatus(0), "No matching source");
  assert.equal(frameworkInputStatus(60), "Sources to assess");
});

test("weekly source inventory treats a zero baseline as recorded and excludes retired or stale work", () => {
  const result = weeklyStrategyEvidence([
    record("zero", "metric", { baseline: 0 }),
    record("unknown", "metric", { baseline: null }),
    record("omitted", "metric"),
    record("old", "metric", { baseline: null }, "stale"),
    record("change", "intervention"),
    record("withdrawn", "intervention", {}, "withdrawn"),
    record("outcome", "outcome"),
    record(
      "weekly",
      "request",
      { questionPlanVersion: "weekly-checkin:v1" },
      "returned",
    ),
    record(
      "draft",
      "request",
      { questionPlanVersion: "weekly-checkin:v1" },
      "draft",
    ),
    record(
      "gap",
      "request",
      { questionPlanVersion: "work-gap:v1" },
      "returned",
    ),
  ]);
  assert.deepEqual(
    result.metrics.map((item) => item.id),
    ["zero", "unknown", "omitted"],
  );
  assert.deepEqual(
    result.missingBaselines.map((item) => item.id),
    ["unknown", "omitted"],
  );
  assert.deepEqual(
    result.interventions.map((item) => item.id),
    ["change"],
  );
  assert.deepEqual(
    result.outcomes.map((item) => item.id),
    ["outcome"],
  );
  assert.deepEqual(
    result.returnedUpdates.map((item) => item.id),
    ["weekly"],
  );
});
