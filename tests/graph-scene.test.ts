import test from "node:test";
import assert from "node:assert/strict";
import type { RecordRow } from "../shared/domain.ts";
import {
  connectedScene,
  workflowScene,
  defaultGraphFocus,
  type Scene,
} from "../client/src/graph-scene.ts";
const r = (id: string, kind: string, data: any = {}, state = "proposed") =>
  ({ id, kind, title: id, version: 1, state, data }) as RecordRow;
function noCardIntersections(scene: Scene) {
  for (const edge of scene.edges)
    for (let i = 1; i < edge.points.length; i++)
      for (const n of scene.nodes.filter(
        (n) => n.id !== edge.source && n.id !== edge.target,
      )) {
        const a = edge.points[i - 1],
          b = edge.points[i];
        const crosses =
          a.x === b.x
            ? a.x > n.x &&
              a.x < n.x + n.w &&
              Math.max(a.y, b.y) > n.y &&
              Math.min(a.y, b.y) < n.y + n.h
            : a.y > n.y &&
              a.y < n.y + n.h &&
              Math.max(a.x, b.x) > n.x &&
              Math.min(a.x, b.x) < n.x + n.w;
        assert.ok(!crosses, `${edge.id} intersects ${n.id}`);
      }
}
function framedAndReadable(scene: Scene) {
  assert.ok(Number.isFinite(scene.width) && Number.isFinite(scene.height));
  for (const node of scene.nodes) {
    assert.ok(node.x >= 0 && node.y >= 0);
    assert.ok(
      node.x + node.w <= scene.width && node.y + node.h <= scene.height,
    );
  }
  for (const [index, edge] of scene.edges.entries()) {
    for (const point of edge.points)
      assert.ok(
        point.x >= 0 &&
          point.y >= 0 &&
          point.x <= scene.width &&
          point.y <= scene.height,
        `${edge.id} route is outside the fitted scene`,
      );
    const box = {
      left: edge.labelX - 53,
      right: edge.labelX + 53,
      top: edge.labelY - 13,
      bottom: edge.labelY + 10,
    };
    assert.ok(
      box.left >= 0 &&
        box.top >= 0 &&
        box.right <= scene.width &&
        box.bottom <= scene.height,
      `${edge.id} caption is outside the fitted scene`,
    );
    for (const node of scene.nodes)
      assert.ok(
        box.right <= node.x ||
          box.left >= node.x + node.w ||
          box.bottom <= node.y ||
          box.top >= node.y + node.h,
        `${edge.id} caption covers ${node.id}`,
      );
    for (const other of scene.edges.slice(index + 1))
      assert.ok(
        Math.abs(edge.labelX - other.labelX) >= 106 ||
          Math.abs(edge.labelY - other.labelY) >= 23,
        `${edge.id} caption overlaps ${other.id}`,
      );
  }
}
test("focused scenes are bounded, bundle dual roles and keep context traceable", () => {
  const records = [
    r("owner", "person", { role: "Lead" }),
    r("task", "task", {
      ownerId: "owner",
      performerId: "owner",
      evidenceIds: ["source"],
      conflict: true,
    }),
    r("source", "evidence", { type: "Policy document" }),
    r("hypothesis", "candidate", { evidenceIds: ["source"] }),
    ...Array.from({ length: 30 }, (_, i) =>
      r("peer" + i, "task", { ownerId: "owner", evidenceIds: ["source"] }),
    ),
  ];
  assert.equal(defaultGraphFocus(records), "task");
  const scene = connectedScene(records, "task");
  assert.ok(scene.nodes.length <= 10);
  assert.ok(scene.nodes.some((n) => n.id === "hypothesis"));
  assert.ok(!scene.nodes.some((n) => n.id === "peer0"));
  const links = scene.edges.filter(
    (e) => e.source === "owner" && e.target === "task",
  );
  assert.equal(links.length, 1);
  assert.equal(links[0].caption, "owns & performs");
  noCardIntersections(scene);
  framedAndReadable(scene);
});
test("workflow scenes use explicit scoped handoffs and place alternatives below", () => {
  const records = [
    r("a", "task"),
    r("b", "task"),
    r("c", "task"),
    r("d", "task"),
    r(
      "h1",
      "handoff",
      { sourceTaskId: "a", targetTaskId: "b", condition: "Standard packet" },
      "reviewed",
    ),
    r("h2", "handoff", {
      sourceTaskId: "a",
      targetTaskId: "c",
      condition: "Missing reference",
    }),
    r("h3", "handoff", {
      sourceTaskId: "b",
      targetTaskId: "d",
      condition: "Checked",
    }),
    r("h4", "handoff", {
      sourceTaskId: "c",
      targetTaskId: "d",
      condition: "Corrected",
    }),
    r("wf", "workflow", {
      taskIds: ["a", "b", "c", "d"],
      handoffIds: ["h1", "h2", "h3", "h4"],
    }),
  ];
  const scene = workflowScene(records, "wf");
  assert.equal(scene.edges.length, 4);
  assert.ok(scene.nodes.every((n) => n.kind === "task"));
  assert.equal(scene.edges[0].recordId, "h1");
  assert.equal(scene.edges[0].dashed, false);
  assert.equal(scene.edges[1].dashed, true);
  assert.equal(scene.edges[1].caption, "Missing reference");
  assert.ok(
    scene.nodes.find((n) => n.id === "c")!.y >
      scene.nodes.find((n) => n.id === "b")!.y,
  );
  noCardIntersections(scene);
  framedAndReadable(scene);
  const scoped = workflowScene(
    [
      ...records,
      r("small", "workflow", { taskIds: ["a", "b"], handoffIds: ["h1"] }),
    ],
    "small",
  );
  assert.equal(scoped.edges.length, 1);
  assert.equal(scoped.nodes.length, 2);
});
test("unconnected and cyclic work never gains an invented execution sequence", () => {
  const empty = workflowScene([r("a", "task"), r("b", "task")], "");
  assert.equal(empty.edges.length, 0);
  assert.match(empty.note, /does not imply a sequence/);
  const cycle = workflowScene(
    [
      r("a", "task"),
      r("b", "task"),
      r("h1", "handoff", {
        sourceTaskId: "a",
        targetTaskId: "b",
        condition: "First",
      }),
      r("h2", "handoff", {
        sourceTaskId: "b",
        targetTaskId: "a",
        condition: "Return",
      }),
    ],
    "",
  );
  assert.equal(cycle.nodes.length, 2);
  assert.match(cycle.note, /loop needs review/);
  assert.ok(Number.isFinite(cycle.height));
  noCardIntersections(cycle);
  framedAndReadable(cycle);
});

test("dense duty context keeps same-column routes out of neighboring people and fits all bypasses", () => {
  const records = [
    r("p1", "person", { role: "Lead", managerId: "p2" }),
    r("p2", "person", { role: "Director" }),
    ...["e0", "e1", "e2"].map((id) =>
      r(id, "evidence", { type: "Policy document" }),
    ),
    r("t0", "task", {
      ownerId: "p2",
      performerId: "p2",
      evidenceIds: ["e1", "e2"],
    }),
    r("t1", "task", {
      ownerId: "p1",
      performerId: "p2",
      evidenceIds: ["e0", "e2"],
    }),
    r("t2", "task", {
      ownerId: "p1",
      performerId: "p1",
      evidenceIds: ["e0", "e1", "e2"],
    }),
    r("t3", "task", {
      ownerId: "p2",
      performerId: "p2",
      evidenceIds: ["e0", "e1", "e2"],
    }),
    r("c", "candidate", { evidenceIds: ["e0", "e1", "e2"] }),
    r("d", "duty", {
      ownerId: "p1",
      taskIds: ["t1", "t2", "t3"],
      evidenceIds: ["e0", "e1", "e2"],
    }),
  ];
  const scene = connectedScene(records, "d");
  assert.ok(scene.nodes.length <= 10);
  assert.ok(scene.edges.length >= 20);
  assert.ok(
    scene.edges.some((edge) => edge.source === "d" && edge.target === "t2"),
  );
  noCardIntersections(scene);
  framedAndReadable(scene);
});

test("three-way fan-out gives every handoff its own readable caption row", () => {
  const tasks = ["a", "b", "c", "d"].map((id) => r(id, "task"));
  const handoffs = ["b", "c", "d"].map((target, i) =>
    r("h" + i, "handoff", {
      sourceTaskId: "a",
      targetTaskId: target,
      condition: "Condition " + target,
    }),
  );
  const scene = workflowScene([...tasks, ...handoffs], "");
  assert.equal(scene.edges.length, 3);
  noCardIntersections(scene);
  framedAndReadable(scene);
  for (const edge of scene.edges) {
    const source = scene.nodes.find((node) => node.id === edge.source)!;
    const target = scene.nodes.find((node) => node.id === edge.target)!;
    assert.ok(edge.labelX - 53 > source.x + source.w);
    assert.ok(edge.labelX + 53 < target.x);
  }
});

test("a dense 14-task workflow retains all 91 real handoffs inside the fitted scene", () => {
  const tasks = Array.from({ length: 14 }, (_, i) => r("t" + i, "task"));
  const handoffs = tasks.flatMap((source, i) =>
    tasks.slice(i + 1).map((target) =>
      r(`${source.id}-${target.id}`, "handoff", {
        sourceTaskId: source.id,
        targetTaskId: target.id,
        condition: "Accepted output",
      }),
    ),
  );
  const scene = workflowScene([...tasks, ...handoffs], "");
  assert.equal(scene.nodes.length, 14);
  assert.equal(scene.edges.length, 91);
  noCardIntersections(scene);
  framedAndReadable(scene);
});

test("empty scenes retain finite usable frame dimensions", () => {
  for (const scene of [connectedScene([], ""), workflowScene([], "")]) {
    assert.equal(scene.nodes.length, 0);
    assert.equal(scene.edges.length, 0);
    framedAndReadable(scene);
  }
});
