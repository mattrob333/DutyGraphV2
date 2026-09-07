import { useEffect, useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import type {
  AnalysisSource,
  WorkCheck,
  AnalysisContext,
  TeamAnalysisOutput,
} from "../../shared/team-analysis.ts";
import { api } from "./api.ts";
import { Panel, Button, Badge, ErrorBox } from "./ui.tsx";
import "./team-analysis.css";
type Job = {
  id: string;
  state: string;
  stale: boolean;
  message: string;
  created_at: string;
  model: string;
  sourceRefs?: Omit<AnalysisSource, "text">[];
  coverage: AnalysisContext["coverage"];
  result?: {
    output: TeamAnalysisOutput;
    reviewVersion?: number;
    reviews?: Record<string, { decision: string; note: string }>;
  } | null;
};
type Status = {
  fingerprint: string;
  configured: boolean;
  coverage: AnalysisContext["coverage"];
  checks: WorkCheck[];
  sourceCount: number;
  jobs: Job[];
};
export function TeamAnalysis({
  companyId,
  revision,
  records,
  open,
}: {
  companyId: string;
  revision: number;
  records: RecordRow[];
  open: (r: RecordRow) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false),
    [selected, setSelected] = useState(""),
    [sources, setSources] = useState<AnalysisSource[]>([]),
    [key, setKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({}),
    [saving, setSaving] = useState(false);
  const path = `/v1/companies/${companyId}/team-analysis`;
  async function refresh() {
    try {
      setStatus(await api(path));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let active = true;
    setStatus(null);
    setSources([]);
    setSelected("");
    setConsent(false);
    setKey(null);
    api<Status>(path)
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  const job = status?.jobs.find((j) => j.id === selected) || status?.jobs[0];
  useEffect(() => {
    setSources([]);
    setNotes({});
  }, [job?.id]);
  const running = busy || status?.jobs.some((j) => j.state === "running");
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [running, path]);
  async function run() {
    if (!status) return;
    setBusy(true);
    setError("");
    const attempt = key || crypto.randomUUID();
    setKey(attempt);
    try {
      const result = await api<{ id: string }>(
        path,
        "POST",
        { consent: true, fingerprint: status.fingerprint },
        attempt,
      );
      setSelected(result.id);
      setKey(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      await refresh();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function inspect() {
    if (!job) return;
    try {
      setSources(
        (
          await api<{ sources: AnalysisSource[] }>(
            path + "/" + job.id + "/sources",
          )
        ).sources,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function review(findingId: string, decision: string) {
    if (!job) return;
    setSaving(true);
    try {
      await api(path + "/" + job.id + "/review", "POST", {
        findingId,
        decision,
        note: notes[findingId] || "",
        expectedReviewVersion: job.result?.reviewVersion || 0,
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const output = job?.state === "complete" ? job.result?.output : null;
  return (
    <Panel
      className="team-analysis"
      title="Review the work across the team"
      subtitle="Find record gaps now, then ask AI to compare tasks and prepare questions for your client readout."
    >
      {error && <ErrorBox error={error} />}
      {!status ? (
        <div>
          <p>{error ? "The review could not be loaded." : "Loading review…"}</p>
          {error && (
            <Button onClick={() => void refresh()}>Try loading again</Button>
          )}
        </div>
      ) : (
        <>
          <div className="team-analysis-stats">
            <span>
              <b>{status.coverage.tasks}</b> active task cards
            </span>
            <span>
              <b>
                {status.coverage.returnedRequests}/
                {status.coverage.workRequests}
              </b>{" "}
              recorded work requests returned
            </span>
            <span>
              <b>{status.coverage.missingOwners}</b> tasks without a linked
              owner
            </span>
          </div>
          <p className="subtle">
            Coverage describes recorded requests, not the whole company. Missing
            information may still be waiting for a response.
          </p>
          <details>
            <summary>Record checks · {status.checks.length}</summary>
            {!status.checks.length ? (
              <p>
                No structural gaps found by these checks. This does not
                establish complete or conflict-free work.
              </p>
            ) : (
              status.checks.map((check) => (
                <article className="team-finding" key={check.id}>
                  <Badge tone="amber">{check.category}</Badge>
                  <h3>{check.title}</h3>
                  <p>{check.detail}</p>
                  <p>
                    <strong>Ask:</strong> {check.question}
                  </p>
                  {check.recordIds.map((id) => {
                    const record = records.find((r) => r.id === id);
                    return record ? (
                      <Button key={id} onClick={() => open(record)}>
                        Open {record.title}
                      </Button>
                    ) : null;
                  })}
                </article>
              ))
            )}
          </details>
          <div className="team-analysis-actions">
            <label>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />{" "}
              Use the configured AI provider to compare these work records and
              accepted evidence.
            </label>
            <p className="subtle">
              Up to 600 source records within a bounded context; no raw audio,
              private invitation links or person email fields. Draft analysis
              only. Twelve attempts per account per day; no automatic retries.
            </p>
            <Button
              primary
              disabled={
                !consent ||
                !status.configured ||
                !status.coverage.tasks ||
                !!running
              }
              onClick={() => void run()}
            >
              {busy ? "Preparing findings…" : "Analyze team work"}
            </Button>
            <Button onClick={() => void refresh()}>Refresh review</Button>
            {key && !busy && (
              <Button onClick={() => setKey(null)}>
                Start a new attempt after checking history
              </Button>
            )}
            {!status.configured && (
              <p>
                Connect OpenAI in Workspace settings to generate findings.
                Record checks remain available.
              </p>
            )}
          </div>
          {!!status.jobs.length && (
            <label>
              Review history
              <select
                aria-label="Team analysis history"
                value={job?.id || ""}
                onChange={(e) => setSelected(e.target.value)}
              >
                {status.jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {new Date(j.created_at).toLocaleString()} · {j.state}
                    {j.stale ? " · older work snapshot" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {job && (
            <div aria-live="polite">
              <p>
                <Badge tone={job.stale ? "amber" : "blue"}>
                  {job.stale
                    ? "Work has changed — historical findings"
                    : job.state === "complete"
                      ? "AI draft — needs advisor review"
                      : job.state}
                </Badge>{" "}
                {job.message}
              </p>
              {job.stale && (
                <p>
                  Rerun against current records before using these findings. The
                  original snapshot remains available below.
                </p>
              )}
            </div>
          )}
          {output && (
            <>
              <p>{output.summary}</p>
              <p className="subtle">
                Exact source excerpts were checked automatically. That does not
                prove the AI interpretation is correct. These hypotheses do not
                grant authority or establish a measured bottleneck.
              </p>
              {!output.findings.length && (
                <p>
                  No supported findings were returned. Review coverage and the
                  record checks above.
                </p>
              )}
              {output.findings.map((f) => (
                <article className="team-finding" key={f.id}>
                  <Badge>
                    {f.category.replaceAll("_", " ")} · {f.confidence}{" "}
                    confidence
                  </Badge>
                  <h3>{f.title}</h3>
                  <p>{f.observation}</p>
                  <dl>
                    <dt>Next action</dt>
                    <dd>{f.nextAction}</dd>
                    <dt>Question to validate</dt>
                    <dd>{f.validationQuestion}</dd>
                    <dt>Boundary</dt>
                    <dd>{f.proposedScope}</dd>
                    <dt>Human review</dt>
                    <dd>{f.humanReview}</dd>
                  </dl>
                  <details>
                    <summary>
                      Evidence behind this finding · {f.citations.length}
                    </summary>
                    {f.citations.map((c, i) => (
                      <blockquote key={i}>
                        {c.quote}
                        <footer>
                          {job?.sourceRefs?.find((r) => r.id === c.sourceId)
                            ?.title || c.sourceId}{" "}
                          · saved snapshot
                        </footer>
                      </blockquote>
                    ))}
                  </details>
                  <div className="team-finding-review">
                    {job?.result?.reviews?.[f.id] && (
                      <p>
                        <Badge tone="sage">
                          {job.result.reviews[f.id].decision === "discuss"
                            ? "For client discussion"
                            : "Dismissed by advisor"}
                        </Badge>{" "}
                        {job.result.reviews[f.id].note}
                      </p>
                    )}
                    <label>
                      Review note
                      <textarea
                        aria-label={"Review note: " + f.title}
                        value={notes[f.id] || ""}
                        maxLength={1500}
                        onChange={(e) =>
                          setNotes({ ...notes, [f.id]: e.target.value })
                        }
                      />
                    </label>
                    <Button
                      disabled={
                        saving ||
                        job?.stale ||
                        (notes[f.id] || "").trim().length < 10
                      }
                      onClick={() => void review(f.id, "discuss")}
                    >
                      Discuss with client
                    </Button>
                    <Button
                      disabled={
                        saving ||
                        job?.stale ||
                        (notes[f.id] || "").trim().length < 10
                      }
                      onClick={() => void review(f.id, "dismissed")}
                    >
                      Dismiss with reason
                    </Button>
                    <p className="subtle">
                      Records an advisor decision; it does not change tasks or
                      authorize an agent.
                    </p>
                  </div>
                </article>
              ))}
              <Button onClick={() => void inspect()}>
                Inspect saved source versions
              </Button>
              {!!sources.length && (
                <details open>
                  <summary>Saved sources · {sources.length}</summary>
                  {sources.map((s) => (
                    <details key={s.id}>
                      <summary>
                        {s.title} · v{s.version} · {s.state}
                      </summary>
                      <pre>{s.text}</pre>
                      <small>Content hash: {s.hash}</small>
                    </details>
                  ))}
                </details>
              )}
            </>
          )}
        </>
      )}
    </Panel>
  );
}
