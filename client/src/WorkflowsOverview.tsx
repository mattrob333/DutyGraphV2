import { ArrowRight, CheckCircle2, Clock3, GitBranch } from "lucide-react";
import type { RecordRow } from "../../shared/domain.ts";
import { State } from "./ui.tsx";
export function WorkflowsOverview({
  records,
  open,
}: {
  records: RecordRow[];
  open: (r: RecordRow) => void;
}) {
  const flows = records.filter((r) => r.kind === "workflow"),
    cases = records.filter((r) => r.kind === "case");
  return (
    <>
      <div className="workflow-summary">
        <span>
          <strong>{flows.length}</strong> workflow definitions
        </span>
        <span>
          <strong>
            {
              cases.filter(
                (r) => r.data.executionMode !== "illustrative_snapshot",
              ).length
            }
          </strong>{" "}
          manual work cases
        </span>
        <span>
          <strong>
            {
              cases.filter(
                (r) => r.data.executionMode === "illustrative_snapshot",
              ).length
            }
          </strong>{" "}
          read-only examples
        </span>
      </div>
      <h2 className="section-heading">Choose a workflow</h2>
      <div className="workflow-tiles">
        {flows.map((f) => (
          <button className="workflow-tile" key={f.id} onClick={() => open(f)}>
            <div className="toolbar">
              <GitBranch size={20} />
              <State value={f.state} />
            </div>
            <h3>{f.title}</h3>
            <p>{f.data.purpose}</p>
            <footer>
              {f.data.taskIds.length} steps · {f.data.handoffIds.length}{" "}
              handoffs <ArrowRight size={16} />
            </footer>
          </button>
        ))}
      </div>
      {!flows.length && (
        <p>
          No workflows recorded. Add task cards and connect their handoffs
          first.
        </p>
      )}
      <h2 className="section-heading">Follow a piece of work</h2>
      <p className="subtle">
        A workflow defines the path. A case tracks one order, request or other
        item on that path.
      </p>
      <div className="case-tiles">
        {cases.map((c) => {
          const steps = c.data.steps || [],
            done = steps.filter((s: any) => s.state === "completed").length,
            current = steps.find((s: any) =>
              ["ready", "escalated", "failed"].includes(s.state),
            );
          const title = c.data.definition?.taskBindings?.find(
            (b: any) => b.id === current?.id,
          )?.title;
          return (
            <button key={c.id} className="case-tile" onClick={() => open(c)}>
              <div className="toolbar">
                <State value={c.state} />
                <span>
                  {done} / {steps.length} steps complete
                  {c.data.executionMode === "illustrative_snapshot"
                    ? " · illustrative"
                    : ""}
                </span>
              </div>
              <h3>{c.title}</h3>
              <p>{c.data.summary || c.data.inputReference}</p>
              <div
                className="case-progress"
                aria-label={`${done} of ${steps.length} steps complete`}
              >
                {steps.map((s: any) => (
                  <span key={s.id} className={s.state} title={s.state} />
                ))}
              </div>
              <div className="case-next">
                {current ? <Clock3 size={16} /> : <CheckCircle2 size={16} />}
                <span>
                  <small>{current ? "NEXT STEP" : "CASE STATUS"}</small>
                  {title || c.state}
                </span>
                <ArrowRight size={16} />
              </div>
            </button>
          );
        })}
      </div>
      {!cases.length && (
        <p>
          No cases yet. Review a workflow, then open it to start a manual case.
        </p>
      )}
    </>
  );
}
