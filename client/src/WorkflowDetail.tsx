import { useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { expireSteps, type CaseStep } from "../../shared/workflow.ts";
import { api } from "./api.ts";
import { Button, Field, ErrorBox, State, Badge, date } from "./ui.tsx";
export function WorkflowDetail({
  record: r,
  company,
  records,
  open,
  refresh,
}: {
  record: RecordRow;
  company: string;
  records: RecordRow[];
  open: (r: RecordRow) => void;
  refresh: () => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [routes, setRoutes] = useState<Record<string, string[]>>({});
  const call = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (r.kind === "workflow")
    return (
      <>
        <ErrorBox error={error} />
        {r.state === "reviewed" && (
          <form
            className="workflow-start"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget));
              void call(async () => {
                const created = await api(
                  `/v1/companies/${company}/workflows/${r.id}/cases`,
                  "POST",
                  { ...d, expectedVersion: r.version },
                );
                await refresh();
                open(created);
              });
            }}
          >
            <h3>Start a manual work case</h3>
            <p className="subtle">
              Track a piece of work through reviewed human steps. Each
              completion needs an observation or receipt reference.
            </p>
            <Field label="Case name">
              <input
                name="title"
                required
                minLength={3}
                placeholder="Supplier packet — case 001"
              />
            </Field>
            <Field label="Starting input or case reference">
              <textarea name="inputReference" required minLength={5} />
            </Field>
            <Button type="submit" primary disabled={busy}>
              Start case
            </Button>
          </form>
        )}
      </>
    );
  const steps = expireSteps(r.data.steps, Date.now()),
    definition = r.data.definition;
  const action = (step: CaseStep, name: string) =>
    call(async () => {
      await api(
        `/v1/companies/${company}/workflows/cases/${r.id}/actions`,
        "POST",
        {
          expectedVersion: r.version,
          stepId: step.id,
          action: name,
          note: notes[step.id],
          routeIds:
            routes[step.id] ??
            (definition.links.filter((l: any) => l.from === step.id).length ===
            1
              ? definition.links
                  .filter((l: any) => l.from === step.id)
                  .map((l: any) => l.id)
              : []),
        },
      );
      setNotes({});
      setRoutes({});
    });
  return (
    <>
      <ErrorBox error={error} />
      <div className="notice">
        Manual work observations · workflow version {r.data.workflowVersion}.
        The case stores checkpoints and does not run external tools.
      </div>
      <p>
        <strong>Starting input:</strong> {r.data.inputReference}
      </p>
      <div className="workflow-steps">
        {steps.map((step, index) => {
          const outgoing = definition.links.filter(
              (l: any) => l.from === step.id,
            ),
            selected =
              routes[step.id] ??
              (outgoing.length === 1 ? outgoing.map((l: any) => l.id) : []),
            task = records.find((t) => t.id === step.id),
            version = definition.taskBindings.find(
              (b: any) => b.id === step.id,
            )?.version;
          return (
            <section className="workflow-step" key={step.id}>
              <div className="toolbar">
                <Badge>
                  Step {index + 1} · task v{version}
                </Badge>
                <State value={step.state} />
              </div>
              <h3>
                {definition.taskBindings.find((b: any) => b.id === step.id)
                  ?.title ||
                  task?.title ||
                  step.id}
              </h3>
              <p className="subtle">
                Attempt {step.attempts} / {definition.maxAttempts}
                {step.dueAt
                  ? ` · deadline ${new Date(step.dueAt).toLocaleString()}`
                  : ""}
              </p>
              {step.note && <p>{step.note}</p>}
              {!["complete", "cancelled"].includes(r.state) &&
                ["ready", "failed", "escalated"].includes(step.state) && (
                  <>
                    <Field
                      label={`Observation or receipt for ${task?.title || "step"}`}
                    >
                      <textarea
                        value={notes[step.id] || ""}
                        onChange={(e) =>
                          setNotes({ ...notes, [step.id]: e.target.value })
                        }
                        placeholder="What happened, who performed it, and where is the completion evidence?"
                      />
                    </Field>
                    {step.state === "ready" && !!outgoing.length && (
                      <fieldset className="workflow-routes">
                        <legend>Handoffs whose conditions are met</legend>
                        {outgoing.map((l: any) => (
                          <label className="check" key={l.id}>
                            <input
                              type="checkbox"
                              checked={selected.includes(l.id)}
                              onChange={(e) =>
                                setRoutes({
                                  ...routes,
                                  [step.id]: e.target.checked
                                    ? [...selected, l.id]
                                    : selected.filter(
                                        (id: string) => id !== l.id,
                                      ),
                                })
                              }
                            />
                            <span>
                              {l.condition}
                              <small>
                                Continue to{" "}
                                {records.find((t) => t.id === l.to)?.title ||
                                  "next task"}
                              </small>
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    )}
                    <div className="actions">
                      {step.state === "ready" ? (
                        <>
                          <Button
                            primary
                            disabled={
                              busy || (notes[step.id] || "").trim().length < 5
                            }
                            onClick={() => void action(step, "complete")}
                          >
                            Record human completion
                          </Button>
                          <Button
                            disabled={
                              busy || (notes[step.id] || "").trim().length < 5
                            }
                            onClick={() => void action(step, "fail")}
                          >
                            Record failure
                          </Button>
                        </>
                      ) : (
                        <Button
                          disabled={
                            busy ||
                            step.attempts >= definition.maxAttempts ||
                            (notes[step.id] || "").trim().length < 5
                          }
                          onClick={() => void action(step, "retry")}
                        >
                          Record another manual attempt
                        </Button>
                      )}
                    </div>
                  </>
                )}
            </section>
          );
        })}
      </div>
      {!["complete", "cancelled"].includes(r.state) && (
        <details className="disclosure">
          <summary>Close this case without completing it</summary>
          <Field label="Reason to close the case">
            <textarea
              value={notes.cancel || ""}
              onChange={(e) => setNotes({ ...notes, cancel: e.target.value })}
            />
          </Field>
          <Button
            disabled={busy || (notes.cancel || "").trim().length < 5}
            onClick={() =>
              void call(async () => {
                await api(
                  `/v1/companies/${company}/workflows/cases/${r.id}/actions`,
                  "POST",
                  {
                    expectedVersion: r.version,
                    action: "cancel",
                    note: notes.cancel,
                  },
                );
              })
            }
          >
            Close case
          </Button>
        </details>
      )}
      <h3>Case history</h3>
      {r.data.events.map((event: any, index: number) => (
        <div className="history-entry" key={index}>
          <strong>
            {event.action} · {date(event.at)}
          </strong>
          <p>{event.note}</p>
        </div>
      ))}
    </>
  );
}
