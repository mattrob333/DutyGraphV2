import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  primaryControls,
}: {
  records: RecordRow[];
  profile?: BusinessProfile | null;
  filter: string;
  query: string;
  open: (r: RecordRow) => void;
  primaryControls?: ReactNode;
}) {
  const [workflow, setWorkflow] = useState("all");
  const [mode, setMode] = useState("all");
  const [personId, setPersonId] = useState("all");
  const [team, setTeam] = useState("all");
  const [grouping, setGrouping] = useState<"stage" | "team">("stage");
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
  const teamName = (person?: RecordRow) =>
    person?.data.team?.trim() || "Team not recorded";
  const teams = useMemo(
    () => [...new Set(people.map(teamName))].sort((a, b) => a.localeCompare(b)),
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
  useEffect(() => {
    setTeam((current) =>
      current === "all" || teams.includes(current) ? current : "all",
    );
  }, [teams]);

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
        task.data.performerId === personId) &&
      (team === "all" ||
        [task.data.ownerId, task.data.performerId].some(
          (id) => teamName(peopleById.get(id)) === team,
        )),
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
    filter !== "all" ||
    query ||
    mode !== "all" ||
    personId !== "all" ||
    team !== "all";
  const activeAdvancedFilters = [
    workflow !== "all",
    personId !== "all",
    team !== "all",
    mode !== "all",
  ].filter(Boolean).length;
  const person = (id: string) => peopleById.get(id);
  const dutyLabel = (task: RecordRow) => {
    const linked = dutiesByTask.get(task.id)?.map((duty) => duty.title) || [];
    return linked.join(" · ") || task.data.duty || "Duty not recorded";
  };
  const visiblePeople = people.filter(
    (candidate) =>
      (team === "all" || teamName(candidate) === team) &&
      (personId === "all" || candidate.id === personId),
  );
  const teamGroups = teams
    .filter((teamName) => team === "all" || teamName === team)
    .map((teamName) => ({
      teamName,
      people: visiblePeople.filter(
        (person) =>
          teamName === person.data.team?.trim() ||
          (!person.data.team?.trim() && teamName === "Team not recorded"),
      ),
    }))
    .filter((group) => group.people.length > 0);
  const unownedTasks = visibleTasks.filter(
    (task) => !task.data.ownerId && !task.data.performerId,
  );

  return (
    <section className="task-library" aria-label="Task card library">
      <div className="library-controls">
        {primaryControls}
        <div className="task-grouping" role="group" aria-label="Group tasks">
          <button
            aria-pressed={grouping === "stage"}
            className={grouping === "stage" ? "active" : ""}
            onClick={() => setGrouping("stage")}
          >
            By stage
          </button>
          <button
            aria-pressed={grouping === "team"}
            className={grouping === "team" ? "active" : ""}
            onClick={() => setGrouping("team")}
          >
            By team
          </button>
        </div>
        <details className="library-advanced-filters">
          <summary>
            Filters{activeAdvancedFilters ? ` · ${activeAdvancedFilters}` : ""}
          </summary>
          <div>
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
            {teams.length > 0 && (
              <label>
                Team
                <select
                  aria-label="Task card team"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                >
                  <option value="all">All recorded teams</option>
                  {teams.map((teamName) => (
                    <option key={teamName} value={teamName}>
                      {teamName}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
            {activeAdvancedFilters > 0 && (
              <button
                className="text-link"
                onClick={() => {
                  setWorkflow("all");
                  setPersonId("all");
                  setTeam("all");
                  setMode("all");
                }}
              >
                Reset
              </button>
            )}
          </div>
        </details>
      </div>

      {model.streams.length > 1 && (
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
      {model.streams.length === 1 && (
        <p className="library-stream-context">{model.streams[0].name}</p>
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

      {grouping === "stage" ? (
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
      ) : (
        <div
          className="team-work-board"
          aria-label="People, duties, and tasks by team"
        >
          {teamGroups.map((group) => (
            <section className="team-work-group" key={group.teamName}>
              <header>
                <p className="eyebrow">TEAM</p>
                <h2>{group.teamName}</h2>
              </header>
              <div className="team-work-people">
                {group.people.map((personRecord) => {
                  const personTasks = visibleTasks.filter(
                    (task) =>
                      task.data.ownerId === personRecord.id ||
                      task.data.performerId === personRecord.id,
                  );
                  const personDuties = model.all.duties.filter(
                    (duty) =>
                      duty.data.ownerId === personRecord.id ||
                      (duty.data.taskIds || []).some((id: string) =>
                        personTasks.some((task) => task.id === id),
                      ),
                  );
                  return (
                    <article className="team-person-card" key={personRecord.id}>
                      <button
                        className="team-person-heading"
                        onClick={() => open(personRecord)}
                      >
                        <span>
                          <strong>{personRecord.title}</strong>
                          <small>
                            {personRecord.data.role || "Role not recorded"}
                          </small>
                        </span>
                        <ArrowUpRight size={15} />
                      </button>
                      <div className="team-work-section">
                        <small>DUTIES</small>
                        {personDuties.length ? (
                          personDuties.map((duty) => (
                            <button key={duty.id} onClick={() => open(duty)}>
                              {duty.title}
                            </button>
                          ))
                        ) : (
                          <span>None recorded</span>
                        )}
                      </div>
                      <div className="team-work-section">
                        <small>TASKS</small>
                        {personTasks.length ? (
                          personTasks.map((task) => (
                            <button key={task.id} onClick={() => open(task)}>
                              {task.title}
                            </button>
                          ))
                        ) : (
                          <span>No matching tasks</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
          {unownedTasks.length > 0 && (
            <section className="team-work-group team-work-unowned">
              <header>
                <p className="eyebrow">NEEDS OWNERSHIP</p>
                <h2>Work without a recorded owner</h2>
              </header>
              <div className="team-work-section">
                {unownedTasks.map((task) => (
                  <button key={task.id} onClick={() => open(task)}>
                    {task.title}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
