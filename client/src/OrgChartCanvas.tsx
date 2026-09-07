import { useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { RecordRow } from "../../shared/domain.ts";
import "./company-visuals.css";
export const departmentColor = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ["#9dc5cf", "#aac7ad", "#d8ba83", "#b9b3ce", "#9cbbdf", "#c8b7a4"][
    h % 6
  ];
};
function PersonNode({ data }: NodeProps) {
  const p = data.person as RecordRow;
  return (
    <div
      className="roster-node"
      style={{ borderTopColor: departmentColor(p.data.team || "") }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="roster-avatar">
        {p.title
          .split(" ")
          .map((s) => s[0])
          .slice(0, 2)
          .join("")}
      </div>
      <strong>{p.title}</strong>
      <span>{p.data.role}</span>
      <small style={{ color: departmentColor(p.data.team || "") }}>
        {p.data.team || "Department not recorded"}
      </small>
      <small>{String(data.count)} linked tasks</small>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const nodeTypes = { person: PersonNode };
export function OrgChartCanvas({
  people,
  tasks = [],
  select,
}: {
  people: RecordRow[];
  tasks?: RecordRow[];
  select: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [instance, setInstance] = useState<any>(null);
  const model = useMemo(() => {
    const ids = new Set(people.map((p) => p.id));
    const parent = new Map(
      people.map((p) => [
        p.id,
        ids.has(p.data.managerId) && p.data.managerId !== p.id
          ? p.data.managerId
          : null,
      ]),
    );
    const warnings: string[] = [];
    for (const p of people) {
      const seen = new Set([p.id]);
      let cur = parent.get(p.id);
      while (cur) {
        if (seen.has(cur)) {
          parent.set(p.id, null);
          warnings.push("Reporting loop: " + p.title);
          break;
        }
        seen.add(cur);
        cur = parent.get(cur);
      }
    }
    const children = (id: string | null) =>
      people.filter((p) => parent.get(p.id) === id);
    const widths = new Map<string, number>();
    const width = (id: string): number => {
      if (widths.has(id)) return widths.get(id)!;
      const cs = children(id);
      const w = Math.max(
        224,
        cs.reduce((n, p) => n + width(p.id) + 32, 0) - 32,
      );
      widths.set(id, w);
      return w;
    };
    const positions = new Map<string, { x: number; y: number }>();
    const place = (p: RecordRow, x: number, y: number) => {
      positions.set(p.id, { x: x + (width(p.id) - 224) / 2, y });
      let next = x;
      for (const c of children(p.id)) {
        place(c, next, y + 220);
        next += width(c.id) + 32;
      }
    };
    let x = 0;
    for (const p of children(null)) {
      place(p, x, 0);
      x += width(p.id) + 64;
    }
    return {
      nodes: people.map((p) => ({
        id: p.id,
        type: "person",
        position: positions.get(p.id) || { x: 0, y: 0 },
        data: {
          person: p,
          count: tasks.filter(
            (t) => t.data.ownerId === p.id || t.data.performerId === p.id,
          ).length,
        },
      })),
      edges: people
        .filter((p) => parent.get(p.id))
        .map((p) => ({
          id: p.id + "-manager",
          source: parent.get(p.id)!,
          target: p.id,
          style: { stroke: "#81949d" },
        })),
      warnings,
    };
  }, [people, tasks]);
  return (
    <div>
      <div className="visual-toolbar">
        <label>
          Find a person
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, role or department"
          />
        </label>
        <span>
          {people.length} people · {model.edges.length} reporting lines
        </span>
      </div>
      {search && (
        <div className="visual-results">
          {people
            .filter((p) =>
              (p.title + " " + p.data.role + " " + p.data.team)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((p) => (
              <button key={p.id} onClick={() => select(p.id)}>
                {p.title} · {p.data.team}
              </button>
            ))}
        </div>
      )}
      {model.warnings.map((w) => (
        <p key={w}>{w} — correct the manager record.</p>
      ))}
      <div className="roster-canvas">
        <ReactFlowProvider>
          <ReactFlow
            nodes={model.nodes}
            edges={model.edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            onInit={setInstance}
            onNodeClick={(_, n) => {
              select(n.id);
              instance?.setCenter(n.position.x + 112, n.position.y + 80, {
                zoom: 1,
                duration: 300,
              });
            }}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            minZoom={0.05}
            maxZoom={2}
            colorMode="dark"
          >
            <Background color="#41474b" />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) =>
                departmentColor((n.data.person as RecordRow).data.team || "")
              }
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <p className="subtle">
        Scroll to zoom · Drag the background to pan · Select a person to see
        their work. Lines reflect recorded manager relationships.
      </p>
    </div>
  );
}
