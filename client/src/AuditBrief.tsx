import { useEffect, useState } from "react";
import { ArrowRight, FileText, RefreshCw } from "lucide-react";
import type { AuditBrief as Brief } from "../../shared/audit-brief.ts";
import type { Company, RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Button, ErrorBox } from "./ui.tsx";
import "./audit-brief.css";

function useBrief(company: Company) {
  const [result, setResult] = useState<{
    companyId: string;
    data: Brief;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    let sequence = 0;
    setLoading(true);
    setError("");
    const read = async () => {
      const request = ++sequence;
      try {
        const data = await api<Brief>(
          `/v1/companies/${company.id}/audit-brief`,
        );
        if (alive && request === sequence) {
          setResult({ companyId: company.id, data });
          setError("");
        }
      } catch (e) {
        if (alive && request === sequence) setError((e as Error).message);
      } finally {
        if (alive && request === sequence) setLoading(false);
      }
    };
    void read();
    const focus = () => {
      if (document.visibilityState === "visible") void read();
    };
    window.addEventListener("focus", focus);
    return () => {
      alive = false;
      window.removeEventListener("focus", focus);
    };
  }, [company.id, company.revision, retry]);
  return {
    brief: result?.companyId === company.id ? result.data : null,
    error,
    loading,
    retry: () => setRetry((r) => r + 1),
  };
}

export function AuditBrief({
  company,
  records,
  open,
  navigate,
  prepare,
}: {
  company: Company;
  records: RecordRow[];
  open: (r: RecordRow) => void;
  navigate: (page: string) => void;
  prepare: (brief: Brief) => void;
}) {
  const { brief, error, loading, retry } = useBrief(company);
  const [allPriorities, setAllPriorities] = useState(false);
  const record = (ids: string[]) => records.find((r) => ids.includes(r.id));
  const inspect = (ids: string[], fallback = "graph") => {
    const found = record(ids);
    if (found) open(found);
    else navigate(fallback);
  };
  return (
    <section className="audit-brief" aria-label="Living client brief">
      <header className="brief-heading">
        <div>
          <div className="eyebrow">THE AUDIT, IN FOCUS</div>
          <h1>Client brief</h1>
          <p>The work you understand. The decisions ahead.</p>
        </div>
        <Button
          primary
          disabled={!brief || loading || !!error}
          onClick={() => brief && prepare(brief)}
        >
          <FileText size={15} /> Prepare client report
        </Button>
      </header>
      {error && (
        <div className="brief-error">
          <ErrorBox error={error} />
          <Button onClick={retry}>
            <RefreshCw size={14} /> Reload brief
          </Button>
        </div>
      )}
      {!brief ? (
        <p role="status" className="subtle">
          {loading
            ? "Assembling the current work and evidence…"
            : "The current brief could not be loaded."}
        </p>
      ) : (
        <>
          <section className="brief-cover">
            <div className="brief-cover-title">
              <div>
                <span className="brief-kicker">
                  {company.sandbox
                    ? "ILLUSTRATIVE COMPANY"
                    : "CURRENT ENGAGEMENT"}
                </span>
                <h2>{brief.scope.companyName}</h2>
                <p>{brief.scope.goal || brief.scope.scope}</p>
              </div>
              <span className="brief-live">
                Live · revision {brief.sourceRevision}
              </span>
            </div>
            <div className="brief-stat-row" aria-label="Audit coverage">
              <div>
                <strong>
                  {brief.coverage.respondedPeople}
                  <span> / {brief.coverage.people}</span>
                </strong>
                <span>people have responded</span>
              </div>
              <div>
                <strong>
                  {brief.coverage.duties}
                  <span> duties</span>
                </strong>
                <span>{brief.coverage.tasks} tasks documented</span>
              </div>
              <div>
                <strong>
                  {brief.coverage.confirmedTasks}
                  <span> / {brief.coverage.tasks}</span>
                </strong>
                <span>tasks confirmed by people</span>
              </div>
              <div>
                <strong>
                  {brief.coverage.stagesWithWork}
                  <span> / {brief.coverage.stages}</span>
                </strong>
                <span>stages with linked work</span>
              </div>
            </div>
            <div className="brief-scope">
              <span>In scope</span>
              <p>{brief.scope.scope || "Scope needs to be recorded."}</p>
            </div>
          </section>
          <section className="brief-coverage">
            <div className="brief-section-heading">
              <div>
                <span className="brief-kicker">01 / UNDERSTAND THE WORK</span>
                <h2>Coverage across the business</h2>
              </div>
              <button
                className="brief-text-link"
                onClick={() => navigate("graph")}
              >
                Explore work map <ArrowRight size={15} />
              </button>
            </div>
            {brief.stages.length ? (
              <div className="brief-stage-grid">
                {brief.stages.map((stage) => (
                  <div
                    key={`${stage.streamId}:${stage.stageId}`}
                    className="brief-stage-summary"
                  >
                    <span className="brief-kicker">
                      {company.settings.businessProfile?.streams.find(
                        (s) => s.id === stage.streamId,
                      )?.name || "Business stream"}
                    </span>
                    <h3>{stage.label}</h3>
                    <p>
                      {stage.duties} duties · {stage.tasks} tasks
                    </p>
                    <span
                      className={
                        stage.gapCount
                          ? "brief-stage-note has-gap"
                          : "brief-stage-note"
                      }
                    >
                      {stage.gapCount
                        ? `${stage.gapCount} documentation ${stage.gapCount === 1 ? "gap" : "gaps"}`
                        : stage.tasks
                          ? "Work linked"
                          : "No work linked yet"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="brief-empty">
                Define the business stages in Discovery to see where the audit
                has coverage.
              </p>
            )}
            <p className="brief-footnote">
              Linked work shows coverage, not proof of a complete process or
              measured performance.
            </p>
          </section>
          <div className="brief-two-column">
            <section className="brief-priorities">
              <div className="brief-section-heading">
                <div>
                  <span className="brief-kicker">02 / DECIDE WHAT MATTERS</span>
                  <h2>Where to focus next</h2>
                </div>
                <span className="brief-count">
                  {brief.priorities.length + brief.omitted.priorities}
                </span>
              </div>
              {brief.priorities
                .slice(0, allPriorities ? undefined : 4)
                .map((item, index) => (
                  <article className="brief-priority" key={item.id}>
                    <span className="brief-item-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <span className="brief-kicker">
                        {item.source === "reviewed_analysis"
                          ? "ADVISOR-REVIEWED HYPOTHESIS"
                          : item.source === "record_finding"
                            ? "RECORDED HYPOTHESIS"
                            : item.kind === "conflict"
                              ? "CONFLICT TO RESOLVE"
                              : "DOCUMENTATION GAP"}
                      </span>
                      <h3>{item.title}</h3>
                      <p>{item.detail}</p>
                      <button
                        className="brief-next-action"
                        onClick={() => inspect(item.recordIds)}
                      >
                        {item.nextAction} <ArrowRight size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              {!brief.priorities.length && (
                <p className="brief-empty">
                  No current priorities are recorded. Review the evidence
                  coverage before drawing a conclusion.
                </p>
              )}
              {brief.priorities.length > 4 && (
                <button
                  className="brief-text-link"
                  onClick={() => setAllPriorities(!allPriorities)}
                >
                  {allPriorities
                    ? "Show fewer"
                    : `Show all ${brief.priorities.length} priorities`}
                </button>
              )}
              {!!brief.omitted.priorities && (
                <p className="brief-footnote">
                  {brief.omitted.priorities} more priorities outside this brief.
                  Explore the work map for detail.
                </p>
              )}
            </section>
            <section className="brief-next-review">
              <div className="brief-section-heading">
                <div>
                  <span className="brief-kicker">03 / KEEP IT MOVING</span>
                  <h2>The next review</h2>
                </div>
              </div>
              <p className="brief-review-intro">
                {company.settings.reviewCadence || "Agree a review cadence"}.
                Check what changed, record a decision, and name the next owner.
              </p>
              {brief.commitments.slice(0, 4).map((item) => (
                <button
                  className="brief-commitment"
                  key={item.id}
                  onClick={() => inspect([item.id], "weekly")}
                >
                  <span
                    className={item.overdue ? "brief-due overdue" : "brief-due"}
                  >
                    {item.overdue ? "Review overdue" : "Review due"} ·{" "}
                    {item.dueDate || "Date not set"}
                  </span>
                  <strong>{item.title}</strong>
                  <span>{item.action}</span>
                  <small>
                    {item.owner} <ArrowRight size={14} />
                  </small>
                </button>
              ))}
              {!brief.commitments.length && (
                <div className="brief-empty">
                  <strong>Turn a finding into a commitment.</strong>
                  <p>
                    Use the weekly review to record the decision, owner, due
                    date and the result you will check.
                  </p>
                </div>
              )}
              <button
                className="brief-text-link"
                onClick={() => navigate("weekly")}
              >
                Open weekly review <ArrowRight size={15} />
              </button>
              {brief.commitments.length + brief.omitted.commitments > 4 && (
                <p className="brief-footnote">
                  Showing 4 of{" "}
                  {brief.commitments.length + brief.omitted.commitments}{" "}
                  commitments.
                </p>
              )}
            </section>
          </div>
          <section className="brief-measures">
            <div className="brief-section-heading">
              <div>
                <span className="brief-kicker">04 / CHECK THE RESULT</span>
                <h2>Evidence of progress</h2>
              </div>
            </div>
            {brief.metrics.length ? (
              <div className="brief-metric-grid">
                {brief.metrics.slice(0, 4).map((metric) => (
                  <button
                    className="brief-metric"
                    key={metric.id}
                    onClick={() => inspect([metric.id], "strategy")}
                  >
                    <h3>{metric.title}</h3>
                    <strong>
                      {metric.latestObservation
                        ? metric.latestObservation.value.toLocaleString()
                        : "Awaiting data"}
                      <small>
                        {metric.latestObservation
                          ? `Latest recorded · ${metric.unit} · ${metric.latestObservation.observedAt.slice(0, 10)}`
                          : "No observations recorded"}
                      </small>
                    </strong>
                    <p>
                      {metric.baseline === null
                        ? "Baseline needed"
                        : `Baseline: ${metric.baseline.toLocaleString()} ${metric.unit}`}
                      <br />
                      {metric.target === null
                        ? "Target not set"
                        : `Target: ${metric.target.toLocaleString()} ${metric.unit}`}
                    </p>
                    <small className="brief-metric-owner">{metric.owner}</small>
                    <span>
                      {metric.observationCount} observations recorded{" "}
                      <ArrowRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="brief-empty">
                <strong>No measures defined yet.</strong>
                <p>
                  Agree what improvement means, who measures it, and the
                  starting baseline. Savings and impact remain unknown until
                  observed.
                </p>
              </div>
            )}
            {brief.metrics.length + brief.omitted.metrics > 4 && (
              <p className="brief-footnote">
                Showing 4 of {brief.metrics.length + brief.omitted.metrics}{" "}
                measures. The full set remains in Strategy.
              </p>
            )}
          </section>
          <section className="brief-strategy-bridge">
            <div>
              <span className="brief-kicker">FROM AUDIT TO ACTION</span>
              <h2>Make this the starting point for strategy.</h2>
              <p>
                Your work record and accepted evidence carry forward. Review the
                remaining inputs, choose a framework, then test a change and
                return here to measure it.
              </p>
            </div>
            <Button onClick={() => navigate("strategy")}>
              Review strategy inputs <ArrowRight size={15} />
            </Button>
          </section>
          <details className="brief-evidence-notes">
            <summary>Scope, missing inputs & evidence notes</summary>
            <div className="brief-notes-grid">
              {brief.missingInputs.map((input) => (
                <div key={input.id}>
                  <h3>{input.title}</h3>
                  <p>{input.detail}</p>
                  {record(input.recordIds) && (
                    <button
                      className="brief-text-link"
                      onClick={() => inspect(input.recordIds)}
                    >
                      Inspect record <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <ul>
              {brief.limitations.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
            <p>
              {brief.analysis.currentReviewed} current findings selected for
              discussion. {brief.analysis.staleExcluded} outdated,{" "}
              {brief.analysis.dismissedExcluded} dismissed and{" "}
              {brief.analysis.unreviewedExcluded} unreviewed findings excluded.
            </p>
          </details>
        </>
      )}
    </section>
  );
}

export function AuditReviewAgenda({
  company,
  records,
  open,
  onBrief,
}: {
  company: Company;
  records: RecordRow[];
  open: (r: RecordRow) => void;
  onBrief: () => void;
}) {
  const { brief, error } = useBrief(company);
  if (error) return <ErrorBox error={error} />;
  if (!brief)
    return (
      <p className="subtle" role="status">
        Preparing the review agenda…
      </p>
    );
  const actions = brief.commitments.slice(0, 4);
  return (
    <section className="audit-review-agenda">
      <div className="brief-section-heading">
        <div>
          <span className="brief-kicker">CONTINUE FROM THE AUDIT</span>
          <h2>Keep the commitments in view</h2>
        </div>
        <button className="brief-text-link" onClick={onBrief}>
          Open live client brief <ArrowRight size={15} />
        </button>
      </div>
      <div className="review-agenda-counts">
        <span>
          <b>{brief.commitments.filter((c) => c.overdue).length}</b> reviews
          overdue
        </span>
        <span>
          <b>{brief.metrics.filter((m) => m.baseline === null).length}</b>{" "}
          baselines to collect
        </span>
        <span>
          <b>{brief.coverage.openRequests}</b> open requests
        </span>
      </div>
      {actions.map((item) => (
        <button
          className="review-agenda-row"
          key={item.id}
          onClick={() => {
            const found = records.find((r) => r.id === item.id);
            if (found) open(found);
          }}
        >
          <span>
            <strong>{item.title}</strong>
            <small>
              {item.owner} · {item.dueDate}
            </small>
          </span>
          <span>{item.action}</span>
          <ArrowRight size={16} />
        </button>
      ))}
      {!actions.length && (
        <p className="brief-empty">
          Start with one audit finding. Record a decision, an owner and a date
          to review the result.
        </p>
      )}
    </section>
  );
}
