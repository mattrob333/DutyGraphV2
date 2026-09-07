import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  businessTemplates,
  type BusinessProfile,
} from "../shared/business-types.ts";
import { kickoffGuide, composeKickoffNotes } from "../shared/kickoff-guide.ts";
import { validateParticipantExtraction } from "../server/participant-cards.ts";
import type { DiscoveryInput } from "../server/discovery.ts";

function profile(...ids: string[]): BusinessProfile {
  return {
    industry: "Synthetic business",
    status: "proposed",
    rationale: "Test context",
    streams: ids.map((id) => {
      const t = businessTemplates.find((t) => t.id === id)!;
      return { id, templateId: id, name: t.label, stages: t.stages };
    }),
  };
}

test("kickoff guide covers every business model and preserves hybrid stage language", () => {
  for (const template of businessTemplates) {
    const guide = kickoffGuide(profile(template.id));
    assert.equal(guide.profileMissing, false, template.id);
    assert.equal(guide.sections.length, 8);
    assert.deepEqual(
      guide.models[0].stages,
      template.stages.map((s) => s.name),
    );
    assert.ok(guide.models[0].probe?.length > 40, template.id);
  }
  const hybrid = kickoffGuide(profile("saas", "manufacturing"));
  assert.equal(hybrid.models.length, 2);
  assert.match(
    hybrid.models.find((m) => m.model === "Software as a service")!.probe,
    /renewal/,
  );
  assert.ok(hybrid.models.some((m) => m.probe.includes("inspection")));
  assert.deepEqual(
    new Set(hybrid.sections.map((s) => s.id)),
    new Set([
      "business",
      "goals",
      "people",
      "duties",
      "tasks",
      "handoffs",
      "systems",
      "followup",
    ]),
  );
});

test("missing and custom models ask for context rather than inventing a company process", () => {
  for (const missing of [undefined, null, {}, { streams: [] }]) {
    const guide = kickoffGuide(missing);
    assert.equal(guide.profileMissing, true);
    assert.deepEqual(guide.models, []);
  }
  const custom = profile("saas");
  custom.streams[0] = {
    id: "mission",
    templateId: "custom",
    name: "Community meals",
    stages: [{ id: "serve", name: "Serve meals", functionIds: ["do"] }],
  };
  const guide = kickoffGuide(custom);
  assert.equal(guide.models[0].model, "Custom operating model");
  assert.match(guide.models[0].probe, /beneficiary/);
  assert.deepEqual(guide.models[0].stages, ["Serve meals"]);
});

test("guided kickoff notes preserve answers and transcript without adding template facts", () => {
  const p = profile("manufacturing");
  assert.equal(
    composeKickoffNotes(p, {}, "  Original transcript  "),
    "Original transcript",
  );
  const result = composeKickoffNotes(
    p,
    {
      people: "Amina leads operations; her manager is unresolved.",
      goals: "Reduce waits; baseline unknown.",
    },
    "Original ending: Finance receives the checklist.",
  );
  assert.match(result, /Amina leads operations; her manager is unresolved./);
  assert.match(result, /Original ending: Finance receives the checklist./);
  assert.match(
    result,
    /sections not separately captured may be present in the transcript/,
  );
  assert.ok(!result.includes("production order"));
  const complete = Object.fromEntries(
    kickoffGuide(p).sections.map((s) => [s.id, `Recorded discussion: ${s.id}`]),
  );
  assert.ok(!composeKickoffNotes(p, complete, "").includes("Coverage note:"));
});

test("participant extraction rejects forged evidence and foreign people while preserving separate task destinations", () => {
  const personId = randomUUID(),
    sourceId = randomUUID();
  const input: DiscoveryInput = {
    stage: "tasks",
    participantReview: true,
    company: "Synthetic",
    fingerprint: "v1",
    omitted: 0,
    people: [
      {
        id: personId,
        name: "Amina",
        email: "",
        role: "Coordinator",
        department: "Service",
        duties: ["Schedule visits: match requests to technicians"],
      },
    ],
    sources: [
      {
        id: sourceId,
        title: "Participant response",
        text: "I check requests and then prepare scheduling options.",
        version: 1,
        hash: "h",
        kind: "response",
        state: "draft",
        origin: "team",
      },
    ],
  };
  const task = {
    title: "Check request",
    duty: "Schedule visits",
    ownerId: "",
    performerId: personId,
    purpose: "Prepare input",
    trigger: "Request arrives",
    inputs: "Customer request",
    instructions: "1. Check required details.",
    output: "Checked request",
    systems: ["Service calendar"],
    humanGate: "Escalate missing details",
    sourceIds: [sourceId],
    destination: "Scheduling",
  };
  const value = {
    summary: "Two tasks",
    gaps: [],
    tasks: [
      task,
      {
        ...task,
        title: "Prepare scheduling options",
        output: "Available slots",
        destination: "Customer coordinator",
      },
    ],
  };
  const result = validateParticipantExtraction(value, input);
  assert.equal(result.tasks.length, 2);
  assert.equal(result.tasks[1].destination, "Customer coordinator");
  for (const invalid of [
    { ...task, sourceIds: [randomUUID()] },
    { ...task, performerId: randomUUID() },
    { ...task, ownerId: randomUUID() },
  ])
    assert.throws(() =>
      validateParticipantExtraction({ ...value, tasks: [invalid] }, input),
    );
  assert.throws(() =>
    validateParticipantExtraction(value, {
      ...input,
      sources: input.sources.map((s) => ({ ...s, origin: "meeting" })),
    }),
  );
});
