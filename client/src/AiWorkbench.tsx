import { useEffect, useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Badge, Button, ErrorBox, Field, Panel } from "./ui.tsx";
export function AiWorkbench({
  company,
  records,
  create,
}: {
  company: string;
  records: RecordRow[];
  create: (preset: Record<string, unknown>) => void;
}) {
  const [data, setData] = useState<any>(null),
    [selected, setSelected] = useState<string[]>([]),
    [mode, setMode] = useState("brief"),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = () => api(`/v1/companies/${company}/ai`).then(setData);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [company]);
  const evidence = records.filter(
    (r) => r.kind === "evidence" && !["stale", "retracted"].includes(r.state),
  );
  return (
    <Panel
      title="AI discovery drafts"
      subtitle="Prepare for the first meeting, then ask the team to correct the draft. AI output never confirms internal ownership or authorizes work."
    >
      <ErrorBox error={error} />
      {data && !data.configured && (
        <p className="notice">
          Add your OpenAI API key in Workspace settings to enable drafting.
        </p>
      )}
      <Field label="What should the AI prepare?">
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="brief">First-meeting brief and questions</option>
          <option value="tasks">Task descriptions from evidence</option>
          <option value="hypotheses">Hypotheses and ways to test them</option>
        </select>
      </Field>
      <fieldset>
        <legend>Select up to eight source records</legend>
        {evidence.length === 0 && (
          <p>Import public research or add an evidence source first.</p>
        )}
        {evidence.map((r) => (
          <label className="check-line" key={r.id}>
            <input
              type="checkbox"
              checked={selected.includes(r.id)}
              disabled={!selected.includes(r.id) && selected.length >= 8}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, r.id]
                    : selected.filter((id) => id !== r.id),
                )
              }
            />
            {r.title}{" "}
            <Badge>
              {r.state} · v{r.version}
            </Badge>
          </label>
        ))}
      </fieldset>
      <p className="subtle">
        Only the first 4,000 characters of each selected source, its title,
        locator, status, and this company’s name are sent. Check that you have
        permission to share this material. Ten attempts per account per 24
        hours; provider charges apply.
      </p>
      <label className="check-line">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        Send these selected excerpts to OpenAI for an unverified draft.
      </label>
      <Button
        primary
        disabled={
          busy || !data?.configured || !consent || selected.length === 0
        }
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await api(`/v1/companies/${company}/ai`, "POST", {
              mode,
              sourceIds: selected,
              consent: true,
            });
            await load();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Preparing draft…" : "Generate AI draft"}
      </Button>
      <Button
        disabled={busy}
        onClick={() => {
          load().catch((e) => setError(e.message));
        }}
      >
        Refresh draft history
      </Button>
      {data?.jobs.map((job: any) => (
        <details
          className="provider-setting"
          key={job.id}
          open={job.id === data.jobs[0]?.id}
        >
          <summary>
            {job.input.mode} · {new Date(job.created_at).toLocaleString()}{" "}
            <Badge>{job.stale ? "Sources changed" : job.state}</Badge>
          </summary>
          <p>{job.message}</p>
          {job.stale && (
            <p className="notice">
              A source changed or was withdrawn. Generate a new draft before
              using these suggestions.
            </p>
          )}
          <p className="subtle">
            {job.input.model} · Sources:{" "}
            {job.input.sources
              .map(
                (s: any) =>
                  `${s.title} (v${s.version}${s.excerpted ? ", excerpt" : ""})`,
              )
              .join("; ")}
          </p>
          {job.result?.draft && (
            <>
              <p>{job.result.draft.summary}</p>
              {job.result.draft.claims.map((c: any, i: number) => (
                <p key={i}>
                  <Badge>{c.basis}</Badge> {c.text}
                  <SourceNames ids={c.sourceIds} sources={job.input.sources} />
                </p>
              ))}
              <h4>Questions to resolve with the team</h4>
              <ol>
                {job.result.draft.questions.map((q: string, i: number) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
              {job.result.draft.tasks.map((t: any, i: number) => (
                <div key={i} className="provider-setting">
                  <h4>{t.title}</h4>
                  <p>{t.purpose}</p>
                  <p>Trigger: {t.trigger}</p>
                  <p>Output: {t.output}</p>
                  <SourceNames ids={t.sourceIds} sources={job.input.sources} />
                  <Button
                    disabled={job.stale || !job.accepted}
                    onClick={() => {
                      const { sourceIds, ...fields } = t;
                      create({
                        ...fields,
                        evidenceIds: sourceIds,
                        classification: "Inferred",
                        mode: "ai_draft",
                        reason: `Advisor review of AI draft ${job.id}`,
                      });
                    }}
                  >
                    Review as a proposed task
                  </Button>
                  {!job.accepted && (
                    <p className="subtle">
                      Review and accept the source records before creating a
                      task from this draft.
                    </p>
                  )}
                </div>
              ))}
              {job.result.draft.hypotheses.map((h: any, i: number) => (
                <div key={i} className="provider-setting">
                  <h4>{h.title}</h4>
                  <p>{h.explanation}</p>
                  <p>Alternative: {h.alternative}</p>
                  <p>Test: {h.test}</p>
                  <SourceNames ids={h.sourceIds} sources={job.input.sources} />
                  <p className="subtle">
                    Review these ideas with the team before recording a
                    candidate in Strategy.
                  </p>
                </div>
              ))}
            </>
          )}
        </details>
      ))}
    </Panel>
  );
}
function SourceNames({ ids, sources }: { ids: string[]; sources: any[] }) {
  return (
    <small className="subtle">
      {" "}
      Sources:{" "}
      {ids
        .map((id) => sources.find((s) => s.id === id)?.title || id)
        .join("; ") || "No supporting source"}
    </small>
  );
}
