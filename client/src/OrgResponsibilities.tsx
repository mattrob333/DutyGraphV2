import { useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { wrapNodeTitle } from "./graph-layout.ts";
import { Badge, Button, State } from "./ui.tsx";

export function OrgResponsibilities({
  records,
  open,
}: {
  records: RecordRow[];
  open: (r: RecordRow) => void;
}) {
  const people = records.filter((r) => r.kind === "person");
  const tasks = records.filter(
    (r) => r.kind === "task" && !["retracted", "withdrawn"].includes(r.state),
  );
  const duties = records.filter(
    (r) => r.kind === "duty" && !["retracted", "withdrawn"].includes(r.state),
  );
  const personIds = new Set(people.map((p) => p.id));
  const unassigned = [
    ...tasks.filter(
      (t) =>
        !personIds.has(t.data.ownerId) || !personIds.has(t.data.performerId),
    ),
    ...duties.filter((d) => !personIds.has(d.data.ownerId)),
  ];
  const teams = [
    ...new Set(people.map((p) => p.data.team || "Team not recorded")),
  ];
  const teamPeople = (team: string) =>
    people.filter((p) => (p.data.team || "Team not recorded") === team);
  const teamTasks = (team: string) => {
    const ids = new Set(teamPeople(team).map((p) => p.id));
    return tasks.filter(
      (t) => ids.has(t.data.ownerId) || ids.has(t.data.performerId),
    );
  };
  const [chosen, setChosen] = useState("");
  const team =
    (teams.includes(chosen) ? chosen : "") ||
    [...teams].sort((a, b) => teamTasks(b).length - teamTasks(a).length)[0];
  const members = teamPeople(team),
    memberIds = new Set(members.map((p) => p.id));
  const work = teamTasks(team);
  const groups = [
    ...new Set(work.map((t) => t.data.duty || "Duty not recorded")),
  ].map((title) => {
    const items = work.filter(
      (t) => (t.data.duty || "Duty not recorded") === title,
    );
    const record = duties.find(
      (d) =>
        d.title === title &&
        d.data.taskIds.some((id: string) => items.some((t) => t.id === id)),
    );
    const owners = [
      ...new Set(
        items.map(
          (t) =>
            people.find((p) => p.id === t.data.ownerId)?.title ||
            "Owner not recorded",
        ),
      ),
    ];
    return {
      title,
      items,
      record,
      owners,
      owns: items.some((t) => memberIds.has(t.data.ownerId)),
      performs: items.some((t) => memberIds.has(t.data.performerId)),
    };
  });
  for (const d of duties.filter(
    (d) =>
      memberIds.has(d.data.ownerId) &&
      !groups.some((g) => g.record?.id === d.id),
  ))
    groups.push({
      title: d.title,
      items: tasks.filter((t) => d.data.taskIds.includes(t.id)),
      record: d,
      owners: [
        people.find((p) => p.id === d.data.ownerId)?.title ||
          "Owner not recorded",
      ],
      owns: true,
      performs: false,
    });
  const selectedIndex = teams.indexOf(team),
    width = Math.max(980, teams.length * 226 + 60),
    rootX = 60 + selectedIndex * 226 + 98;
  const visible = groups.slice(0, 6),
    columns = Math.min(3, visible.length || 1),
    gap = 30,
    cardW = Math.min(350, (width - 120 - gap * (columns - 1)) / columns);
  return (
    <div className="responsibility-view">
      {!!unassigned.length && (
        <section className="org-unassigned">
          <h3>
            Unassigned responsibilities{" "}
            <Badge tone="amber">{unassigned.length}</Badge>
          </h3>
          <p>
            These records still need an accountable owner or performer. They
            remain visible here even when no team can be connected.
          </p>
          {unassigned.map((r) => (
            <button
              className="inspector-link"
              key={r.id}
              onClick={() => open(r)}
            >
              <small>
                {!personIds.has(r.data.ownerId)
                  ? "Accountable owner missing"
                  : "Performer missing"}
              </small>
              {r.title}
            </button>
          ))}
        </section>
      )}
      <p className="subtle">
        Select a team to follow its duties. Connections describe recorded task
        responsibility; team positions do not imply a reporting hierarchy.
      </p>
      <div className="responsibility-map-scroll">
        <svg
          className="responsibility-map"
          viewBox={`0 0 ${width} ${visible.length > 3 ? 650 : 430}`}
          style={{ minWidth: width }}
          aria-label="Teams and their recorded duties"
        >
          <text x="60" y="35" className="graph-column-label">
            TEAMS IN SCOPE
          </text>
          {teams.map((name, i) => (
            <g
              key={name}
              role="button"
              tabIndex={0}
              aria-label={`Explore ${name} duties`}
              className={`graph-node ${name === team ? "selected" : ""}`}
              transform={`translate(${60 + i * 226},65)`}
              onClick={() => setChosen(name)}
              onKeyDown={(e) => {
                if (["Enter", " "].includes(e.key)) {
                  e.preventDefault();
                  setChosen(name);
                }
              }}
            >
              <rect width="196" height="84" rx="8" />
              <text x="15" y="31" className="node-title">
                {name.length > 22 ? name.slice(0, 20) + "…" : name}
              </text>
              <text x="15" y="58" className="node-subtitle">
                {teamPeople(name).length} people · {teamTasks(name).length}{" "}
                tasks
              </text>
            </g>
          ))}
          {visible.map((g, i) => {
            const row = Math.floor(i / 3),
              col = i % 3,
              x =
                (width - columns * cardW - (columns - 1) * gap) / 2 +
                col * (cardW + gap),
              y = 290 + row * 215,
              mid = x + cardW / 2;
            // Lower cards receive lines down a free side gutter rather than through
            // the upper card. Only the selected team's relationships are drawn.
            const laneY = 194 + i * 12,
              gutter = x - 15;
            const d = row
              ? `M${rootX},149 V${laneY} H${gutter} V${y - 22} H${mid} V${y}`
              : `M${rootX},149 V${laneY} H${mid} V${y}`;
            return (
              <g key={g.title}>
                <path d={d} className="graph-edge" />
                <circle cx={mid} cy={y} r="3" className="responsibility-port" />
                <g
                  role="button"
                  tabIndex={0}
                  className="graph-node"
                  transform={`translate(${x},${y})`}
                  aria-label={`Open ${g.record ? "duty" : "task group"}: ${g.title}`}
                  onClick={() => open(g.record || g.items[0])}
                  onKeyDown={(e) => {
                    if (["Enter", " "].includes(e.key)) {
                      e.preventDefault();
                      open(g.record || g.items[0]);
                    }
                  }}
                >
                  <rect width={cardW} height="132" rx="8" />
                  <text x="16" y="24" className="node-kind">
                    {g.record ? "RECORDED DUTY" : "TASK GROUP"} ·{" "}
                    {g.items.length} TASKS
                  </text>
                  {wrapNodeTitle(g.title)
                    .slice(0, 2)
                    .map((line, j) => (
                      <text
                        key={j}
                        x="16"
                        y={49 + j * 20}
                        className="node-title"
                      >
                        {line}
                      </text>
                    ))}
                  <text x="16" y="98" className="node-subtitle">
                    {g.owns && g.performs
                      ? "Team owns & performs work"
                      : g.owns
                        ? "Team accountable for work"
                        : "Team performs work"}
                  </text>
                  <text x="16" y="118" className="node-subtitle">
                    Owners: {g.owners.join(", ").slice(0, 35)}
                    {g.owners.join(", ").length > 35 ? "…" : ""}
                  </text>
                </g>
              </g>
            );
          })}
          {!visible.length && (
            <text x="60" y="265" className="node-title">
              No duties or task responsibilities recorded for this team yet.
            </text>
          )}
        </svg>
      </div>
      <section className="responsibility-register">
        <div className="section-heading">
          <h3>{team} · responsibilities</h3>
          <Badge>{groups.length} duty groups</Badge>
        </div>
        {members.length > 0 && (
          <p className="subtle">
            People: {members.map((p) => p.title).join(", ")}.
          </p>
        )}
        {groups.length > 6 && (
          <p className="subtle">
            The map shows six groups; the complete list is below.
          </p>
        )}
        {groups.map((g) => (
          <details key={g.title} open={groups.length === 1}>
            <summary>
              {g.title}{" "}
              <span>
                {g.items.length} tasks ·{" "}
                {g.record ? "Duty record" : "Grouped from task descriptions"}
              </span>
            </summary>
            {g.record && (
              <Button onClick={() => open(g.record!)}>Open duty record</Button>
            )}
            {g.items.map((t) => (
              <button
                className="inspector-link"
                key={t.id}
                onClick={() => open(t)}
              >
                {t.title}
                <State value={t.state} />
              </button>
            ))}
          </details>
        ))}
      </section>
    </div>
  );
}
