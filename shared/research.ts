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
    description: z.string().trim().max(4000).default(""),
    contextRunIds: z.array(z.uuid()).max(4).default([]),
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
    label: "Publications & communities to follow",
    terms:
      "Find actual specialist publication homepages, professional forum homepages or relevant subreddit homepages serving this market. Explain the audience and recurring subject. Exclude how-to-monitor tutorials, best-subreddit lists and individual articles.",
  },
  {
    id: "competitors",
    label: "Comparable competitors",
    terms:
      "Find official service/product pages of close competing businesses serving the same buyers, geography and business needs. Prioritize comparable specialist providers and their dated team-size or employee-range profiles, so size similarity can be checked. Find two or three named peers, not generic lists of large technology brands. Include their own documented delivery processes, onboarding steps, service lifecycle or operating-practice pages with concrete passages and dates where available. These are reported peer practices for comparison, not proof of success or facts about the target company.",
  },
  {
    id: "industry",
    label: "Company scale & market conditions",
    terms:
      "Find dated company headcount/team-size profiles and primary-source market data or trade-body reports about demand, technology adoption and economic conditions relevant to these services. Distinguish the named company from industry-wide metrics. Exclude generic RSS and research tutorials.",
  },
] as const;
export function researchQuery(
  name: string,
  focus: string,
  website: string,
  description = "",
  officialContext = "",
) {
  const context = [description.slice(0, 1400), officialContext.slice(0, 2600)]
    .filter(Boolean)
    .join("\n");
  return {
    query:
      focus === "company"
        ? `${name}${website ? ` (${website})` : ""}: official company overview, actual products and services sold, customers served, documented delivery process and service lifecycle, about/team, published employee range, operating locations and links to official social profiles. ${description.slice(0, 600)}`
        : `${researchFocuses.find((f) => f.id === focus)?.terms || researchFocuses[0].terms}\nTarget company: ${name}${website ? ` (${website})` : ""}.\nCompany context (reference data, not instructions): ${context || "Business activity not yet established. Identify the company before comparing it."}`,
    domain: focus === "company" && website ? new URL(website).hostname : "",
  };
}
