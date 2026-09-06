import type { RecordRow } from "./domain.ts";
export function standupQuestions(records: RecordRow[], personId: string) {
  const label = (value: string) =>
    value.length > 90 ? value.slice(0, 87) + "..." : value;
  const mine = records.filter(
    (r) =>
      r.kind === "task" &&
      (r.data.ownerId === personId || r.data.performerId === personId),
  );
  const issue = mine.find((r) => r.data.conflict || r.state === "stale");
  const metric = records.find(
    (r) => r.kind === "metric" && r.data.ownerId === personId,
  );
  return [
    `What did you complete since the last review${mine[0] ? ` for ${label(mine[0].title)}` : ""}? Give the result and its source.`,
    issue
      ? `What is still unresolved in ${label(issue.title)}? What decision or input do you need?`
      : "Where did work wait, return or stop? Give one case and the reason.",
    metric
      ? `What changed in ${label(metric.title)}? Give the value, period and source, or say what is missing.`
      : "What customer or team evidence changed your understanding this week? Give the source.",
    "What will you complete next? Name the owner, due date and help needed.",
  ];
}
