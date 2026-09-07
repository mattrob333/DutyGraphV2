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
      <header>
        <div className="eyebrow">
          COMPANY PROFILE · {new Date(job.created_at).toLocaleDateString()}
        </div>
        <div className="brief-identity">
          <span className="brief-monogram" aria-hidden="true">
            {job.input.name
              .split(/\s+/)
              .slice(0, 2)
              .map((s: string) => s[0])
              .join("")}
          </span>
          <div>
            <h2>{job.input.name}</h2>
            <p>{review?.industry || job.result.draft.industry}</p>
          </div>
        </div>
        <p className="brief-summary">
          {review?.summary || job.result.draft.summary}
        </p>
        <div className="brief-links">
          {job.input.website && (
            <a href={job.input.website} target="_blank" rel="noreferrer">
              Visit company website ↗
            </a>
          )}
          {socials.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              title={`Linked from ${link.sourceUrl}`}
            >
              {link.label} ↗
            </a>
          ))}
        </div>
        <div className="brief-highlights">
          {["scale", "footprint"].map((category) => {
            const fact = brief.facts.find((f) => f.category === category);
            return (
              <div key={category}>
                <small>
                  {category === "scale" ? "Team size" : "Market & location"}
                </small>
                <strong>{fact?.value || "Not established"}</strong>
                <small>
                  {fact?.basis}
                  {fact?.asOf ? ` · ${fact.asOf}` : ""}
                </small>
              </div>
            );
          })}
        </div>
        {changed && (
          <p className="notice">
            Saved research for {job.input.name}. The input above has changed;
            run research again to update this profile. It has not been silently
            rewritten.
          </p>
        )}
        <p className="subtle">
          {job.result.draft.industry} · {supported} cited findings ·{" "}
          {brief.facts.length - supported} open gaps
        </p>
        <small>
          AI research draft. “Reported” means a source states it; it is not
          independent verification. Confirm estimates and open questions at
          kickoff.
        </small>
      </header>
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
      <div className="brief-grid">
        {Object.entries(briefCategories).map(([category, title]) => (
          <article key={category}>
            <h3>{title}</h3>
            {brief.facts
              .filter((f) => f.category === category)
              .map((fact, i) => (
                <div className="brief-fact" key={i}>
                  <div className="brief-fact-heading">
                    <strong>{fact.label}</strong>
                    <span
                      className={`brief-basis ${fact.basis === "Not established" ? "missing" : ""}`}
                    >
                      {fact.basis}
                    </span>
                  </div>
                  <p>{fact.value}</p>
                  {fact.asOf && <small>As of {fact.asOf}</small>}
                  {!!fact.citations.length && (
                    <details>
                      <summary>
                        Evidence · {fact.citations.length}{" "}
                        {fact.citations.length === 1 ? "source" : "sources"}
                      </summary>
                      {fact.citations.map((c, j) => {
                        const source = sources.find((s) => s.id === c.sourceId);
                        return (
                          <div className="brief-evidence" key={j}>
                            {source ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.title} ↗
                              </a>
                            ) : (
                              <strong>Advisor-provided description</strong>
                            )}
                            <blockquote>{c.quote}</blockquote>
                            {source?.retrievedAt && (
                              <small>
                                Retrieved{" "}
                                {new Date(
                                  source.retrievedAt,
                                ).toLocaleDateString()}
                              </small>
                            )}
                          </div>
                        );
                      })}
                    </details>
                  )}
                </div>
              ))}
          </article>
        ))}
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
