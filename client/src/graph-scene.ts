import type { RecordRow } from "../../shared/domain.ts";
import { linksFor } from "../../shared/record-links.ts";
import type { GraphNode, GraphEdge } from "./graph-layout.ts";

export type Point = { x: number; y: number };
export type SceneNode = GraphNode &
  Point & { w: number; h: number; subtitle: string; column: number };
export type SceneEdge = GraphEdge & {
  id: string;
  path: string;
  points: Point[];
  label: string;
  caption: string;
  labelX: number;
  labelY: number;
  dashed: boolean;
  recordId?: string;
};
export type Scene = {
  nodes: SceneNode[];
  edges: SceneEdge[];
  columns: { kind: string; x: number; y: number }[];
  width: number;
  height: number;
  hidden: number;
  note: string;
};
const W = 248,
  H = 126,
  DX = 360,
  DY = 176;
const active = (r: RecordRow) => !["retracted", "withdrawn"].includes(r.state);
const labelFor: Record<string, string> = {
  ACCOUNTABLE_FOR: "accountable for",
  PERFORMS: "performs",
  SUPPORTED_BY: "supported by",
  REPORTS_TO: "reports to",
  CONTAINS: "contains",
  BOUND_TO: "proposed for",
  PROPOSES_CHANGE_TO: "tests a change to",
  MEASURED_BY: "measured by",
};
export function defaultGraphFocus(records: RecordRow[]) {
  const tasks = records.filter((r) => r.kind === "task" && active(r));
  return (
    (
      tasks.find(
        (r) => r.data.conflict || ["conflicting", "stale"].includes(r.state),
      ) ||
      tasks[0] ||
      records.find(
        (r) =>
          active(r) && ["candidate", "evidence", "person"].includes(r.kind),
      )
    )?.id || ""
  );
}
function node(
  r: RecordRow,
  x: number,
  y: number,
  column: number,
  records: RecordRow[],
): SceneNode {
  const owner = records.find((p) => p.id === r.data.ownerId);
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    version: r.version,
    state: r.state,
    x,
    y,
    column,
    w: W,
    h: H,
    subtitle:
      r.kind === "person"
        ? r.data.role
        : r.kind === "task"
          ? owner
            ? `Owner: ${owner.title}`
            : "Owner not recorded"
          : r.kind === "evidence"
            ? r.data.type
            : r.kind === "duty"
              ? owner
                ? `Owner: ${owner.title}`
                : "Duty owner not recorded"
              : r.kind === "agent"
                ? "Proposal · no live execution"
                : r.state.replaceAll("_", " "),
  };
}
function rounded(points: Point[]) {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      b = points[i],
      c = points[i + 1];
    const radius = Math.min(
      10,
      Math.hypot(b.x - a.x, b.y - a.y) / 2,
      Math.hypot(c.x - b.x, c.y - b.y) / 2,
    );
    const before = {
      x: b.x + Math.sign(a.x - b.x) * radius,
      y: b.y + Math.sign(a.y - b.y) * radius,
    };
    const after = {
      x: b.x + Math.sign(c.x - b.x) * radius,
      y: b.y + Math.sign(c.y - b.y) * radius,
    };
    d += ` L${before.x},${before.y} Q${b.x},${b.y} ${after.x},${after.y}`;
  }
  return d + ` L${points.at(-1)!.x},${points.at(-1)!.y}`;
}
type Link = GraphEdge & {
  caption?: string;
  dashed?: boolean;
  recordId?: string;
};
// Routes use dedicated column gutters and empty horizontal lanes. The segment
// geometry is retained so tests can verify routes never enter unrelated cards.
function route(
  nodes: SceneNode[],
  links: Link[],
  headingY: number,
): SceneEdge[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const valid = links.filter((e) => byId.has(e.source) && byId.has(e.target));
  const minY = Math.min(180, ...nodes.map((n) => n.y));
  const maxY = Math.max(300, ...nodes.map((n) => n.y + n.h));
  // Every vertical track must stay inside the free column gutter, including
  // same-column links that pass several rows. Leave room for rounded corners.
  const gutter = DX - W;
  const laneOffset = (index: number) => 24 + (index % 4) * ((gutter - 48) / 3);
  const sides = valid.map((e) => {
    const a = byId.get(e.source)!,
      b = byId.get(e.target)!;
    return {
      s: a.x <= b.x ? "r" : "l",
      t: a.x === b.x ? "r" : a.x < b.x ? "l" : "r",
    };
  });
  const port = (n: SceneNode, side: string, i: number) => {
    const entries = valid
      .map((e, j) => ({ e, j }))
      .filter(
        ({ e, j }) =>
          (e.source === n.id && sides[j].s === side) ||
          (e.target === n.id && sides[j].t === side),
      );
    const index = entries.findIndex((e) => e.j === i);
    return {
      x: n.x + (side === "r" ? n.w : 0),
      y: n.y + 28 + ((index + 1) * 72) / (entries.length + 1),
    };
  };
  let bypass = 0;
  const routed: SceneEdge[] = valid.map((e, i) => {
    const a = byId.get(e.source)!,
      b = byId.get(e.target)!,
      s = port(a, sides[i].s, i),
      t = port(b, sides[i].t, i);
    const same = a.column === b.column,
      adjacent = Math.abs(a.column - b.column) === 1;
    let points: Point[], labelX: number, labelY: number;
    if (adjacent) {
      const left = a.x < b.x ? a : b;
      const lane = left.x + W + laneOffset(i);
      points = [s, { x: lane, y: s.y }, { x: lane, y: t.y }, t];
      // Label sits on the outgoing horizontal segment, with its own port row.
      labelX = left.x + W + (DX - W) / 2;
      labelY = s.y - 12;
    } else if (same) {
      const lane = a.x + W + laneOffset(i);
      points = [s, { x: lane, y: s.y }, { x: lane, y: t.y }, t];
      labelX = lane + 8;
      labelY = (s.y + t.y) / 2;
    } else {
      const laneY =
        bypass % 2 === 0
          ? Math.min(minY - 48, headingY - 38) - Math.floor(bypass / 2) * 34
          : maxY + 48 + Math.floor(bypass / 2) * 34;
      bypass++;
      const sx = s.x + (sides[i].s === "r" ? 1 : -1) * laneOffset(i),
        tx = t.x + (sides[i].t === "r" ? 1 : -1) * laneOffset(i);
      points = [
        s,
        { x: sx, y: s.y },
        { x: sx, y: laneY },
        { x: tx, y: laneY },
        { x: tx, y: t.y },
        t,
      ];
      labelX = (sx + tx) / 2;
      labelY = laneY - 10;
    }
    return {
      ...e,
      id: `${e.source}:${e.target}:${e.relationship}:${i}`,
      points,
      path: rounded(points),
      label: `${a.title} ${e.caption || labelFor[e.relationship] || e.relationship} ${b.title}`,
      caption:
        e.caption ||
        labelFor[e.relationship] ||
        e.relationship.toLowerCase().replaceAll("_", " "),
      labelX,
      labelY,
      dashed: !!e.dashed,
    };
  });
  // Captions have real dimensions in Graph.tsx. Reserve bypass captions first;
  // then distribute nearby captions down each free gutter rather than crowding
  // the few pixels between a card's outgoing ports.
  const occupied: { x: number; y: number }[] = [];
  const fits = (x: number, y: number) =>
    !occupied.some((p) => Math.abs(p.x - x) < 112 && Math.abs(p.y - y) < 29);
  for (const e of routed) {
    const a = byId.get(e.source)!,
      b = byId.get(e.target)!;
    if (Math.abs(a.column - b.column) > 1)
      occupied.push({ x: e.labelX, y: e.labelY });
  }
  for (const e of routed) {
    const a = byId.get(e.source)!,
      b = byId.get(e.target)!;
    if (Math.abs(a.column - b.column) > 1) continue;
    const s = e.points[0],
      t = e.points.at(-1)!;
    const left = a.x < b.x ? a : b;
    const x = left.x + W + gutter / 2;
    const low = Math.min(s.y, t.y),
      high = Math.max(s.y, t.y);
    const preferred = high - low >= 64 ? (low + high) / 2 : e.labelY;
    const candidates = [preferred];
    for (let step = 1; step <= routed.length + 2; step++)
      candidates.push(preferred + step * 29, preferred - step * 29);
    const inSegment = candidates.find(
      (y) => y >= Math.max(headingY + 32, low) && y <= high && fits(x, y),
    );
    const y =
      inSegment ??
      candidates.find((y) => y >= headingY + 32 && fits(x, y)) ??
      Math.max(headingY + 32, preferred, ...occupied.map((p) => p.y + 29));
    e.labelX = x;
    e.labelY = y;
    occupied.push({ x, y });
    if (y < low || y > high) {
      // With parallel or short connections there may be no free caption row on
      // the original segment. Extend the route within the gutter to that row so
      // the caption still visibly belongs to its connection.
      const lane = e.points[1].x;
      const returnLane = lane + (lane < x ? 16 : -16);
      e.points = [
        s,
        { x: lane, y: s.y },
        { x: lane, y: y + 12 },
        { x: returnLane, y: y + 12 },
        { x: returnLane, y: t.y },
        t,
      ];
      e.path = rounded(e.points);
    }
  }
  return routed;
}
function finish(
  nodes: SceneNode[],
  links: Link[],
  columns: Scene["columns"],
  hidden: number,
  note: string,
): Scene {
  const edges = route(nodes, links, Math.min(62, ...columns.map((c) => c.y)));
  // Dense routes can need several lanes above the cards. Normalize the entire
  // scene, including headings and caption boxes, so Fit never crops those lanes.
  const minX = Math.min(
    0,
    ...nodes.map((n) => n.x),
    ...edges.flatMap((e) => [...e.points.map((p) => p.x), e.labelX - 53]),
    ...columns.map((c) => c.x),
  );
  const minY = Math.min(
    0,
    ...nodes.map((n) => n.y),
    ...edges.flatMap((e) => [...e.points.map((p) => p.y), e.labelY - 13]),
    ...columns.map((c) => c.y - 16),
  );
  const shiftX = minX < 0 ? 24 - minX : 0,
    shiftY = minY < 0 ? 24 - minY : 0;
  const sceneNodes = nodes.map((n) => ({
    ...n,
    x: n.x + shiftX,
    y: n.y + shiftY,
  }));
  const sceneEdges = edges.map((e) => {
    const points = e.points.map((p) => ({ x: p.x + shiftX, y: p.y + shiftY }));
    return {
      ...e,
      points,
      path: rounded(points),
      labelX: e.labelX + shiftX,
      labelY: e.labelY + shiftY,
    };
  });
  return {
    nodes: sceneNodes,
    edges: sceneEdges,
    columns: columns.map((c) => ({ ...c, x: c.x + shiftX, y: c.y + shiftY })),
    hidden,
    note,
    width: Math.max(
      640,
      ...sceneNodes.map((n) => n.x + n.w + 70),
      ...sceneEdges.flatMap((e) => [
        ...e.points.map((p) => p.x + 90),
        e.labelX + 53 + 24,
      ]),
    ),
    height: Math.max(
      480,
      ...sceneNodes.map((n) => n.y + n.h + 100),
      ...sceneEdges.flatMap((e) => [
        ...e.points.map((p) => p.y + 90),
        e.labelY + 10 + 24,
      ]),
    ),
  };
}
export function connectedScene(records: RecordRow[], focus: string): Scene {
  const allowed = new Set([
    "evidence",
    "candidate",
    "intervention",
    "metric",
    "duty",
    "task",
    "person",
    "agent",
  ]);
  const all = records.filter((r) => active(r) && allowed.has(r.kind));
  const ids = new Set(all.map((r) => r.id));
  const links: Link[] = all
    .flatMap((r) =>
      linksFor(r).map((l) => ({
        source: l.inbound ? l.target : r.id,
        target: l.inbound ? r.id : l.target,
        relationship: l.relationship,
      })),
    )
    .filter((e) => ids.has(e.source) && ids.has(e.target));
  const root =
    all.find((r) => r.id === focus) ||
    all.find((r) => r.id === defaultGraphFocus(all)) ||
    all[0];
  if (!root) return finish([], [], [], 0, "");
  const chosen = new Set([root.id]);
  const direct = links.filter(
    (e) => e.source === root.id || e.target === root.id,
  );
  const priority = (id: string) =>
    [
      "evidence",
      "duty",
      "candidate",
      "person",
      "agent",
      "task",
      "intervention",
      "metric",
    ].indexOf(all.find((r) => r.id === id)!.kind);
  for (const id of [
    ...new Set(direct.flatMap((e) => [e.source, e.target])),
  ].sort((a, b) => priority(a) - priority(b)))
    if (chosen.size < 10) chosen.add(id);
  // Context may share a source with the focus. Add only a few records, never the
  // whole two-hop fan-out of every person's work.
  const secondary = links.filter(
    (e) => chosen.has(e.source) || chosen.has(e.target),
  );
  for (const id of secondary.flatMap((e) => [e.source, e.target]))
    if (
      chosen.size < 10 &&
      ["candidate", "duty", "intervention", "metric"].includes(
        all.find((r) => r.id === id)!.kind,
      )
    )
      chosen.add(id);
  for (const r of all.filter(
    (r) =>
      chosen.has(r.id) &&
      ["candidate", "duty", "intervention"].includes(r.kind),
  )) {
    for (const id of r.data.evidenceIds || [])
      if (chosen.size < 10 && ids.has(id)) chosen.add(id);
  }
  const group = (r: RecordRow) =>
    r.kind === "evidence"
      ? 0
      : ["candidate", "intervention", "metric"].includes(r.kind)
        ? 1
        : ["task", "duty"].includes(r.kind)
          ? 2
          : 3;
  const names = [
    "01 / EVIDENCE",
    "02 / BUSINESS CONTEXT",
    "03 / WORK & DUTIES",
    "04 / PEOPLE & DELEGATION",
  ];
  const groups = [0, 1, 2, 3].filter((g) =>
    all.some((r) => chosen.has(r.id) && group(r) === g),
  );
  const visible = all.filter((r) => chosen.has(r.id));
  const rows = Math.max(
    ...groups.map((g) => visible.filter((r) => group(r) === g).length),
  );
  const top = 140;
  const nodes = groups.flatMap((g, col) => {
    const members = visible
      .filter((r) => group(r) === g)
      .sort((a, b) => Number(b.id === root.id) - Number(a.id === root.id));
    return members.map((r, row) =>
      node(
        r,
        48 + col * DX,
        top + row * DY + ((rows - members.length) * DY) / 2,
        col,
        records,
      ),
    );
  });
  const bundled: Link[] = [];
  for (const link of links.filter(
    (e) => chosen.has(e.source) && chosen.has(e.target),
  )) {
    const previous = bundled.find(
      (e) =>
        e.source === link.source &&
        e.target === link.target &&
        ["ACCOUNTABLE_FOR", "PERFORMS"].includes(e.relationship) &&
        ["ACCOUNTABLE_FOR", "PERFORMS"].includes(link.relationship),
    );
    if (previous) previous.caption = "owns & performs";
    else bundled.push({ ...link });
  }
  return finish(
    nodes,
    bundled,
    groups.map((g, col) => ({ kind: names[g], x: 48 + col * DX, y: 62 })),
    all.length - chosen.size,
    `Connections around ${root.title}. Select another record to explore its context.`,
  );
}
export function workflowScene(records: RecordRow[], workflowId: string): Scene {
  const workflow = records.find(
    (r) => r.id === workflowId && r.kind === "workflow",
  );
  const tasks = records.filter(
    (r) =>
      r.kind === "task" &&
      active(r) &&
      (!workflow || workflow.data.taskIds.includes(r.id)),
  );
  const ids = new Set(tasks.map((r) => r.id));
  const handoffs = records.filter(
    (r) =>
      r.kind === "handoff" &&
      active(r) &&
      ids.has(r.data.sourceTaskId) &&
      ids.has(r.data.targetTaskId) &&
      (!workflow || workflow.data.handoffIds.includes(r.id)),
  );
  const links: Link[] = handoffs.map((r) => ({
    source: r.data.sourceTaskId,
    target: r.data.targetTaskId,
    relationship: "HANDS_OFF_TO",
    caption: r.data.condition,
    dashed: r.state !== "reviewed",
    recordId: r.id,
  }));
  // Kahn ranks put dependent work to the right; secondary nodes at a rank sit
  // below the first path. Cyclic/unconnected records remain visible separately.
  const rank = new Map<string, number>();
  const indegree = new Map(
    tasks.map((t) => [t.id, links.filter((l) => l.target === t.id).length]),
  );
  const queue = tasks.filter((t) => indegree.get(t.id) === 0).map((t) => t.id);
  for (const id of queue) rank.set(id, 0);
  for (let q = 0; q < queue.length; q++)
    for (const edge of links.filter((l) => l.source === queue[q])) {
      rank.set(
        edge.target,
        Math.max(rank.get(edge.target) || 0, (rank.get(queue[q]) || 0) + 1),
      );
      indegree.set(edge.target, indegree.get(edge.target)! - 1);
      if (indegree.get(edge.target) === 0) queue.push(edge.target);
    }
  const cyclic = tasks.filter((t) => !queue.includes(t.id));
  const max = Math.max(0, ...rank.values());
  cyclic.forEach((t) => rank.set(t.id, max + 1));
  const counts = new Map<number, number>();
  const nodes = tasks.map((r) => {
    const col = rank.get(r.id) || 0,
      row = counts.get(col) || 0;
    counts.set(col, row + 1);
    return node(r, 48 + col * DX, 170 + row * DY, col, records);
  });
  return finish(
    nodes,
    links,
    [
      {
        kind: links.length
          ? "RECORDED HANDOFFS · FOLLOW THE ARROWS"
          : "TASKS · NO HANDOFFS RECORDED",
        x: 48,
        y: 85,
      },
    ],
    0,
    cyclic.length
      ? "A handoff loop needs review; the affected tasks are grouped at the right."
      : links.length
        ? "Arrows show recorded handoff conditions. Dashed connections still need review. Select a connection to open its handoff contract."
        : "These tasks have no recorded handoffs. Their position does not imply a sequence. Add handoff contracts in Task cards.",
  );
}
