import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, Focus, Minus, Plus, List, Network } from "lucide-react";
import type { RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Button, Badge, Empty, ErrorBox, State } from "./ui.tsx";
export function Graph({
  company,
  revision,
  records,
  open,
}: {
  company: string;
  revision: number;
  records: RecordRow[];
  open: (r: RecordRow) => void;
}) {
  const [graph, setGraph] = useState<any>(null),
    [error, setError] = useState(""),
    [view, setView] = useState("connected"),
    [list, setList] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [expanded, setExpanded] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0, w: 1120, h: 650 });
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<any>(null);
  useEffect(() => {
    let active = true;
    api(`/v1/companies/${company}/graph`)
      .then((r) => {
        if (active) setGraph(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [company, revision]);
  const layout = useMemo(() => {
    const nodes = (graph?.nodes || []).filter((n: any) =>
      view === "work"
        ? ["task", "person"].includes(n.kind)
        : view === "org"
          ? n.kind === "person"
          : ["task", "person", "evidence", "candidate", "agent"].includes(
              n.kind,
            ),
    );
    const columns =
      view === "connected"
        ? ["evidence", "person", "task", "candidate", "agent"]
        : view === "work"
          ? ["person", "task"]
          : ["person"];
    const result = nodes.map((n: any) => {
      const group = nodes.filter((a: any) => a.kind === n.kind),
        i = group.findIndex((a: any) => a.id === n.id);
      const col = columns.indexOf(n.kind);
      const x =
        view === "org"
          ? 55 + (i % 4) * 270
          : view === "work"
            ? n.kind === "person"
              ? 60
              : 450 + (i % 2) * 290
            : 30 + col * 230;
      const y =
        view === "org"
          ? 80 + Math.floor(i / 4) * 155
          : view === "work"
            ? 50 + Math.floor(i / (n.kind === "task" ? 2 : 1)) * 105
            : 55 + i * 103;
      return { ...n, x, y, w: view === "org" ? 225 : 200, h: 72 };
    });
    const allowed = new Set(result.map((n: any) => n.id));
    return {
      nodes: result,
      edges: (graph?.edges || []).filter(
        (e: any) => allowed.has(e.source) && allowed.has(e.target),
      ),
      width: Math.max(1120, ...result.map((n: any) => n.x + n.w + 35)),
      height: Math.max(650, ...result.map((n: any) => n.y + n.h + 40)),
    };
  }, [graph, view]);
  const fit = () =>
    setCamera({ x: 0, y: 0, w: layout.width, h: layout.height });
  useEffect(() => {
    fit();
  }, [view, layout.width, layout.height]);
  const zoom = (factor: number, px = 0.5, py = 0.5) =>
    setCamera((c) => {
      const w = Math.min(layout.width * 3, Math.max(300, c.w * factor)),
        h = (w * layout.height) / layout.width;
      return { x: c.x + (c.w - w) * px, y: c.y + (c.h - h) * py, w, h };
    });
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoom(
        e.deltaY > 0 ? 1.12 : 0.88,
        (e.clientX - r.left) / r.width,
        (e.clientY - r.top) / r.height,
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [layout.width, layout.height, list]);
  const current = records.find((r) => r.id === selected);
  const away =
    Math.abs(camera.w - layout.width) > 1 || camera.x !== 0 || camera.y !== 0;
  if (error) return <ErrorBox error={error} />;
  if (!graph) return <div className="loading">Loading the company graph…</div>;
  if (!layout.nodes.length)
    return (
      <Empty
        title="Your work graph starts with people and evidence"
        detail="Add a participant, accept an evidence source, and describe a task. The relationships will appear here."
      />
    );
  return (
    <div className={expanded ? "graph-expanded" : ""}>
      <div className="toolbar">
        <div className="tabs">
          {[
            ["connected", "Connected"],
            ["work", "Work flow"],
            ["org", "Org & duties"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="actions">
          <Button onClick={() => setList(!list)}>
            {list ? <Network size={16} /> : <List size={16} />}{" "}
            {list ? "Graph" : "Register"}
          </Button>
          <Button onClick={() => setExpanded(!expanded)}>
            <Expand size={16} />
            {expanded ? "Close expanded" : "Expand"}
          </Button>
        </div>
      </div>
      {list ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Record</th>
                <th>Type</th>
                <th>Version</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {layout.nodes.map((n: any) => (
                <tr key={n.id}>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => open(records.find((r) => r.id === n.id)!)}
                    >
                      {n.title}
                    </button>
                  </td>
                  <td>{n.kind}</td>
                  <td>v{n.version}</td>
                  <td>
                    <State value={n.state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="graph-shell">
          <div className="graph-canvas">
            <div className="graph-caption">
              <span className="eyebrow">
                {view === "org"
                  ? "People in scope"
                  : view === "work"
                    ? "Accountability & meaningful work"
                    : "One record. Connected evidence."}
              </span>
              <Badge>Revision {graph.sourceRevision}</Badge>
            </div>
            <svg
              ref={svg}
              viewBox={`${camera.x} ${camera.y} ${camera.w} ${camera.h}`}
              aria-label="Company relationship graph. Use arrow keys to pan, plus or minus to zoom, and zero to fit."
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (
                  [
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                    "+",
                    "-",
                    "0",
                  ].includes(e.key)
                )
                  e.preventDefault();
                if (e.key === "+") zoom(0.8);
                if (e.key === "-") zoom(1.25);
                if (e.key === "0") fit();
                if (e.key.startsWith("Arrow"))
                  setCamera((c) => ({
                    ...c,
                    x:
                      c.x +
                      (e.key === "ArrowRight"
                        ? 60
                        : e.key === "ArrowLeft"
                          ? -60
                          : 0),
                    y:
                      c.y +
                      (e.key === "ArrowDown"
                        ? 60
                        : e.key === "ArrowUp"
                          ? -60
                          : 0),
                  }));
              }}
              onPointerDown={(e) => {
                if ((e.target as Element).closest("[data-node]")) return;
                const bounds = e.currentTarget.getBoundingClientRect();
                drag.current = { x: e.clientX, y: e.clientY, camera, bounds };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                const d = drag.current;
                setCamera({
                  ...d.camera,
                  x:
                    d.camera.x -
                    ((e.clientX - d.x) * d.camera.w) / d.bounds.width,
                  y:
                    d.camera.y -
                    ((e.clientY - d.y) * d.camera.h) / d.bounds.height,
                });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              <defs>
                <pattern
                  id="dots"
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r=".8" className="graph-dot" />
                </pattern>
                <marker
                  id="arrow"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6" className="arrow-head" />
                </marker>
              </defs>
              <rect
                x={camera.x}
                y={camera.y}
                width={camera.w}
                height={camera.h}
                fill="url(#dots)"
              />
              {layout.edges.map((e: any, i: number) => {
                const a = layout.nodes.find((n: any) => n.id === e.source),
                  b = layout.nodes.find((n: any) => n.id === e.target);
                const right = a.x < b.x;
                const ax = a.x + (right ? a.w : 0),
                  bx = b.x + (right ? 0 : b.w),
                  ay = a.y + a.h / 2,
                  by = b.y + b.h / 2;
                const middle = (ax + bx) / 2;
                return (
                  <path
                    key={i}
                    d={`M${ax},${ay} C${middle},${ay} ${middle},${by} ${bx},${by}`}
                    className={
                      "graph-edge " +
                      (selected &&
                      (e.source === selected || e.target === selected)
                        ? "highlight"
                        : "")
                    }
                    markerEnd="url(#arrow)"
                  />
                );
              })}
              {layout.nodes.map((n: any) => {
                const words = n.title.split(" ");
                let lines: string[] = [""];
                for (const word of words) {
                  if ((lines[lines.length - 1] + " " + word).length > 25)
                    lines.push(word);
                  else
                    lines[lines.length - 1] +=
                      (lines[lines.length - 1] ? " " : "") + word;
                }
                return (
                  <g
                    key={n.id}
                    data-node={n.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${n.kind}: ${n.title}, ${n.state}. Open record.`}
                    onClick={() => setSelected(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(n.id);
                      }
                    }}
                    className={
                      "graph-node " +
                      n.kind +
                      (selected === n.id ? " selected" : "")
                    }
                    transform={`translate(${n.x},${n.y})`}
                  >
                    <rect width={n.w} height={n.h} rx="9" />
                    <text x="13" y="18" className="node-kind">
                      {n.kind.toUpperCase()} · V{n.version}
                    </text>
                    {lines.slice(0, 2).map((line, i) => (
                      <text
                        key={i}
                        x="13"
                        y={39 + i * 16}
                        className="node-title"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
            </svg>
            <div className="camera-controls">
              <Button onClick={() => zoom(0.8)} title="Zoom in">
                <Plus size={17} />
              </Button>
              <Button onClick={() => zoom(1.25)} title="Zoom out">
                <Minus size={17} />
              </Button>
              <Button onClick={fit}>
                <Focus size={16} />
                Fit
              </Button>
              <span>Ctrl + scroll to zoom</span>
            </div>
            {away && (
              <svg
                className="minimap"
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                aria-label="Graph minimap"
              >
                {layout.nodes.map((n: any) => (
                  <rect
                    key={n.id}
                    x={n.x}
                    y={n.y}
                    width={n.w}
                    height={n.h}
                    className="mini-node"
                  />
                ))}
                <rect
                  x={camera.x}
                  y={camera.y}
                  width={camera.w}
                  height={camera.h}
                  className="mini-camera"
                />
              </svg>
            )}
          </div>
          {current && (
            <aside className="graph-inspector">
              <div className="eyebrow">
                {current.kind} · v{current.version}
              </div>
              <h2>{current.title}</h2>
              <State value={current.state} />
              <p>
                {current.data.purpose ||
                  current.data.pressure ||
                  current.data.role ||
                  current.data.type}
              </p>
              <h3>Connected records</h3>
              {layout.edges
                .filter(
                  (e: any) =>
                    e.source === current.id || e.target === current.id,
                )
                .map((e: any, i: number) => {
                  const target = records.find(
                    (r) =>
                      r.id === (e.source === current.id ? e.target : e.source),
                  );
                  return (
                    target && (
                      <button
                        key={i}
                        className="inspector-link"
                        onClick={() => setSelected(target.id)}
                      >
                        <small>
                          {e.relationship.replaceAll("_", " ").toLowerCase()}
                        </small>
                        {target.title}
                      </button>
                    )
                  );
                })}
              <Button primary onClick={() => open(current)}>
                Open full record
              </Button>
              <button className="text-link" onClick={() => setSelected(null)}>
                Close inspector
              </button>
            </aside>
          )}
        </div>
      )}
      <div className="graph-foot">
        <div className="legend">
          <span className="dot blue" />
          Evidence <span className="dot sage" />
          People & work <span className="dot amber" />
          Hypotheses
        </div>
        <span>
          {layout.nodes.length} records ·{" "}
          {graph.pending
            ? "Projection catching up; current records shown"
            : "Current authoritative records"}
          {graph.truncated ? " · First 150 records" : ""}
        </span>
      </div>
      {view === "work" && (
        <p className="subtle">
          This view shows task ownership and performance. Workflow handoff
          contracts have not been defined; position does not imply an execution
          order.
        </p>
      )}
    </div>
  );
}
