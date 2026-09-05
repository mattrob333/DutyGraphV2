import type pg from "pg";
import {
  schemas,
  confirmationStatus,
  type RecordRow,
  type User,
} from "../shared/domain.ts";
import { fail, getRecord, putRecord, setState } from "./db.ts";
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
  for (const key of ["ownerId", "performerId", "personId"])
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
  if (kind === "task" && !d.evidenceIds.length)
    fail(
      422,
      "EVIDENCE_REQUIRED",
      "A task needs at least one accepted source.",
    );
  for (const id of d.taskIds || []) await requireKind(id, "task");
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
  const d: any = schemas[kind as keyof typeof schemas].parse(input);
  await validateReferences(db, company, kind, d);
  if (existing && existing.kind !== kind)
    fail(422, "INVALID_KIND", "A record cannot change type.");
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
    } as any
  )[kind];
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
  if (existing && kind === "task") {
    const agents = await db.query(
      "SELECT * FROM records WHERE company_id=$1 AND kind='agent'",
      [company],
    );
    for (const agent of agents.rows)
      if (agent.data.taskIds.includes(existing.id))
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
