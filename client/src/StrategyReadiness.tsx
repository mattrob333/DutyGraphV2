import { useEffect, useState } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { AuditBrief } from "../../shared/audit-brief.ts";
import type { RecordRow } from "../../shared/domain.ts";
import {
  frameworkOrder,
  frameworkSpecs,
} from "../../shared/framework-specs.ts";
import {
  frameworkInputStatus,
  frameworkLabel,
  nextStrategyFramework,
  weeklyStrategyEvidence,
  type FrameworkReadinessList,
} from "../../shared/strategy-readiness.ts";
import { api } from "./api.ts";
import { Button, ErrorBox } from "./ui.tsx";
import "./strategy-readiness.css";

type InputDetail = {
  configured: boolean;
  sourceCount: number;
  omitted: number;
  missingUpstream: string[];
  variables: {
    key: string;
    label: string;
    lookFor: string;
    sourceCount: number;
  }[];
  sources: {
    id: string;
    version: number;
    hash: string;
    title: string;
    state: string;
    kind: string;
    excerpted: boolean;
  }[];
};

export function StrategyReadiness({
  company,
  records,
  runs,
  openFramework,
  openRecord,
  onWeeklyReview,
}: {
  company: string;
  records: RecordRow[];
  runs: FrameworkReadinessList | null;
  openFramework: (key: string) => void;
  openRecord: (record: RecordRow) => void;
  onWeeklyReview?: () => void;
}) {
  const [audit, setAudit] = useState<AuditBrief | null>(null),
    [auditLoading, setAuditLoading] = useState(true),
    [auditError, setAuditError] = useState(""),
    [selected, setSelected] = useState(""),
    [detail, setDetail] = useState<{ key: string; value: InputDetail } | null>(
      null,
    ),
    [inputError, setInputError] = useState(""),
    [retry, setRetry] = useState(0);
  const selectedKey = selected || nextStrategyFramework(runs?.frameworks || []);
  const state = runs?.frameworks.find((item) => item.key === selectedKey);
  const currentDetail = detail?.key === selectedKey ? detail.value : null;
  const weekly = weeklyStrategyEvidence(records);
  useEffect(() => {
    let active = true;
    let requestVersion = 0;
    const read = () => {
      const version = ++requestVersion;
      setAuditLoading(true);
      setAuditError("");
      api(`/v1/companies/${company}/audit-brief`)
        .then((value) => {
          if (active && version === requestVersion) setAudit(value);
        })
        .catch((error) => {
          if (active && version === requestVersion) {
            setAudit(null);
            setAuditError(error.message);
          }
        })
        .finally(() => {
          if (active && version === requestVersion) setAuditLoading(false);
        });
    };
    read();
    const focus = () => {
      if (document.visibilityState === "visible") read();
    };
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      window.removeEventListener("focus", focus);
    };
  }, [company, records, runs, retry]);
  useEffect(() => {
    let active = true;
    setDetail(null);
    setInputError("");
    api(`/v1/companies/${company}/framework-runs/${selectedKey}`)
      .then((value) => {
        if (active) setDetail({ key: selectedKey, value });
      })
      .catch((error) => {
        if (active) setInputError(error.message);
      });
    return () => {
      active = false;
    };
  }, [company, selectedKey, records, runs, retry]);
  const variables =
    currentDetail?.variables || frameworkSpecs[selectedKey].inputs;
  const missingUpstream =
    currentDetail?.missingUpstream || state?.missingUpstream || [];
  return (
    <section
      className="strategy-readiness"
      aria-label="Audit evidence for strategy"
    >
      <header>
        <div>
          <span className="eyebrow">FROM THE WORK AUDIT</span>
          <h2>Use what we know. Find what the decision still needs.</h2>
          <p>
            The live work record is a starting point for strategy. Check the
            sources and missing inputs before choosing an analysis.
          </p>
        </div>
        {audit && (
          <small>
            Work snapshot · revision {audit.sourceRevision}
            {auditLoading ? " · updating" : ""}
          </small>
        )}
      </header>
      <ErrorBox error={auditError} />
      {auditError && (
        <Button onClick={() => setRetry((value) => value + 1)}>
          Retry work snapshot
        </Button>
      )}
      {audit ? (
        <div className="strategy-readiness-facts">
          <div>
            <b>
              {audit.coverage.tasksWithAcceptedEvidence}
              <span> / {audit.coverage.tasks}</span>
            </b>
            <span>tasks linked to accepted evidence</span>
          </div>
          <div>
            <b>{audit.coverage.confirmedTasks}</b>
            <span>tasks with current human confirmation</span>
          </div>
          <div>
            <b>{audit.coverage.acceptedEvidence}</b>
            <span>accepted evidence records</span>
          </div>
          <div>
            <b>
              {audit.coverage.respondedPeople}
              <span> / {audit.coverage.people}</span>
            </b>
            <span>people with a saved response</span>
          </div>
        </div>
      ) : (
        !auditError && <p role="status">Reading the current work snapshot…</p>
      )}
      {audit && (
        <details className="strategy-readiness-audit">
          <summary>What still needs checking in the work audit</summary>
          <p>
            {audit.coverage.unmappedTasks} tasks without a saved stage ·{" "}
            {audit.coverage.openRequests} open requests ·{" "}
            {audit.analysis.staleExcluded} outdated analyses excluded from the
            audit findings.
          </p>
          {audit.missingInputs.length ? (
            <ul>
              {audit.missingInputs.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <b>{item.title}</b>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No structural input gaps were identified by this audit check. This
              does not establish analytical completeness.
            </p>
          )}
          {(audit.missingInputs.length > 4 ||
            audit.omitted.missingInputs > 0) && (
            <p>More work questions remain in the live audit.</p>
          )}
          <p>
            Accepted accounts remain reported evidence. Work coverage does not
            establish financial results, market demand or a measured bottleneck.
          </p>
        </details>
      )}
      <div className="strategy-readiness-next">
        <div className="strategy-readiness-choice">
          <label>
            Strategy question
            <select
              value={selectedKey}
              onChange={(event) => setSelected(event.target.value)}
            >
              {frameworkOrder.map((key) => (
                <option key={key} value={key}>
                  {frameworkLabel(key)}
                </option>
              ))}
            </select>
          </label>
          <p>
            {state?.current
              ? "A current analysis is available to review."
              : state?.stale
                ? "Saved inputs changed. Review them before preparing a new version."
                : "Start with the required inputs for this decision."}
          </p>
          <Button primary onClick={() => openFramework(selectedKey)}>
            Review {frameworkLabel(selectedKey)} <ArrowRight size={15} />
          </Button>
          <small>
            Opens the existing canvas. AI runs only when you choose to generate
            there.
          </small>
          {currentDetail && !currentDetail.configured && (
            <small>
              OpenAI is not configured. You can inspect inputs and use the
              manual analysis path.
            </small>
          )}
        </div>
        <div className="strategy-readiness-requirements">
          <h3>Inputs this framework needs</h3>
          <ErrorBox error={inputError} />
          {inputError && (
            <Button onClick={() => setRetry((value) => value + 1)}>
              Retry input check
            </Button>
          )}
          {!!missingUpstream.length && (
            <div className="strategy-readiness-dependencies">
              <p>Complete or refresh these required analyses first:</p>
              {missingUpstream.map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelected(key)}
                >
                  {frameworkLabel(key)} <ChevronRight size={13} />
                </button>
              ))}
            </div>
          )}
          <ul>
            {variables.map((variable) => {
              const count = currentDetail?.variables.find(
                (item) => item.key === variable.key,
              )?.sourceCount;
              return (
                <li key={variable.key}>
                  <details>
                    <summary>
                      <span>{variable.label}</span>
                      <small>{frameworkInputStatus(count)}</small>
                    </summary>
                    <p>{variable.lookFor}</p>
                    {count !== undefined && (
                      <p>
                        {count} matching source{" "}
                        {count === 1 ? "excerpt" : "excerpts"}. Check that the
                        content actually answers this question.
                      </p>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
          <p className="strategy-readiness-limit">
            Source counts show available context, not that the requirement is
            satisfied. Financials, customer evidence, market data and observed
            performance may still be missing.
          </p>
        </div>
      </div>
      {currentDetail && (
        <details className="strategy-readiness-sources">
          <summary>
            Inspect the current source inventory · {currentDetail.sourceCount}{" "}
            excerpts
          </summary>
          <ul>
            {currentDetail.sources.map((source) => {
              const record = records.find(
                (item) =>
                  item.id === source.id &&
                  item.version === source.version &&
                  item.hash === source.hash,
              );
              return (
                <li key={source.id}>
                  {record ? (
                    <button type="button" onClick={() => openRecord(record)}>
                      {source.title}
                    </button>
                  ) : (
                    <span>{source.title}</span>
                  )}
                  <small>
                    v{source.version} · {source.state.replaceAll("_", " ")}
                    {source.excerpted ? " · excerpt" : ""}
                  </small>
                </li>
              );
            })}
          </ul>
          <p>
            {currentDetail.omitted} additional records outside the bounded
            context. Full saved-run citations and source passages are available
            inside the framework canvas.
          </p>
        </details>
      )}
      <footer className="strategy-readiness-weekly">
        <div>
          <h3>Bring the next observation back</h3>
          <p>
            {weekly.metrics.length} measures · {weekly.missingBaselines.length}{" "}
            without a baseline · {weekly.interventions.length} interventions ·{" "}
            {weekly.outcomes.length} outcome reviews ·{" "}
            {weekly.returnedUpdates.length} returned weekly updates.
          </p>
          <p>
            Use the weekly review to capture what changed, the source, the
            decision and who will act next. New accepted evidence can make an
            analysis out of date; a new AI run remains your choice.
          </p>
          {(weekly.missingBaselines.length > 0 ||
            weekly.interventions.length > 0) && (
            <ul className="strategy-readiness-weekly-items">
              {weekly.missingBaselines.slice(0, 2).map((record) => (
                <li key={record.id}>
                  <button type="button" onClick={() => openRecord(record)}>
                    Establish a baseline: {record.title}
                  </button>
                </li>
              ))}
              {weekly.interventions.slice(0, 2).map((record) => (
                <li key={record.id}>
                  <button type="button" onClick={() => openRecord(record)}>
                    Review {record.title}
                  </button>
                  <small>
                    {" "}
                    · {record.data.reviewDate || "Review date not recorded"}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>
        {onWeeklyReview && (
          <button
            className="strategy-readiness-weekly-link"
            type="button"
            onClick={onWeeklyReview}
          >
            Open weekly review <ArrowRight size={14} />
          </button>
        )}
      </footer>
    </section>
  );
}
