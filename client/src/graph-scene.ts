import type { RecordRow } from "../../shared/domain.ts";
import { taskMode } from "../../shared/task-presentation.ts";
import type { GraphNode, GraphEdge } from "./graph-layout.ts";

export type Point = { x: number; y: number };
export type SceneNode = GraphNode &
  Point & {
    w: number;
    h: number;
    subtitle: string;
    column: number;
    mode?: string;
    modeLabel?: string;
  };
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
      records.find(
        (r) =>
          r.kind === "duty" &&
          active(r) &&
          r.data.ownerId &&
          r.data.taskIds?.length,
      ) ||
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
  const performer = records.find((p) => p.id === r.data.performerId);
  const mode = r.kind === "task" ? taskMode(r.data.mode) : undefined;
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    version: r.version,
    state: r.state,
    x,
    y,
    column,
    mode: mode?.id,
    modeLabel: mode?.label,
    w: W,
    h: H,
    subtitle:
      r.kind === "person"
        ? r.data.role
        : r.kind === "task"
          ? mode?.id === "ai"
            ? "AI execution · proposed"
            : performer
              ? `Performer: ${performer.title}`
              : "Performer not recorded"
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
  const all = records.filter(active);
  const root =
    all.find((r) => r.id === focus) ||
    all.find((r) => r.id === defaultGraphFocus(all));
  if (!root) return finish([], [], [], 0, "");
  // Show one recorded duty at a time. Shared evidence is inspected separately:
  // it does not imply that unrelated duties belong to this responsibility chain.
  const duties = all.filter((r) => r.kind === "duty");
  const duty =
    root.kind === "duty"
      ? root
      : duties.find((d) =>
          root.kind === "person"
            ? d.data.ownerId === root.id
            : root.kind === "task"
              ? (d.data.taskIds || []).includes(root.id)
              : false,
        );
  const relatedTasks = all.filter(
    (r) =>
      r.kind === "task" &&
      (duty
        ? (duty.data.taskIds || []).includes(r.id)
        : root.kind === "task"
          ? r.id === root.id
          : root.kind === "person" &&
            (r.data.ownerId === root.id || r.data.performerId === root.id)),
  );
  const tasks = [...relatedTasks]
    .sort((a, b) => Number(b.id === root.id) - Number(a.id === root.id))
    .slice(0, 3);
  const ownerIds = duty
    ? [duty.data.ownerId]
    : tasks.map((t) => t.data.ownerId);
  const people = all
    .filter((r) => r.kind === "person" && ownerIds.includes(r.id))
    .slice(0, 3);
  const groups = [people, duty ? [duty] : [], tasks];
  const rows = Math.max(1, ...groups.map((g) => g.length));
  const nodes = groups.flatMap((members, col) =>
    members.map((r, row) =>
      node(
        r,
        48 + col * DX,
        116 + row * DY + ((rows - members.length) * DY) / 2,
        col,
        all,
      ),
    ),
  );
  const links: Link[] = [];
  if (duty) {
    if (people.some((p) => p.id === duty.data.ownerId))
      links.push({
        source: duty.data.ownerId,
        target: duty.id,
        relationship: "ACCOUNTABLE_FOR",
      });
    for (const task of tasks)
      links.push({
        source: duty.id,
        target: task.id,
        relationship: "CONTAINS",
        caption: "includes task",
      });
  } else {
    for (const task of tasks)
      if (people.some((p) => p.id === task.data.ownerId))
        links.push({
          source: task.data.ownerId,
          target: task.id,
          relationship: "ACCOUNTABLE_FOR",
        });
  }
  const scene = finish(
    nodes,
    links,
    [
      "01 / PEOPLE · ACCOUNTABLE OWNER",
      "02 / DUTY · ONGOING RESPONSIBILITY",
      "03 / TASKS · WHO DOES THE WORK",
    ].map((kind, col) => ({ kind, x: 48 + col * DX, y: 62 })),
    all.length - nodes.length,
    `${duty?.title || root.title}. ${tasks.length} of ${relatedTasks.length} related tasks shown. Choose a duty or task to explore its responsibility. Evidence and other connections are in the record details.`,
  );
  // Keep all three columns visible even when responsibility is not recorded.
  scene.width = Math.max(scene.width, 48 + 2 * DX + W + 70);
  return scene;
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
  // A recorded A→C plus A→B→C path can put B below C, keeping the direct
  // route legible. This is layout only: every real edge and condition remains.
  const detours = new Map<string, string>();
  for (const task of tasks) {
    const incoming = links.filter((l) => l.target === task.id);
    const outgoing = links.filter((l) => l.source === task.id);
    if (
      incoming.length === 1 &&
      outgoing.length === 1 &&
      incoming[0].source !== outgoing[0].target &&
      links.some(
        (l) =>
          l.source === incoming[0].source && l.target === outgoing[0].target,
      )
    )
      detours.set(task.id, outgoing[0].target);
  }
  // Nested detours use the regular dependency layout rather than hiding ranks.
  for (const [id, target] of [...detours])
    if (detours.has(target)) detours.delete(id);
  const rankedTasks = tasks.filter((t) => !detours.has(t.id));
  const rankedLinks = links.filter(
    (l) => !detours.has(l.source) && !detours.has(l.target),
  );
  // Kahn ranks put the remaining dependent work to the right. Cyclic and
  // unconnected records remain visible; no new relationship is inferred.
  const rank = new Map<string, number>();
  const indegree = new Map(
    rankedTasks.map((t) => [
      t.id,
      rankedLinks.filter((l) => l.target === t.id).length,
    ]),
  );
  const queue = rankedTasks
    .filter((t) => indegree.get(t.id) === 0)
    .map((t) => t.id);
  for (const id of queue) rank.set(id, 0);
  for (let q = 0; q < queue.length; q++)
    for (const edge of rankedLinks.filter((l) => l.source === queue[q])) {
      rank.set(
        edge.target,
        Math.max(rank.get(edge.target) || 0, (rank.get(queue[q]) || 0) + 1),
      );
      indegree.set(edge.target, indegree.get(edge.target)! - 1);
      if (indegree.get(edge.target) === 0) queue.push(edge.target);
    }
  const cyclic = rankedTasks.filter((t) => !queue.includes(t.id));
  const max = Math.max(0, ...rank.values());
  cyclic.forEach((t) => rank.set(t.id, max + 1));
  for (const [id, target] of detours) rank.set(id, rank.get(target) || 0);
  const counts = new Map<number, number>();
  const nodes = [...rankedTasks, ...tasks.filter((t) => detours.has(t.id))].map(
    (r) => {
      const col = rank.get(r.id) || 0,
        row = counts.get(col) || 0;
      counts.set(col, row + 1);
      return node(r, 48 + col * DX, 170 + row * DY, col, records);
    },
  );
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
