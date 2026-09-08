import { StageHelp } from "./StageHelp.tsx";
import {
  snapshotFactText,
  snapshotCompanyLink,
} from "../../shared/snapshot-display.ts";
import { briefCategories } from "../../shared/business-brief.ts";
export function KickoffSnapshot({
  context: c,
  illustrative = false,
}: {
  context: any;
  illustrative?: boolean;
}) {
  const facts = c?.facts || [],
    reported = facts.filter(
      (f: any) =>
        illustrative || (f.basis === "Reported" && f.citations?.length),
    );
  const groups = Object.entries(briefCategories)
    .map(([key, label]) => ({
      key,
      label,
      facts: (key === "competitors"
        ? facts.filter(
            (f: any) => f.basis !== "Not established" && f.citations?.length,
          )
        : reported
      ).filter((f: any) => f.category === key),
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
          <div className="kickoff-eyebrow">
            {illustrative ? "FICTIONAL COMPANY SNAPSHOT" : "COMPANY SNAPSHOT"}
          </div>
          <h1>{c?.name || "Your company"}</h1>
          {c?.industry && <p className="snapshot-label">{c.industry}</p>}
          {c?.website && (
            <a href={c.website} target="_blank" rel="noreferrer">
              {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
            </a>
          )}
        </div>
        <span className="snapshot-date">
          {illustrative
            ? "Training example"
            : c?.asOf
              ? `Researched ${new Date(c.asOf).toLocaleDateString()}`
              : "Awaiting public research"}
        </span>
      </header>
      <div className="snapshot-description">
        <span className="snapshot-label">
          {illustrative
            ? "About this example"
            : "Research summary · please verify"}
        </span>
        <p>{shortDescription}</p>
        {description.length > 320 && (
          <details>
            <summary>
              {illustrative ? "Full description" : "Full research summary"}
            </summary>
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
            <details
              className="snapshot-flow"
              data-primary={i === 0}
              key={s.id || i}
              open={i === 0}
            >
              <summary>
                <strong>{s.name}</strong>
                <span>{i === 0 ? "Primary stream" : "Supporting stream"}</span>
              </summary>
              <ol>
                {s.stages?.map((stage: any, j: number) => (
                  <li key={j}>
                    <span>{j + 1}</span>
                    {stage.name || stage.label || stage.title}
                    <StageHelp stage={stage} stream={s} />
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}
      <div className="snapshot-fact-heading">
        <h2>Company facts</h2>
        <span>
          {illustrative
            ? "Authored sample data"
            : "Public research · please confirm"}
        </span>
      </div>
      {groups.length ? (
        <div className="snapshot-fact-grid">
          {groups.map((g) => (
            <section key={g.key} className="snapshot-fact-group">
              <h3>
                {g.key === "competitors" ? "Potential competitors" : g.label}
              </h3>
              <ul>
                {g.facts.map((f: any, i: number) => {
                  const link =
                    g.key === "competitors"
                      ? snapshotCompanyLink(f)
                      : undefined;
                  return (
                    <li key={i}>
                      {link ? (
                        <a href={link} target="_blank" rel="noreferrer">
                          {f.label} ↗
                        </a>
                      ) : illustrative ? (
                        f.value
                      ) : (
                        snapshotFactText(f)
                      )}
                      {g.key === "scale" && !illustrative && (
                        <small>{f.asOf || "Reported"}</small>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="snapshot-empty">No public facts recorded yet.</p>
      )}
      <details className="snapshot-evidence">
        <summary>
          {illustrative
            ? "About the sample data"
            : "Research details & sources"}
        </summary>
        {illustrative && (
          <>
            <p>{c.provenance}</p>
            <ul>
              {c.unknowns?.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
        {facts.map((f: any, i: number) => (
          <article key={i}>
            <strong>{f.label}</strong>{" "}
            <span className="snapshot-label">
              {f.basis}
              {f.asOf ? ` · ${f.asOf}` : ""}
            </span>
            <p>{f.value}</p>
            {f.citations?.map((source: any, j: number) => (
              <div className="snapshot-citation" key={j}>
                {/^(https?):\/\//i.test(source.url || "") ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                ) : (
                  <span>{source.title}</span>
                )}
                <blockquote>{source.quote}</blockquote>
              </div>
            ))}
          </article>
        ))}
      </details>
    </section>
  );
}
import "./kickoff-link.css";
