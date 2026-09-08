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
import "./org-chart-focus.css";
export type OrgChartPersonFocus = {
  dutyCount: number;
  taskCount: number;
  roles: string[];
};
export const departmentColor = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ["#9dc5cf", "#aac7ad", "#d8ba83", "#b9b3ce", "#9cbbdf", "#c8b7a4"][
    h % 6
  ];
};
function PersonNode({ data }: NodeProps) {
  const p = data.person as RecordRow;
  const focus = data.focus as OrgChartPersonFocus | undefined;
  const isScoped = Boolean(data.isScoped);
  const neutral = Boolean(data.neutral);
  const counts = isScoped
    ? `${focus?.dutyCount ?? 0} ${focus?.dutyCount === 1 ? "duty" : "duties"} · ${focus?.taskCount ?? 0} ${focus?.taskCount === 1 ? "task" : "tasks"}`
    : `${String(data.count)} linked tasks`;
  const avatar = (
    <div className="roster-avatar" aria-hidden="true">
      {p.title
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")}
    </div>
  );
  return (
    <div
      className={`roster-node${neutral ? " roster-node-neutral" : ""}${isScoped ? (focus ? " roster-node-match" : " roster-node-muted") : ""}${data.active ? " roster-node-active" : ""}`}
      style={
        neutral
          ? undefined
          : { borderTopColor: departmentColor(p.data.team || "") }
      }
      role="button"
      tabIndex={0}
      aria-pressed={Boolean(data.active)}
      aria-label={`${p.title}, ${p.data.role || "Role not recorded"}. ${counts}${isScoped && !focus ? ". No work linked to this stage" : ""}${focus?.roles.length ? `. ${focus.roles.join(", ")}` : ""}. Show this person's work.`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          (data.activate as () => void)();
        }
      }}
    >
      <Handle type="target" position={Position.Top} />
      {neutral ? (
        <div className="roster-person-heading">
          {avatar}
          <strong>{p.title}</strong>
        </div>
      ) : (
        <>
          {avatar}
          <strong>{p.title}</strong>
        </>
      )}
      <span>{p.data.role}</span>
      <small
        className="roster-department"
        style={
          neutral ? undefined : { color: departmentColor(p.data.team || "") }
        }
      >
        {p.data.team || "Department not recorded"}
      </small>
      <small className="roster-work-count">{counts}</small>
      {isScoped && (
        <small className="roster-work-roles">
          {focus?.roles.join(" · ") ||
            (focus ? "Linked work" : "No work linked")}
        </small>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const nodeTypes = { person: PersonNode };
export function OrgChartCanvas({
  people,
  tasks = [],
  select,
  focus,
  activePersonId,
  stableViewport = false,
  neutral = false,
}: {
  people: RecordRow[];
  tasks?: RecordRow[];
  select: (id: string) => void;
  focus?: Record<string, OrgChartPersonFocus>;
  activePersonId?: string;
  stableViewport?: boolean;
  neutral?: boolean;
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
  const activate = (id: string) => {
    select(id);
    const node = model.nodes.find((node) => node.id === id);
    if (!stableViewport && node) {
      instance?.setCenter(node.position.x + 112, node.position.y + 80, {
        zoom: 1,
        duration: 300,
      });
    }
  };
  const nodes = model.nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      focus: focus?.[node.id],
      isScoped: focus !== undefined,
      active: activePersonId === node.id,
      neutral,
      activate: () => activate(node.id),
    },
  }));
  const edges = neutral
    ? model.edges.map((edge) => ({ ...edge, style: { stroke: "#65635f" } }))
    : model.edges;
  return (
    <div className={neutral ? "org-chart-neutral" : undefined}>
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
              <button
                key={p.id}
                onClick={() => activate(p.id)}
                aria-pressed={activePersonId === p.id}
              >
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
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            autoPanOnNodeFocus={!stableViewport}
            autoPanOnSelection={!stableViewport}
            onInit={setInstance}
            onNodeClick={(_, n) => activate(n.id)}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            minZoom={0.05}
            maxZoom={2}
            colorMode="dark"
          >
            <Background color={neutral ? "#363638" : "#41474b"} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) =>
                neutral
                  ? focus === undefined || focus[n.id]
                    ? "#b9b5ac"
                    : "#424244"
                  : departmentColor(
                      (n.data.person as RecordRow).data.team || "",
                    )
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
