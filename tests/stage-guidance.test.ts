import test from "node:test";
import assert from "node:assert/strict";
import {
  businessTemplates,
  businessProfileSchema,
} from "../shared/business-types.ts";
import { stageGuidance } from "../shared/stage-guidance.ts";
import { stageWorkMap } from "../shared/stage-work-map.ts";

test("company stage counts are not fixed at six and descriptions survive validation", () => {
  for (const count of [1, 4, 7, 8, 12, 16]) {
    const profile = businessProfileSchema.parse({
      industry: "Example",
      status: "proposed",
      rationale: "Example",
      streams: [
        {
          id: "custom",
          name: "Example",
          templateId: "custom",
          stages: Array.from({ length: count }, (_, i) => ({
            id: `stage-${i}`,
            name: `Stage ${i}`,
            description: "An agreed company stage.",
            functionIds: ["do"],
          })),
        },
      ],
    });
    assert.equal(stageWorkMap([], profile).streams[0].stages.length, count);
    assert.equal(
      profile.streams[0].stages[0].description,
      "An agreed company stage.",
    );
  }
});
test("specific stage guidance is educational and company wording takes precedence", () => {
  const stream = businessTemplates.find((t) => t.id === "wholesale")!;
  const stage = stream.stages[0];
  assert.match(stageGuidance(stage, stream).summary, /business customers/);
  assert.equal(
    stageGuidance(
      { ...stage, description: "Our team serves existing accounts only." },
      stream,
    ).summary,
    "Our team serves existing accounts only.",
  );
  assert.equal(
    stageGuidance({ ...stage, name: "Renew permits" }, stream).examples.length,
    0,
  );
  assert.equal(
    stageGuidance(
      { id: "custom-1", name: "Renew permits" },
      { templateId: "custom" },
    ).examples.length,
    0,
  );
  assert.match(
    stageGuidance(stage, { name: stream.label }).summary,
    /business customers/,
  );
});
