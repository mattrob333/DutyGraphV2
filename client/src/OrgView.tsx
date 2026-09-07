import { OrgChartCanvas } from "./OrgChartCanvas.tsx";
import { useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { Badge, Button, Empty, State } from "./ui.tsx";
import { OrgResponsibilities } from "./OrgResponsibilities.tsx";

export function OrgView({
  records,
  selected,
  select,
  open,
}: {
  records: RecordRow[];
  selected: string | null;
  select: (id: string | null) => void;
  open: (record: RecordRow) => void;
}) {
  const [mode, setMode] = useState("reporting");
  const [department, setDepartment] = useState("");
  const people = records.filter((r) => r.kind === "person");
  const tasks = records.filter((r) => r.kind === "task");
  const dutyRecords = records.filter((r) => r.kind === "duty");
  const teams = [
    ...new Set(people.map((p) => p.data.team || "Team not recorded")),
  ];
  const current = people.find((p) => p.id === selected);
  const reports = people.filter((p) =>
    people.some(
      (manager) => manager.id === p.data.managerId && manager.id !== p.id,
    ),
  );
  const relatedTasks = (id: string) =>
    tasks.filter((t) => t.data.ownerId === id || t.data.performerId === id);
  const role = (task: RecordRow, personId: string) =>
    task.data.ownerId === personId
      ? task.data.performerId === personId
        ? "Accountable & performs"
        : "Accountable"
      : "Performs";
  const personCard = (person: RecordRow) => {
    const work = relatedTasks(person.id);
    const duties = [...new Set(work.map((t) => t.data.duty))];
    return (
      <button
        className={`org-person ${selected === person.id ? "selected" : ""}`}
        onClick={() => select(person.id)}
        aria-label={`View responsibilities for ${person.title}`}
      >
        <span className="org-person-heading">
          <strong>{person.title}</strong>
          <span className="org-avatar">
            {person.title
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")}
          </span>
        </span>
        <span className="org-role">{person.data.role}</span>
        <span className="org-work-summary">
          {work.length
            ? `${work.length} ${work.length === 1 ? "task" : "tasks"} · ${duties.length} ${duties.length === 1 ? "duty" : "duties"}`
            : "No tasks linked yet"}
        </span>
        {!!duties.length && (
          <span className="org-duty-preview">
            {duties.slice(0, 2).join(" · ")}
            {duties.length > 2 ? ` +${duties.length - 2} more` : ""}
          </span>
        )}
      </button>
    );
  };
  const work = current ? relatedTasks(current.id) : [];
  const duties = [
    ...new Set(work.map((t) => t.data.duty || "Duty not recorded")),
  ];
  return (
    <div className="org-workspace">
      <div className="org-intro">
        <div>
          <h2>Who owns the work?</h2>
          <p>
            Explore the reporting chart, then select a person to see their
            duties and task responsibilities.
          </p>
        </div>
        <div className="tabs" aria-label="Organization view">
          <button
            className={mode === "reporting" ? "active" : ""}
            onClick={() => setMode("reporting")}
          >
            Reporting chart
          </button>

          <button
            className={mode === "duties" ? "active" : ""}
            onClick={() => {
              setMode("duties");
              select(null);
            }}
          >
            Teams & duties
          </button>
          <button
            className={mode === "teams" ? "active" : ""}
            onClick={() => setMode("teams")}
          >
            By team
          </button>
        </div>
      </div>
      <div className="org-scope-note">
        {reports.length
          ? `${reports.length} reporting relationships recorded. These reflect the roster and have not been independently confirmed.`
          : "No reporting lines recorded yet. Team membership does not establish who reports to whom."}
      </div>
      <div className="org-body">
        <div className="org-content">
          {mode === "duties" ? (
            <OrgResponsibilities
              key={department}
              initialTeam={department}
              records={records}
              open={open}
            />
          ) : mode === "teams" ? (
            <div className="org-teams">
              {teams.map((team) => {
                const members = people.filter(
                  (p) => (p.data.team || "Team not recorded") === team,
                );
                const memberIds = new Set(members.map((p) => p.id));
                const owned = tasks.filter((t) =>
                  memberIds.has(t.data.ownerId),
                ).length;
                return (
                  <section className="org-team" key={team}>
                    <header>
                      <h3>{team}</h3>
                      <Badge>
                        {members.length}{" "}
                        {members.length === 1 ? "person" : "people"}
                      </Badge>
                    </header>
                    <p>
                      {owned
                        ? `Accountable for ${owned} ${owned === 1 ? "task" : "tasks"}`
                        : "Task accountability not recorded"}
                    </p>
                    <div className="org-members">
                      {members.map((p) => (
                        <div key={p.id}>{personCard(p)}</div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <OrgChartCanvas people={people} tasks={tasks} select={select} />
          )}
        </div>
        {current && (
          <aside className="org-inspector graph-inspector">
            <div className="eyebrow">{current.data.team}</div>
            <h2>{current.title}</h2>
            <p>{current.data.role}</p>
            <State value={current.state} />
            <h3>Reports to</h3>
            <p>
              {people.find((p) => p.id === current.data.managerId)?.title ||
                (current.data.managerId
                  ? "Manager outside this roster"
                  : "Not recorded")}
            </p>
            <h3>Duties & task responsibilities</h3>
            {dutyRecords
              .filter((d) => d.data.ownerId === current.id)
              .map((d) => (
                <button
                  className="inspector-link"
                  key={d.id}
                  onClick={() => open(d)}
                >
                  <small>Recorded duty ownership claim</small>
                  {d.title}
                  <State value={d.state} />
                </button>
              ))}
            {!work.length && (
              <p>No tasks have been linked to this person yet.</p>
            )}
            {duties.map((duty) => (
              <section className="org-duty" key={duty}>
                <h4>{duty}</h4>
                {work
                  .filter((t) => (t.data.duty || "Duty not recorded") === duty)
                  .map((t) => (
                    <button
                      className="inspector-link"
                      key={t.id}
                      onClick={() => open(t)}
                    >
                      <small>{role(t, current.id)}</small>
                      {t.title}
                      <State value={t.state} />
                    </button>
                  ))}
              </section>
            ))}
            {!!work.length && (
              <p className="subtle">
                Duties group the recorded tasks. Task confirmation does not
                confirm ownership of an entire duty.
              </p>
            )}
            <Button primary onClick={() => open(current)}>
              Open person record
            </Button>
            <button className="text-link" onClick={() => select(null)}>
              Close inspector
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
