import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, Focus, Minus, Plus, List, Network } from "lucide-react";
import type { RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Button, Badge, Empty, ErrorBox, State } from "./ui.tsx";
import { OrgView } from "./OrgView.tsx";
import {
  layoutGraph,
  wrapNodeTitle,
  type GraphNode,
  type GraphEdge,
} from "./graph-layout.ts";
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
  const [graph, setGraph] = useState<{
      nodes: GraphNode[];
      edges: GraphEdge[];
      sourceRevision: number;
      pending: boolean;
      truncated: boolean;
    } | null>(null),
    [error, setError] = useState(""),
    [view, setView] = useState("connected"),
    [list, setList] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [expanded, setExpanded] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0, w: 1120, h: 650 });
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<any>(null);
  const viewport = useRef({ width: 1120, height: 650 });
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
  const layout = useMemo(
    () => layoutGraph(graph?.nodes || [], graph?.edges || [], view),
    [graph, view],
  );
  const frame = (readable = false) => {
    const { width, height } = viewport.current;
    const scale = Math.max(
      readable ? 0.8 : 0,
      Math.min(width / layout.width, height / layout.height),
    );
    const w = width / scale,
      h = height / scale;
    return {
      x: w >= layout.width ? (layout.width - w) / 2 : 0,
      y: h >= layout.height ? (layout.height - h) / 2 : 0,
      w,
      h,
    };
  };
  const fit = () => setCamera(frame());
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    let initial = true;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const previous = viewport.current;
      viewport.current = { width, height };
      if (initial) {
        setCamera(frame(true));
        initial = false;
      } else
        setCamera((c) => {
          const scale = previous.width / c.w;
          return { ...c, w: width / scale, h: height / scale };
        });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [view, layout.width, layout.height, list, expanded, !!graph]);
  const zoom = (factor: number, px = 0.5, py = 0.5) =>
    setCamera((c) => {
      const w = Math.min(layout.width * 3, Math.max(300, c.w * factor)),
        h = (w * viewport.current.height) / viewport.current.width;
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
  }, [layout.width, layout.height, list, view, !!graph]);
  const current = records.find((r) => r.id === selected);
  const away =
    camera.w < layout.width ||
    camera.h < layout.height ||
    camera.x > 0 ||
    camera.y > 0;
  const neighborhood = new Set(
    selected
      ? [
          selected,
          ...layout.edges
            .filter((e) => e.source === selected || e.target === selected)
            .flatMap((e) => [e.source, e.target]),
        ]
      : [],
  );
  const registerNodes =
    view === "org"
      ? layout.nodes.filter((n) => n.kind === "person")
      : layout.nodes;
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
              onClick={() => {
                setView(id);
                setSelected(null);
              }}
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
              {registerNodes.map((n) => (
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
      ) : view === "org" ? (
        <OrgView
          records={records}
          selected={selected}
          select={setSelected}
          open={open}
        />
      ) : (
        <div className="graph-shell">
          <div className="graph-canvas">
            <div className="graph-caption">
              <span className="eyebrow">
                {view === "work"
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
                  markerWidth="12"
                  markerHeight="12"
                  markerUnits="userSpaceOnUse"
                  viewBox="0 0 8 8"
                  refX="8"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 Z" className="arrow-head" />
                </marker>
                <marker
                  id="arrow-highlight"
                  markerWidth="12"
                  markerHeight="12"
                  markerUnits="userSpaceOnUse"
                  viewBox="0 0 8 8"
                  refX="8"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 Z" className="arrow-head highlight" />
                </marker>
              </defs>
              <rect
                x={camera.x}
                y={camera.y}
                width={camera.w}
                height={camera.h}
                fill="url(#dots)"
              />
              {layout.columns.map((col) => (
                <text
                  key={col.kind}
                  x={col.x}
                  y={col.y}
                  className="graph-column-label"
                >
                  {
                    (
                      {
                        person: "PEOPLE",
                        task: "TASKS",
                        evidence: "EVIDENCE",
                        candidate: "HYPOTHESES",
                        agent: "AGENT PROPOSALS",
                      } as Record<string, string>
                    )[col.kind]
                  }
                </text>
              ))}
              {[...layout.edges]
                .sort(
                  (a, b) =>
                    Number(b.source !== selected && b.target !== selected) -
                    Number(a.source !== selected && a.target !== selected),
                )
                .map((e, i) => {
                  const highlight =
                    selected &&
                    (e.source === selected || e.target === selected);
                  return (
                    <path
                      key={i}
                      d={e.path}
                      className={`graph-edge ${highlight ? "highlight" : selected ? "muted" : ""}`}
                      markerEnd={`url(#${highlight ? "arrow-highlight" : "arrow"})`}
                    >
                      <title>{e.label}</title>
                    </path>
                  );
                })}
              {layout.nodes.map((n) => {
                const lines = wrapNodeTitle(n.title);
                return (
                  <g
                    key={n.id}
                    data-node={n.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${n.kind}: ${n.title}, ${n.state}. Inspect connections.`}
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
                      (selected === n.id ? " selected" : "") +
                      (selected && !neighborhood.has(n.id) ? " muted" : "")
                    }
                    transform={`translate(${n.x},${n.y})`}
                  >
                    <title>{n.title}</title>
                    <rect width={n.w} height={n.h} rx="9" />
                    <text x="16" y="23" className="node-kind">
                      {n.kind.toUpperCase()} · V{n.version}
                    </text>
                    {lines.map((line, i) => (
                      <text
                        key={i}
                        x="16"
                        y={47 + i * 20}
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
              <Button onClick={() => setCamera(frame(true))}>Readable</Button>
              <span>Drag to pan · Ctrl + scroll to zoom</span>
            </div>
            {away && (
              <svg
                className="minimap"
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                aria-label="Graph minimap"
              >
                {layout.nodes.map((n) => (
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
        {view === "org" ? (
          <span>Teams organize people. Duties connect them to work.</span>
        ) : (
          <div className="legend">
            <span className="dot blue" />
            Evidence <span className="dot sage" />
            People & work <span className="dot amber" />
            Hypotheses
          </div>
        )}
        <span>
          {registerNodes.length} records ·{" "}
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
