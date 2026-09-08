import { businessTemplates, type BusinessProfile } from "./business-types.ts";
import type { RecordRow } from "./domain.ts";

// Hand-authored illustration for known fictional fixture keys. Never reuse this
// as a classifier for customer data, titles, teams or job descriptions.
const sampleStages: Record<string, string> = {
  "order-stock": "wholesale-2",
  "order-shortage": "wholesale-2",
  "order-intake": "wholesale-3",
  "order-release": "wholesale-3",
  "supplier-packet": "wholesale-4",
  "supplier-draft": "wholesale-4",
  "supplier-legal": "wholesale-4",
  "supplier-verify": "wholesale-4",
  "supplier-mismatch": "wholesale-4",
  "supplier-result": "wholesale-4",
  "supplier-approve": "wholesale-4",
  "supplier-activate": "wholesale-4",
  "order-pack": "wholesale-4",
  "order-dispatch": "wholesale-4",
  "order-notify": "wholesale-4",
};

/** Temporary read-only view data; none of these assignments are saved. */
export function cobaltStageExample(
  records: RecordRow[],
  savedProfile?: BusinessProfile | null,
  sandbox = false,
): {
  profile: BusinessProfile | undefined;
  records: RecordRow[];
  illustrative: boolean;
} {
  const unchanged = {
    profile: savedProfile || undefined,
    records,
    illustrative: false,
  };
  if (
    !sandbox ||
    savedProfile ||
    !records.some(
      (r) =>
        r.kind === "evidence" &&
        [
          "Synthetic V2 example · full excerpt",
          "Synthetic guided Cobalt example · complete excerpt",
        ].includes(r.data.locator),
    )
  )
    return unchanged;
  const eligible = (r: RecordRow) =>
    r.kind === "task" &&
    r.data.sampleVersion === "cobalt-guided-v3" &&
    Object.hasOwn(sampleStages, r.data.sampleKey) &&
    !r.data.businessStageLinks?.length;
  if (!records.some(eligible)) return unchanged;
  const template = businessTemplates.find((t) => t.id === "wholesale")!;
  const profile: BusinessProfile = {
    industry: "Industrial supply",
    status: "proposed",
    rationale:
      "Illustrative stage assignments for the fictional Cobalt sample. Not saved company research or reviewed work assignments.",
    streams: [
      {
        id: "example-wholesale",
        templateId: template.id,
        name: template.label,
        stages: template.stages.map((stage) => ({
          ...stage,
          functionIds: [...stage.functionIds],
        })),
      },
    ],
  };
  return {
    illustrative: true,
    profile,
    records: records.map((r) =>
      eligible(r)
        ? {
            ...r,
            data: {
              ...r.data,
              businessStageLinks: [
                {
                  streamId: profile.streams[0].id,
                  stageId: sampleStages[r.data.sampleKey],
                },
              ],
            },
          }
        : r,
    ),
  };
}
