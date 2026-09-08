import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import type { RecordRow } from "../shared/domain.ts";
import {
  populateCobaltExamples,
  canEnrichOriginalTask,
  canUpgradeV2,
  canUpgradeCobaltBusiness,
} from "../server/sample-examples.ts";
import {
  cobaltBusinessProfile,
  cobaltSettingsUpgrade,
  isKnownCobaltSample,
  COBALT_STREAM_ID,
  cobaltCompanyFieldsUpgrade,
  COBALT_SCOPE,
} from "../shared/cobalt-company-example.ts";
import { stageWorkMap } from "../shared/stage-work-map.ts";
import type { Company } from "../shared/domain.ts";
import { workflowScene } from "../client/src/graph-scene.ts";
import {
  advanceCase,
  startCase,
  caseStatus,
  validateFlow,
} from "../shared/workflow.ts";

function memoryWriter() {
  const writes: RecordRow[] = [];
  const write = async (
    kind: string,
    title: string,
    data: any,
    state: string,
    existing?: RecordRow,
  ) => {
    const row = {
      id: existing?.id || randomUUID(),
      kind,
      title,
      data,
      state,
      version: (existing?.version || 0) + 1,
      hash: createHash("sha256").update(JSON.stringify(data)).digest("hex"),
      company_id: randomUUID(),
      created_at: "",
      updated_at: "",
    } as RecordRow;
    writes.push(row);
    return row;
  };
  return { write, writes };
}
test("both sample workflows have navigable handoffs, owned exceptions and complete source references", async () => {
  const { write } = memoryWriter();
  const records = await populateCobaltExamples([], write);
  const flows = records.filter((r) => r.kind === "workflow");
  assert.equal(flows.length, 2);
  assert.equal(records.filter((r) => r.kind === "task").length, 18);
  assert.equal(records.filter((r) => r.kind === "handoff").length, 16);
  for (const flow of flows) {
    assert.deepEqual(validateFlow(flow.data.taskIds, flow.data.links), []);
    const scene = workflowScene(records, flow.id);
    assert.equal(scene.nodes.length, flow.data.taskIds.length);
    assert.equal(scene.edges.length, flow.data.handoffIds.length);
    for (const edge of scene.edges) {
      const handoff = records.find((r) => r.id === edge.recordId)!;
      assert.equal(handoff.kind, "handoff");
      assert.ok(handoff.data.acceptanceCheck.length > 30);
      assert.ok(handoff.data.outputMapping.length > 30);
      assert.ok(
        records.some(
          (r) => r.id === handoff.data.exceptionOwnerId && r.kind === "person",
        ),
      );
      for (const id of handoff.data.evidenceIds)
        assert.equal(records.find((r) => r.id === id)?.state, "accepted");
    }
    for (const binding of [
      ...flow.data.taskBindings,
      ...flow.data.handoffBindings,
    ]) {
      assert.equal(
        records.find((r) => r.id === binding.id)?.hash,
        binding.hash,
      );
    }
  }
  const approval = records.find(
    (r) => r.data.sampleKey === "supplier-approve",
  )!;
  assert.equal(approval.data.ownerId, "");
  assert.equal(approval.state, "conflicting");
  assert.ok(
    records
      .filter((r) => r.kind === "agent")
      .every(
        (r) =>
          r.data.runtimeState === "not_deployed" &&
          !r.data.approvedScope.length,
      ),
  );
  assert.ok(
    records
      .filter((r) => r.kind === "metric")
      .every((r) => r.data.baseline === null),
  );
});
test("available-stock and shortage routes both join safely and reach customer confirmation", async () => {
  const { write } = memoryWriter();
  const records = await populateCobaltExamples([], write);
  const flow = records.find((r) => r.data.sampleKey === "order-workflow")!;
  for (const exception of [false, true]) {
    let steps = startCase(flow.data.taskIds, flow.data.links, 24, 0);
    let completed = 0;
    while (steps.some((s) => s.state === "ready")) {
      const current = steps.find((s) => s.state === "ready")!;
      const outgoing = flow.data.links.filter(
        (l: any) => l.from === current.id,
      );
      current.state = "completed";
      current.routes = outgoing
        .filter(
          (l: any) =>
            outgoing.length === 1 ||
            l.condition === (exception ? "Stock shortage" : "Stock reserved"),
        )
        .map((l: any) => l.id);
      completed++;
      assert.ok(completed <= flow.data.taskIds.length);
      steps = advanceCase(steps, flow.data.links, "all", 24, completed);
    }
    assert.equal(caseStatus(steps), "complete");
    const shortage = records.find(
      (r) => r.data.sampleKey === "order-shortage",
    )!;
    assert.equal(
      steps.find((s) => s.id === shortage.id)?.state,
      exception ? "completed" : "skipped",
    );
  }
});
test("reopening examples is idempotent and preserves user revisions", async () => {
  const { write, writes } = memoryWriter();
  const records = await populateCobaltExamples([], write);
  const target = records.find((r) => r.data.sampleKey === "order-intake")!;
  target.title = "My customized intake";
  target.version++;
  target.data.instructions = "My notes must survive.";
  const before = writes.length;
  const again = await populateCobaltExamples(records, write);
  assert.equal(writes.length, before);
  assert.equal(
    again.find((r) => r.id === target.id)?.data.instructions,
    "My notes must survive.",
  );
});
test("sample reporting hierarchy connects every person and preserves edited or removed manager links", async () => {
  const { write } = memoryWriter();
  const rows = await populateCobaltExamples([], write);
  const people = rows.filter((r) => r.kind === "person");
  const root = people.find((r) => r.title === "Elena Torres")!;
  assert.equal(people.length, 12);
  for (const person of people.filter((r) => r.id !== root.id)) {
    const seen = new Set<string>();
    let current = person;
    while (current.id !== root.id) {
      assert.ok(!seen.has(current.id));
      seen.add(current.id);
      const manager = people.find((r) => r.id === current.data.managerId);
      assert.ok(manager);
      current = manager;
    }
  }
  const maya = people.find((r) => r.title === "Maya Chen")!;
  maya.data.managerId = "";
  maya.version++;
  const again = await populateCobaltExamples(rows, write);
  assert.equal(again.find((r) => r.id === maya.id)?.data.managerId, "");
});

test("only untouched original tasks qualify for enrichment", () => {
  const r = {
    kind: "task",
    state: "proposed",
    version: 1,
    data: {
      reviewed: false,
      reason:
        "Imported synthetic V2 work description; local confirmations were not imported.",
      instructions:
        "Check the source packet, record the result, and route exceptions to the named human owner.",
    },
  } as RecordRow;
  assert.equal(canEnrichOriginalTask(r), true);
  assert.equal(canEnrichOriginalTask({ ...r, version: 2 }), false);
  assert.equal(canEnrichOriginalTask({ ...r, state: "confirmed" }), false);
  assert.equal(canEnrichOriginalTask({ ...r, has_confirmations: true }), false);
  assert.equal(
    canEnrichOriginalTask({
      ...r,
      data: { ...r.data, instructions: "A user's revised instruction." },
    }),
    false,
  );
});

test("v2 enrichment adds modes, software and stages while preserving edited content and refreshing bindings", async () => {
  const initial = memoryWriter();
  const records = await populateCobaltExamples([], initial.write, false);
  for (const r of records) {
    r.data.sampleVersion = "cobalt-guided-v2";
    if (r.data.reason)
      r.data.reason =
        "Cobalt guided example v2; entirely fictional training data.";
    if (r.kind === "task")
      Object.assign(r.data, {
        mode: "human_only",
        systems: ["ERP", "Document workspace"],
        valueStage: "unmapped",
        aiPrompt: "",
      });
  }
  const customized = records.find((r) => r.data.sampleKey === "order-intake")!;
  customized.data.instructions = "Keep my customer-specific instructions.";
  customized.version++;
  const writer = memoryWriter();
  const upgraded = await populateCobaltExamples(records, writer.write);
  assert.equal(
    upgraded.find((r) => r.id === customized.id)?.data.instructions,
    customized.data.instructions,
  );
  const packet = upgraded.find((r) => r.data.sampleKey === "supplier-packet")!;
  assert.equal(packet.data.mode, "ai_execute_bounded");
  assert.equal(packet.data.valueStage, "receive");
  assert.ok(packet.data.aiPrompt.includes("Do not change the ERP"));
  assert.deepEqual(packet.data.systems, ["Google Drive", "Google Sheets"]);
  for (const r of upgraded.filter((r) =>
    ["handoff", "workflow", "duty", "agent"].includes(r.kind),
  ))
    for (const b of r.data.taskBindings || [])
      assert.equal(b.hash, upgraded.find((t) => t.id === b.id)?.hash, r.title);
  const before = writer.writes.length;
  await populateCobaltExamples(upgraded, writer.write);
  assert.equal(writer.writes.length, before);
  assert.equal(
    canUpgradeV2({ ...packet, has_confirmations: true }, "task", packet.data),
    false,
  );
});

test("saved Cobalt business stages cover the complete account cycle with role duty task links", async () => {
  const writer = memoryWriter();
  const records = await populateCobaltExamples([], writer.write);
  const map = stageWorkMap(records, cobaltBusinessProfile());
  assert.equal(map.streams[0].id, COBALT_STREAM_ID);
  assert.equal(map.streams[0].stages.length, 6);
  assert.deepEqual(map.invalidStageLinks, []);
  assert.deepEqual(map.unmapped.taskIds, []);
  for (const stage of map.streams[0].stages) {
    assert.ok(stage.taskIds.length > 0, stage.name);
    assert.ok(stage.dutyIds.length > 0, stage.name);
    assert.ok(
      stage.people.some((p) => p.person.data.role),
      stage.name,
    );
  }
  for (const task of records.filter((r) => r.kind === "task")) {
    const duties = records.filter(
      (r) => r.kind === "duty" && r.data.taskIds.includes(task.id),
    );
    assert.equal(duties.length, 1, task.title);
    assert.equal(duties[0].title, task.data.duty);
    assert.ok(
      duties[0].data.businessStageLinks.some(
        (l: any) => l.stageId === task.data.businessStageLinks[0].stageId,
      ),
    );
  }
  const before = writer.writes.length;
  await populateCobaltExamples(records, writer.write);
  assert.equal(writer.writes.length, before);
});

test("v3 business upgrade preserves edited reviewed confirmed work and refreshes untouched bindings once", async () => {
  const writer = memoryWriter();
  const legacy = await populateCobaltExamples([], writer.write, false);
  const find = (key: string) => legacy.find((r) => r.data.sampleKey === key)!;
  const edited = find("order-intake");
  edited.data.instructions =
    "Preserve my changed process even without a version bump.";
  const reviewed = find("order-stock");
  reviewed.data.reviewed = true;
  const confirmed = find("supplier-verify");
  (confirmed as any).has_confirmations = true;
  const customLinks = find("order-notify");
  customLinks.data.businessStageLinks = [
    { streamId: "custom-stream", stageId: "custom-stage" },
  ];
  const editedDuty = legacy.find(
    (r) =>
      r.kind === "duty" && r.data.taskIds.includes(find("supplier-draft").id),
  )!;
  editedDuty.data.purpose = "Preserve my duty scope.";
  const protectedRows = [edited, reviewed, confirmed, customLinks, editedDuty];
  const upgraded = await populateCobaltExamples(legacy, writer.write);
  for (const old of protectedRows)
    assert.equal(
      upgraded.find((r) => r.id === old.id),
      old,
    );
  const mapped = upgraded.find((r) => r.data.sampleKey === "supplier-draft")!;
  assert.equal(mapped.data.businessStageLinks[0].streamId, COBALT_STREAM_ID);
  for (const r of upgraded.filter(
    (r) =>
      ["handoff", "workflow", "agent", "duty"].includes(r.kind) &&
      !protectedRows.includes(r),
  ))
    for (const b of r.data.taskBindings || [])
      assert.equal(b.hash, upgraded.find((t) => t.id === b.id)?.hash);
  assert.equal(
    canUpgradeCobaltBusiness({ ...mapped, version: 4 }, "task", mapped.data),
    false,
  );
  const before = writer.writes.length;
  await populateCobaltExamples(upgraded, writer.write);
  assert.equal(writer.writes.length, before);
});

test("Cobalt profile upgrade is sandbox-only idempotent and preserves saved company information", async () => {
  const writer = memoryWriter();
  const records = await populateCobaltExamples([], writer.write, false);
  const settings: Company["settings"] = {
    notice: "Fixture",
    retentionDays: 90,
    reviewCadence: "Quarterly",
    modules: [],
  };
  assert.equal(isKnownCobaltSample(false, records), false);
  assert.equal(isKnownCobaltSample(true, []), false);
  assert.equal(
    cobaltSettingsUpgrade({ sandbox: false, settings }, records),
    settings,
  );
  assert.equal(
    cobaltSettingsUpgrade({ sandbox: true, settings }, []),
    settings,
  );
  const upgraded = cobaltSettingsUpgrade({ sandbox: true, settings }, records);
  assert.equal(
    cobaltCompanyFieldsUpgrade(
      { sandbox: true, scope: "Supplier onboarding", goal: "My saved goal" },
      records,
    ).scope,
    COBALT_SCOPE,
  );
  assert.deepEqual(
    cobaltCompanyFieldsUpgrade(
      { sandbox: true, scope: "My saved scope", goal: "My saved goal" },
      records,
    ),
    { scope: "My saved scope", goal: "My saved goal" },
  );
  assert.equal(
    cobaltCompanyFieldsUpgrade(
      { sandbox: false, scope: "Supplier onboarding", goal: "My saved goal" },
      records,
    ).scope,
    "Supplier onboarding",
  );
  assert.deepEqual(upgraded.businessProfile, cobaltBusinessProfile());
  assert.equal(upgraded.businessIntake?.website, "");
  assert.equal(
    cobaltSettingsUpgrade({ sandbox: true, settings: upgraded }, records),
    upgraded,
  );
  for (const saved of [
    {
      ...settings,
      businessProfile: {
        ...cobaltBusinessProfile(),
        status: "advisor_reviewed" as const,
      },
    },
    {
      ...settings,
      businessIntake: {
        name: "My company",
        website: "",
        description: "My saved intake",
      },
    },
    {
      ...settings,
      companyResearchReview: {
        jobId: randomUUID(),
        summary: "My saved research",
        industry: "My sector",
        updates: "",
        reviewedAt: "2026-09-07",
      },
    },
  ])
    assert.equal(
      cobaltSettingsUpgrade({ sandbox: true, settings: saved }, records),
      saved,
    );
});
