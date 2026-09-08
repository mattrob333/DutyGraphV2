import { useEffect, useRef, useState } from "react";
import { FrameworkWorkspace } from "./FrameworkWorkspace.tsx";
import {
  frameworkOrder,
  frameworkSpecs,
} from "../../shared/framework-specs.ts";
import { api } from "./api.ts";
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
import { State, Button, ErrorBox } from "./ui.tsx";
import type { FrameworkReadinessList } from "../../shared/strategy-readiness.ts";
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
  companyId,
  onReadiness,
  refreshVersion = 0,
}: {
  companyId?: string;
  onReadiness?: (value: FrameworkReadinessList | null) => void;
  refreshVersion?: number;
  registry: any;
  records: RecordRow[];
  open: (r: RecordRow) => void;
  write: (key: string) => void;
  report?: (group: string) => void;
  reportStatus?: (group: string) => string;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [selectedVersion, setSelectedVersion] = useState<string | undefined>(),
    [runs, setRuns] = useState<any>(null),
    [error, setError] = useState(""),
    [sequence, setSequence] = useState(""),
    [message, setMessage] = useState("");
  const stop = useRef(false),
    alive = useRef(true),
    activeCompany = useRef(companyId),
    generation = useRef(0);
  activeCompany.current = companyId;
  const path = `/v1/companies/${companyId}/framework-runs`;
  const load = () =>
    companyId
      ? api(path).then((d) => {
          if (alive.current && activeCompany.current === companyId) setRuns(d);
          return d;
        })
      : Promise.resolve(null);
  useEffect(() => {
    alive.current = true;
    stop.current = false;
    generation.current++;
    setSequence("");
    setRuns(null);
    setSelected(null);
    setSelectedVersion(undefined);
    return () => {
      alive.current = false;
      stop.current = true;
      generation.current++;
    };
  }, [companyId]);
  useEffect(() => {
    load().catch((e) => {
      if (alive.current && activeCompany.current === companyId)
        setError(e.message);
    });
  }, [companyId, records, refreshVersion]);
  useEffect(() => {
    onReadiness?.(runs);
  }, [runs, onReadiness]);
  const status = (key: string) =>
    runs?.frameworks.find((f: any) => f.key === key);
  async function runSequence() {
    if (sequence || !companyId) return;
    stop.current = false;
    setError("");
    setMessage("");
    setSequence("Checking the analysis sequence…");
    let completed = 0;
    const runGeneration = generation.current;
    const stillHere = () =>
      alive.current &&
      activeCompany.current === companyId &&
      generation.current === runGeneration;
    try {
      for (const key of frameworkOrder) {
        if (stop.current || !stillHere()) break;
        const current = await load(),
          state = current?.frameworks.find((f: any) => f.key === key);
        if (stop.current || !stillHere()) break;
        if (!state?.ready || state.current) continue;
        setSequence(`Running ${frameworkSpecs[key].name} · ${completed} saved`);
        const result = await api(`${path}/${key}`, "POST", { consent: true });
        const history = await api(`${path}/${key}`),
          job = history.jobs.find((j: any) => j.id === result.id);
        if (job?.state !== "complete")
          throw new Error(
            job?.message ||
              "The sequence stopped because this analysis did not complete.",
          );
        completed++;
      }
      await load();
      if (stillHere())
        setMessage(
          completed
            ? `${completed} analyses saved${stop.current ? ". The sequence was stopped." : ". Open a canvas to review its findings."}`
            : "No further analyses are ready. Check missing evidence and upstream analyses.",
        );
    } catch (e: any) {
      if (stillHere()) setError(e.message);
    } finally {
      if (stillHere()) {
        setSequence("");
        load().catch(() => {});
      }
    }
  }
  return (
    <div className="framework-library">
      {companyId && (
        <section className="framework-sequence">
          <div>
            <h3>From business context to the next decision</h3>
            <p>
              Start with the Business Model Canvas. Each analysis waits for all
              its required upstream analyses. A changed source marks affected
              versions for an update. Run the sequence to prepare up to 16
              analyses using your OpenAI account.
            </p>
          </div>
          <div className="actions">
            {sequence ? (
              <Button
                onClick={() => {
                  stop.current = true;
                }}
              >
                Stop after this analysis
              </Button>
            ) : (
              <Button
                disabled={
                  !runs?.configured ||
                  !runs?.frameworks.some((f: any) => f.ready && !f.current)
                }
                onClick={runSequence}
              >
                Run remaining sequence
              </Button>
            )}
          </div>
        </section>
      )}
      {sequence && (
        <p role="status" className="framework-sequence-status">
          {sequence}
        </p>
      )}
      <ErrorBox error={error} />
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {selected && companyId && (
        <FrameworkWorkspace
          key={`${companyId}:${selected}:${selectedVersion || "latest"}`}
          companyId={companyId}
          frameworkKey={selected}
          initialJobId={selectedVersion}
          records={records}
          close={() => {
            setSelected(null);
            setSelectedVersion(undefined);
          }}
          openRecord={open}
          write={write}
          navigate={(key, jobId) => {
            setSelected(key);
            setSelectedVersion(jobId);
          }}
          saved={() => load().catch((e) => setError(e.message))}
        />
      )}

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
                    onClick={() =>
                      companyId
                        ? setSelected(f.key)
                        : r
                          ? open(r)
                          : write(f.key)
                    }
                  >
                    <div className="toolbar">
                      <span className="framework-label">{group.label}</span>
                      <State
                        value={
                          status(f.key)?.current
                            ? "complete"
                            : status(f.key)?.stale
                              ? "stale"
                              : status(f.key)?.missingUpstream.length
                                ? "waiting_for_context"
                                : status(f.key)?.ready
                                  ? "ready_to_analyze"
                                  : r?.state || "needs_input"
                        }
                      />
                    </div>
                    <h3>{f.name}</h3>
                    <p>{g.question}</p>
                    <span className="framework-cadence">
                      <Clock size={12} />
                      {g.cadence}
                    </span>
                    {!!status(f.key)?.missingUpstream.length && (
                      <span className="framework-upstream-hint">
                        Needs{" "}
                        {status(f.key)
                          .missingUpstream.map(
                            (k: string) => frameworkSpecs[k].name,
                          )
                          .join(", ")}
                      </span>
                    )}
                    <footer>
                      <span>
                        {companyId
                          ? status(f.key)?.current
                            ? "Open populated canvas"
                            : "Open framework canvas"
                          : r
                            ? "Open analysis"
                            : "Read guide & start"}
                      </span>
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
