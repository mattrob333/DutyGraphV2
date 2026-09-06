import { useEffect, useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Badge, Button, ErrorBox, Field, Panel } from "./ui.tsx";
export function AiWorkbench({
  company,
  records,
  create,
  createCandidate,
  strategy = false,
  stage = "brief",
  prepareRequest,
  kickoff,
  createRecord,
}: {
  company: string;
  records: RecordRow[];
  create: (preset: Record<string, unknown>) => void;
  createCandidate?: (preset: Record<string, unknown>) => void;
  strategy?: boolean;
  stage?: "brief" | "tasks" | "interview" | "roster";
  prepareRequest?: (preset: Record<string, unknown>) => void;
  kickoff?: () => void;
  createRecord?: (kind: string, preset: Record<string, unknown>) => void;
}) {
  const [data, setData] = useState<any>(null),
    [selected, setSelected] = useState<string[]>([]),
    [mode] = useState(strategy ? "hypotheses" : stage),
    [personId, setPersonId] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = () => api(`/v1/companies/${company}/ai`).then(setData);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [company]);
  const evidence = records.filter(
    (r) =>
      r.kind === "evidence" &&
      !["stale", "retracted"].includes(r.state) &&
      (!["tasks", "roster"].includes(mode) || r.state === "accepted") &&
      (mode !== "roster" || ["leadership", "org"].includes(r.data.bucket)),
  );
  return (
    <Panel
      title={
        strategy
          ? "Strategy assistant"
          : mode === "roster"
            ? "Propose the team and their duties"
            : mode === "tasks"
              ? "Draft task cards from reviewed evidence"
              : mode === "interview"
                ? "Prepare each person’s interview"
                : "Prepare the leadership meeting"
      }
      subtitle={
        strategy
          ? "Select evidence and draft possible constraints with OpenAI. Review each draft before adding it to the ledger. This is an on-demand assistant, not a scheduled framework agent."
          : mode === "roster"
            ? "Use accepted leadership notes or team accounts to propose people, departments and duties. Review each record before adding it; missing details stay blank."
            : mode === "interview"
              ? "Choose the participant and evidence about their work. Review the suggested questions before preparing their private request."
              : mode === "tasks"
                ? "Use reviewed team accounts to describe the work. Each suggestion opens an editable task card; confirmation comes next."
                : "Turn public research into a saved brief and questions about goals, value delivery, and missing information. Nothing is emailed by this action."
      }
    >
      <ErrorBox error={error} />
      {data && !data.configured && (
        <p className="notice">
          Add your OpenAI API key in Workspace settings to enable drafting.
        </p>
      )}
      {mode === "interview" && (
        <Field label="Team participant">
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            <option value="">Choose a person</option>
            {records
              .filter((r) => r.kind === "person")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · {p.data.role}
                </option>
              ))}
          </select>
        </Field>
      )}
      <fieldset className="discovery-source-list">
        <legend>Select up to eight source records</legend>
        {evidence.length === 0 && (
          <p>Import public research or add an evidence source first.</p>
        )}
        {evidence.map((r) => (
          <label className="discovery-source" key={r.id}>
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
        hours; provider charges apply. Interviews also include the selected
        person’s name, role and team.
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
          busy ||
          !data?.configured ||
          !consent ||
          selected.length === 0 ||
          (mode === "interview" && !personId)
        }
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await api(`/v1/companies/${company}/ai`, "POST", {
              mode,
              ...(mode === "interview" ? { personId } : {}),
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
        {busy
          ? "Preparing draft…"
          : mode === "brief"
            ? "Prepare leadership meeting"
            : mode === "roster"
              ? "Draft roster and duties"
              : mode === "interview"
                ? "Draft interview questions"
                : "Generate AI draft"}
      </Button>
      <Button
        disabled={busy}
        onClick={() => {
          load().catch((e) => setError(e.message));
        }}
      >
        Refresh draft history
      </Button>
      {data?.jobs
        .filter((job: any) => job.input.mode === mode)
        .map((job: any) => (
          <details
            className="provider-setting"
            key={job.id}
            open={
              job.id === data.jobs.find((j: any) => j.input.mode === mode)?.id
            }
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
                    <SourceNames
                      ids={c.sourceIds}
                      sources={job.input.sources}
                    />
                  </p>
                ))}
                <h4>Questions to resolve with the team</h4>
                <ol>
                  {job.result.draft.questions.map((q: string, i: number) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
                {mode === "brief" && kickoff && (
                  <Button disabled={job.stale} onClick={kickoff}>
                    Use meeting pack in leadership kickoff
                  </Button>
                )}
                {mode === "interview" && prepareRequest && (
                  <Button
                    disabled={job.stale || !job.result.draft.questions.length}
                    onClick={() =>
                      prepareRequest({
                        title: `Work interview: ${job.input.participant?.name || "Team member"}`,
                        personId: job.input.participant?.id,
                        type: "work",
                        questions: job.result.draft.questions.join("\n"),
                        questionPlanVersion: `ai-interview:${job.id}`,
                        questionIds: [],
                        taskIds: [],
                        dueDate: new Date(Date.now() + 7 * 86400000)
                          .toISOString()
                          .slice(0, 10),
                      })
                    }
                  >
                    Review and prepare private request
                  </Button>
                )}
                {job.result.draft.people?.map((person: any, i: number) => (
                  <section className="provider-setting" key={i}>
                    <h4>{person.name}</h4>
                    <p>
                      {person.role || "Role not stated"} ·{" "}
                      {person.team || "Department not stated"}
                    </p>
                    <p>
                      Reported manager: {person.managerName || "Not stated"}
                    </p>
                    <SourceNames
                      ids={person.sourceIds}
                      sources={job.input.sources}
                    />
                    <Button
                      disabled={
                        job.stale ||
                        !job.accepted ||
                        records.some(
                          (r) =>
                            r.kind === "person" &&
                            ((person.email &&
                              r.data.email.toLowerCase() ===
                                person.email.toLowerCase()) ||
                              r.title.toLowerCase() ===
                                person.name.toLowerCase()),
                        )
                      }
                      onClick={() =>
                        createRecord?.("person", {
                          name: person.name,
                          email: person.email,
                          role: person.role,
                          team: person.team,
                          managerId: "",
                          externalId: "",
                        })
                      }
                    >
                      Review person and reporting line
                    </Button>
                    {person.duties.map((duty: any, j: number) => (
                      <div key={j}>
                        <h4>{duty.title}</h4>
                        <p>{duty.purpose}</p>
                        <Button
                          disabled={job.stale || !job.accepted}
                          onClick={() =>
                            createRecord?.("duty", {
                              ...duty,
                              ownerId: "",
                              taskIds: [],
                              evidenceIds: person.sourceIds,
                              reason: `Reviewed roster draft ${job.id}`,
                            })
                          }
                        >
                          Review proposed duty and owner
                        </Button>
                      </div>
                    ))}
                  </section>
                ))}
                {job.result.draft.tasks.map((t: any, i: number) => (
                  <div key={i} className="provider-setting">
                    <h4>{t.title}</h4>
                    <p>{t.purpose}</p>
                    <p>Trigger: {t.trigger}</p>
                    <p>Output: {t.output}</p>
                    <SourceNames
                      ids={t.sourceIds}
                      sources={job.input.sources}
                    />
                    <Button
                      disabled={job.stale || !job.accepted}
                      onClick={() => {
                        const { sourceIds, ...fields } = t;
                        create({
                          ...fields,
                          evidenceIds: sourceIds,
                          classification: "Inferred",
                          mode: "human_only",
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
                    <SourceNames
                      ids={h.sourceIds}
                      sources={job.input.sources}
                    />
                    {createCandidate && (
                      <Button
                        disabled={job.stale || !job.accepted}
                        onClick={() =>
                          createCandidate({
                            title: h.title,
                            pressure: h.explanation,
                            alternative: h.alternative,
                            discriminator: h.test,
                            evidenceIds: h.sourceIds,
                          })
                        }
                      >
                        Review for constraint ledger
                      </Button>
                    )}
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
