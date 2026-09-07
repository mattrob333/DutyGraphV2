import {
  briefCategories,
  type BusinessBrief as Brief,
  type BriefSource,
} from "../../shared/business-brief.ts";
import { Button } from "./ui.tsx";
import "./business-brief.css";

export function BusinessBrief({
  job,
  prepare,
  busy,
}: {
  job: any;
  prepare: () => void;
  busy: boolean;
}) {
  const brief: Brief | undefined = job?.result?.draft?.brief;
  if (!brief) return null;
  const sources: BriefSource[] = job.input.sources;
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
          PRE-KICKOFF BRIEF · {new Date(job.created_at).toLocaleDateString()}
        </div>
        <h2>{job.input.name} at a glance</h2>
        <p className="brief-summary">{job.result.draft.summary}</p>
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
