import { KickoffSnapshot } from "./KickoffSnapshot.tsx";
import "./kickoff-link.css";
import {
  briefCategories,
  type BusinessBrief as Brief,
  type BriefSource,
} from "../../shared/business-brief.ts";
import { Button } from "./ui.tsx";
import { useState } from "react";
import { api } from "./api.ts";
import type { Company } from "../../shared/domain.ts";
import {
  companySocialLinks,
  companyProfileHtml,
} from "../../shared/company-profile.ts";
import "./business-brief.css";

export function BusinessBrief({
  job,
  prepare,
  busy,
  company,
  refresh,
  changed,
  reviewDisabled,
  reviewed,
}: {
  job: any;
  prepare: () => void;
  busy: boolean;
  company: Company;
  refresh: () => Promise<void>;
  changed: boolean;
  reviewDisabled: boolean;
  reviewed: (revision: number) => void;
}) {
  const [editing, setEditing] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const stored = company.settings.companyResearchReview;
  const review = stored?.jobId === job.id ? stored : undefined;
  const [fields, setFields] = useState({
    summary: "",
    industry: "",
    updates: "",
  });
  const brief: Brief | undefined = job?.result?.draft?.brief;
  if (!brief) return null;
  const sources: BriefSource[] = job.input.sources;
  const socials = companySocialLinks(job.input.website, sources);
  const supported = brief.facts.filter(
    (f) => f.basis !== "Not established",
  ).length;
  return (
    <section
      id="business-brief"
      className="business-brief"
      aria-label="Business briefing"
      tabIndex={-1}
    >
      <KickoffSnapshot context={{
        name: job.input.name, website: job.input.website, asOf: job.created_at,
        summary: review?.summary || job.result.draft.summary,
        industry: review?.industry || job.result.draft.industry,
        streams: company.settings.businessProfile?.streams || [],
        facts: brief.facts.map(f => ({ ...f, citations: f.citations.map(c => {
          const source = sources.find(s => s.id === c.sourceId);
          return { title: source?.title || "Provided description", url: source?.url || "", quote: c.quote };
        }) })),
      }} />
      <div className="brief-meeting">
        <div className="actions">
          <Button
            disabled={busy || reviewDisabled || changed}
            onClick={() => {
              setFields({
                summary: review?.summary || job.result.draft.summary,
                industry: review?.industry || job.result.draft.industry,
                updates: review?.updates || "",
              });
              setEditing(true);
              setError("");
            }}
          >
            Update after kickoff
          </Button>
          <Button
            onClick={() => {
              const blob = new Blob(
                [
                  companyProfileHtml(
                    job,
                    review,
                    company.settings.businessProfile?.streams || [],
                  ),
                ],
                { type: "text/html;charset=utf-8" },
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "company-profile.html";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Download company profile
          </Button>
        </div>
        {reviewDisabled && (
          <small>
            Confirm the business streams below before adding advisor updates.
          </small>
        )}
        {review && (
          <div>
            <h3>Advisor updates</h3>
            <small>
              Saved {new Date(review.reviewedAt).toLocaleString()} · Original
              research and citations retained below.
            </small>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {review.updates || "Summary and industry reviewed."}
            </p>
          </div>
        )}
        {editing && (
          <div className="brief-editor">
            {(["summary", "industry", "updates"] as const).map((key) => (
              <label key={key}>
                {key === "summary"
                  ? "Business overview"
                  : key === "industry"
                    ? "Industry"
                    : "Kickoff corrections & confirmed details"}
                <textarea
                  aria-label={
                    key === "summary"
                      ? "Business overview"
                      : key === "industry"
                        ? "Industry"
                        : "Kickoff corrections & confirmed details"
                  }
                  rows={key === "industry" ? 2 : 5}
                  maxLength={
                    key === "industry" ? 200 : key === "summary" ? 2000 : 8000
                  }
                  value={fields[key]}
                  onChange={(e) =>
                    setFields({ ...fields, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <small>
              Record the corrected fact, who confirmed it and when. These are
              advisor updates, separate from public-source findings.
            </small>
            {error && <p role="alert">{error}</p>}
            <div className="actions">
              <Button
                disabled={
                  saving || !fields.summary.trim() || !fields.industry.trim()
                }
                onClick={async () => {
                  setSaving(true);
                  setError("");
                  try {
                    const saved = await api(
                      `/v1/companies/${company.id}/business-classification/review`,
                      "PUT",
                      {
                        ...fields,
                        jobId: job.id,
                        expectedRevision: company.revision,
                      },
                    );
                    reviewed(saved.revision);
                    await refresh();
                    setEditing(false);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving…" : "Save profile updates"}
              </Button>
              <Button disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="brief-meeting">
        <h3>What to resolve in the first meeting</h3>
        <ol>
          {job.result.draft.questions.map((q: string) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <Button disabled={busy} onClick={prepare}>
          Review business streams →
        </Button>
        <small>
          Next, confirm the primary and supporting streams. The kickoff request
          uses all retained streams.
        </small>
      </div>
      <details className="brief-monitoring">
        <summary>
          Sources to follow · {brief.monitoring.length} suggested channels
        </summary>
        <p>
          Places to watch for future market signals. No subscriptions or
          background monitoring have been started.
        </p>
        {!brief.monitoring.length && (
          <p>No relevant channel homepages were established in this pass.</p>
        )}
        <div className="brief-grid">
          {brief.monitoring.map((channel, i) => {
            const source = sources.find((s) => s.id === channel.sourceId);
            return (
              <article key={i}>
                <small>{channel.kind}</small>
                <h3>
                  <a href={source?.url} target="_blank" rel="noreferrer">
                    {channel.name} ↗
                  </a>
                </h3>
                <p>{channel.relevance}</p>
                <p>
                  <strong>Watch for:</strong> {channel.signal}
                </p>
                {channel.feedUrl && (
                  <p>
                    <a href={channel.feedUrl} target="_blank" rel="noreferrer">
                      Published RSS / Atom address ↗
                    </a>
                    <small>
                      Address found in source text; connectivity not tested.
                    </small>
                  </p>
                )}
                <details>
                  <summary>Why this source</summary>
                  <blockquote>{channel.quote}</blockquote>
                </details>
              </article>
            );
          })}
        </div>
      </details>
    </section>
  );
}
