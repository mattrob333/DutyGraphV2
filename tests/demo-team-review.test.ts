import test from "node:test";
import assert from "node:assert/strict";
import { sampleTasks, type DemoTask } from "../shared/discovery-demo-tasks.ts";
import {
  demoTeamFindings,
  originalReviewedTask,
  readoutMarkdown,
} from "../shared/demo-team-review.ts";
const complete = () =>
  Object.fromEntries(
    ["maya", "dana", "jordan", "riley", "karl"].map((id) => [
      id,
      sampleTasks(id).map((c) => ({ ...c, decision: "correct" })),
    ]),
  ) as Record<string, DemoTask[]>;
test("prepared team findings require all referenced approved and unchanged source cards", () => {
  const cards = complete();
  assert.equal(demoTeamFindings(cards).length, 3);
  cards.maya[5].edited = true;
  assert.equal(
    demoTeamFindings(cards).some((f) => f.id === "approval"),
    false,
  );
  cards.maya[0].output = "Changed result";
  assert.equal(demoTeamFindings(cards).length, 0);
  assert.equal(
    originalReviewedTask(cards, { person: "missing", index: 0 }),
    false,
  );
  assert.deepEqual(demoTeamFindings({}), []);
});
test("meeting draft includes selected findings and evidence without grants or savings claims", () => {
  const findings = demoTeamFindings(complete());
  const text = readoutMarkdown(
    [findings[0]],
    20,
    9,
    "Ask the sponsor to name an owner.",
  );
  assert.ok(text.includes(findings[0].question));
  assert.ok(!text.includes(findings[1].title));
  assert.ok(text.includes("Source cards:"));
  assert.ok(text.includes("Ask the sponsor"));
  assert.ok(text.includes("not live AI analysis"));
  assert.ok(text.includes("No invitations sent"));
});
