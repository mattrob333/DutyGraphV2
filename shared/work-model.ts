import { z } from "zod";
const short = z.string().trim().min(1).max(200);
const text = z.string().trim().min(1).max(20000);
const optional = z.string().max(20000).default("");
const optionalId = z.union([z.uuid(), z.literal("")]).default("");
const ids = z.array(z.uuid()).max(150).default([]);
const lines = z.array(z.string().max(1000)).max(80).default([]);

const businessStageId = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(100);
export const businessStageLinksSchema = z
  .array(
    z.object({ streamId: businessStageId, stageId: businessStageId }).strict(),
  )
  .max(128)
  .superRefine((links, ctx) => {
    const pairs = new Set<string>();
    links.forEach((link, index) => {
      const key = `${link.streamId}:${link.stageId}`;
      if (pairs.has(key))
        ctx.addIssue({
          code: "custom",
          message: "Each business stage link must be unique",
          path: [index],
        });
      pairs.add(key);
    });
  })
  .default([]);
export type BusinessStageLink = z.infer<
  typeof businessStageLinksSchema
>[number];

export const kickoffQuestions = [
  {
    id: "value",
    question: "What do customers value enough to pay for, and how do you know?",
    bucket: "biz",
    purpose: "Customer value and evidence gaps",
  },
  {
    id: "output",
    question:
      "What completed result counts as output, and how do you measure it today?",
    bucket: "biz",
    purpose: "Define system throughput without inventing a baseline",
  },
  {
    id: "demand",
    question:
      "Is demand sufficient today? What would break first if demand increased?",
    bucket: "leadership",
    purpose: "Distinguish a demand constraint from an internal constraint",
  },
  {
    id: "flow",
    question:
      "Walk through one recent piece of work from request to completed result. Where did it wait or return?",
    bucket: "org",
    purpose: "Trace actual steps, queues, resources and rework",
  },
  {
    id: "authority",
    question:
      "Which decisions need a senior person’s approval, and where are those rules recorded?",
    bucket: "leadership",
    purpose:
      "Identify authority sources without treating a title as permission",
  },
  {
    id: "alternatives",
    question:
      "What do you think limits progress? What evidence would prove that explanation wrong?",
    bucket: "leadership",
    purpose: "Record the leader's hypothesis and a falsification question",
  },
  {
    id: "change",
    question:
      "What have you already tried, and what changed in the measured result?",
    bucket: "biz",
    purpose: "Separate an intervention from an observed outcome",
  },
  {
    id: "scope",
    question:
      "Which teams, systems, source types and activities may we review, and what is out of scope?",
    bucket: "org",
    purpose: "Bound the engagement and source policy",
  },
] as const;

export const workSchemas = {
  engagement: z
    .object({
      title: short,
      sponsorId: optionalId,
      totalHeadcount: z.number().int().positive().nullable().default(null),
      outcome: text,
      startDate: z.iso.date(),
      endDate: z.iso.date(),
      systems: lines,
      locations: lines,
      inScope: text,
      outOfScope: text,
      sourcePolicy: text,
      visibility: text,
      retentionDays: z.number().int().min(1).max(3650),
      reviewCadence: short,
      timezone: short,
      successCriteria: text,
    })
    .strict()
    .refine((d) => d.endDate >= d.startDate, {
      message: "End date must follow the start date",
      path: ["endDate"],
    }),
  duty: z
    .object({
      title: short,
      ownerId: optionalId,
      purpose: text,
      scope: text,
      taskIds: ids,
      businessStageLinks: businessStageLinksSchema,
      evidenceIds: ids,
      reviewDue: z.iso.date(),
      reason: short,
    })
    .strict(),
  handoff: z
    .object({
      title: short,
      sourceTaskId: z.uuid(),
      targetTaskId: z.uuid(),
      condition: text,
      outputMapping: text,
      requiredInput: text,
      acceptanceCheck: text,
      exceptionOwnerId: z.uuid(),
      timeoutHours: z.number().positive().max(8760),
      maxRetries: z.number().int().min(0).max(10),
      failureAction: text,
      evidenceIds: ids,
      reason: short,
    })
    .strict()
    .refine((d) => d.sourceTaskId !== d.targetTaskId, {
      message: "A handoff must connect two different tasks",
      path: ["targetTaskId"],
    }),
  outcome: z
    .object({
      title: short,
      interventionId: z.uuid(),
      ownerId: z.uuid(),
      result: z.enum(["supported", "falsified", "inconclusive"]),
      observationWindow: short,
      coverage: text,
      confounders: text,
      interpretation: text,
      nextAction: text,
      evidenceIds: z.array(z.uuid()).min(1).max(150),
      reason: short,
    })
    .strict(),
};

export function coverageSummary(
  people: { id: string }[],
  tasks: { data: any; state: string }[],
  requests: { data: any; state: string }[],
) {
  const roster = new Set(people.map((p) => p.id));
  const responded = new Set(
    requests
      .filter(
        (r) =>
          ["returned", "accepted"].includes(r.state) &&
          roster.has(r.data.personId),
      )
      .map((r) => r.data.personId),
  );
  return {
    participants: roster.size,
    responded: responded.size,
    confirmedTasks: tasks.filter((t) => t.state === "confirmed").length,
    totalTasks: tasks.length,
    unresolvedOwners: tasks.filter((t) => !roster.has(t.data.ownerId)).length,
    unresolvedPerformers: tasks.filter((t) => !roster.has(t.data.performerId))
      .length,
  };
}
