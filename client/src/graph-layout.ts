export type GraphNode = {
  id: string;
  kind: string;
  title: string;
  version: number;
  state: string;
};
export type GraphEdge = {
  source: string;
  target: string;
  relationship: string;
};
type PositionedNode = GraphNode & {
  x: number;
  y: number;
  w: number;
  h: number;
  column: number;
};

export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  view: string,
) {
  // Keeping task evidence beside tasks removes the old routes through people.
  const kinds =
    view === "work"
      ? ["person", "task"]
      : ["person", "task", "evidence", "candidate", "agent"];
  const columns = kinds.filter((kind) => nodes.some((n) => n.kind === kind));
  const visible = nodes.filter((n) => columns.includes(n.kind));
  const allowed = new Set(visible.map((n) => n.id));
  const links = edges.filter(
    (e) => allowed.has(e.source) && allowed.has(e.target),
  );
  const longLinks = links.filter((e) => {
    const a = visible.find((n) => n.id === e.source)!;
    const b = visible.find((n) => n.id === e.target)!;
    return Math.abs(columns.indexOf(a.kind) - columns.indexOf(b.kind)) > 1;
  });
  const top = 116 + longLinks.length * 16;
  const positioned: PositionedNode[] = visible.map((n) => ({
    ...n,
    column: columns.indexOf(n.kind),
    x: 48 + columns.indexOf(n.kind) * 420,
    y:
      top +
      visible.filter((a) => a.kind === n.kind).findIndex((a) => a.id === n.id) *
        144,
    w: 260,
    h: 100,
  }));
  const byId = new Map(positioned.map((n) => [n.id, n]));
  const ports = new Map<string, number[]>();
  const sides = links.map((e, i) => {
    const a = byId.get(e.source)!,
      b = byId.get(e.target)!;
    const right = a.x <= b.x;
    const sourceSide = right ? "right" : "left";
    const targetSide = a.x === b.x ? "right" : right ? "left" : "right";
    for (const key of [`${a.id}:${sourceSide}`, `${b.id}:${targetSide}`]) {
      const entries = ports.get(key) || [];
      entries.push(i);
      ports.set(key, entries);
    }
    return { sourceSide, targetSide };
  });
  const port = (n: PositionedNode, side: string, i: number) => {
    const entries = ports.get(`${n.id}:${side}`)!;
    return {
      x: n.x + (side === "right" ? n.w : 0),
      y: n.y + 20 + ((entries.indexOf(i) + 1) * 60) / (entries.length + 1),
    };
  };
  const routed = links.map((e, i) => {
    const a = byId.get(e.source)!,
      b = byId.get(e.target)!;
    const { sourceSide, targetSide } = sides[i];
    const start = port(a, sourceSide, i),
      end = port(b, targetSide, i);
    const direction = sourceSide === "right" ? 1 : -1;
    const endDirection = targetSide === "right" ? 1 : -1;
    let path: string;
    if (Math.abs(a.column - b.column) === 1) {
      const bend = 54 + (i % 4) * 12;
      path = `M${start.x},${start.y} C${start.x + direction * bend},${start.y} ${end.x + endDirection * bend},${end.y} ${end.x},${end.y}`;
    } else if (a.column === b.column) {
      // Reporting edges stay in the side gutter, never through another card.
      const lane = Math.max(a.x + a.w, b.x + b.w) + 38 + (i % 5) * 14;
      path = `M${start.x},${start.y} C${lane},${start.y} ${lane},${end.y} ${end.x},${end.y}`;
    } else {
      // Long connections travel above the columns on separate rounded lanes.
      const laneY = 56 + longLinks.indexOf(e) * 16;
      const sx = start.x + direction * (32 + (i % 4) * 18);
      const ex = end.x + endDirection * (32 + (i % 4) * 18);
      const travel = Math.sign(ex - sx);
      path = `M${start.x},${start.y} L${sx - direction * 10},${start.y} Q${sx},${start.y} ${sx},${start.y - 10} L${sx},${laneY + 10} Q${sx},${laneY} ${sx + travel * 10},${laneY} L${ex - travel * 10},${laneY} Q${ex},${laneY} ${ex},${laneY + 10} L${ex},${end.y - 10} Q${ex},${end.y} ${ex - endDirection * 10},${end.y} L${end.x},${end.y}`;
    }
    return {
      ...e,
      path,
      label: `${a.title} ${e.relationship.replaceAll("_", " ").toLowerCase()} ${b.title}`,
    };
  });
  return {
    nodes: positioned,
    edges: routed,
    columns: columns.map((kind, column) => ({
      kind,
      x: 48 + column * 420,
      y: top - 22,
    })),
    width: Math.max(600, ...positioned.map((n) => n.x + n.w + 100)),
    height: Math.max(500, ...positioned.map((n) => n.y + n.h + 76)),
  };
}

export function wrapNodeTitle(title: string) {
  const lines: string[] = [""];
  for (const word of title.split(/\s+/)) {
    const last = lines.length - 1;
    if (lines[last] && `${lines[last]} ${word}`.length > 28) lines.push(word);
    else lines[last] += `${lines[last] ? " " : ""}${word}`;
  }
  return lines.length > 3
    ? [...lines.slice(0, 2), `${lines[2].slice(0, 25)}…`]
    : lines;
}
