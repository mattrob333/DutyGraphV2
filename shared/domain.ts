import type { BusinessProfile } from "./business-types.ts";
import type { CompanyProfileReview } from "./company-profile.ts";
import { z } from "zod";
import {
  businessStageLinksSchema,
  stageInferenceSchema,
  workSchemas,
} from "./work-model.ts";
import { workflowSchema } from "./workflow.ts";
export const evidenceLabels = [
  "Known",
  "Inferred",
  "Assumed",
  "Missing",
] as const;
const text = z.string().trim().min(1).max(20000);
const short = z.string().trim().min(1).max(200);
const optional = z.string().max(20000).default("");
const ids = z.array(z.string().uuid()).max(150).default([]);
const lines = z.array(z.string().max(1000)).max(80).default([]);
export const schemas = {
  ...workSchemas,
  workflow: workflowSchema,
  person: z
    .object({
      name: short,
      email: z.email().toLowerCase(),
      role: short,
      team: short,
      managerId: z.union([z.uuid(), z.literal("")]).default(""),
      externalId: optional,
    })
    .strict(),
  evidence: z
    .object({
      title: short,
      type: z.enum([
        "Employee account",
        "Leadership account",
        "Customer account",
        "Policy document",
        "System configuration",
        "Execution record",
        "Public research",
        "Other document",
      ]),
      text,
      personId: z.union([z.uuid(), z.literal("")]).default(""),
      locator: short,
      originId: optional,
      classification: z.enum(evidenceLabels).default("Known"),
      bucket: z.enum(["biz", "leadership", "calls", "org"]).default("org"),
      assetId: z.union([z.uuid(), z.literal("")]).default(""),
      sourceDate: optional,
    })
    .strict(),
  task: z
    .object({
      title: short,
      duty: short,
      ownerId: z.union([z.uuid(), z.literal("")]).default(""),
      performerId: z.union([z.uuid(), z.literal("")]).default(""),
      purpose: text,
      trigger: text,
      inputs: text,
      instructions: text,
      aiPrompt: optional,
      destination: optional,
      valueStage: z
        .enum(["receive", "prepare", "check", "decide", "deliver", "unmapped"])
        .default("unmapped"),
      businessStageLinks: businessStageLinksSchema,
      stageInference: stageInferenceSchema,
      output: text,
      systems: lines,
      controlAreas: z
        .array(z.enum(["Access review", "Change review", "Confidential data"]))
        .max(3)
        .default([]),
      allowed: lines,
      denied: lines,
      humanGate: text,
      evidenceIds: ids,
      mode: z
        .enum([
          "human_only",
          "ai_assist",
          "ai_draft",
          "ai_recommend",
          "ai_execute_with_approval",
          "ai_execute_bounded",
          "prohibited",
        ])
        .default("human_only"),
      classification: z.enum(evidenceLabels).default("Inferred"),
      conflict: z.boolean().default(false),
      stopConditions: optional,
      reviewDue: z.iso.date(),
      reason: short,
    })
    .strict(),
  request: z
    .object({
      title: short,
      personId: z.uuid(),
      type: z.enum(["work", "leadership", "confirmation"]),
      questions: z.array(short).min(1).max(10),
      questionPlanVersion: z.string().max(100).default("custom-v1"),
      questionIds: z.array(z.string().max(100)).max(10).default([]),
      emailSubject: z.string().max(200).default(""),
      emailBody: z.string().max(12000).default(""),
      taskIds: ids,
      dueDate: z.iso.date(),
      notice: text,
    })
    .strict(),
  candidate: z
    .object({
      title: short,
      flow: short,
      pressure: text,
      alternative: text,
      counterfactual: text,
      discriminator: text,
      evidenceIds: ids,
      disconfirmingEvidenceIds: ids,
      ownerId: z.uuid(),
      throughputUnit: short,
    })
    .strict(),
  metric: z
    .object({
      title: short,
      question: text,
      formula: text,
      unit: short,
      population: short,
      source: short,
      ownerId: z.uuid(),
      baseline: z.number().finite().nullable(),
      target: z.number().finite().nullable(),
      missingReason: optional,
      window: short,
      guardrail: text,
    })
    .strict(),
  intervention: z
    .object({
      title: short,
      candidateId: z.uuid(),
      ownerId: z.uuid(),
      metricId: z.uuid(),
      change: text,
      prediction: text,
      stopConditions: text,
      reviewDate: z.iso.date(),
    })
    .strict(),
  agent: z
    .object({
      title: short,
      ownerId: z.uuid(),
      taskIds: z.array(z.uuid()).min(1).max(50),
      purpose: text,
    })
    .strict(),
  review: z
    .object({
      title: short,
      ownerId: z.uuid(),
      decision: text,
      nextAction: text,
      dueDate: z.iso.date(),
    })
    .strict(),
};
export type Kind =
  | keyof typeof schemas
  | "response"
  | "framework"
  | "export"
  | "brief"
  | "case"
  | "agent_request";
export type RecordRow = {
  id: string;
  company_id: string;
  kind: Kind;
  title: string;
  version: number;
  state: string;
  data: any;
  hash: string;
  created_at: string;
  updated_at: string;
  confirmations?: any[];
};
export type Company = {
  id: string;
  name: string;
  scope: string;
  goal: string;
  settings: {
    businessProfile?: BusinessProfile;
    companyResearchReview?: CompanyProfileReview;
    demoContact?: {
      name: string;
      email: string;
      role: string;
      teamSize: string;
    };
    demoApplicationId?: string;
    businessIntake?: { name: string; website: string; description: string };
    notice: string;
    retentionDays: number;
    reviewCadence: string;
    modules: string[];
  };
  sandbox: boolean;
  revision: number;
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: "advisor" | "participant";
  tenant_id: string;
  person_id: string | null;
  company_id: string | null;
};
export function confirmationStatus(
  task: RecordRow,
  confirmations: any[],
  now = Date.now(),
) {
  if (task.data.conflict) return "conflicting";
  if (!task.data.ownerId || !task.data.performerId) return "proposed";
  if (
    task.state === "stale" ||
    new Date(task.data.reviewDue + "T23:59:59Z").getTime() < now
  )
    return "stale";
  if (!task.data.reviewed) return "proposed";
  const required = new Set([task.data.ownerId, task.data.performerId]);
  for (const c of confirmations)
    if (
      c.record_id === task.id &&
      c.version === task.version &&
      c.decision === "correct" &&
      c.accepted &&
      c.hash === task.hash
    )
      required.delete(c.person_id);
  return required.size ? "awaiting_confirmation" : "confirmed";
}
export function diagnosisReadiness(
  candidate: RecordRow,
  evidence: RecordRow[],
  metrics: RecordRow[],
) {
  const sources = evidence.filter(
    (e) => candidate.data.evidenceIds.includes(e.id) && e.state === "accepted",
  );
  const independent = new Set(sources.map((e) => e.data.originId || e.id)).size;
  const reasons: string[] = [];
  if (independent < 2)
    reasons.push("Two independent, accepted sources are required.");
  if (!candidate.data.alternativeTested)
    reasons.push("Test the leading alternative and record the result.");
  if (!candidate.data.discriminatorResult)
    reasons.push("Collect the discriminating measurement.");
  if (
    !metrics.some(
      (m) =>
        m.data.baseline !== null && m.data.ownerId === candidate.data.ownerId,
    )
  )
    reasons.push(
      "A measured baseline and accountable measurement owner are required.",
    );
  if (!candidate.data.counterfactual)
    reasons.push("Describe the global throughput counterfactual.");
  return { ready: !reasons.length, reasons, independentSources: independent };
}
export const capturePrompts = [
  "What are you responsible for, and what does a good week look like?",
  "Walk through one recent task from the first trigger to the finished result.",
  "Where does work wait, get returned, or need a workaround?",
  "What can you decide yourself, and when do you need someone else?",
  "If you could change one thing about this work, what would it be?",
];
