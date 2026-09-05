import test from "node:test";
import assert from "node:assert/strict";
import {
  layoutGraph,
  wrapNodeTitle,
  type GraphNode,
  type GraphEdge,
} from "../client/src/graph-layout.ts";
const nodes: GraphNode[] = [
  "person",
  "task",
  "evidence",
  "candidate",
  "agent",
].flatMap((kind) =>
  [0, 1].map((i) => ({
    id: `${kind}-${i}`,
    kind,
    title: `${kind} ${i}`,
    state: "proposed",
    version: 1,
  })),
);
const edges: GraphEdge[] = [
  { source: "person-0", target: "task-1", relationship: "ACCOUNTABLE_FOR" },
  { source: "person-0", target: "task-1", relationship: "PERFORMS" },
  { source: "task-0", target: "evidence-1", relationship: "SUPPORTED_BY" },
  { source: "person-0", target: "agent-0", relationship: "ACCOUNTABLE_FOR" },
  { source: "agent-0", target: "task-0", relationship: "BOUND_TO" },
];
test("layout leaves clear horizontal gutters and does not mutate records", () => {
  const original = JSON.stringify({ nodes, edges });
  const layout = layoutGraph(nodes, edges, "connected");
  for (const a of layout.nodes)
    for (const b of layout.nodes) {
      if (a.id === b.id) continue;
      if (a.column === b.column) assert.ok(Math.abs(a.y - b.y) >= a.h + 40);
      else assert.ok(Math.abs(a.x - b.x) >= a.w + 150);
    }
  assert.equal(JSON.stringify({ nodes, edges }), original);
});
test("distinct owner and performer relationships have separate ports", () => {
  const layout = layoutGraph(nodes, edges, "connected");
  assert.notEqual(layout.edges[0].path, layout.edges[1].path);
  assert.notEqual(layout.edges[0].label, layout.edges[1].label);
});
test("long arrows use separate overhead lanes outside intervening cards", () => {
  const layout = layoutGraph(nodes, edges, "connected");
  const long = layout.edges.slice(3);
  for (const edge of long) {
    assert.match(edge.path, / Q/);
    const all = [...edge.path.matchAll(/[MLQ](-?[\d.]+),(-?[\d.]+)/g)].map(
      (m) => ({ x: Number(m[1]), y: Number(m[2]) }),
    );
    assert.ok(
      all.some((p) => p.y < Math.min(...layout.nodes.map((n) => n.y)) - 40),
    );
    for (const p of all)
      for (const n of layout.nodes.filter(
        (n) => n.id !== edge.source && n.id !== edge.target,
      ))
        assert.ok(
          !(p.x > n.x && p.x < n.x + n.w && p.y > n.y && p.y < n.y + n.h),
        );
  }
});
test("filtered views omit dangling edges and remain finite when empty", () => {
  const layout = layoutGraph(
    nodes,
    [
      ...edges,
      { source: "missing", target: "task-0", relationship: "PERFORMS" },
    ],
    "work",
  );
  assert.equal(layout.edges.length, 2);
  assert.ok(layout.nodes.every((n) => ["person", "task"].includes(n.kind)));
  const empty = layoutGraph([], [], "connected");
  assert.ok(Number.isFinite(empty.width) && Number.isFinite(empty.height));
});
test("title wrapping preserves sample hypothesis and visibly marks long truncation", () => {
  const title = "Supplier approval is falling between two teams.";
  assert.equal(wrapNodeTitle(title).join(" "), title);
  assert.ok(
    wrapNodeTitle(
      "An exceptionally long description of a hypothetical responsibility that will not fit inside one visible graph card without a readable truncation mark.",
    )
      .at(-1)
      ?.endsWith("…"),
  );
});
