import { useEffect, useMemo, useState } from "react";
import { ArrowRight, X, Check } from "lucide-react";
import { schemas, type RecordRow } from "../../shared/domain.ts";
import type { BusinessProfile } from "../../shared/business-types.ts";
import { cobaltStageExample } from "../../shared/stage-work-map-example.ts";
import { stageWorkMap, selectStageWork } from "../../shared/stage-work-map.ts";
import { OrgChartCanvas } from "./OrgChartCanvas.tsx";
import { CompanyWorkMap } from "./CompanyWorkMap.tsx";
import { Button, ErrorBox, Modal } from "./ui.tsx";
import { api } from "./api.ts";
import "./stage-work-map.css";

type Link = { streamId: string; stageId: string };
export function StageWorkMap({
  companyId,
  profile,
  sandbox,
  records,
  open,
  refresh,
  openFlow,
}: {
  companyId: string;
  profile?: BusinessProfile;
  sandbox?: boolean;
  records: RecordRow[];
  open: (record: RecordRow) => void;
  refresh?: () => Promise<void>;
  openFlow: (id: string) => void;
}) {
  const [streamId, setStreamId] = useState("");
  const [stageId, setStageId] = useState("");
  const [selected, setSelected] = useState("");
  const [unmapped, setUnmapped] = useState(false);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const example = useMemo(
    () => cobaltStageExample(records, profile, sandbox),
    [records, profile, sandbox],
  );
  const model = useMemo(
    () => stageWorkMap(example.records, example.profile),
    [example],
  );
  const canAssign = !!refresh && !example.illustrative;
  const stream =
    model.streams.find((s) => s.id === streamId) || model.streams[0];
  const stage = stream?.stages.find((s) => s.id === stageId);
  const scope = unmapped
    ? model.unmapped
    : stage
      ? selectStageWork(model, stream?.id, stage.id)
      : model.all;
  const people = useMemo(
    () =>
      records.filter(
        (r) =>
          r.kind === "person" &&
          !["withdrawn", "retracted", "superseded"].includes(r.state),
      ),
    [records],
  );
  const allTasks = model.all.tasks;
  const selectPerson = (id: string) => {
    setSelected(id);
    if (window.matchMedia("(max-width:760px)").matches)
      requestAnimationFrame(() =>
        document
          .getElementById("swm-person-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
  };
  const current = scope.people.find((p) => p.personId === selected);
  const selectedPerson = people.find((p) => p.id === selected);
  const focus = Object.fromEntries(
    scope.people.map((p) => [
      p.personId,
      {
        dutyCount: p.dutyIds.length,
        taskCount: p.taskIds.length,
        roles: [
          ...(p.ownedDutyIds.length || p.ownedTaskIds.length
            ? ["Owns work"]
            : []),
          ...(p.performedTaskIds.length ? ["Does the work"] : []),
        ],
      },
    ]),
  );
  const title = unmapped
    ? "Work not assigned to a stage"
    : stage?.name || "All company work";
  const choose = (id: string) => {
    setStageId(id);
    setUnmapped(false);
    setSelected("");
    setNotice("");
  };
  useEffect(() => {
    if (stageId && !stage) setStageId("");
  }, [stageId, stage]);
  const startEdit = (r: RecordRow) => {
    setEditing(r);
    setLinks(r.data.businessStageLinks || []);
    setError("");
    setNotice("");
  };
  const sortedLinks = (items: Link[]) =>
    items
      .map((l) => `${l.streamId}:${l.stageId}`)
      .sort()
      .join("|");
  const changed =
    !!editing &&
    sortedLinks(links) !== sortedLinks(editing.data.businessStageLinks || []);
  const save = async () => {
    if (!editing || !changed) return;
    setBusy(true);
    setError("");
    try {
      const shape = schemas[editing.kind as "duty" | "task"].shape;
      const data = Object.fromEntries(
        Object.keys(shape)
          .filter((k) => k in editing.data)
          .map((k) => [k, editing.data[k]]),
      );
      await api(`/v1/companies/${companyId}/records/${editing.id}`, "PATCH", {
        expectedVersion: editing.version,
        data: { ...data, businessStageLinks: links },
      });
      await refresh?.();
      setEditing(null);
      setNotice("Stage assignments saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const taskRow = (t: RecordRow) => (
    <li key={t.id} className="swm-task">
      <button onClick={() => open(records.find((r) => r.id === t.id) || t)}>
        <span>{t.title}</span>
        <ArrowRight size={14} />
      </button>
      <small>
        {t.data.performerId === selected
          ? "Does the work"
          : t.data.ownerId === selected
            ? "Owns work"
            : "Part of this duty"}
      </small>
      {!!stream && canAssign && (
        <button className="swm-text" onClick={() => startEdit(t)}>
          Assign stages
        </button>
      )}
    </li>
  );
  return (
    <section className="stage-work-map" aria-label="Work stages and people">
      <header className="swm-intro">
        <div>
          <p className="eyebrow">FROM BUSINESS STAGES TO PEOPLE</p>
          <h2>Who makes the work happen?</h2>
          <p>
            Select a stage. See the people involved. Explore their duties and
            tasks.
          </p>
        </div>
      </header>
      {example.illustrative && (
        <p className="swm-example">
          Illustrative stage assignments · Cobalt sample. No company records are
          changed.
        </p>
      )}
      <div className="swm-streams" aria-label="Business streams">
        {model.streams.length > 1 &&
          model.streams.map((s, i) => (
            <button
              key={s.id}
              aria-pressed={stream?.id === s.id}
              onClick={() => {
                setStreamId(s.id);
                choose("");
              }}
            >
              <strong>{s.name}</strong>
              <small>{i === 0 ? "Primary stream" : "Supporting stream"}</small>
            </button>
          ))}
      </div>
      {stream ? (
        <div className="swm-stage-picker">
          <div className="swm-stage-heading">
            <span>{stream.name}</span>
            <button
              aria-pressed={!stage && !unmapped}
              onClick={() => choose("")}
            >
              All company work
            </button>
          </div>
          <ol aria-label="Select a business stage">
            {stream.stages.map((s, i) => (
              <li key={s.id}>
                <button
                  aria-pressed={stage?.id === s.id && !unmapped}
                  onClick={() => choose(s.id)}
                >
                  <span className="swm-step">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <strong>{s.name}</strong>
                  <small>
                    {s.people.length}{" "}
                    {s.people.length === 1 ? "person" : "people"} ·{" "}
                    {s.tasks.length} {s.tasks.length === 1 ? "task" : "tasks"}
                  </small>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="swm-empty">
          <h3>Add your business stages in Discovery</h3>
          <p>
            The people and work are available below. Save a business stream in
            Discovery to explore it by stage.
          </p>
          <a href="#discovery">
            Open Discovery <ArrowRight size={14} />
          </a>
        </div>
      )}
      <div className="swm-scope">
        <div aria-live="polite">
          <h3>{title}</h3>
          <p>
            {scope.people.length}{" "}
            {scope.people.length === 1 ? "person" : "people"} involved ·{" "}
            {scope.duties.length}{" "}
            {scope.duties.length === 1 ? "duty" : "duties"}·{" "}
            {scope.tasks.length} {scope.tasks.length === 1 ? "task" : "tasks"}
          </p>
        </div>
        {(model.unmapped.tasks.length > 0 ||
          model.unmapped.duties.length > 0) && (
          <button
            className={unmapped ? "active" : ""}
            aria-pressed={unmapped}
            onClick={() => {
              setUnmapped(!unmapped);
              setSelected("");
            }}
          >
            {model.unmapped.tasks.length}{" "}
            {model.unmapped.tasks.length === 1 ? "task" : "tasks"} /{" "}
            {model.unmapped.duties.length}{" "}
            {model.unmapped.duties.length === 1 ? "duty" : "duties"} not
            assigned <ArrowRight size={14} />
          </button>
        )}
      </div>
      <span className="sr-only" role="status">
        {selectedPerson ? `Showing ${selectedPerson.title} in ${title}` : ""}
      </span>
      {notice && (
        <p role="status" className="swm-notice">
          <Check size={16} />
          {notice}
        </p>
      )}
      <div className="swm-explore">
        <div className="swm-chart">
          <div className="swm-chart-heading">
            <strong>The people</strong>
            <span>Lines show who reports to whom.</span>
          </div>
          {people.length ? (
            <OrgChartCanvas
              people={people}
              tasks={allTasks}
              select={selectPerson}
              focus={focus}
              activePersonId={selected}
              stableViewport
              neutral
            />
          ) : (
            <p className="swm-empty">
              Add the team roster in Discovery to build the reporting chart.
            </p>
          )}
        </div>
        <aside
          id="swm-person-detail"
          className="swm-detail"
          aria-label="Selected person's work"
        >
          <div className="swm-detail-heading">
            <p className="eyebrow">
              {selectedPerson ? "PERSON & WORK" : "EXPLORE THIS STAGE"}
            </p>
            {selected && (
              <button
                aria-label="Clear selected person"
                onClick={() => setSelected("")}
              >
                <X size={17} />
              </button>
            )}
          </div>
          {selectedPerson ? (
            <>
              <h3>{selectedPerson.title}</h3>
              <p>
                {selectedPerson.data.role} · {selectedPerson.data.team}
              </p>
              {current ? (
                <>
                  <p className="swm-counts">
                    {current.dutyIds.length}{" "}
                    {current.dutyIds.length === 1 ? "duty" : "duties"} ·{" "}
                    {current.taskIds.length}{" "}
                    {current.taskIds.length === 1 ? "task" : "tasks"}
                  </p>
                  {scope.duties
                    .filter((d) => current.dutyIds.includes(d.id))
                    .map((d) => (
                      <details className="swm-duty" key={d.id} open>
                        <summary>{d.title}</summary>
                        <small>
                          {d.data.ownerId === selected
                            ? "Owns this duty"
                            : "Contributes tasks"}
                        </small>
                        <ul>
                          {scope.tasks
                            .filter(
                              (t) =>
                                d.data.taskIds?.includes(t.id) &&
                                current.taskIds.includes(t.id),
                            )
                            .map(taskRow)}
                        </ul>
                        {!scope.tasks.some(
                          (t) =>
                            d.data.taskIds?.includes(t.id) &&
                            current.taskIds.includes(t.id),
                        ) && (
                          <p>
                            No tasks linked to this person under this duty in
                            the current view.
                          </p>
                        )}
                        <div className="swm-duty-actions">
                          <button
                            onClick={() =>
                              open(records.find((r) => r.id === d.id) || d)
                            }
                          >
                            Open duty
                          </button>
                          {stream && canAssign && (
                            <button onClick={() => startEdit(d)}>
                              Assign stages
                            </button>
                          )}
                        </div>
                      </details>
                    ))}
                  {scope.tasks.some(
                    (t) =>
                      current.taskIds.includes(t.id) &&
                      !scope.duties.some((d) => d.data.taskIds?.includes(t.id)),
                  ) && (
                    <div className="swm-duty">
                      <h4>Other tasks</h4>
                      <ul>
                        {scope.tasks
                          .filter(
                            (t) =>
                              current.taskIds.includes(t.id) &&
                              !scope.duties.some((d) =>
                                d.data.taskIds?.includes(t.id),
                              ),
                          )
                          .map(taskRow)}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="swm-empty">
                  No work is linked to this person in the selected stage.
                </p>
              )}
              <button className="swm-text" onClick={() => open(selectedPerson)}>
                Open person record <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <h3>
                {scope.people.length
                  ? "Select a person"
                  : "No people linked yet"}
              </h3>
              <p>
                {scope.people.length
                  ? "Choose a highlighted person to see their work here."
                  : "Assign duties or tasks to this stage. People appear from the owners and performers recorded on that work."}
              </p>
              <div className="swm-person-list">
                {scope.people.map((p) => (
                  <button
                    key={p.personId}
                    onClick={() => selectPerson(p.personId)}
                  >
                    <span>
                      {p.person.title}
                      <small>
                        {p.dutyIds.length}{" "}
                        {p.dutyIds.length === 1 ? "duty" : "duties"} ·{" "}
                        {p.taskIds.length}{" "}
                        {p.taskIds.length === 1 ? "task" : "tasks"}
                      </small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
      {(scope.unownedTaskIds.length > 0 || scope.unownedDutyIds.length > 0) && (
        <details className="swm-gaps">
          <summary>
            {scope.unownedTaskIds.length}{" "}
            {scope.unownedTaskIds.length === 1 ? "task" : "tasks"} /{" "}
            {scope.unownedDutyIds.length}{" "}
            {scope.unownedDutyIds.length === 1 ? "duty" : "duties"} without a
            recorded owner
          </summary>
          {[...scope.tasks, ...scope.duties]
            .filter((r) =>
              [...scope.unownedTaskIds, ...scope.unownedDutyIds].includes(r.id),
            )
            .map((r) => (
              <div key={r.id} className="swm-assign-row">
                <button onClick={() => open(r)}>
                  {r.title} <ArrowRight size={14} />
                </button>
                {stream && canAssign && (
                  <button onClick={() => startEdit(r)}>Assign stages</button>
                )}
              </div>
            ))}
        </details>
      )}
      {!!model.unmapped.tasks.length || !!model.unmapped.duties.length ? (
        <details className="swm-gaps" open={unmapped}>
          <summary>Assign work to business stages</summary>
          <p>
            Choose where each duty belongs. Its tasks follow that assignment
            unless a task has its own stages. Work can belong to more than one
            stage.
          </p>
          {[...model.unmapped.duties, ...model.unmapped.tasks].map((r) => (
            <div className="swm-assign-row" key={r.id}>
              <span>
                <small>{r.kind}</small>
                {r.title}
              </span>
              {stream && canAssign ? (
                <button onClick={() => startEdit(r)}>Assign stages</button>
              ) : (
                <button onClick={() => open(r)}>Open record</button>
              )}
            </div>
          ))}
        </details>
      ) : null}
      {!!model.invalidStageLinks.length && (
        <details className="swm-gaps">
          <summary>Repair assignments to removed stages</summary>
          {[...new Set(model.invalidStageLinks.map((l) => l.recordId))].map(
            (id) => {
              const r = records.find((r) => r.id === id)!;
              return (
                <div key={id} className="swm-assign-row">
                  <span>{r.title}</span>
                  <button onClick={() => (canAssign ? startEdit(r) : open(r))}>
                    Review assignments
                  </button>
                </div>
              );
            },
          )}
        </details>
      )}
      <section className="swm-flows">
        <div>
          <p className="eyebrow">FOLLOW THE WORK</p>
          <h3>Task flows{stage ? ` in ${stage.name}` : ""}</h3>
          <p>These connections show how work passes between people.</p>
        </div>
        {scope.flows.length ? (
          <div className="swm-flow-list">
            {scope.flows.map((f) => (
              <button
                key={f.workflow.id}
                onClick={() => openFlow(f.workflow.id)}
              >
                <strong>{f.workflow.title}</strong>
                <span>{f.taskIds.length} tasks in this view</span>
                <span>
                  Open full flow <ArrowRight size={14} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p>No recorded task flows for this selection yet.</p>
        )}
      </section>
      <details className="swm-legacy">
        <summary>Detailed task map, gaps & AI opportunities</summary>
        <CompanyWorkMap records={records} open={open} />
      </details>
      {editing && (
        <Modal
          title="Assign business stages"
          className="swm-assignment"
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <p>{editing.title}</p>
          <p className="subtle">
            {editing.kind === "duty"
              ? "Tasks in this duty follow these stages unless assigned separately."
              : "These selections override the task’s duty stages. Clear all to follow its duties."}
          </p>
          <p className="subtle">
            Saving a change creates a new record version. Reviewed work and
            linked records may need a fresh review.
          </p>
          <ErrorBox error={error} />
          {links
            .filter(
              (l) =>
                !model.streams.some(
                  (s) =>
                    s.id === l.streamId &&
                    s.stages.some((st) => st.id === l.stageId),
                ),
            )
            .map((l) => (
              <div
                className="swm-assign-row"
                key={`${l.streamId}:${l.stageId}`}
              >
                <span>
                  Removed stage: {l.streamId} / {l.stageId}
                </span>
                <button
                  onClick={() => setLinks((v) => v.filter((x) => x !== l))}
                >
                  Remove
                </button>
              </div>
            ))}
          {model.streams.map((s) => (
            <fieldset key={s.id}>
              <legend>{s.name}</legend>
              {s.stages.map((st) => {
                const checked = links.some(
                  (l) => l.streamId === s.id && l.stageId === st.id,
                );
                return (
                  <label key={st.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setLinks((v) =>
                          checked
                            ? v.filter(
                                (l) =>
                                  l.streamId !== s.id || l.stageId !== st.id,
                              )
                            : [...v, { streamId: s.id, stageId: st.id }],
                        )
                      }
                    />
                    {st.name}
                  </label>
                );
              })}
            </fieldset>
          ))}
          <div className="swm-duty-actions">
            <Button disabled={busy} onClick={() => setLinks([])}>
              Clear assignments
            </Button>
            <Button
              primary
              disabled={busy || !changed}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save assignments"}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
