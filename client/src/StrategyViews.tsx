import {
  ArrowRight,
  BookOpen,
  Clock,
  Search,
  FlaskConical,
} from "lucide-react";
import {
  frameworkGroups,
  frameworkGuides,
  analysisRules,
} from "../../shared/framework-guides.ts";
import type { RecordRow } from "../../shared/domain.ts";
import { State } from "./ui.tsx";
export function FrameworkInstructions({
  frameworkKey,
}: {
  frameworkKey: string;
}) {
  const g = frameworkGuides[frameworkKey];
  if (!g) return null;
  return (
    <details className={`framework-guide strategy-${g.group}`} open>
      <summary>
        <BookOpen size={16} /> How to use this framework
      </summary>
      <p>
        <strong>{g.question}</strong>
      </p>
      <ol>
        {g.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p>
        <strong>Produce:</strong> {g.output}
      </p>
      <p>
        <strong>Suggested review:</strong> {g.cadence}. This is guidance, not an
        active schedule.
      </p>
      <details>
        <summary>Evidence and review rules</summary>
        <ul>
          {analysisRules.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
    </details>
  );
}
export function FrameworkLibrary({
  registry,
  records,
  open,
  write,
  report,
  reportStatus,
}: {
  registry: any;
  records: RecordRow[];
  open: (r: RecordRow) => void;
  write: (key: string) => void;
  report?: (group: string) => void;
  reportStatus?: (group: string) => string;
}) {
  return (
    <div className="framework-library">
      {frameworkGroups.map((group) => (
        <section
          key={group.id}
          className={`framework-section strategy-${group.id}`}
        >
          <header>
            <span className="strategy-dot" />
            <div>
              <h2>{group.label}</h2>
              <p>{group.hint}</p>
            </div>
            {report && (
              <button
                className={`btn framework-report-button ${reportStatus?.(group.id) === "Inputs changed" ? "has-update" : ""}`}
                onClick={() => report(group.id)}
              >
                <BookOpen size={15} />
                {reportStatus?.(group.id) || "Read report"}
                <ArrowRight size={14} />
              </button>
            )}
          </header>
          <div className="framework-grid">
            {registry.frameworks
              .filter((f: any) => frameworkGuides[f.key]?.group === group.id)
              .map((f: any) => {
                const g = frameworkGuides[f.key],
                  r = records.find(
                    (r) => r.kind === "framework" && r.data.key === f.key,
                  );
                return (
                  <button
                    className="framework-card"
                    key={f.key}
                    onClick={() => (r ? open(r) : write(f.key))}
                  >
                    <div className="toolbar">
                      <span className="framework-label">{group.label}</span>
                      <State value={r?.state || "needs_input"} />
                    </div>
                    <h3>{f.name}</h3>
                    <p>{g.question}</p>
                    <span className="framework-cadence">
                      <Clock size={12} />
                      {g.cadence}
                    </span>
                    <footer>
                      <span>{r ? "Open analysis" : "Read guide & start"}</span>
                      <ArrowRight size={14} />
                    </footer>
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
export function ConstraintLedger({
  records,
  open,
}: {
  records: RecordRow[];
  open: (r: RecordRow) => void;
}) {
  const candidates = records.filter((r) => r.kind === "candidate");
  return (
    <section className="constraint-ledger">
      <div className="strategy-intro">
        <Search size={22} />
        <div>
          <h2>What might be holding the business back?</h2>
          <p>
            The ledger tracks possible limits, the evidence, and the test needed
            to decide. A suspected issue is not a confirmed constraint.
          </p>
        </div>
      </div>
      {candidates.map((r, i) => (
        <article className="constraint-card" key={r.id}>
          <header>
            <span className="constraint-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <State value={r.state} />
              <h3>{r.title}</h3>
            </div>
          </header>
          <div className="constraint-grid">
            <section>
              <small>WHY WE SUSPECT IT</small>
              <p>{r.data.pressure}</p>
            </section>
            <section>
              <small>WHAT ELSE COULD EXPLAIN IT?</small>
              <p>{r.data.alternative}</p>
            </section>
            <section>
              <small>WHAT WOULD CHANGE IF FIXED?</small>
              <p>{r.data.counterfactual}</p>
            </section>
            <section>
              <small>HOW TO TEST IT</small>
              <p>{r.data.discriminator}</p>
            </section>
          </div>
          <footer>
            <span>
              {r.data.evidenceIds?.length || 0} supporting sources ·{" "}
              {r.data.disconfirmingEvidenceIds?.length || 0} contrary sources
            </span>
            <button className="btn" onClick={() => open(r)}>
              <FlaskConical size={14} />
              Review evidence & test
            </button>
          </footer>
        </article>
      ))}
      {!candidates.length && (
        <p>
          No suspected constraints recorded. Review the evidence, then add a
          possible limit and an alternative explanation.
        </p>
      )}
    </section>
  );
}
