import { useEffect, useMemo, useState } from "react";
import {
  UserRound,
  Bot,
  UsersRound,
  ArrowUpRight,
  FileText,
  AppWindow,
  ShieldAlert,
} from "lucide-react";
import {
  siGooglesheets,
  siGoogledrive,
  siGmail,
  siSap,
  siNotion,
} from "simple-icons";
import type { BusinessProfile } from "../../shared/business-types.ts";
import type { RecordRow } from "../../shared/domain.ts";
import { stageWorkMap } from "../../shared/stage-work-map.ts";
import { taskMode, selectTasks } from "../../shared/task-presentation.ts";
import { State } from "./ui.tsx";

const software = [
  { names: ["google sheets", "sheets"], icon: siGooglesheets },
  { names: ["google drive", "drive"], icon: siGoogledrive },
  { names: ["gmail", "google mail"], icon: siGmail },
  { names: ["sap", "sap erp"], icon: siSap },
  { names: ["notion"], icon: siNotion },
];
const inactiveStates = new Set(["withdrawn", "retracted", "superseded"]);

export function SoftwareChips({ systems }: { systems: string[] }) {
  return (
    <div className="software-chips">
      {systems.length ? (
        systems.map((name, index) => {
          const item = software.find((x) =>
            x.names.includes(name.trim().toLowerCase()),
          );
          return (
            <span
              className="software-chip"
              key={name + "-" + index}
              title={name + " · described software; connection not verified"}
            >
              {item ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{
                    color:
                      item.icon.hex === "000000"
                        ? "var(--ink)"
                        : "#" + item.icon.hex,
                  }}
                >
                  <path fill="currentColor" d={item.icon.path} />
                </svg>
              ) : (
                <AppWindow size={13} aria-hidden="true" />
              )}
              {name}
            </span>
          );
        })
      ) : (
        <span className="subtle">Software not recorded</span>
      )}
    </div>
  );
}

export function ModeBadge({ mode }: { mode: string }) {
  const m = taskMode(mode);
  const Icon =
    m.id === "human"
      ? UserRound
      : m.id === "ai"
        ? Bot
        : m.id === "hybrid"
          ? UsersRound
          : ShieldAlert;
  return (
    <span className={"mode-badge mode-" + m.id} title={m.detail}>
      <Icon size={14} aria-hidden="true" />
      {m.label}
    </span>
  );
}

type TaskLane = {
  id: string;
  streamName?: string;
  stageName: string;
  order?: number;
  tasks: RecordRow[];
  unassigned?: boolean;
};

/**
 * This library reads saved membership via stageWorkMap. It deliberately does
 * not organize cards from legacy valueStage, titles, departments, or guesses.
 */
export function TaskCards({
  records,
  profile,
  filter,
  query,
  open,
}: {
  records: RecordRow[];
  profile?: BusinessProfile | null;
  filter: string;
  query: string;
  open: (r: RecordRow) => void;
}) {
  const [workflow, setWorkflow] = useState("all");
  const [mode, setMode] = useState("all");
  const [personId, setPersonId] = useState("all");
  const [selectedStreamIds, setSelectedStreamIds] = useState<string[] | null>(
    null,
  );
  const currentRecords = useMemo(() => {
    const latest = new Map<string, RecordRow>();
    for (const record of records) {
      const old = latest.get(record.id);
      if (!old || (record.version || 0) >= (old.version || 0))
        latest.set(record.id, record);
    }
    return [...latest.values()].filter(
      (record) => !inactiveStates.has(record.state),
    );
  }, [records]);
  const model = useMemo(
    () => stageWorkMap(currentRecords, profile),
    [currentRecords, profile],
  );
  const flows = currentRecords.filter((r) => r.kind === "workflow");
  const people = currentRecords.filter((r) => r.kind === "person");
  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );
  const dutiesByTask = useMemo(() => {
    const result = new Map<string, RecordRow[]>();
    for (const duty of model.all.duties)
      for (const taskId of duty.data.taskIds || [])
        result.set(taskId, [...(result.get(taskId) || []), duty]);
    return result;
  }, [model.all.duties]);

  useEffect(() => {
    const available = model.streams.map((stream) => stream.id);
    setSelectedStreamIds((current) => {
      if (current === null) return available.length ? available : null;
      const retained = current.filter((id) => available.includes(id));
      return retained;
    });
  }, [model.streams]);

  const selectedTaskIds = new Set(
    selectTasks(currentRecords, workflow, filter, query, mode).map(
      (task) => task.id,
    ),
  );
  const visibleTasks = model.all.tasks.filter(
    (task) =>
      selectedTaskIds.has(task.id) &&
      (personId === "all" ||
        task.data.ownerId === personId ||
        task.data.performerId === personId),
  );
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id));
  const activeStreams = model.streams.filter(
    (stream) =>
      selectedStreamIds === null || selectedStreamIds.includes(stream.id),
  );
  const lanes: TaskLane[] = [
    ...activeStreams.flatMap((stream) =>
      stream.stages.map((stage, index) => ({
        id: stream.id + ":" + stage.id,
        streamName: stream.name,
        stageName: stage.name,
        order: index + 1,
        tasks: stage.tasks.filter((task) => visibleTaskIds.has(task.id)),
      })),
    ),
    {
      id: "unassigned",
      stageName: "Unassigned",
      tasks: model.unmapped.tasks.filter((task) => visibleTaskIds.has(task.id)),
      unassigned: true,
    },
  ];
  const placementCount = lanes.reduce(
    (total, lane) => total + lane.tasks.length,
    0,
  );
  const shownTaskCount = new Set(
    lanes.flatMap((lane) => lane.tasks.map((task) => task.id)),
  ).size;
  const hasSavedStreams = model.streams.length > 0;
  const stageCount = activeStreams.reduce(
    (total, stream) => total + stream.stages.length,
    0,
  );
  const streamHidden = shownTaskCount < visibleTasks.length;
  const repeatedAcrossStages = placementCount > shownTaskCount;
  const filtered =
    filter !== "all" || query || mode !== "all" || personId !== "all";
  const person = (id: string) => peopleById.get(id);
  const dutyLabel = (task: RecordRow) => {
    const linked = dutiesByTask.get(task.id)?.map((duty) => duty.title) || [];
    return linked.join(" · ") || task.data.duty || "Duty not recorded";
  };

  return (
    <section className="task-library" aria-label="Task card library">
      <div className="library-controls">
        <label>
          Workflow
          <select
            aria-label="Task card workflow"
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
          >
            <option value="all">All workflows</option>
            {flows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Person
          <select
            aria-label="Task card person"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            <option value="all">All recorded people</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.title}
              </option>
            ))}
          </select>
        </label>
        <div className="mode-filters" aria-label="Filter by operating mode">
          {[
            ["all", "Everyone"],
            ["human", "Human"],
            ["ai", "AI"],
            ["hybrid", "AI + human review"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={mode === id}
              className={mode === id ? "active" : ""}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {hasSavedStreams && (
        <div className="stream-picker" aria-label="Business streams to show">
          <span>Business streams</span>
          {model.streams.map((stream) => {
            const selected =
              selectedStreamIds === null ||
              selectedStreamIds.includes(stream.id);
            return (
              <button
                key={stream.id}
                aria-pressed={selected}
                onClick={() =>
                  setSelectedStreamIds((current) => {
                    const currentIds =
                      current || model.streams.map((item) => item.id);
                    return selected
                      ? currentIds.filter((id) => id !== stream.id)
                      : [...currentIds, stream.id];
                  })
                }
              >
                {stream.name}
                {stream.primary && <small>Primary</small>}
              </button>
            );
          })}
        </div>
      )}

      <p className="library-explainer">
        {hasSavedStreams ? (
          <>
            {streamHidden ? (
              <>
                {shownTaskCount} shown of {visibleTasks.length} matching{" "}
                {visibleTasks.length === 1 ? "task" : "tasks"}
              </>
            ) : (
              <>
                {shownTaskCount} task {shownTaskCount === 1 ? "card" : "cards"}{" "}
                · {stageCount} business {stageCount === 1 ? "stage" : "stages"}
              </>
            )}
            {repeatedAcrossStages && (
              <>
                {" · "}
                <span title="A task is counted once for every saved business-stage assignment.">
                  {placementCount} placements
                </span>
              </>
            )}
          </>
        ) : (
          "No business streams are saved for this company yet. Work stays in Unassigned until an advisor records a business-stage assignment."
        )}
      </p>

      <div
        className="value-board business-stage-board"
        tabIndex={0}
        aria-label="Saved business stages and unassigned task cards; scroll horizontally for more"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          event.currentTarget.scrollBy({
            left: event.key === "ArrowRight" ? 300 : -300,
          });
        }}
      >
        {lanes.map((lane) => (
          <section
            className={
              "value-column" + (lane.unassigned ? " unassigned-column" : "")
            }
            key={lane.id}
          >
            <header>
              <span className="stage-number">
                {lane.unassigned ? "—" : String(lane.order).padStart(2, "0")}
              </span>
              <div>
                {lane.streamName && (
                  <span className="stream-name">{lane.streamName}</span>
                )}
                <h2>{lane.stageName}</h2>
                {lane.unassigned && <p>No saved business-stage assignment</p>}
              </div>
              <span
                className="stage-count"
                title="Task placements in this lane"
              >
                {lane.tasks.length}
              </span>
            </header>
            {lane.tasks.map((task) => {
              const owner = person(task.data.ownerId);
              return (
                <button
                  key={task.id}
                  className={
                    "work-card mode-" +
                    taskMode(task.data.mode).id +
                    (task.data.conflict ? " has-conflict" : "")
                  }
                  onClick={() => open(task)}
                >
                  <div className="card-top">
                    <ModeBadge mode={task.data.mode} />
                    <span className="card-version">v{task.version}</span>
                  </div>
                  <span className="card-role">
                    Role · {owner?.data.role || "Role not recorded"}
                  </span>
                  <span className="card-duty">Duty · {dutyLabel(task)}</span>
                  <h3>{task.title}</h3>
                  <div className="card-output">
                    <small>DELIVERS</small>
                    <p>{task.data.output}</p>
                  </div>
                  <SoftwareChips systems={task.data.systems || []} />
                  <div className="card-person">
                    <UserRound size={14} />
                    <span>
                      {owner?.title || "Owner unresolved"}
                      <small>Accountable human</small>
                    </span>
                  </div>
                  <footer>
                    <State value={task.state} />
                    <span>
                      <FileText size={12} />
                      {task.data.evidenceIds?.length || 0}
                      <ArrowUpRight size={15} />
                    </span>
                  </footer>
                </button>
              );
            })}
            {!lane.tasks.length && (
              <div className="mapping-space">
                {lane.unassigned
                  ? "No unassigned tasks"
                  : filtered
                    ? "No matching tasks"
                    : "No tasks assigned yet"}
                .
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
