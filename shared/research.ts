import { z } from "zod";
export function publicWebUrl(value: string) {
  try {
    const u = new URL(value),
      h = u.hostname.toLowerCase();
    return (
      ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !u.port &&
      h.includes(".") &&
      !h.endsWith(".local") &&
      !h.endsWith(".localhost") &&
      !h.endsWith(".internal") &&
      !/^\d+(\.\d+){3}$/.test(h) &&
      !h.includes(":") &&
      h.length <= 253
    );
  } catch {
    return false;
  }
}
export const researchInput = z
  .object({
    publicName: z.string().trim().min(2).max(160),
    website: z
      .string()
      .trim()
      .max(500)
      .default("")
      .refine(
        (v) => !v || publicWebUrl(v),
        "Use a public website URL without credentials or a port.",
      ),
    acknowledgePublicQuery: z.literal(true),
  })
  .strict();
export type ResearchSource = {
  title: string;
  url: string;
  text: string;
  publishedDate: string;
  retrievedAt: string;
  contentHash: string;
  excerpted: boolean;
  importedId?: string;
};
export type ResearchRun = {
  id: string;
  query: string;
  domain: string;
  state: string;
  results: ResearchSource[];
  message: string;
  created_at: string;
};
export const researchChecklist = [
  [
    "Offer & customers",
    "What does the business sell, to whom, and what result does it promise?",
  ],
  [
    "Business footprint",
    "Where does it operate? Which locations, brands and channels appear in public sources?",
  ],
  [
    "People & structure",
    "Which leaders and teams are named publicly? Leave internal reporting and ownership unverified.",
  ],
  [
    "How value is delivered",
    "What process is described publicly? Mark any inferred internal steps as questions.",
  ],
  [
    "Changes & pressures",
    "What recent announcements, hiring or market changes need context from the team?",
  ],
  [
    "Questions for kickoff",
    "What is missing, outdated, contradictory or assumed? Ask the team to correct it.",
  ],
] as const;
