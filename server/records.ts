import type pg from "pg";
import {
  schemas,
  confirmationStatus,
  type RecordRow,
  type User,
} from "../shared/domain.ts";
import { fail, getRecord, putRecord, setState } from "./db.ts";
import { validateFlow } from "../shared/workflow.ts";
import type { BusinessStageLink } from "../shared/work-model.ts";

async function validateBusinessStageLinks(
  db: pg.PoolClient,
  user: User,
  company: string,
  links: BusinessStageLink[],
  existing?: RecordRow,
) {
  // A profile can change after work was mapped. Keep retained links visible for
  // review, while allowing ordinary edits and removals. New links must resolve.
  const previous = new Set(
    (existing?.data.businessStageLinks || []).map(
      (link: BusinessStageLink) => `${link.streamId}:${link.stageId}`,
    ),
  );
  const added = links.filter(
    (link) => !previous.has(`${link.streamId}:${link.stageId}`),
  );
  if (!added.length) return;
  const result = await db.query(
    "SELECT settings FROM companies WHERE id=$1 AND tenant_id=$2",
    [company, user.tenant_id],
  );
  if (!result.rows.length) fail(404, "NOT_FOUND", "Workspace not found.");
  const streams = result.rows[0].settings?.businessProfile?.streams || [];
  if (
    added.some(
      (link) =>
        !streams.some(
          (stream: any) =>
            stream.id === link.streamId &&
            stream.stages?.some((stage: any) => stage.id === link.stageId),
        ),
    )
  )
    fail(
      422,
      "INVALID_BUSINESS_STAGE",
      "A selected business stage is no longer available in this workspace. Refresh the work map and choose a current stage.",
    );
}
export async function validateReferences(
  db: pg.PoolClient,
  company: string,
  kind: string,
  d: any,
) {
  const requireKind = async (id: string | undefined, expected: string) => {
    if (!id) return;
    const r = await getRecord(db, company, id);
    if (r.kind !== expected)
      fail(
        422,
        "INVALID_REFERENCE",
        `Expected a ${expected} from this workspace.`,
      );
    return r;
  };
  if (kind === "person" && d.managerId) {
    const manager = await requireKind(d.managerId, "person");
    if (manager?.data.email === d.email)
      fail(422, "REPORTING_CYCLE", "A person cannot report to themselves.");
  }
  for (const key of [
    "ownerId",
    "performerId",
    "personId",
    "sponsorId",
    "exceptionOwnerId",
  ])
    if (d[key]) await requireKind(d[key], "person");
  for (const id of [
    ...(d.evidenceIds || []),
    ...(d.disconfirmingEvidenceIds || []),
  ]) {
    const e = await requireKind(id, "evidence");
    if (e?.state !== "accepted")
      fail(
        422,
        "SOURCE_NOT_ACCEPTED",
        "Use an accepted, current evidence source.",
      );
  }
  for (const id of d.taskIds || []) await requireKind(id, "task");
  for (const id of d.handoffIds || []) await requireKind(id, "handoff");
  for (const key of ["sourceTaskId", "targetTaskId"])
    if (d[key]) await requireKind(d[key], "task");
  if (d.interventionId) await requireKind(d.interventionId, "intervention");
  if (d.candidateId) await requireKind(d.candidateId, "candidate");
  if (d.metricId) await requireKind(d.metricId, "metric");
  if (d.assetId) {
    const a = await db.query(
      "SELECT 1 FROM assets WHERE company_id=$1 AND id=$2 AND state=$3",
      [company, d.assetId, "stored_unscanned"],
    );
    if (!a.rowCount)
      fail(
        422,
        "ASSET_NOT_READY",
        "The complete audio asset must be verified first.",
      );
  }
}
export async function createOrEdit(
  db: pg.PoolClient,
  user: User,
  company: string,
  kind: string,
  input: unknown,
  existing?: RecordRow,
) {
  if (!(kind in schemas))
    fail(422, "INVALID_KIND", "This record type cannot be edited directly.");
  const hasStageLinks = kind === "task" || kind === "duty";
  // Older edit forms do not know this field. Omission preserves saved links;
  // an explicit empty array clears them. New records still default to [].
  const normalizedInput =
    hasStageLinks &&
    existing &&
    input &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    !("businessStageLinks" in input)
      ? { ...input, businessStageLinks: existing.data.businessStageLinks || [] }
      : input;
  const d: any = schemas[kind as keyof typeof schemas].parse(normalizedInput);
  // Internal fixture identity survives normal edits, including title changes.
  // It is copied only from the existing server record, never accepted as input.
  if (existing?.data.sampleKey) {
    d.sampleKey = existing.data.sampleKey;
    d.sampleVersion = existing.data.sampleVersion;
  }
  await validateReferences(db, company, kind, d);
  if (hasStageLinks)
    await validateBusinessStageLinks(
      db,
      user,
      company,
      d.businessStageLinks,
      existing,
    );
  if (existing && existing.kind !== kind)
    fail(422, "INVALID_KIND", "A record cannot change type.");
  if (kind === "person") {
    const duplicate = await db.query(
      "SELECT id FROM records WHERE company_id=$1 AND kind='person' AND lower(data->>'email')=lower($2) AND id<>$3",
      [
        company,
        d.email,
        existing?.id || "00000000-0000-0000-0000-000000000000",
      ],
    );
    if (duplicate.rowCount)
      fail(
        409,
        "DUPLICATE_PERSON",
        "A person with this email already exists in this workspace. Review that record rather than creating an alias.",
      );
  }
  if (existing && ["evidence", "request"].includes(kind))
    fail(
      409,
      "IMMUTABLE_SOURCE",
      "Original sources and requests are immutable. Create a new record.",
    );
  if (existing && kind === "person" && d.managerId) {
    const visited = new Set([existing.id]);
    let cursor = d.managerId;
    while (cursor) {
      if (visited.has(cursor))
        fail(
          422,
          "REPORTING_CYCLE",
          "This manager would create a reporting cycle.",
        );
      visited.add(cursor);
      const p = await getRecord(db, company, cursor);
      cursor = p.data.managerId;
    }
  }
  let state: string = (
    {
      person: "reported",
      evidence: "pending_review",
      task: d.conflict ? "conflicting" : "proposed",
      request: "draft",
      candidate: "constraint_hypothesis",
      metric: d.baseline === null ? "missing_baseline" : "defined",
      intervention: "proposed",
      agent: "draft",
      review: "open",
      engagement: "draft",
      duty: "proposed",
      handoff: "proposed",
      outcome: "proposed",
      workflow: "proposed",
    } as any
  )[kind];
  if (kind === "workflow") {
    d.taskBindings = [];
    d.handoffBindings = [];
    d.links = [];
    for (const id of d.taskIds) {
      const r = await getRecord(db, company, id);
      d.taskBindings.push({
        id,
        version: r.version,
        hash: r.hash,
        title: r.title,
      });
    }
    for (const id of d.handoffIds) {
      const r = await getRecord(db, company, id);
      d.handoffBindings.push({ id, version: r.version, hash: r.hash });
      d.links.push({
        id,
        from: r.data.sourceTaskId,
        to: r.data.targetTaskId,
        condition: r.data.condition,
      });
    }
    const issues = validateFlow(d.taskIds, d.links);
    if (issues.length) fail(422, "INVALID_WORKFLOW", issues.join(" "));
  }
  if (kind === "engagement") {
    try {
      new Intl.DateTimeFormat("en", { timeZone: d.timezone }).format();
    } catch {
      fail(
        422,
        "INVALID_TIMEZONE",
        "Choose an IANA timezone, such as America/New_York.",
      );
    }
  }
  if (["duty", "handoff", "outcome"].includes(kind)) {
    d.sourceBindings = [];
    for (const id of d.evidenceIds) {
      const source = await getRecord(db, company, id);
      d.sourceBindings.push({ id, version: source.version, hash: source.hash });
    }
  }
  if (kind === "duty" || kind === "handoff") {
    d.taskBindings = [];
    for (const id of kind === "duty"
      ? d.taskIds
      : [d.sourceTaskId, d.targetTaskId]) {
      const task = await getRecord(db, company, id);
      d.taskBindings.push({ id, version: task.version, hash: task.hash });
    }
  }
  if (kind === "outcome") {
    const intervention = await getRecord(db, company, d.interventionId);
    const metric = await getRecord(db, company, intervention.data.metricId);
    d.predictionSnapshot = {
      id: intervention.id,
      version: intervention.version,
      hash: intervention.hash,
      prediction: intervention.data.prediction,
      candidateId: intervention.data.candidateId,
    };
    d.measurementSnapshot = {
      id: metric.id,
      version: metric.version,
      hash: metric.hash,
      baseline: metric.data.baseline,
      target: metric.data.target,
      unit: metric.data.unit,
      observations: metric.data.observations || [],
    };
    if (
      d.result !== "inconclusive" &&
      !d.measurementSnapshot.observations.length
    )
      fail(
        422,
        "MEASUREMENTS_REQUIRED",
        "Record measured observations before concluding that a prediction is supported or falsified. Otherwise choose inconclusive.",
      );
  }
  if (kind === "task") {
    d.reviewed = false;
  }
  if (kind === "evidence") d.originId = d.originId || crypto.randomUUID();
  if (kind === "metric") {
    if (d.baseline === null && !d.missingReason)
      fail(422, "MISSING_REASON", "Explain why the baseline is missing.");
    d.observations = existing?.data.observations || [];
  }
  if (kind === "request") {
    d.taskSnapshots = [];
    for (const id of d.taskIds) {
      const task = await getRecord(db, company, id);
      if (![task.data.ownerId, task.data.performerId].includes(d.personId))
        fail(
          422,
          "WRONG_RECIPIENT",
          "Only the named owner or performer may confirm a task.",
        );
      if (!task.data.reviewed || task.data.conflict || task.state === "stale")
        fail(
          422,
          "TASK_NOT_READY",
          "Review and resolve the task before requesting confirmation.",
        );
      d.taskSnapshots.push({
        id: task.id,
        version: task.version,
        hash: task.hash,
        title: task.title,
        data: task.data,
      });
    }
    if (d.type === "confirmation" && !d.taskSnapshots.length)
      fail(422, "TASK_REQUIRED", "Choose at least one reviewed task.");
    d.channel = "manual_link";
  }
  if (kind === "agent") {
    d.taskBindings = [];
    for (const id of d.taskIds) {
      const task = await getRecord(db, company, id);
      if (task.data.ownerId !== d.ownerId)
        fail(
          422,
          "OWNER_MISMATCH",
          "All proposed tasks must share this accountable owner.",
        );
      d.taskBindings.push({
        id: task.id,
        version: task.version,
        hash: task.hash,
      });
    }
    d.requestedScope = [];
    d.approvedScope = [];
    d.provisionedScope = [];
    d.observedScope = [];
    d.runtimeState = "not_deployed";
  }
  const record = await putRecord(
    db,
    user,
    company,
    kind,
    d.title || d.name,
    d,
    state,
    existing,
    d.reason || "Reviewed record change",
  );
  if (existing && ["task", "handoff"].includes(kind)) {
    const agents = await db.query(
      "SELECT * FROM records WHERE company_id=$1 AND kind IN ('agent','duty','handoff','workflow')",
      [company],
    );
    for (const agent of agents.rows)
      if (
        agent.data.taskIds?.includes(existing.id) ||
        agent.data.taskBindings?.some((b: any) => b.id === existing.id) ||
        agent.data.handoffBindings?.some((b: any) => b.id === existing.id)
      )
        await setState(
          db,
          user,
          company,
          agent,
          "stale",
          "manifest.binding_stale",
        );
  }
  return record;
}
export async function refreshTask(
  db: pg.PoolClient,
  user: User,
  company: string,
  task: RecordRow,
) {
  const cs = await db.query(
    "SELECT * FROM confirmations WHERE company_id=$1 AND record_id=$2",
    [company, task.id],
  );
  const status = confirmationStatus(task, cs.rows);
  await setState(
    db,
    user,
    company,
    task,
    status,
    "task.confirmation_reconciled",
  );
  return status;
}
