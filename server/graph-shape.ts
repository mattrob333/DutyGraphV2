import { linksFor } from "../shared/record-links.ts";
export const graphKinds = [
  "person",
  "task",
  "evidence",
  "candidate",
  "agent",
  "metric",
  "intervention",
  "duty",
  "handoff",
  "workflow",
  "outcome",
];
export function graphEdges(records: any[]) {
  return records.flatMap((r) =>
    r.kind === "handoff"
      ? [
          {
            source: r.data.sourceTaskId,
            target: r.data.targetTaskId,
            relationship: "HANDS_OFF_TO",
            sourceRecordId: r.id,
            sourceVersion: r.version,
            sourceHash: r.hash,
            validation: r.state,
          },
        ]
      : linksFor(r).map((l) => ({
          source: l.inbound ? l.target : r.id,
          target: l.inbound ? r.id : l.target,
          relationship: l.relationship,
          sourceRecordId: r.id,
          sourceVersion: r.version,
          sourceHash: r.hash,
          validation: r.state,
        })),
  );
}
