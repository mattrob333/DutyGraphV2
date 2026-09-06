import type { RecordRow } from "./domain.ts";
export const stages = [
  { id: "receive", label: "Receive", description: "Requests & raw inputs" },
  { id: "prepare", label: "Prepare", description: "Build the work product" },
  { id: "check", label: "Check", description: "Validate & resolve" },
  { id: "decide", label: "Decide", description: "Authorize the next step" },
  { id: "deliver", label: "Deliver", description: "Release the outcome" },
  {
    id: "unmapped",
    label: "Not mapped",
    description: "Stage to be established",
  },
] as const;
export function taskMode(mode: string) {
  if (mode === "human_only")
    return { id: "human", label: "Human", detail: "Human-performed work" };
  if (mode === "ai_execute_bounded")
    return { id: "ai", label: "AI", detail: "Proposed bounded AI execution" };
  if (
    [
      "ai_assist",
      "ai_draft",
      "ai_recommend",
      "ai_execute_with_approval",
    ].includes(mode)
  )
    return {
      id: "hybrid",
      label: "AI + human review",
      detail: "Proposed AI assistance with a human checkpoint",
    };
  if (mode === "prohibited")
    return {
      id: "prohibited",
      label: "Prohibited",
      detail: "Execution is prohibited",
    };
  return {
    id: "unknown",
    label: "Not classified",
    detail: "Operating mode has not been established",
  };
}
export function taskStage(task: RecordRow) {
  return stages.find((s) => s.id === task.data.valueStage)?.id || "unmapped";
}
export function selectTasks(
  records: RecordRow[],
  workflow: string,
  filter: string,
  query: string,
  mode: string,
) {
  const flow = records.find((r) => r.kind === "workflow" && r.id === workflow);
  return records.filter(
    (t) =>
      t.kind === "task" &&
      (!flow || flow.data.taskIds.includes(t.id)) &&
      (filter === "all" || t.state === filter) &&
      (mode === "all" || taskMode(t.data.mode).id === mode) &&
      `${t.title} ${t.data.duty} ${(t.data.systems || []).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
}
