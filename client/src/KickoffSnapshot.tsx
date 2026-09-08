import { briefCategories } from "../../shared/business-brief.ts";
export function KickoffSnapshot({ context: c }: { context: any }) {
  const facts = c?.facts || [],
    reported = facts.filter(
      (f: any) => f.basis === "Reported" && f.citations?.length,
    ),
    uncertain = facts.filter(
      (f: any) => f.basis !== "Reported" || !f.citations?.length,
    );
  const groups = Object.entries(briefCategories)
    .map(([key, label]) => ({
      key,
      label,
      facts: reported.filter((f: any) => f.category === key),
    }))
    .filter((g) => g.facts.length);
  const description =
    c?.summary || "Tell us what your company does in your response below.";
  const shortDescription =
    description.length > 320
      ? description.slice(0, Math.max(1, description.lastIndexOf(" ", 320))) +
        "…"
      : description;
  return (
    <section className="company-snapshot" aria-label="Company snapshot">
      <header className="snapshot-identity">
        <div className="snapshot-monogram" aria-hidden="true">
          {(c?.name || "C")
            .split(/\s+/)
            .slice(0, 2)
            .map((s: string) => s[0])
            .join("")}
        </div>
        <div>
          <div className="kickoff-eyebrow">COMPANY SNAPSHOT</div>
          <h1>{c?.name || "Your company"}</h1>
          {c?.industry && <p className="snapshot-label">{c.industry}</p>}
          {c?.website && (
            <a href={c.website} target="_blank" rel="noreferrer">
              {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
            </a>
          )}
        </div>
        <span className="snapshot-date">
          {c?.asOf
            ? `Researched ${new Date(c.asOf).toLocaleDateString()}`
            : "Awaiting public research"}
        </span>
      </header>
      <div className="snapshot-description">
        <span className="snapshot-label">Research summary · please verify</span>
        <p>{shortDescription}</p>
        {description.length > 320 && (
          <details>
            <summary>Full research summary</summary>
            <p>{description}</p>
          </details>
        )}
      </div>
      {!!c?.streams?.length && (
        <div className="snapshot-flows">
          <div className="snapshot-fact-heading">
            <h2>How this business delivers value</h2>
            <span>Proposed stages · confirm with the team</span>
          </div>
          {c.streams.map((s: any, i: number) => (
            <details className="snapshot-flow" key={s.id || i} open={i === 0}>
              <summary>
                <strong>{s.name}</strong>
                <span>{i === 0 ? "Primary stream" : "Supporting stream"}</span>
              </summary>
              <ol>
                {s.stages?.map((stage: any, j: number) => (
                  <li key={j}>
                    <span>{j + 1}</span>
                    {stage.name || stage.label || stage.title}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}
      <div className="snapshot-fact-heading">
        <h2>What public sources report</h2>
        <span>
          {reported.length} sourced findings · open a source to inspect it
        </span>
      </div>
      {groups.length ? (
        <div className="snapshot-fact-grid">
          {groups.map((g) => (
            <section key={g.key} className="snapshot-fact-group">
              <h3>{g.label}</h3>
              <dl>
                {g.facts.map((f: any, i: number) => (
                  <div className="snapshot-fact" key={i}>
                    <dt>{f.label}</dt>
                    <dd>
                      {f.value}

                      <details>
                        <summary>
                          {f.citations.length === 1 ? "Source" : "Sources"}
                        </summary>
                        {f.asOf && <small>As of {f.asOf}</small>}
                        {f.citations.map((source: any, j: number) => (
                          <div className="snapshot-citation" key={j}>
                            {source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.title}
                              </a>
                            ) : (
                              <span>{source.title}</span>
                            )}
                            <blockquote>{source.quote}</blockquote>
                          </div>
                        ))}
                      </details>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <p className="snapshot-empty">
          We do not yet have source-backed findings to show here. Your
          description and corrections will help us prepare.
        </p>
      )}
      {uncertain.length > 0 && (
        <details className="snapshot-uncertain">
          <summary>
            {uncertain.length} assumptions or gaps to check{" "}
            <span>Optional detail</span>
          </summary>
          <ul>
            {uncertain.map((f: any, i: number) => (
              <li key={i}>
                <strong>{f.label}</strong>
                <span className="snapshot-label">{f.basis}</span>
                <p>{f.value}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

    </section>
  );
}
