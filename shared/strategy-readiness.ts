import { frameworkOrder, frameworkSpecs } from "./framework-specs.ts";
import type { RecordRow } from "./domain.ts";

export type FrameworkReadiness = {
  key: string;
  current: boolean;
  stale: boolean;
  ready: boolean;
  missingUpstream: string[];
  sourceCount: number;
};
export type FrameworkReadinessList = {
  configured: boolean;
  frameworks: FrameworkReadiness[];
};

/** Follow the server's version-aware dependency state, never count tasks as proof. */
export function nextStrategyFramework(states: FrameworkReadiness[]) {
  const ordered = frameworkOrder.flatMap((key) => {
    const state = states.find((item) => item.key === key);
    return state ? [state] : [];
  });
  return (
    ordered.find((state) => !state.current && state.ready)?.key ||
    ordered.find((state) => !state.current && !state.missingUpstream.length)
      ?.key ||
    ordered.find((state) => !state.current)?.key ||
    frameworkOrder[0]
  );
}

export function frameworkInputStatus(sourceCount: number | undefined) {
  return sourceCount === undefined
    ? "Checking sources"
    : sourceCount > 0
      ? "Sources to assess"
      : "No matching source";
}

export function weeklyStrategyEvidence(records: RecordRow[]) {
  const active = records.filter(
    (r) => !["withdrawn", "retracted", "superseded", "stale"].includes(r.state),
  );
  const metrics = active.filter((r) => r.kind === "metric");
  const interventions = active.filter((r) => r.kind === "intervention");
  return {
    metrics,
    missingBaselines: metrics.filter(
      (r) => r.data.baseline === null || r.data.baseline === undefined,
    ),
    interventions,
    outcomes: active.filter((r) => r.kind === "outcome"),
    returnedUpdates: active.filter(
      (r) =>
        r.kind === "request" &&
        String(r.data.questionPlanVersion || "").startsWith(
          "weekly-checkin:",
        ) &&
        ["returned", "accepted"].includes(r.state),
    ),
  };
}

export function frameworkLabel(key: string) {
  return frameworkSpecs[key]?.name || key;
}
