import { useEffect, useState } from "react";
import type { Company, RecordRow } from "../../shared/domain.ts";
import { coverageSummary, kickoffQuestions } from "../../shared/work-model.ts";
import { api } from "./api.ts";
import { Badge, Button, ErrorBox, Field, Panel, Row, State } from "./ui.tsx";

export function Engagement({
  company,
  records,
  create,
  open,
  refresh,
  captureMeeting,
  roster,
  interviews,
}: {
  company: Company;
  records: RecordRow[];
  create: (kind: string) => void;
  open: (r: RecordRow) => void;
  refresh: () => Promise<void>;
  captureMeeting: () => void;
  roster: () => void;
  interviews: () => void;
}) {
  const people = records.filter((r) => r.kind === "person");
  const plans = records.filter((r) => r.kind === "engagement");
  const coverage = coverageSummary(
    people,
    records.filter((r) => r.kind === "task"),
    records.filter((r) => r.kind === "request"),
  );
  const [personId, setPersonId] = useState("");
  const [pack, setPack] = useState<any>(null);
  const [questions, setQuestions] = useState<
    { id: string; question: string; purpose: string; bucket: string }[]
  >(kickoffQuestions.map((q) => ({ ...q })));
  useEffect(() => {
    let active = true;
    api(`/v1/companies/${company.id}/ai`)
      .then((data) => {
        if (!active) return;
        const latest = data.jobs.find(
          (j: any) => j.input.mode === "brief" && j.state === "complete",
        );
        setPack(latest || null);
        if (
          latest &&
          !latest.stale &&
          latest.result?.draft?.questions?.length
        ) {
          const next = latest.result.draft.questions.map(
            (question: string, i: number) => ({
              id: `ai-${i}`,
              question,
              purpose: "From the saved research brief · edit before sending",
              bucket: "leadership",
            }),
          );
          setQuestions(next);
          setChosen(next.map((q: any) => q.id));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [company.id]);

  const [chosen, setChosen] = useState<string[]>(
    kickoffQuestions.slice(0, 5).map((q) => q.id),
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <p className="notice">
        Research → leadership meeting → agreed roster → team interviews → draft
        task cards → human confirmation. Counts below come from this workspace’s
        records, not from public research.
      </p>
      <div className="engagement-coverage">
        <div>
          <strong>{coverage.participants}</strong>
          <span>People in scope</span>
        </div>
        <div>
          <strong>
            {coverage.responded} / {coverage.participants}
          </strong>
          <span>People with a returned response</span>
        </div>
        <div>
          <strong>
            {coverage.confirmedTasks} / {coverage.totalTasks}
          </strong>
          <span>Tasks confirmed by their people</span>
        </div>
        <div>
          <strong>{coverage.unresolvedOwners}</strong>
          <span>Tasks missing an owner</span>
        </div>
      </div>
      <Panel
        title="Start with a bounded engagement"
        subtitle="Agree the outcome, sponsor, systems, exclusions, source visibility and review cadence."
        action={
          <Button onClick={() => create("engagement")}>
            Create engagement plan
          </Button>
        }
      >
        {plans.length ? (
          plans.map((p) => (
            <Row
              key={p.id}
              title={p.title}
              detail={`${p.data.startDate} → ${p.data.endDate} · ${p.data.reviewCadence}`}
              onClick={() => open(p)}
            >
              <State value={p.state} />
            </Row>
          ))
        ) : (
          <p className="subtle">
            No plan has been recorded. The company workspace scope is currently
            “{company.scope}”.
          </p>
        )}
      </Panel>
      <Panel
        title="Leadership meeting: brief and questions"
        subtitle="Meet with the owners and executives together, or prepare a private question set for one person at a time. Preparing a request does not send email."
      >
        <ErrorBox error={error} />
        {pack ? (
          <section className="meeting-pack">
            <Badge>
              {pack.stale
                ? "Sources changed · prepare a fresh brief"
                : "Saved research brief"}
            </Badge>
            <p>{pack.result?.draft?.summary}</p>
            <p className="subtle">
              {pack.input.sources
                .map((source: any) => `${source.title} · v${source.version}`)
                .join("; ")}
            </p>
          </section>
        ) : (
          <p className="notice">
            No saved AI brief yet. These are starter questions. Research the
            business and prepare a leadership meeting to get tailored questions
            here.
          </p>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const selected = questions.filter((q) => chosen.includes(q.id));
              const request = await api(
                `/v1/companies/${company.id}/records`,
                "POST",
                {
                  kind: "request",
                  data: {
                    title: "Executive kickoff",
                    personId,
                    type: "leadership",
                    dueDate,
                    questions: selected.map((q) => q.question),
                    questionIds: selected.map((q) => q.id),
                    questionPlanVersion:
                      pack && !pack.stale
                        ? `ai-brief:${pack.id}`
                        : "executive-kickoff-v1",
                    taskIds: [],
                    notice: company.settings.notice,
                  },
                },
              );
              await refresh();
              open(request);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="two-col">
            <Field label="Executive participant">
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                required
              >
                <option value="">Choose a person in scope</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {p.data.role}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Response due">
              <input
                type="date"
                value={dueDate}
                required
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          </div>
          <div className="kickoff-questions">
            {questions.map((q) => (
              <label className="kickoff-question" key={q.id}>
                <input
                  type="checkbox"
                  checked={chosen.includes(q.id)}
                  onChange={(e) =>
                    setChosen(
                      e.target.checked
                        ? [...chosen, q.id]
                        : chosen.filter((id) => id !== q.id),
                    )
                  }
                />
                <span>
                  <textarea
                    aria-label={`Edit question ${questions.indexOf(q) + 1}`}
                    value={q.question}
                    maxLength={200}
                    onChange={(e) =>
                      setQuestions(
                        questions.map((item) =>
                          item.id === q.id
                            ? { ...item, question: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <small>
                    {q.purpose} <Badge>{q.bucket}</Badge>
                  </small>
                </span>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <span className="subtle">
              {chosen.length} questions selected · start with four or five
            </span>
            <Button
              primary
              type="submit"
              disabled={
                busy ||
                !chosen.length ||
                !personId ||
                questions.some(
                  (q) => chosen.includes(q.id) && !q.question.trim(),
                )
              }
            >
              {busy ? "Preparing…" : "Prepare kickoff request"}
            </Button>
          </div>
        </form>
      </Panel>
      <Panel
        title="After the leadership meeting"
        subtitle="Record what leadership agreed before asking the wider team about their work."
      >
        <div className="research-stages">
          <div>
            <h3>1. Capture the meeting</h3>
            <p>
              Add the transcript or meeting notes as leadership evidence. Record
              goals, constraints, scope and open questions.
            </p>
            <Button onClick={captureMeeting}>
              Add leadership meeting notes
            </Button>
          </div>
          <div>
            <h3>2. Agree the roster</h3>
            <p>
              Import the agreed people, departments and manager emails. Review
              the roster; public research does not establish reporting lines.
            </p>
            <Button onClick={roster}>Review people in scope</Button>
          </div>
          <div>
            <h3>3. Ask about the work</h3>
            <p>
              Use the meeting evidence and each person’s role to draft their
              questions. Review each request before sending its private link.
            </p>
            <Button onClick={interviews}>Prepare team interviews</Button>
          </div>
        </div>
      </Panel>
    </>
  );
}
