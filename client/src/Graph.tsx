import { linksFor } from "../../shared/record-links.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, Focus, Minus, Plus, List, Network } from "lucide-react";
import type { RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Button, Badge, Empty, ErrorBox, State, stateLabel } from "./ui.tsx";
import { OrgView } from "./OrgView.tsx";
import { AuditGraph } from "./AuditGraph.tsx";
import {
  wrapNodeTitle,
  type GraphNode,
  type GraphEdge,
} from "./graph-layout.ts";
import {
  connectedScene,
  workflowScene,
  defaultGraphFocus,
} from "./graph-scene.ts";
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
      pending: number;
      truncated: boolean;
      scanTruncated: boolean;
    } | null>(null),
    [error, setError] = useState(""),
    [view, setView] = useState(() =>
      records.some(
        (r) =>
          r.kind === "workflow" && r.data.sampleKey === "supplier-workflow",
      )
        ? "work"
        : "connected",
    ),
    [list, setList] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const workflows = records.filter(
    (r) => r.kind === "workflow" && r.state !== "withdrawn",
  );
  const activeFocus = focus || defaultGraphFocus(records);
  const activeWorkflow =
    workflowId ||
    workflows.find((r) => r.data.sampleKey === "supplier-workflow")?.id ||
    workflows[0]?.id ||
    "*";
  const currentWorkflow = workflows.find((r) => r.id === activeWorkflow);
  const [retry, setRetry] = useState(0);
  const [camera, setCamera] = useState({ x: 0, y: 0, w: 1120, h: 650 });
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<any>(null);
  const viewport = useRef({ width: 1120, height: 650 });
  useEffect(() => {
    let active = true;
    setError("");
    api(
      `/v1/companies/${company}/graph${focus ? `?focus=${focus}&depth=2` : ""}`,
    )
      .then((r) => {
        if (active) setGraph(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [company, revision, focus, retry]);
  const layout = useMemo(() => {
    const currentRecords = records;
    return view === "work"
      ? workflowScene(currentRecords, activeWorkflow)
      : connectedScene(currentRecords, activeFocus);
  }, [graph, records, view, activeFocus, activeWorkflow]);
  const frame = (readable = false) => {
    const { width, height } = viewport.current;
    const scale = Math.max(
      readable ? 0.75 : 0,
      Math.min(1, width / layout.width, height / layout.height),
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
      ? records.filter((n) => n.kind === "person")
      : view === "work"
        ? layout.nodes
        : records.filter(
            (r) =>
              [
                "person",
                "task",
                "evidence",
                "candidate",
                "duty",
                "agent",
                "intervention",
                "metric",
              ].includes(r.kind) &&
              !["retracted", "withdrawn"].includes(r.state),
          );
  if (error)
    return (
      <>
        <ErrorBox error={error} />
        <Button
          onClick={() => {
            setFocus("");
            setError("");
            setRetry((n) => n + 1);
          }}
        >
          Return to full graph
        </Button>
      </>
    );
  if (!graph) return <div className="loading">Loading the company graph…</div>;
  if (!records.length)
    return (
      <Empty
        title="Your work graph starts with people and evidence"
        detail="Add a participant, accept an evidence source, and describe a task. The relationships will appear here."
        action={
          view !== "connected" || focus ? (
            <Button
              onClick={() => {
                setView("connected");
                setFocus("");
              }}
            >
              Return to connected records
            </Button>
          ) : undefined
        }
      />
    );
  return (
    <div className={expanded ? "graph-expanded" : "graph-standard"}>
      <div className="toolbar">
        <div className="tabs">
          {[
            ["connected", "Connected"],
            ["work", "Work flow"],
            ["org", "Org & duties"],
            ["audit", "Agents & controls"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => {
                setView(id);
                setSelected(null);
                if (id === "org") setFocus("");
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
      {view === "work" && currentWorkflow && (
        <div className="workflow-graph-intro">
          <h2>{currentWorkflow.title}</h2>
          <p>{currentWorkflow.data.purpose}</p>
          <span>
            {currentWorkflow.data.taskIds.length} task cards ·{" "}
            {currentWorkflow.data.handoffIds.length} handoffs · Click an arrow
            label to inspect what the next person needs.
          </span>
        </div>
      )}
      {view !== "org" && view !== "audit" && (
        <div className="graph-context">
          <label>
            {view === "work" ? "Workflow" : "Explore"}{" "}
            <select
              aria-label={
                view === "work" ? "Select workflow" : "Focus on a record"
              }
              value={view === "work" ? activeWorkflow : activeFocus}
              onChange={(e) => {
                if (view === "work") setWorkflowId(e.target.value);
                else setFocus(e.target.value);
                setSelected(null);
              }}
            >
              {view === "work" ? (
                <>
                  <option value="*">All recorded handoffs</option>
                  {workflows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </>
              ) : (
                records
                  .filter(
                    (r) =>
                      ["person", "task", "duty"].includes(r.kind) &&
                      r.state !== "retracted",
                  )
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))
              )}
            </select>
          </label>
          <span>
            {view === "work"
              ? "Recorded task-to-task handoffs, with conditions on each connection."
              : "People own duties. Duties contain tasks. Each task shows who performs the work."}
          </span>
        </div>
      )}
      {view === "audit" ? <AuditGraph company={company} records={records} open={open}/> : list ? (
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
      ) : view === "work" && !layout.edges.length ? (
        <Empty
          title="No handoffs recorded for this work yet"
          detail="A workflow needs explicit receiving conditions between tasks. Add handoff contracts in Task cards, then select them in a workflow. The task register is available now."
          action={
            <Button onClick={() => setList(true)}>View task register</Button>
          }
        />
      ) : (
        <div className="graph-shell">
          <div className="graph-canvas">
            <div className="graph-caption">
              <span className="eyebrow">
                {view === "work"
                  ? "From one completed step to the next"
                  : "Responsibility, from people to tasks"}
              </span>
              <Badge>
                {graph.pending
                  ? `Projection catching up · revision ${graph.sourceRevision}`
                  : `Revision ${graph.sourceRevision}`}
              </Badge>
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
                if (
                  (e.target as Element).closest(
                    "[data-node], .graph-edge-label",
                  )
                )
                  return;
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
                  {col.kind}
                </text>
              ))}
              {view === "connected" &&
                [0, 1, 2]
                  .filter((col) => !layout.nodes.some((n) => n.column === col))
                  .map((col) => (
                    <text
                      key={`missing-${col}`}
                      x={48 + col * 360}
                      y={140}
                      className="graph-missing-label"
                    >
                      {col === 0
                        ? "Owner not recorded"
                        : col === 1
                          ? "Duty not mapped yet"
                          : "No tasks recorded"}
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
                    <g key={e.id}>
                      <path
                        d={e.path}
                        className={`graph-edge ${e.dashed ? "conditional" : ""} ${highlight ? "highlight" : selected ? "muted" : ""}`}
                        markerEnd={`url(#${highlight ? "arrow-highlight" : "arrow"})`}
                      >
                        <title>{e.label}</title>
                      </path>
                    </g>
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
                    aria-label={`${n.kind}: ${n.title}, ${n.modeLabel || n.kind}, ${n.state}. Inspect connections.`}
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
                      (n.mode ? ` mode-${n.mode}` : "") +
                      (n.state === "conflicting" ? " issue" : "") +
                      (selected === n.id ? " selected" : "") +
                      (selected && !neighborhood.has(n.id) ? " muted" : "")
                    }
                    transform={`translate(${n.x},${n.y})`}
                  >
                    <title>{n.title}</title>
                    <rect width={n.w} height={n.h} rx="9" />
                    <text x="16" y="23" className="node-kind">
                      {n.modeLabel
                        ? n.modeLabel.toUpperCase()
                        : n.kind.toUpperCase()}{" "}
                      · V{n.version}
                    </text>
                    {lines.slice(0, 2).map((line, i) => (
                      <text
                        key={i}
                        x="16"
                        y={47 + i * 20}
                        className="node-title"
                      >
                        {i === 1 && lines.length > 2
                          ? line.slice(0, 25) + "…"
                          : line}
                      </text>
                    ))}
                    <text x="16" y="94" className="node-subtitle">
                      {n.subtitle.length > 33
                        ? n.subtitle.slice(0, 30) + "…"
                        : n.subtitle}
                    </text>
                    <text
                      x="16"
                      y="113"
                      className={`node-state ${n.state === "confirmed" ? "confirmed" : ""}`}
                    >
                      {stateLabel(n.state)}
                    </text>
                  </g>
                );
              })}
              {layout.edges.map((e) => {
                const muted =
                  selected && e.source !== selected && e.target !== selected;
                return (
                  <g
                    key={e.id}
                    className={`graph-edge-label ${muted ? "muted" : ""} ${e.recordId ? "interactive" : ""}`}
                    transform={`translate(${e.labelX},${e.labelY})`}
                    role={e.recordId ? "button" : undefined}
                    tabIndex={e.recordId ? 0 : undefined}
                    aria-label={
                      e.recordId ? `Open handoff: ${e.caption}` : undefined
                    }
                    onClick={() => {
                      const r = records.find((r) => r.id === e.recordId);
                      if (r) open(r);
                    }}
                    onKeyDown={(event) => {
                      if (e.recordId && ["Enter", " "].includes(event.key)) {
                        event.preventDefault();
                        const r = records.find((r) => r.id === e.recordId);
                        if (r) open(r);
                      }
                    }}
                  >
                    <title>{e.label}</title>
                    <rect x="-53" y="-13" width="106" height="23" rx="4" />
                    <text textAnchor="middle" y="2">
                      {e.caption.length > 18
                        ? e.caption.slice(0, 16) + "…"
                        : e.caption}
                    </text>
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
              {current.kind === "task" && current.data.humanGate && (
                <>
                  <h3>Human checkpoint</h3>
                  <p>{current.data.humanGate}</p>
                </>
              )}
              <h3>Evidence & connected records</h3>
              {[
                ...layout.edges.filter(
                  (e) => e.relationship === "HANDS_OFF_TO",
                ),
                ...records.flatMap((r) =>
                  linksFor(r).map((l) => ({
                    source: l.inbound ? l.target : r.id,
                    target: l.inbound ? r.id : l.target,
                    relationship: l.relationship,
                  })),
                ),
              ]
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
                          {e.target === current.id
                            ? (
                                {
                                  ACCOUNTABLE_FOR: "Accountable owner",
                                  PERFORMS: "Performed by",
                                  SUPPORTED_BY: "Evidence for",
                                  REPORTS_TO: "Direct report",
                                  BOUND_TO: "Proposed agent",
                                  HANDS_OFF_TO: "Receives from",
                                  CONTAINS: "Part of",
                                } as Record<string, string>
                              )[e.relationship] ||
                              e.relationship.replaceAll("_", " ").toLowerCase()
                            : e.relationship.replaceAll("_", " ").toLowerCase()}
                        </small>
                        {target.title}
                      </button>
                    )
                  );
                })}
              <Button primary onClick={() => open(current)}>
                Open full record
              </Button>
              {!focus && ["person", "duty", "task"].includes(current.kind) && (
                <Button onClick={() => setFocus(current.id)}>
                  Focus connections
                </Button>
              )}
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
            Human <span className="dot violet" />
            AI <span className="dot amber" />
            AI + human review · AI modes are proposed
          </div>
        )}
        <span>
          {view === "connected" && !list
            ? `${layout.nodes.length} of ${registerNodes.length} records in this view`
            : `${registerNodes.length} records`}{" "}
          ·{" "}
          {graph.pending
            ? "Projection catching up; current records shown"
            : "Current authoritative records"}
          {graph.truncated ? " · Node budget reached; choose a focus" : ""}
          {graph.scanTruncated ? " · Large workspace: partial scan" : ""}
        </span>
      </div>
      {view !== "org" && !list && <p className="subtle">{layout.note}</p>}
    </div>
  );
}
