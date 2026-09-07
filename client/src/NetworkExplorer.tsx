import { useEffect, useState } from "react";
import { ReactFlow, Controls, Background, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Button, ErrorBox } from "./ui.tsx";
import "./company-visuals.css";
const questions = [
  ["controls", "Which agents touch control-related work?"],
  ["people", "What work depends on this person?"],
  ["ownership", "Which tasks need an owner?"],
  ["ai", "Which tasks are marked for AI assistance?"],
];
const labels: Record<string, string> = {
  ACCOUNTABLE_FOR: "owns",
  PERFORMS: "performs",
  CONTAINS: "contains",
  BOUND_TO: "proposed for",
  REPORTS_TO: "reports to",
  USES: "uses",
  MAPPED_TO: "mapped to",
};
export default function NetworkExplorer({
  company,
  records,
  open,
}: {
  company: string;
  records: RecordRow[];
  open: (r: RecordRow) => void;
}) {
  const [graph, setGraph] = useState<any>(null),
    [error, setError] = useState(""),
    [question, setQuestion] = useState("controls"),
    [focus, setFocus] = useState(""),
    [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    setGraph(null);
    setError("");
    setFocus("");
    api(`/v1/companies/${company}/graph?limit=150`)
      .then((g) => {
        if (active) setGraph(g);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [company, records]);
  const active = records.filter(
    (r) => !["retracted", "withdrawn"].includes(r.state),
  );
  const byId = new Map(active.map((r) => [r.id, r]));
  const sourceEdges = (graph?.edges || []).filter(
    (e: any) =>
      labels[e.relationship] && byId.has(e.source) && byId.has(e.target),
  );
  const controlTasks = new Set(
    active
      .filter((r) => r.kind === "task" && r.data.controlAreas?.length)
      .map((r) => r.id),
  );
  const candidates = active.filter((r) =>
    question === "people"
      ? r.kind === "person"
      : question === "ownership"
        ? r.kind === "task" && !r.data.ownerId
        : question === "ai"
          ? r.kind === "task" && String(r.data.mode).startsWith("ai_")
          : r.kind === "agent" &&
            sourceEdges.some(
              (e: any) =>
                e.source === r.id &&
                e.relationship === "BOUND_TO" &&
                controlTasks.has(e.target),
            ),
  );
  const matches = candidates.filter((r) =>
    (r.title + " " + (r.data.team || ""))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const picked = byId.get(focus) || matches[0];
  const direct = picked
    ? sourceEdges.filter(
        (e: any) => e.source === picked.id || e.target === picked.id,
      )
    : [];
  const neighborIds = [
    ...new Set<string>(direct.flatMap((e: any) => [e.source, e.target])),
  ]
    .filter((id) => id !== picked?.id)
    .slice(0, 4);
  const visible = new Set([picked?.id, ...neighborIds]);
  const nodes: any[] = picked
    ? [
        {
          id: picked.id,
          position: { x: 0, y: Math.max(0, (neighborIds.length - 1) * 65) },
          data: {
            label: `${picked.kind.toUpperCase()} · ${picked.state}\n${picked.title}`,
          },
          style: {
            width: 220,
            whiteSpace: "pre-line",
          fontSize: 16,
            border: "2px solid #b9d3c4",
            background: "#303738",
            color: "#fff",
            padding: 16,
          },
          sourcePosition: "right",
          targetPosition: "left",
        },
      ]
    : [];
  neighborIds.forEach((id, i) => {
    const r = byId.get(id)!;
    nodes.push({
      id,
      position: { x: 410, y: i * 130 },
      data: { label: `${r.kind.toUpperCase()}\n${r.title}` },
      style: {
        width: 220,
        whiteSpace: "pre-line",
          fontSize: 16,
        background: "#303738",
        color: "#fff",
        padding: 16,
      },
      sourcePosition: "right",
      targetPosition: "left",
    });
  });
  const edges: any[] = direct
    .filter((e: any) => visible.has(e.source) && visible.has(e.target))
    .map((e: any, i: number) => ({
      id: "e" + i,
      source: e.source,
      target: e.target,
      label: labels[e.relationship],
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#a7b8bd" },
      labelStyle: { fill: "#fff" },
      labelBgStyle: { fill: "#202426" },
      labelBgPadding: [7, 4],
    }));
  const taskRecords = [picked, ...neighborIds.map((id) => byId.get(id))].filter(
    (r): r is RecordRow => !!r && r.kind === "task",
  );
  const software = [
    ...new Set(taskRecords.flatMap((r) => r.data.systems || [])),
  ];
  const controls = [
    ...new Set(taskRecords.flatMap((r) => r.data.controlAreas || [])),
  ];
  return (
    <section className="relationship-explorer">
      <h2>Find the connections that matter</h2>
      <p>
        Choose a question, then a record. Follow a labeled connection to explore
        the next part of the work.
      </p>
      <div className="relationship-questions">
        {questions.map(([id, title]) => (
          <button
            key={id}
            aria-pressed={question === id}
            onClick={() => {
              setQuestion(id);
              setFocus("");
              setSearch("");
            }}
          >
            {title}
          </button>
        ))}
      </div>
      <ErrorBox error={error} />
      <p className="subtle">
        {graph
          ? `${graph.engine} · ${candidates.length} matching records`
          : "Loading relationships…"}
        {graph?.truncated || graph?.scanTruncated
          ? " · Partial graph; additional relationships may exist."
          : ""}
      </p>
      <div className="relationship-workspace">
        <aside>
          <label>
            Find a record
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocus("");
              }}
              placeholder="Search names or tasks"
            />
          </label>
          <div className="relationship-list">
            {matches.map((r) => (
              <button
                key={r.id}
                aria-pressed={picked?.id === r.id}
                onClick={() => setFocus(r.id)}
              >
                <small>
                  {r.kind} · {r.data.team || r.state}
                </small>
                <strong>{r.title}</strong>
              </button>
            ))}
          </div>
          {graph && !matches.length && (
            <p>
              No matching records for this question. This does not establish
              that the company has no gaps or opportunities.
            </p>
          )}
        </aside>
        <div>
          {picked && (
            <>
              <div className="relationship-heading">
                <h3>{picked.title}</h3>
                <Button onClick={() => open(picked)}>Review record</Button>
              </div>
              <p>
                {question === "ownership" &&
                picked.kind === "task" &&
                !picked.data.ownerId
                  ? "No accountable owner is recorded. Review this task and resolve ownership before delegation."
                  : question === "ai"
                    ? "These are recorded operating-mode proposals. Review the task, evidence, and human oversight before proposing an agent."
                    : "Select a connected record to follow its relationships. Open the record to review its details and evidence."}
              </p>
              <div
                style={{
                  height: 500,
                  border: "1px solid #495154",
                  borderRadius: 10,
                }}
              >
                <ReactFlow
                  key={picked.id + neighborIds.join()}
                  nodes={nodes}
                  edges={edges}
                  fitView
                  fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  onNodeClick={(_, n) => setFocus(n.id)}
                  colorMode="dark"
                >
                  <Controls showInteractive={false} />
                  <Background />
                </ReactFlow>
              </div>
              <p className="subtle">
                {neighborIds.length} immediate connections shown
                {new Set(direct.flatMap((e: any) => [e.source, e.target]))
                  .size > 5
                  ? " · First 4 neighbors; review the record for full context."
                  : ""}
                . Arrows follow the recorded relationship direction.
              </p>
              <div className="relationship-facts">
                <div>
                  <strong>Software listed on these tasks</strong>
                  <p>
                    {software.join(" · ") ||
                      "No software recorded on the tasks in this view."}
                  </p>
                </div>
                <div>
                  <strong>Mapped control areas</strong>
                  <p>
                    {controls.join(" · ") ||
                      "No control mappings recorded on these tasks."}
                  </p>
                </div>
              </div>
              <details>
                <summary>Read connections as a list</summary>
                {direct.map((e: any, i: number) => (
                  <p key={i}>
                    {byId.get(e.source)?.title}{" "}
                    <strong>{labels[e.relationship]}</strong>{" "}
                    <button onClick={() => setFocus(e.target)}>
                      {byId.get(e.target)?.title}
                    </button>
                  </p>
                ))}
              </details>
            </>
          )}
        </div>
      </div>
      <p className="subtle">
        Software listings are not access grants. Control mappings identify work
        to review, not proof of compliance. Evidence remains available in each
        record.
      </p>
    </section>
  );
}
