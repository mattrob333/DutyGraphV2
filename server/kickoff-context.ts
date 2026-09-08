import type pg from "pg";
import { publicWebUrl } from "../shared/research.ts";
export async function kickoffPublicContext(
  db: pg.PoolClient,
  companyId: string,
) {
  const c = (
    await db.query("SELECT name,settings FROM companies WHERE id=$1", [
      companyId,
    ])
  ).rows[0];
  const intake = c.settings.businessIntake || {};
  const job = (
    await db.query(
      "SELECT id,result,input,created_at FROM provider_jobs WHERE company_id=$1 AND kind='business_classification' AND state='complete' AND input->>'name'=$2 AND input->>'website'=$3 AND input->>'description'=$4 ORDER BY created_at DESC LIMIT 1",
      [
        companyId,
        intake.name || "",
        intake.website || "",
        intake.description || "",
      ],
    )
  ).rows[0];
  const draft = job?.result?.draft;
  // Public research only: never return advisor notes, provider inputs, raw evidence or keys.
  return {
    name: c.name,
    website: publicWebUrl(intake.website || "") ? intake.website : "",
    asOf: job?.created_at || null,
    summary:
      draft?.summary ||
      "No public research summary is available yet. Please describe the business in your response.",
    industry:
      draft?.industry ||
      c.settings.businessProfile?.industry ||
      "Not established",
    facts: (draft?.brief?.facts || []).map((f: any) => ({
      category: f.category,
      label: f.label,
      value: f.value,
      basis: f.basis,
      asOf: f.asOf,
      citations: (f.citations || []).map((citation: any) => {
        const source = job.input.sources?.find(
          (s: any) => s.id === citation.sourceId,
        );
        return {
          title: source?.title || "Provided description",
          url: source && publicWebUrl(source.url) ? source.url : "",
          quote: citation.quote,
        };
      }),
    })),
    streams: (c.settings.businessProfile?.streams || []).map(
      (s: any, i: number) => ({
        id: s.id,
        name: s.name,
        focus: i === 0 ? "primary" : "supporting",
        stages: s.stages,
      }),
    ),
  };
}
