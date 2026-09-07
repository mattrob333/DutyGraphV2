import test from "node:test";
import assert from "node:assert/strict";
import {
  backbone,
  businessTemplates,
  businessProfileSchema,
} from "../shared/business-types.ts";
import {
  validateFrameworkOutput,
  frameworkContext,
} from "../server/frameworks.ts";
import { syntheticFramework } from "./framework-fixtures.ts";
import { FRAMEWORK_GUIDE_VERSION } from "../shared/framework-guides.ts";
test("business library has valid distinct models and delivery subdivisions keep their meaning", () => {
  assert.equal(businessTemplates.length, 52);
  assert.equal(new Set(businessTemplates.map((t) => t.id)).size, 52);
  for (const t of businessTemplates) {
    businessProfileSchema.parse({
      industry: "",
      status: "proposed",
      rationale: "",
      streams: [
        { id: t.id, templateId: t.id, name: t.label, stages: t.stages },
      ],
    });
    assert.deepEqual(
      new Set(t.stages.flatMap((s) => s.functionIds)),
      new Set(backbone.map((f) => f.id)),
      t.id,
    );
  }
  const m = businessTemplates.find((t) => t.id === "manufacturing")!;
  for (const name of ["Source materials", "Make", "Ship"])
    assert.deepEqual(m.stages.find((s) => s.name === name)?.functionIds, [
      "do",
    ]);
});
test("hybrid and custom flows work; unknown templates and duplicate identifiers are rejected", () => {
  const streams = businessTemplates
    .filter((t) => ["manufacturing", "saas"].includes(t.id))
    .map((t) => ({
      id: t.id,
      templateId: t.id,
      name: t.label,
      stages: t.stages,
    }));
  const p = {
    industry: "Industrial products",
    status: "proposed",
    rationale: "Includes hosted monitoring",
    streams,
  };
  assert.equal(businessProfileSchema.parse(p).streams.length, 2);
  assert.equal(
    businessProfileSchema.safeParse({ ...p, streams: [streams[0], streams[0]] })
      .success,
    false,
  );
  assert.equal(
    businessProfileSchema.safeParse({
      ...p,
      streams: [{ ...streams[0], templateId: "made-up" }],
    }).success,
    false,
  );
  assert.equal(
    businessProfileSchema.safeParse({
      ...p,
      streams: [{ ...streams[0], templateId: "custom" }],
    }).success,
    true,
  );
});
test("industry map validates classification IDs and requires actual source citations", () => {
  const input = {
    frameworkKey: "industrymap",
    company: "Test",
    promptVersion: FRAMEWORK_GUIDE_VERSION,
    omitted: 0,
    sources: [
      {
        id: "r1",
        version: 1,
        hash: "h",
        title: "Company research",
        state: "collected",
        kind: "research",
        locator: "https://example.com",
        text: "A consulting practice",
        excerpted: false,
      },
    ],
  };
  const output = syntheticFramework(input);
  validateFrameworkOutput(output, input);
  const row = output.sections.find((s) => s.id === "business_types")!.items[0];
  row.values.find((v) => v.key === "template_id")!.value = "unrecognized-type";
  assert.throws(
    () => validateFrameworkOutput(output, input),
    /unknown business type/,
  );
  row.values.find((v) => v.key === "template_id")!.value = "advisory";
  row.sourceIds = ["foreign"];
  assert.throws(() => validateFrameworkOutput(output, input), /valid source/);
});
