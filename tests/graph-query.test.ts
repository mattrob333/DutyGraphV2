import test from "node:test";
import assert from "node:assert/strict";
import { boundedGraph, graphQuerySchema } from "../server/graph-query.ts";
const person = {
    id: "p",
    kind: "person",
    title: "Person",
    version: 1,
    state: "reported",
    data: {},
  },
  task = {
    id: "t",
    kind: "task",
    title: "Task",
    version: 1,
    state: "proposed",
    data: { ownerId: "p", performerId: "p", evidenceIds: ["e"] },
  },
  evidence = {
    id: "e",
    kind: "evidence",
    title: "Source",
    version: 1,
    state: "accepted",
    data: { text: "Private original" },
  };
test("a focused graph respects hop and node budgets and omits source bodies", () => {
  const graph = boundedGraph([person, task, evidence], {
    focus: "p",
    limit: 2,
    depth: 1,
  });
  assert.equal(graph.nodes.length, 2);
  assert.ok(!graph.nodes.some((n) => n.id === "e"));
  assert.ok(!JSON.stringify(graph).includes("Private original"));
  const capped = boundedGraph([person, task, evidence], {
    focus: "p",
    limit: 2,
    depth: 2,
  });
  assert.ok(capped.truncated);
  assert.ok(
    capped.edges.every(
      (e) =>
        capped.nodes.some((n) => n.id === e.source) &&
        capped.nodes.some((n) => n.id === e.target),
    ),
  );
});
test("arbitrary queries and unsupported relationship filters are rejected", () => {
  assert.equal(
    graphQuerySchema.safeParse({ cypher: "MATCH (n) RETURN n" }).success,
    false,
  );
  assert.equal(graphQuerySchema.safeParse({ depth: 5 }).success, false);
  assert.equal(graphQuerySchema.safeParse({ limit: 1000 }).success, false);
  assert.throws(() =>
    boundedGraph([person, task], {
      limit: 10,
      depth: 1,
      relationships: "GRANT_ADMIN",
    }),
  );
});
