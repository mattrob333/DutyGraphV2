import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  frameworkGuides,
  frameworkGroups,
} from "../shared/framework-guides.ts";
import { standupQuestions } from "../shared/standup.ts";
import { sampleCases } from "../server/sample-cases.ts";
import { populateCobaltExamples } from "../server/sample-examples.ts";
import type { RecordRow } from "../shared/domain.ts";
test("every canonical framework has a specific guide, output and cadence", () => {
  const registry = JSON.parse(
    readFileSync("contracts/framework-registry.json", "utf8"),
  );
  assert.deepEqual(
    Object.keys(frameworkGuides).sort(),
    [...registry.order].sort(),
  );
  for (const key of registry.order) {
    const g = frameworkGuides[key];
    assert.ok(g.steps.length >= 4);
    assert.ok(g.output.length > 30);
    assert.ok(g.cadence.length > 10);
    assert.ok(frameworkGroups.some((c) => c.id === g.group));
  }
  assert.equal(frameworkGuides.fiveforces.group, "market");
  assert.ok(frameworkGuides.pestle.steps[0].includes("economic"));
});
test("standup questions use only the selected person’s work and always ask for sources", () => {
  const records = [
    {
      kind: "task",
      title: "Private task",
      data: { ownerId: "other", conflict: true },
    },
    {
      kind: "task",
      title: "Supplier approval",
      data: { ownerId: "me", conflict: true },
    },
  ] as RecordRow[];
  const questions = standupQuestions(records, "me");
  assert.equal(questions.length, 4);
  assert.ok(questions.join(" ").includes("Supplier approval"));
  assert.ok(!questions.join(" ").includes("Private task"));
  assert.ok(questions[0].includes("source"));
});
test("fictional cases follow real sample routes and never acquire live deadlines", async () => {
  const records = await populateCobaltExamples(
    [],
    async (kind, title, data, state) =>
      ({
        id: randomUUID(),
        kind,
        title,
        data,
        state,
        version: 1,
        hash: randomUUID(),
      }) as RecordRow,
  );
  const previews = sampleCases(records);
  assert.equal(previews.length, 2);
  for (const c of previews) {
    assert.equal(c.data.executionMode, "illustrative_snapshot");
    assert.ok(c.data.steps.some((s) => s.state === "completed"));
    assert.equal(c.data.steps.filter((s) => s.state === "ready").length, 1);
    assert.ok(c.data.steps.every((s) => s.dueAt === null));
    assert.ok(
      c.data.steps.every((s) => c.data.definition.taskIds.includes(s.id)),
    );
  }
  assert.equal(
    sampleCases([
      ...records,
      ...previews.map(
        (c) => ({ ...c, id: randomUUID(), kind: "case" }) as RecordRow,
      ),
    ]).length,
    0,
  );
});
