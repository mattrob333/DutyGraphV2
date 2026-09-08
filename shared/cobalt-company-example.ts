import { businessTemplates, type BusinessProfile } from "./business-types.ts";
import type { Company, RecordRow } from "./domain.ts";

export const COBALT_BUSINESS_VERSION = "cobalt-business-v1";
export const COBALT_STREAM_ID = "cobalt-wholesale";
export const COBALT_SCOPE =
  "Wholesale account-to-replenishment cycle and supplier onboarding";
export const COBALT_GOAL =
  "Explore the fictional wholesale business from customer need to replenishment, with explicit duties, task handoffs and human decision boundaries.";

/** Authored training context, never a web research result or customer evidence. */
export const cobaltCompanySnapshot = {
  label: "Fictional company profile · authored training example",
  name: "Cobalt Industrial Supply",
  industry: "Industrial supply",
  businessType: "Wholesale & distribution",
  summary:
    "Cobalt is a fictional distributor of maintenance, repair and operating supplies to business customers. Its example work runs from developing customer accounts and checking availability through order confirmation, sourcing and fulfillment, invoice preparation and account replenishment.",
  offers: [
    "Maintenance and repair supplies",
    "Order sourcing and distribution",
    "Repeat account replenishment",
  ],
  customers:
    "Illustrative business purchasing teams that need the right products, quantities and delivery promise.",
  team: "The sample includes 12 fictional people across Leadership, Sales, Procurement, Finance, Operations, Warehouse, Legal and IT. This is fixture coverage, not a measured company headcount.",
  unknowns: [
    "No real website or public research was collected.",
    "Revenue, geography, market share and comparable companies are not established.",
    "No live throughput, waiting-time baseline, provider execution or delegated authority is established.",
  ],
  provenance:
    "Written for the Cobalt sandbox. All people, work accounts and operating examples are synthetic; no external citations are claimed.",
};

export function cobaltBusinessProfile(): BusinessProfile {
  const template = businessTemplates.find((t) => t.id === "wholesale")!;
  return {
    industry: cobaltCompanySnapshot.industry,
    status: "proposed",
    rationale:
      "Fictional Cobalt training profile. Wholesale distribution connects account development, product availability, confirmed orders, sourcing and fulfillment, invoicing, and account replenishment. Authored sample context; no public research or advisor review is claimed.",
    streams: [
      {
        id: COBALT_STREAM_ID,
        templateId: template.id,
        name: template.label,
        stages: template.stages.map((s) => ({
          ...s,
          functionIds: [...s.functionIds],
        })),
      },
    ],
  };
}

export function isKnownCobaltSample(sandbox: boolean, records: RecordRow[]) {
  return (
    sandbox &&
    records.some(
      (r) =>
        r.kind === "evidence" &&
        [
          "Synthetic V2 example · full excerpt",
          "Synthetic guided Cobalt example · complete excerpt",
        ].includes(r.data.locator),
    )
  );
}

/** Only fill absent settings. An advisor's saved profile/intake/review always wins. */
export function cobaltSettingsUpgrade(
  company: Pick<Company, "sandbox" | "settings">,
  records: RecordRow[],
) {
  if (
    !isKnownCobaltSample(company.sandbox, records) ||
    company.settings.businessProfile ||
    company.settings.companyResearchReview ||
    company.settings.businessIntake
  )
    return company.settings;
  return {
    ...company.settings,
    businessProfile: cobaltBusinessProfile(),
    businessIntake: {
      name: cobaltCompanySnapshot.name,
      website: "",
      description: cobaltCompanySnapshot.summary,
    },
  };
}

export function cobaltCompanyFieldsUpgrade(
  company: Pick<Company, "sandbox" | "scope" | "goal">,
  records: RecordRow[],
) {
  if (!isKnownCobaltSample(company.sandbox, records))
    return { scope: company.scope, goal: company.goal };
  return {
    scope:
      company.scope === "Supplier onboarding" ? COBALT_SCOPE : company.scope,
    goal: [
      "Reduce supplier-onboarding uncertainty without weakening financial controls.",
      "Explore this fictional example before creating a real engagement.",
    ].includes(company.goal)
      ? COBALT_GOAL
      : company.goal,
  };
}

export const cobaltTaskStageIds: Record<string, string> = {
  "account-needs": "wholesale-1",
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
  "invoice-prepare": "wholesale-5",
  "account-replenish": "wholesale-6",
};

export function cobaltStageLinks(keys: string[]) {
  return [
    ...new Set(keys.map((key) => cobaltTaskStageIds[key]).filter(Boolean)),
  ].map((stageId) => ({ streamId: COBALT_STREAM_ID, stageId }));
}
