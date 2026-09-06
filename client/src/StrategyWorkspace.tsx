import { useEffect, useState } from "react";
import { FileText, MessageSquare, RefreshCw, ArrowRight } from "lucide-react";
import type { RecordRow } from "../../shared/domain.ts";
import { frameworkGroups } from "../../shared/framework-guides.ts";
import { api } from "./api.ts";
import { Badge, Button, ErrorBox, Modal } from "./ui.tsx";
import { FrameworkLibrary } from "./StrategyViews.tsx";

export function StrategyWorkspace({
  company,
  records,
  registry,
  open,
  write,
  scope,
  setScope,
}: {
  company: string;
  records: RecordRow[];
  registry: any;
  open: (r: RecordRow) => void;
  write: (key: string) => void;
  scope: string | null;
  setScope: (scope: string | null) => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [question, setQuestion] = useState(""),
    [selectedId, setSelectedId] = useState("");
  const path = `/v1/companies/${company}/strategy-briefs`;
  useEffect(() => {
    let alive = true;
    const load = () =>
      api(path)
        .then((d) => {
          if (alive) setData(d);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [path, records]);
  const copilot = scope === "copilot",
    reportScope = copilot ? "overview" : scope;
  const group = (id: string) => data?.groups.find((g: any) => g.scope === id);
  const scopedJobs = (data?.jobs || []).filter((j: any) =>
    copilot ? !!j.input.question : j.input.scope === scope && !j.input.question,
  );
  const job = scopedJobs.find((j: any) => j.id === selectedId) || scopedJobs[0];
  const title = copilot
    ? "Strategy copilot"
    : scope === "overview"
      ? "Executive brief"
      : frameworkGroups.find((g) => g.id === scope)?.label || "Strategy report";
  const select = (next: string) => {
    setSelectedId("");
    setQuestion("");
    setError("");
    setScope(next);
  };
  async function generate() {
    if (!reportScope || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api(path, "POST", {
        scope: reportScope,
        question: copilot ? question : "",
        consent: true,
      });
      const next = await api(path);
      setData(next);
      setSelectedId(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const updated = data?.groups.filter((g: any) => g.changed).length || 0;
  return (
    <>
      <section className="strategy-brief-bar" aria-label="Strategy reports">
        <div>
          <span className="eyebrow">YOUR BUSINESS, EXPLAINED</span>
          <h2>What changed. What it means. What to do next.</h2>
          <p>
            Read the whole-company brief or explore one part of the business.
            Ask the copilot a question using the same evidence.
          </p>
          {updated > 0 && (
            <Badge tone="amber">
              Inputs changed · {updated} reports need a refresh
            </Badge>
          )}
        </div>
        <div className="actions">
          <Button primary onClick={() => select("overview")}>
            <FileText size={16} />
            Executive brief
          </Button>
          <Button onClick={() => select("copilot")}>
            <MessageSquare size={16} />
            Ask the copilot
          </Button>
        </div>
      </section>
      {!scope && <ErrorBox error={error} />}
      <FrameworkLibrary
        registry={registry}
        records={records}
        open={open}
        write={write}
        report={(id) => select(id)}
        reportStatus={(id) =>
          group(id)?.changed
            ? "Inputs changed"
            : group(id)?.latestId
              ? "Report ready"
              : "Read report"
        }
      />
      <section className="strategy-input-note">
        <h3>Keep the strategy current</h3>
        <p>
          Accepted leadership notes, customer calls and work records feed these
          reports. The page checks for changed inputs every minute while open.
          Generate a report to analyze those changes.
        </p>
        <p>
          Fireflies, customer communities, competitor channels and industry
          feeds still need collection integrations. No daily collection job is
          running.
        </p>
      </section>
      {scope && (
        <Modal
          title={title}
          subtitle={copilot ? "Ask about your company" : "STRATEGY REPORT"}
          wide={!copilot}
          className={
            copilot ? "strategy-copilot-dialog" : "strategy-report-dialog"
          }
          onClose={() => setScope(null)}
        >
          <ErrorBox error={error} />
          {!data?.configured && (
            <p className="notice">
              Add your OpenAI API key in Workspace settings to generate reports
              and answers.
            </p>
          )}
          {copilot && (
            <form
              className="copilot-question"
              onSubmit={(e) => {
                e.preventDefault();
                generate();
              }}
            >
              <label htmlFor="strategy-question">
                What would you like to understand?
              </label>
              <textarea
                id="strategy-question"
                value={question}
                maxLength={1500}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Where should we focus next, and what evidence supports that?"
                rows={3}
              />
              <Button
                type="submit"
                primary
                disabled={busy || !data?.configured || !question.trim()}
              >
                {busy ? "Reading the company context…" : "Ask OpenAI"}
                <ArrowRight size={15} />
              </Button>
            </form>
          )}
          {!copilot && (
            <div className="strategy-report-actions">
              <p>
                {group(reportScope || "")?.sourceCount || 0} source and analysis
                excerpts available
                {group(reportScope || "")?.omitted
                  ? ` · ${group(reportScope || "").omitted} additional records omitted`
                  : ""}
                .
              </p>
              <Button
                primary
                disabled={
                  busy ||
                  !data?.configured ||
                  !group(reportScope || "")?.sourceCount
                }
                onClick={generate}
              >
                <RefreshCw size={15} />
                {busy
                  ? "Preparing report…"
                  : job
                    ? "Refresh with OpenAI"
                    : "Generate with OpenAI"}
              </Button>
            </div>
          )}
          <p className="subtle">
            Uses accepted evidence and saved analyses. Up to 48 excerpts of
            4,000 characters are sent to your OpenAI account. Twenty strategy
            attempts per account each day. Provider charges apply.
          </p>
          {scopedJobs.length > 1 && (
            <label className="report-history">
              Report history
              <select
                aria-label="Strategy report history"
                value={job?.id || ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {scopedJobs.map((j: any) => (
                  <option key={j.id} value={j.id}>
                    {new Date(j.created_at).toLocaleString()} ·{" "}
                    {j.input.question || j.state}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!job && !busy && (
            <div className="strategy-report-empty">
              <FileText size={24} />
              <h3>
                {copilot
                  ? "A grounded answer starts here"
                  : "Your first report is ready to prepare"}
              </h3>
              <p>
                {copilot
                  ? "Ask about risks, customer needs, competitive pressures or the next decision."
                  : "The report will explain the current position, recent input changes, key findings and questions for the team. You do not need to read each framework separately."}
              </p>
            </div>
          )}
          {job && (
            <article className="strategy-report">
              <div className="actions">
                <Badge>
                  {job.state === "complete" ? "AI draft" : job.state}
                </Badge>
                {job.stale && (
                  <Badge tone="amber">Inputs changed since this report</Badge>
                )}
                <small>{new Date(job.created_at).toLocaleString()}</small>
              </div>
              {job.input.question && <h3>{job.input.question}</h3>}
              {job.stale && (
                <p className="notice">
                  This report uses an earlier set of inputs. Refresh it before
                  using its recommendations.
                </p>
              )}
              {job.result?.draft ? (
                <>
                  <h3>The overall picture</h3>
                  <p className="report-summary">{job.result.draft.summary}</p>
                  <h3>Findings & suggested next steps</h3>
                  {job.result.draft.claims.map((claim: any, i: number) => (
                    <section className="strategy-finding" key={i}>
                      <Badge>{claim.basis}</Badge>
                      <p>{claim.text}</p>
                      <div className="report-source-links">
                        {claim.sourceIds.map((id: string) => {
                          const source = job.input.sources.find(
                              (s: any) => s.id === id,
                            ),
                            record = records.find((r) => r.id === id);
                          return record ? (
                            <button
                              className="text-link"
                              key={id}
                              onClick={() => open(record)}
                            >
                              {source?.title || record.title} · v
                              {source?.version}
                            </button>
                          ) : (
                            <span key={id}>
                              {source?.title || "Source unavailable"}
                            </span>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                  {job.result.draft.questions.length > 0 && (
                    <>
                      <h3>Decisions & open questions</h3>
                      <ul>
                        {job.result.draft.questions.map(
                          (q: string, i: number) => (
                            <li key={i}>{q}</li>
                          ),
                        )}
                      </ul>
                    </>
                  )}
                </>
              ) : (
                <p>{job.message}</p>
              )}
              <details>
                <summary>Sources used · {job.input.sources.length}</summary>
                {job.input.sources.map((s: any) => (
                  <p key={s.id}>
                    {s.title} · v{s.version} · {s.state}
                    {s.excerpted ? " · excerpt" : ""}
                  </p>
                ))}
                <p>
                  {job.input.model}
                  {job.input.omitted
                    ? ` · ${job.input.omitted} records outside this report's context`
                    : ""}
                </p>
              </details>
            </article>
          )}
        </Modal>
      )}
    </>
  );
}
