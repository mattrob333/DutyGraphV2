import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleTasks,
  sampleTranscript,
  candidateTasks,
} from "../shared/discovery-demo-tasks.ts";
test("sample delegation excludes unreviewed, removed, uncertain and edited work", () => {
  const cards = sampleTasks("maya");
  assert.equal(cards.length, 6);
  assert.equal(candidateTasks(cards).length, 0);
  cards.forEach((c) => (c.decision = "correct"));
  assert.equal(candidateTasks(cards).length, 3);
  const eligible = candidateTasks(cards);
  eligible[0].decision = "not_mine";
  eligible[1].decision = "unsure";
  eligible[2].edited = true;
  assert.equal(candidateTasks(cards).length, 0);
  assert.ok(cards.some((c) => c.suitability === "gap"));
});
test("each fictional role has independent task results under its duty and fresh review state", () => {
  for (const id of ["maya", "dana", "jordan", "riley", "karl"]) {
    const cards = sampleTasks(id);
    assert.ok(cards.length >= 3);
    assert.equal(new Set(cards.map((c) => c.title)).size, cards.length);
    const transcript = sampleTranscript(id);
    for (const c of cards) {
      assert.notEqual(c.title, c.duty);
      assert.ok(c.inputs && c.output && c.handoff && c.boundary);
      assert.ok(c.instructions.split("\n").length >= 2);
      assert.ok(transcript.includes(c.output));
      assert.equal(c.decision, "");
    }
    cards[0].decision = "correct";
    assert.equal(sampleTasks(id)[0].decision, "");
  }
  assert.deepEqual(sampleTasks("unknown"), []);
});
