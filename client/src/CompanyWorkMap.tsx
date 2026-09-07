import { useMemo, useState } from "react";
import {
  ArrowRight,
  FileText,
  CircleAlert,
  UserRound,
  Sparkles,
} from "lucide-react";
import type { RecordRow } from "../../shared/domain.ts";
import { companyWorkMap } from "../../shared/company-work-map.ts";
import "./company-work-map.css";

export function CompanyWorkMap({
  records,
  open,
}: {
  records: RecordRow[];
  open: (r: RecordRow) => void;
}) {
  const map = useMemo(() => companyWorkMap(records), [records]);
  const [overlay, setOverlay] = useState("ownership");
  const [selected, setSelected] = useState("");
  const [meeting, setMeeting] = useState(false);
  const task = map.tasks.find((t) => t.id === selected);
  const person = (id: string) => map.byId.get(id)?.title || "Owner to confirm";
  const isGap = (t: RecordRow) => map.missingOwners.some((x) => x.id === t.id);
  const isAI = (t: RecordRow) => map.aiCandidates.some((x) => x.id === t.id);
  const highlight = (t: RecordRow) =>
    overlay === "ownership"
      ? isGap(t) || t.data.conflict
      : overlay === "ai"
        ? isAI(t)
        : false;
  const related = task
    ? records.filter(
        (r) =>
          r.kind === "handoff" &&
          [r.data.sourceTaskId, r.data.targetTaskId].includes(task.id) &&
          !["withdrawn", "retracted"].includes(r.state),
      )
    : [];
  return (
    <section className="work-map" aria-label="Company Work Map">
      <div className="wm-intro">
        <div>
          <p className="eyebrow">THE BUSINESS AT A GLANCE</p>
          <h2>See how work moves through the company.</h2>
          <p>Follow a flow. Open a task. Decide what needs attention.</p>
        </div>
        <button onClick={() => setMeeting(!meeting)} aria-pressed={meeting}>
          {meeting ? "Return to work map" : "Prepare client readout"}
        </button>
      </div>
      <div className="wm-summary">
        <span>
          <strong>{map.flows.length}</strong> recorded flows
        </span>
        <span>
          <strong>{map.tasks.length}</strong> task descriptions
        </span>
        <span>
          <strong>{map.missingOwners.length}</strong> owners to confirm
        </span>
        <span>
          <strong>{map.aiCandidates.length}</strong> proposed AI tasks
        </span>
      </div>
      <p className="wm-note">
        These are recorded descriptions of work. Case examples are labeled
        separately. Task confirmation records a person’s understanding; it does
        not grant an agent permission.
      </p>
      {meeting ? (
        <div className="wm-readout">
          <h2>Decisions for the next client meeting</h2>
          <p>
            Review these questions with the team before prescribing a solution.
          </p>
          <h3>1. Confirm who owns the work</h3>
          {map.missingOwners.length ? (
            map.missingOwners.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelected(t.id);
                  setMeeting(false);
                }}
              >
                {t.title} · Assign an accountable owner <ArrowRight size={14} />
              </button>
            ))
          ) : (
            <p>
              Every recorded task has a named owner. Confirm that the team
              agrees.
            </p>
          )}
          <h3>2. Test the explanation for delays</h3>
          {map.findings.length ? (
            map.findings.map((f) => (
              <article key={f.id}>
                <h4>{f.title}</h4>
                <p>{f.data.pressure}</p>
                <p>
                  <strong>Another explanation:</strong> {f.data.alternative}
                </p>
                <p>
                  <strong>What to measure:</strong> {f.data.discriminator}
                </p>
                <button onClick={() => open(f)}>
                  Review finding and evidence
                </button>
              </article>
            ))
          ) : (
            <p>
              No constraint hypothesis has been recorded. Agree which outcome
              matters and what to measure.
            </p>
          )}
          <h3>3. Review AI opportunities and boundaries</h3>
          <p>
            {map.aiCandidates.length} tasks have a proposed AI mode. Agree the
            scope, human review, and required permissions before proceeding.
          </p>
          <button
            onClick={() => {
              setOverlay("ai");
              setMeeting(false);
            }}
          >
            Review proposed AI tasks
          </button>
          <h3>4. Agree the next review</h3>
          <p>
            Name a responsible person, a measurement window, and the evidence
            needed to judge whether the change helped.
          </p>
        </div>
      ) : (
        <>
          <div className="wm-controls" role="group" aria-label="Map overlay">
            {[
              ["ownership", "Ownership & gaps"],
              ["ai", "AI opportunities"],
              ["plain", "Work only"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={overlay === id}
                onClick={() => setOverlay(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {map.findings[0] && (
            <aside className="wm-priority">
              <CircleAlert size={22} />
              <div>
                <small>
                  PRIORITY TO INVESTIGATE · NOT A MEASURED BOTTLENECK
                </small>
                <h3>{map.findings[0].title}</h3>
                <p>{map.findings[0].data.discriminator}</p>
                <button onClick={() => open(map.findings[0])}>
                  See the hypothesis and alternatives
                </button>
              </div>
            </aside>
          )}
          <div className={`wm-layout${task ? " has-selection" : ""}`}>
            <div className="wm-flows">
              {!map.flows.length && (
                <div className="wm-empty">
                  <h3>Your work map starts with reviewed tasks.</h3>
                  <p>
                    Complete discovery, then connect the task handoffs into
                    workflows. Business-type templates are starting suggestions,
                    not recorded company activity.
                  </p>
                </div>
              )}
              {map.flows.map(
                ({ flow, layers, steps, links, cases, missingTaskIds }, fi) => (
                  <article
                    className="wm-flow"
                    key={flow.id}
                    style={
                      {
                        "--flow-color": ["#9dc5de", "#c4b7df", "#b8cdb0"][
                          fi % 3
                        ],
                      } as React.CSSProperties
                    }
                  >
                    <header>
                      <div>
                        <small>
                          FLOW {String(fi + 1).padStart(2, "0")} ·{" "}
                          {person(flow.data.ownerId)}
                        </small>
                        <h3>{flow.title}</h3>
                        <p>{flow.data.purpose}</p>
                      </div>
                      <button onClick={() => open(flow)}>
                        Open flow <ArrowRight size={14} />
                      </button>
                    </header>
                    <div
                      className="wm-stages"
                      tabIndex={0}
                      aria-label={`${flow.title} steps`}
                    >
                      {layers.map((layer, i) => (
                        <div className="wm-stage" key={i}>
                          <span className="wm-stage-number">
                            {String(i + 1).padStart(2, "0")}
                            {layer.length > 1 ? " · branches" : ""}
                          </span>
                          {layer.map((t) => (
                            <button
                              key={t.id}
                              className={`wm-stop${highlight(t) ? " highlighted" : ""}${selected === t.id ? " selected" : ""}`}
                              onClick={() => setSelected(t.id)}
                              aria-pressed={selected === t.id}
                            >
                              <strong>{t.title}</strong>
                              <span>
                                <UserRound size={13} />
                                {person(t.data.ownerId)}
                              </span>
                              {overlay === "ownership" &&
                                (isGap(t) || t.data.conflict) && (
                                  <em>
                                    <CircleAlert size={13} />
                                    {isGap(t)
                                      ? "Owner to confirm"
                                      : "Conflicting accounts"}
                                  </em>
                                )}
                              {overlay === "ai" && isAI(t) && (
                                <em>
                                  <Sparkles size={13} />
                                  AI scope proposed
                                </em>
                              )}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                    {missingTaskIds.length > 0 && (
                      <p className="wm-note">
                        {missingTaskIds.length} referenced tasks are
                        unavailable. This flow is incomplete.
                      </p>
                    )}
                    <details>
                      <summary>
                        {links.length} recorded handoffs · inspect conditions
                      </summary>
                      <div className="wm-handoffs">
                        {links.map((h) => (
                          <button key={h.id} onClick={() => open(h)}>
                            <strong>
                              {map.byId.get(h.data.sourceTaskId)?.title} →{" "}
                              {map.byId.get(h.data.targetTaskId)?.title}
                            </strong>
                            <span>{h.data.condition}</span>
                          </button>
                        ))}
                      </div>
                    </details>
                    <footer>
                      <span>
                        {steps.length} tasks · Timing has not been calculated
                      </span>
                      <details>
                        <summary>Follow a work item ({cases.length})</summary>
                        {cases.length ? (
                          cases.map((c) => (
                            <button key={c.id} onClick={() => open(c)}>
                              {c.title} ·{" "}
                              {c.data.executionMode === "illustrative_snapshot"
                                ? "Fictional example"
                                : "Recorded case"}
                            </button>
                          ))
                        ) : (
                          <p>No individual cases recorded yet.</p>
                        )}
                      </details>
                    </footer>
                  </article>
                ),
              )}
              <details className="wm-connections">
                <summary>
                  Connections between flows ({map.crossFlowLinks.length})
                </summary>
                {map.crossFlowLinks.length ? (
                  map.crossFlowLinks.map((h) => (
                    <button key={h.id} onClick={() => open(h)}>
                      {h.title} · {h.data.condition}
                    </button>
                  ))
                ) : (
                  <p>
                    No cross-flow handoff has been recorded. Similar names or
                    nearby steps do not establish a dependency.
                  </p>
                )}
              </details>
              {map.unassigned.length > 0 && (
                <details className="wm-connections">
                  <summary>
                    {map.unassigned.length} tasks not yet connected to a flow
                  </summary>
                  {map.unassigned.map((t) => (
                    <button key={t.id} onClick={() => setSelected(t.id)}>
                      {t.title}
                    </button>
                  ))}
                </details>
              )}
            </div>
            {task && (
              <aside className="wm-task" aria-label="Selected task">
                <div className="wm-task-top">
                  <small>TASK CARD</small>
                  <button
                    aria-label="Close task preview"
                    onClick={() => setSelected("")}
                  >
                    Close
                  </button>
                </div>
                <h3>{task.title}</h3>
                <p>{task.data.duty}</p>
                <dl>
                  {[
                    ["Accountable person", person(task.data.ownerId)],
                    ["Performer", person(task.data.performerId)],
                    ["Why this matters", task.data.purpose],
                    ["Starts when", task.data.trigger],
                    ["What comes in", task.data.inputs],
                    ["Actions", task.data.instructions],
                    ["What comes out", task.data.output],
                    ["Where it goes", task.data.destination],
                    ["Software", (task.data.systems || []).join(", ")],
                    ["Human decision", task.data.humanGate],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || "Not yet recorded"}</dd>
                    </div>
                  ))}
                </dl>
                <h4>AI opportunity</h4>
                <p>
                  {isAI(task)
                    ? "This task has a proposed AI scope. Verify identity, access, and approval before delegation."
                    : "No AI scope proposed for this task."}
                </p>
                {task.data.allowed?.length > 0 && (
                  <p>
                    <strong>Proposed boundary:</strong>{" "}
                    {task.data.allowed.join("; ")}
                  </p>
                )}
                <button onClick={() => open(task)}>
                  Open full task and review boundaries
                </button>
                <h4>Handoffs</h4>
                {related.map((h) => (
                  <button key={h.id} onClick={() => open(h)}>
                    {h.title} <ArrowRight size={14} />
                  </button>
                ))}
                <details>
                  <summary>
                    <FileText size={14} /> How we know (
                    {task.data.evidenceIds?.length || 0})
                  </summary>
                  {(task.data.evidenceIds || []).map((id: string) => {
                    const e = map.byId.get(id);
                    return e ? (
                      <button key={id} onClick={() => open(e)}>
                        {e.title}
                      </button>
                    ) : (
                      <p key={id}>Referenced evidence unavailable</p>
                    );
                  })}
                </details>
              </aside>
            )}
          </div>
        </>
      )}
    </section>
  );
}
