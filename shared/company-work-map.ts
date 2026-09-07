import type { RecordRow } from "./domain.ts";

// The map reads descriptions and recorded handoffs. Position never creates a link.
export function companyWorkMap(records: RecordRow[]) {
  const current = records.filter(
    (r) => !["withdrawn", "retracted", "superseded"].includes(r.state),
  );
  const byId = new Map(current.map((r) => [r.id, r]));
  const tasks = current.filter((r) => r.kind === "task");
  const handoffs = current.filter((r) => r.kind === "handoff");
  const flows = current
    .filter((r) => r.kind === "workflow")
    .map((flow) => {
      const ids = new Set<string>(flow.data.taskIds || []);
      const steps = tasks.filter((t) => ids.has(t.id));
      const links = handoffs.filter(
        (h) =>
          (flow.data.handoffIds || []).includes(h.id) &&
          ids.has(h.data.sourceTaskId) &&
          ids.has(h.data.targetTaskId),
      );
      // Stable topological layers preserve branches. Cycles remain visible as unresolved.
      const remaining = new Set(steps.map((t) => t.id));
      const layers: RecordRow[][] = [];
      while (remaining.size) {
        const next = steps.filter(
          (t) =>
            remaining.has(t.id) &&
            !links.some(
              (h) =>
                h.data.targetTaskId === t.id &&
                remaining.has(h.data.sourceTaskId),
            ),
        );
        if (!next.length) {
          layers.push(steps.filter((t) => remaining.has(t.id)));
          break;
        }
        layers.push(next);
        next.forEach((t) => remaining.delete(t.id));
      }
      return {
        flow,
        steps,
        layers,
        links,
        missingTaskIds: [...ids].filter((id) => !byId.has(id)),
        cases: current.filter(
          (r) => r.kind === "case" && r.data.workflowId === flow.id,
        ),
      };
    });
  const unassigned = tasks.filter(
    (t) => !flows.some((f) => f.steps.some((s) => s.id === t.id)),
  );
  const missingOwners = tasks.filter(
    (t) => byId.get(t.data.ownerId)?.kind !== "person",
  );
  const aiCandidates = tasks.filter((t) =>
    String(t.data.mode).startsWith("ai_"),
  );
  // Cross-flow connections must be explicit records, never guessed from names.
  const crossFlowLinks = handoffs.filter((h) =>
    flows.some(
      (a) =>
        a.steps.some((t) => t.id === h.data.sourceTaskId) &&
        flows.some(
          (b) =>
            b.flow.id !== a.flow.id &&
            b.steps.some((t) => t.id === h.data.targetTaskId),
        ),
    ),
  );
  return {
    byId,
    tasks,
    flows,
    unassigned,
    missingOwners,
    aiCandidates,
    crossFlowLinks,
    findings: current.filter((r) => r.kind === "candidate"),
  };
}
