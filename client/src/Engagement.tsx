import { useState } from "react";
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
}: {
  company: Company;
  records: RecordRow[];
  create: (kind: string) => void;
  open: (r: RecordRow) => void;
  refresh: () => Promise<void>;
}) {
  const people = records.filter((r) => r.kind === "person");
  const plans = records.filter((r) => r.kind === "engagement");
  const coverage = coverageSummary(
    people,
    records.filter((r) => r.kind === "task"),
    records.filter((r) => r.kind === "request"),
  );
  const [personId, setPersonId] = useState("");
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
        title="One executive kickoff. Several connected lenses."
        subtitle="Choose a focused question set. One returned account remains one evidence source, even when it informs several analyses."
      >
        <ErrorBox error={error} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const selected = kickoffQuestions.filter((q) =>
                chosen.includes(q.id),
              );
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
                    questionPlanVersion: "executive-kickoff-v1",
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
            {kickoffQuestions.map((q) => (
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
                  <strong>{q.question}</strong>
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
              disabled={busy || !chosen.length || !personId}
            >
              {busy ? "Preparing…" : "Prepare kickoff request"}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
