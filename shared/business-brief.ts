import { z } from "zod";
import { publicWebUrl } from "./research.ts";

export const briefCategories = {
  offers: "Products & services",
  customers: "Customers & buying needs",
  scale: "Size & team",
  footprint: "Market & footprint",
  competitors: "Comparable companies",
  environment: "Market conditions",
} as const;
const citation = z
  .object({
    sourceId: z.string().min(1).max(160),
    quote: z.string().trim().min(8).max(600),
  })
  .strict();
export const businessBriefSchema = z
  .object({
    facts: z
      .array(
        z
          .object({
            category: z.enum(
              Object.keys(briefCategories) as [
                keyof typeof briefCategories,
                ...Array<keyof typeof briefCategories>,
              ],
            ),
            label: z.string().trim().min(1).max(100),
            value: z.string().trim().min(1).max(450),
            basis: z.enum(["Reported", "Inferred", "Not established"]),
            asOf: z.string().max(100),
            citations: z.array(citation).max(3),
          })
          .strict(),
      )
      .min(6)
      .max(18),
    monitoring: z
      .array(
        z
          .object({
            name: z.string().min(1).max(140),
            kind: z.enum([
              "Publication",
              "Community",
              "Forum",
              "Trade body",
              "Competitor channel",
            ]),
            sourceId: z.string().min(1).max(160),
            quote: z.string().trim().min(8).max(600),
            relevance: z.string().min(1).max(400),
            signal: z.string().min(1).max(240),
            feedUrl: z.string().max(2000),
          })
          .strict(),
      )
      .max(6),
  })
  .strict();
export type BusinessBrief = z.infer<typeof businessBriefSchema>;
export type BriefSource = {
  id: string;
  title: string;
  text: string;
  url: string;
  retrievedAt?: string;
  publishedDate?: string;
  focus?: string;
};

const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
export function validateBusinessBrief(
  value: unknown,
  sources: BriefSource[],
  description: string,
) {
  const brief = businessBriefSchema.parse(value);
  const texts = new Map(sources.map((s) => [s.id, s.text]));
  if (description) texts.set("description", description);
  function check(c: { sourceId: string; quote: string }) {
    const source = texts.get(c.sourceId);
    if (!source || !normalize(source).includes(normalize(c.quote)))
      throw new Error(
        "Business brief citation is not present in its source excerpt",
      );
  }
  for (const key of Object.keys(briefCategories))
    if (!brief.facts.some((f) => f.category === key))
      throw new Error("Business brief omitted a required area");
  for (const fact of brief.facts) {
    if (fact.basis === "Not established") {
      if (fact.citations.length)
        throw new Error("Unknown findings cannot claim evidence");
    } else {
      if (!fact.citations.length)
        throw new Error("Business finding requires evidence");
      fact.citations.forEach(check);
    }
  }
  for (const channel of brief.monitoring) {
    if (!sources.some((s) => s.id === channel.sourceId))
      throw new Error("Monitoring source must be a retrieved public page");
    check(channel);
    if (
      channel.feedUrl &&
      (!publicWebUrl(channel.feedUrl) ||
        !texts.get(channel.sourceId)!.includes(channel.feedUrl))
    )
      throw new Error("Feed address must occur in the retrieved channel text");
  }
  return brief;
}

export const businessBriefInstructions = `Produce a concise pre-kickoff business brief, not search results. Cover all six categories with useful data points. Extract offers (what is sold, delivery and pricing if published), customer segments/buying needs, headcount or team size (with date and source's range, never estimated from site size), geography and market, close competitors, and relevant macro conditions. Use Not established and a clear gap when evidence is absent or irrelevant. Never invent revenue, employees, competitors or dates. Reported means the source actually reports it, not independently verified; use Inferred for interpretations, competitor proximity and implications. Each non-missing fact must cite a supplied sourceId AND an exact supporting quote copied from its text (8–600 characters). A matching quote is provenance, not proof of truth. Quotes must support the precise value; avoid attribution to a similarly named company. Distinguish company self-description from independent evidence in the value. asOf is the date applicable to the fact if stated, otherwise empty; retrieval date is not measurement date. Competitors must serve overlapping customers and needs: explain overlap and any scale/geography mismatch, and use their own offering evidence plus target evidence. Do not call a global vendor a close competitor just because it mentions AI. Macro items need dated relevant evidence; state business implications as inference. Ignore generic SEO lists, how-to articles about research or RSS, and incidental company mentions. For monitoring return actual publication/community/forum/trade-body/competitor-channel home pages found in the sources, with a quote explaining their subject, why relevant and which signal to watch. Never return tutorials on how to monitor or create feeds, random articles, or invented URLs. The UI uses the cited source URL; choose a source that is itself the channel page. Set feedUrl only when the exact public RSS/Atom address is explicitly present in the cited channel text; otherwise use an empty string. A channel is a suggestion, not an active subscription or a connectivity-tested RSS feed. Keep monitoring separate from facts and do not use community opinions as company metrics. Prefer fewer supported findings over filler. Summary should synthesize the supported findings in two plain-English sentences; questions should target important remaining gaps and distinguish consulting and custom-build streams where relevant.`;

export const companyProfileResearchInstructions = `The brief is a reusable company profile. Give each distinct product or service its own offers fact (up to four), explaining what customers buy and how it is delivered. For competitors, prefer two or three named companies with comparable scale; use a separate fact for each and explain offering overlap, buyer/geographic overlap, published employee range and its date when available. Cite both overlap and any size claim. If either company size is unknown, explicitly say size comparison is unconfirmed; never assert similarly sized without evidence. Do not fill missing peers with global platforms. Keep the company identity, offerings, market and team size easy to scan. Do not confuse a consulting stream with a custom-build stream.`;
