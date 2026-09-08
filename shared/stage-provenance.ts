import { z } from "zod";
import { publicWebUrl } from "./research.ts";

export const stageCitationSchema = z
  .object({
    kind: z.enum(["company_reported", "peer_example"]),
    sourceId: z.string().min(1).max(160),
    quote: z.string().trim().min(8).max(600),
    subject: z.string().trim().min(1).max(160),
    relevance: z.string().trim().min(1).max(500),
    title: z.string().max(200).optional(),
    url: z
      .string()
      .max(2000)
      .refine((v) => !v || publicWebUrl(v))
      .optional(),
    retrievedAt: z.string().max(100).optional(),
    publishedDate: z.string().max(100).optional(),
  })
  .strict();

export const stageProvenanceSchema = z
  .object({
    status: z.literal("proposed"),
    rationale: z.string().trim().min(1).max(1000),
    citations: z.array(stageCitationSchema).max(6),
    unknowns: z.array(z.string().trim().min(1).max(300)).max(4),
  })
  .strict();
export type StageProvenance = z.infer<typeof stageProvenanceSchema>;
