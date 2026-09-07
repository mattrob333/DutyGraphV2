import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import type { RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Button, ErrorBox } from "./ui.tsx";
import "./company-visuals.css";
const colors: Record<string, string> = {
  person: "#99c7d5",
  task: "#b7c8a1",
  duty: "#d8b780",
  agent: "#b8a7d6",
  evidence: "#9babb4",
  department: "#dfbf94",
  software: "#8fc8b4",
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
    [selected, setSelected] = useState(""),
    [search, setSearch] = useState(""),
    [area, setArea] = useState(""),
    [department, setDepartment] = useState(""),
    [width, setWidth] = useState(600),
    [webgl, setWebgl] = useState(true);
  const host = useRef<HTMLDivElement>(null),
    fg = useRef<any>(null);
  useEffect(() => {
    let active = true;
    setGraph(null);
    api(`/v1/companies/${company}/graph?limit=150`)
      .then((g) => active && setGraph(g))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [company, records]);
  useEffect(() => {
    const c = document.createElement("canvas");
    setWebgl(!!c.getContext("webgl2"));
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    if (host.current) ro.observe(host.current);
    return () => ro.disconnect();
  }, []);
  const model = useMemo(() => {
    const nodes: any[] = (graph?.nodes || []).map((n: any) => ({ ...n }));
    const ids = new Set(nodes.map((n) => n.id));
    const links: any[] = (graph?.edges || [])
      .filter((e: any) => ids.has(e.source) && ids.has(e.target))
      .map((e: any) => ({ ...e }));
    const add = (
      id: string,
      title: string,
      kind: string,
      source: string,
      relationship: string,
    ) => {
      if (!ids.has(id)) {
        nodes.push({ id, title, kind });
        ids.add(id);
      }
      links.push({ source, target: id, relationship, derived: true });
    };
    for (const r of records.filter((r) => ids.has(r.id))) {
      if (r.kind === "person" && r.data.team)
        add(
          "department:" + r.data.team,
          r.data.team,
          "department",
          r.id,
          "MEMBER_OF",
        );
      if (r.kind === "task")
        for (const s of r.data.systems || [])
          add("software:" + s, s, "software", r.id, "USES_LISTED_SOFTWARE");
    }
    const seeds = new Set(
      records
        .filter(
          (r) =>
            (area &&
              r.kind === "task" &&
              r.data.controlAreas?.includes(area)) ||
            (department && r.kind === "person" && r.data.team === department),
        )
        .map((r) => r.id),
    );
    let visible = new Set(nodes.map((n) => n.id));
    if (area || department) {
      visible = new Set(seeds);
      for (let i = 0; i < 2; i++) {
        const prev = new Set(visible);
        for (const e of links)
          if (prev.has(e.source) || prev.has(e.target)) {
            visible.add(e.source);
            visible.add(e.target);
          }
      }
    }
    const kept = links.filter(
      (e) => visible.has(e.source) && visible.has(e.target),
    );
    const degree = new Map<string, number>();
    for (const e of kept) {
      degree.set(e.source, (degree.get(e.source) || 0) + 1);
      degree.set(e.target, (degree.get(e.target) || 0) + 1);
    }
    return {
      nodes: nodes
        .filter((n) => visible.has(n.id) && (degree.get(n.id) || 0) > 0)
        .map((n) => ({
          ...n,
          val: 2 + Math.min(20, degree.get(n.id) || 0),
          degree: degree.get(n.id) || 0,
        })),
      links: kept,
    };
  }, [graph, records, area, department]);
  const endpoint = (v: any) => (typeof v === "object" ? v.id : v);
  const neighbors = new Set([selected]);
  for (const e of model.links)
    if (endpoint(e.source) === selected || endpoint(e.target) === selected) {
      neighbors.add(endpoint(e.source));
      neighbors.add(endpoint(e.target));
    }
  const picked = model.nodes.find((n) => n.id === selected),
    matches = model.nodes.filter(
      (n) => !search || n.title.toLowerCase().includes(search.toLowerCase()),
    );
  const choose = (id: string) => {
    setSelected(id);
    const n = model.nodes.find((n) => n.id === id);
    if (n && Number.isFinite(n.x)) {
      const d = 120;
      fg.current?.cameraPosition(
        { x: n.x + d, y: n.y + d / 2, z: n.z + d },
        n,
        600,
      );
    }
  };
  return (
    <section>
      <h2>Explore the company in 3D</h2>
      <p>
        Connected records are shown. Rotate the network, select a node, and
        follow its connections. Larger nodes have more connections in this view.
      </p>
      <div className="visual-toolbar">
        <label>
          Find a connection
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Person, agent, task or software"
          />
        </label>
        <label>
          Control scenario
          <select
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setDepartment("");
              setSelected("");
            }}
          >
            <option value="">All work</option>
            {["Access review", "Change review", "Confidential data"].map(
              (a) => (
                <option key={a}>{a}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Department
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setArea("");
              setSelected("");
            }}
          >
            <option value="">All departments</option>
            {[
              ...new Set(
                records
                  .filter((r) => r.kind === "person")
                  .map((r) => r.data.team as string),
              ),
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <Button
          onClick={() => {
            setSelected("");
            fg.current?.zoomToFit(500, 40);
          }}
        >
          Fit network
        </Button>
      </div>
      <ErrorBox error={error} />
      <p>
        {graph
          ? `${model.nodes.length} nodes · ${model.links.length} connections · ${graph.engine}`
          : "Loading connections…"}
        {graph?.truncated || graph?.scanTruncated ? " · Partial view" : ""}
      </p>
      <div className="network-legend">
        {Object.entries(colors).map(([k, c]) => (
          <span key={k}>
            <i style={{ background: c }} />
            {k}
          </span>
        ))}
      </div>
      <div className="network-layout">
        <div ref={host} className="network-canvas">
          {webgl && graph ? (
            <ForceGraph3D
              ref={fg}
              width={width}
              height={600}
              graphData={model}
              backgroundColor="#202426"
              nodeLabel={(n: any) => {
                return String(n.title).replace(
                  /[&<>"']/g,
                  (c) =>
                    ({
                      "&": "&amp;",
                      "<": "&lt;",
                      ">": "&gt;",
                      '"': "&quot;",
                      "'": "&#39;",
                    })[c]!,
                );
              }}
              nodeColor={(n: any) =>
                selected && !neighbors.has(n.id)
                  ? "#43494c"
                  : colors[n.kind] || "#aeb7bf"
              }
              nodeVal="val"
              nodeRelSize={6}
              linkOpacity={0.65}
              linkColor={(e: any) =>
                selected &&
                (endpoint(e.source) === selected ||
                  endpoint(e.target) === selected)
                  ? "#f3d194"
                  : "#66767d"
              }
              linkWidth={(e: any) =>
                selected &&
                (endpoint(e.source) === selected ||
                  endpoint(e.target) === selected)
                  ? 2
                  : 1.2
              }
              linkDirectionalArrowLength={3}
              onNodeClick={(n: any) => choose(n.id)}
              cooldownTicks={100}
              onEngineStop={() => {
                if (!selected) fg.current?.zoomToFit(400, 40);
              }}
            />
          ) : (
            <p className="network-fallback">
              {graph
                ? "3D is unavailable in this browser. Use the connection list beside the canvas."
                : "Loading graph…"}
            </p>
          )}
        </div>
        <aside className="network-detail">
          {picked ? (
            <>
              <small>{picked.kind}</small>
              <h3>{picked.title}</h3>
              <p>{picked.degree} connections in this view</p>
              {records.find((r) => r.id === selected) && (
                <Button
                  onClick={() => open(records.find((r) => r.id === selected)!)}
                >
                  Open record
                </Button>
              )}
              <h4>Connected to</h4>
              {model.nodes
                .filter((n) => n.id !== selected && neighbors.has(n.id))
                .map((n) => (
                  <button key={n.id} onClick={() => choose(n.id)}>
                    {n.title}
                  </button>
                ))}
            </>
          ) : (
            <p>
              Select a node to highlight its neighbors and inspect the record.
            </p>
          )}
          <details open={!!search}>
            <summary>Browse nodes ({matches.length})</summary>
            {matches.map((n) => (
              <div key={n.id}>
                <button onClick={() => choose(n.id)}>{n.title}</button>
              </div>
            ))}
          </details>
        </aside>
      </div>
      <p className="subtle">
        Drag to rotate · Scroll to zoom · Right-drag to pan. Department and
        software nodes come from record fields; software links are not access
        grants. Control scenarios are review mappings, not proof of compliance.
      </p>
    </section>
  );
}
