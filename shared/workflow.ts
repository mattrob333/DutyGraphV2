import { z } from "zod";
export const workflowSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    documentationOnly: z.boolean().default(false),
    purpose: z.string().trim().min(5).max(12000),
    ownerId: z.union([z.uuid(), z.literal("")]),
    taskIds: z.array(z.uuid()).min(1).max(40),
    handoffIds: z.array(z.uuid()).max(100),
    joinPolicy: z.enum(["all", "any"]),
    timeoutHours: z.number().positive().max(8760),
    maxAttempts: z.number().int().min(1).max(10),
    reason: z.string().trim().min(3).max(500),
  })
  .strict()
  .refine((data) => data.documentationOnly || !!data.ownerId, {
    message: "An executable workflow requires an owner.",
    path: ["ownerId"],
  });
export type FlowLink = {
  id: string;
  from: string;
  to: string;
  condition: string;
};
export type CaseStep = {
  id: string;
  state: "blocked" | "ready" | "completed" | "failed" | "skipped" | "escalated";
  attempts: number;
  dueAt: string | null;
  routes: string[];
  note: string;
  completedAt: string | null;
};
export function validateFlow(taskIds: string[], links: FlowLink[]) {
  const issues: string[] = [];
  if (new Set(taskIds).size !== taskIds.length)
    issues.push("A task appears more than once.");
  if (links.some((l) => !taskIds.includes(l.from) || !taskIds.includes(l.to)))
    issues.push("A handoff references a task outside this workflow.");
  if (links.some((l) => !l.condition.trim()))
    issues.push("Every handoff needs an explicit condition.");
  if (new Set(links.map((l) => `${l.from}:${l.to}`)).size !== links.length)
    issues.push("Duplicate paths between the same tasks are ambiguous.");
  const visiting = new Set<string>(),
    visited = new Set<string>();
  let cycle = false;
  const visit = (id: string) => {
    if (visiting.has(id)) {
      cycle = true;
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const l of links.filter((l) => l.from === id)) visit(l.to);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of taskIds) visit(id);
  if (cycle)
    issues.push(
      "This workflow contains a cycle. Use bounded step retries rather than a looping handoff.",
    );
  if (
    taskIds.length > 1 &&
    taskIds.some((id) => !links.some((l) => l.from === id || l.to === id))
  )
    issues.push("Connect every task or create a separate workflow.");
  return issues;
}
export function startCase(
  taskIds: string[],
  links: FlowLink[],
  hours: number,
  now: number,
): CaseStep[] {
  return taskIds.map((id) => {
    const ready = !links.some((l) => l.to === id);
    return {
      id,
      state: ready ? "ready" : "blocked",
      attempts: ready ? 1 : 0,
      dueAt: ready ? new Date(now + hours * 3600000).toISOString() : null,
      routes: [],
      note: "",
      completedAt: null,
    };
  });
}
export function advanceCase(
  steps: CaseStep[],
  links: FlowLink[],
  join: "all" | "any",
  hours: number,
  now: number,
) {
  const next = structuredClone(steps);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of next.filter((s) => s.state === "blocked")) {
      const incoming = links.filter((l) => l.to === step.id);
      const parents = incoming.map((l) => ({
        link: l,
        step: next.find((s) => s.id === l.from)!,
      }));
      const terminal = parents.every((p) =>
        ["completed", "skipped"].includes(p.step.state),
      );
      const active = parents.filter(
        (p) =>
          p.step.state === "completed" && p.step.routes.includes(p.link.id),
      );
      if (
        (join === "any" && active.length) ||
        (join === "all" && terminal && active.length)
      ) {
        step.state = "ready";
        step.attempts = 1;
        step.dueAt = new Date(now + hours * 3600000).toISOString();
        changed = true;
      } else if (terminal && !active.length) {
        step.state = "skipped";
        changed = true;
      }
    }
  }
  return next;
}
export function caseStatus(steps: CaseStep[]) {
  return steps.every((s) => ["completed", "skipped"].includes(s.state))
    ? "complete"
    : steps.some((s) => s.state === "escalated" || s.state === "failed")
      ? "needs_attention"
      : "in_progress";
}
export function expireSteps(steps: CaseStep[], now: number) {
  return steps.map((s) =>
    s.state === "ready" && s.dueAt && new Date(s.dueAt).getTime() <= now
      ? {
          ...s,
          state: "escalated" as const,
          note: "Deadline passed. Human review required.",
        }
      : structuredClone(s),
  );
}
