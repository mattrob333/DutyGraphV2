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
    focus: z
      .enum(["company", "communities", "competitors", "industry"])
      .default("company"),
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

export const researchFocuses = [
  {
    id: "company",
    label: "Company overview",
    terms: "company products services customers leadership locations",
  },
  {
    id: "communities",
    label: "Customer communities",
    terms:
      "customer industry discussion communities Reddit subreddits professional forums where customers ask questions",
  },
  {
    id: "competitors",
    label: "Competitors & their channels",
    terms:
      "competitors alternatives official social media LinkedIn YouTube customer discussions",
  },
  {
    id: "industry",
    label: "Industry news & feeds",
    terms: "industry trade publications news RSS feeds market developments",
  },
] as const;
export function researchQuery(name: string, focus: string, website: string) {
  return {
    query: `${name} ${researchFocuses.find((f) => f.id === focus)?.terms || researchFocuses[0].terms}`,
    domain: focus === "company" && website ? new URL(website).hostname : "",
  };
}
