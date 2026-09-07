import { z } from "zod";
import { publicWebUrl } from "./research.ts";
import type { BriefSource } from "./business-brief.ts";

export const companyProfileReviewSchema = z
  .object({
    jobId: z.uuid(),
    summary: z.string().trim().min(1).max(2000),
    industry: z.string().trim().min(1).max(200),
    updates: z.string().trim().max(8000),
  })
  .strict();
export type CompanyProfileReview = z.infer<
  typeof companyProfileReviewSchema
> & { reviewedAt: string };

// Only expose social links explicitly present on the company's own website.
export function companySocialLinks(website: string, sources: BriefSource[]) {
  if (!publicWebUrl(website)) return [];
  const host = new URL(website).hostname.replace(/^www\./, "");
  const links = new Map<
    string,
    { url: string; label: string; sourceUrl: string }
  >();
  for (const source of sources) {
    if (
      !publicWebUrl(source.url) ||
      new URL(source.url).hostname.replace(/^www\./, "") !== host
    )
      continue;
    for (const raw of source.text.match(/https?:\/\/[^\s<>"')\]]+/g) || []) {
      const url = raw.replace(/[.,;]+$/, "");
      if (!publicWebUrl(url)) continue;
      const parsed = new URL(url),
        domain = parsed.hostname.replace(/^www\./, "");
      const label = (
        {
          "linkedin.com": "LinkedIn",
          "youtube.com": "YouTube",
          "instagram.com": "Instagram",
          "facebook.com": "Facebook",
          "x.com": "X",
        } as Record<string, string>
      )[domain];
      if (
        !label ||
        parsed.pathname === "/" ||
        /\/(share|sharer|intent|watch)(\/|$)/.test(parsed.pathname)
      )
        continue;
      parsed.search = "";
      parsed.hash = "";
      links.set(parsed.href, {
        url: parsed.href,
        label,
        sourceUrl: source.url,
      });
    }
  }
  return [...links.values()].slice(0, 6);
}

const escape = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function companyProfileHtml(
  job: any,
  review?: CompanyProfileReview,
  streams: any[] = [],
) {
  const draft = job.result.draft,
    current = review?.jobId === job.id ? review : undefined;
  const sources: BriefSource[] = job.input.sources || [];
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(job.input.name)} — Company profile</title><style>body{font:16px/1.65 system-ui;margin:48px auto;max-width:980px;padding:24px;color:#182e35}h1{font-size:40px}h2{margin-top:36px}article{border-top:1px solid #ccd8d4;padding:18px 0}small{color:#52666b}blockquote{border-left:3px solid #92b6a2;padding-left:16px}a{color:#235b66}@media print{body{margin:0}article{break-inside:avoid}}</style><header><small>DutyGraph · A Tier 4 Intelligence company · Research ${escape(new Date(job.created_at).toLocaleDateString())}</small><h1>${escape(job.input.name)}</h1><h2>${escape(current?.industry || draft.industry)}</h2><p>${escape(current?.summary || draft.summary)}</p><p>${escape(job.input.website)}</p><small>AI research draft. Source-reported claims are not independently verified.</small></header>${current ? `<h2>Advisor updates</h2><small>Saved ${escape(current.reviewedAt)}</small><p style="white-space:pre-wrap">${escape(current.updates || "Summary and industry reviewed.")}</p>` : ""}<h2>Business facts & evidence</h2>${draft.brief.facts
    .map(
      (f: any) =>
        `<article><h3>${escape(f.label)}</h3><small>${escape(f.category)} · ${escape(f.basis)} ${escape(f.asOf)}</small><p>${escape(f.value)}</p>${f.citations
          .map((c: any) => {
            const source = sources.find((s) => s.id === c.sourceId);
            return `<blockquote>${escape(c.quote)}</blockquote>${source && publicWebUrl(source.url) ? `<a href="${escape(source.url)}">${escape(source.title)}</a>` : "<small>Advisor-provided description</small>"}`;
          })
          .join("")}</article>`,
    )
    .join(
      "",
    )}<h2>Operating streams</h2>${streams.map((s: any, index: number) => `<article><small>${index === 0 ? "Primary business" : "Supporting business stream"}</small><h3>${escape(s.name)}</h3><p>${(s.stages || []).map((v: any) => escape(v.label || v.name || v)).join(" → ")}</p></article>`).join("")}<h2>Questions for kickoff</h2><ul>${draft.questions.map((q: string) => `<li>${escape(q)}</li>`).join("")}</ul></html>`;
}
