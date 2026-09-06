import { useState } from "react";
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
import type { RecordRow } from "../../shared/domain.ts";
import {
  stages,
  taskMode,
  taskStage,
  selectTasks,
} from "../../shared/task-presentation.ts";
import { State } from "./ui.tsx";
const software = [
  { names: ["google sheets", "sheets"], icon: siGooglesheets },
  { names: ["google drive", "drive"], icon: siGoogledrive },
  { names: ["gmail", "google mail"], icon: siGmail },
  { names: ["sap", "sap erp"], icon: siSap },
  { names: ["notion"], icon: siNotion },
];
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
              key={`${name}-${index}`}
              title={`${name} · described software; connection not verified`}
            >
              {item ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{
                    color:
                      item.icon.hex === "000000"
                        ? "var(--ink)"
                        : `#${item.icon.hex}`,
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
  const m = taskMode(mode),
    Icon =
      m.id === "human"
        ? UserRound
        : m.id === "ai"
          ? Bot
          : m.id === "hybrid"
            ? UsersRound
            : ShieldAlert;
  return (
    <span className={`mode-badge mode-${m.id}`} title={m.detail}>
      <Icon size={14} aria-hidden="true" />
      {m.label}
    </span>
  );
}
export function TaskCards({
  records,
  filter,
  query,
  open,
}: {
  records: RecordRow[];
  filter: string;
  query: string;
  open: (r: RecordRow) => void;
}) {
  const [workflow, setWorkflow] = useState("all"),
    [mode, setMode] = useState("all");
  const flows = records.filter((r) => r.kind === "workflow");
  const tasks = selectTasks(records, workflow, filter, query, mode);
  const person = (id: string) =>
    records.find((r) => r.kind === "person" && r.id === id)?.title ||
    "Owner unresolved";
  const visibleStages = stages.filter(
    (s) =>
      s.id !== "unmapped" || tasks.some((t) => taskStage(t) === "unmapped"),
  );
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
            {flows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
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
        <span className="subtle">{tasks.length} task cards</span>
      </div>
      <p className="library-explainer">
        Follow the value from left to right. Categories organize the work; the
        workflow graph shows the actual handoffs. AI labels describe the
        proposed role, not a live deployment.
      </p>
      <div
        className="value-board"
        tabIndex={0}
        aria-label="Value-chain stages; scroll horizontally for more"
      >
        {visibleStages.map((stage, index) => (
          <section className="value-column" key={stage.id}>
            <header>
              <span className="stage-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2>{stage.label}</h2>
                <p>{stage.description}</p>
              </div>
              <span className="stage-count">
                {tasks.filter((t) => taskStage(t) === stage.id).length}
              </span>
            </header>
            {tasks
              .filter((t) => taskStage(t) === stage.id)
              .map((t) => (
                <button
                  key={t.id}
                  className={`work-card mode-${taskMode(t.data.mode).id}${t.data.conflict ? " has-conflict" : ""}`}
                  onClick={() => open(t)}
                >
                  <div className="card-top">
                    <ModeBadge mode={t.data.mode} />
                    <span className="card-version">v{t.version}</span>
                  </div>
                  <span className="card-duty">{t.data.duty}</span>
                  <h3>{t.title}</h3>
                  <div className="card-output">
                    <small>DELIVERS</small>
                    <p>{t.data.output}</p>
                  </div>
                  <SoftwareChips systems={t.data.systems || []} />
                  <div className="card-person">
                    <UserRound size={14} />
                    <span>
                      {person(t.data.ownerId)}
                      <small>Accountable human</small>
                    </span>
                  </div>
                  <footer>
                    <State value={t.state} />
                    <span>
                      <FileText size={12} />
                      {t.data.evidenceIds?.length || 0}
                      <ArrowUpRight size={15} />
                    </span>
                  </footer>
                </button>
              ))}
            {!tasks.some((t) => taskStage(t) === stage.id) && (
              <div className="mapping-space">
                No tasks mapped here
                {filter !== "all" || query || mode !== "all"
                  ? " for these filters"
                  : ""}
                .<small>This does not establish that work is missing.</small>
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
