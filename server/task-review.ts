import type pg from "pg";
import type { RecordRow, User } from "../shared/domain.ts";
import { fail, putRecord } from "./db.ts";

/** The same review gate is used for manual task review and reviewed Discovery drafts. */
export async function reviewTask(
  db: pg.PoolClient,
  user: User,
  company: string,
  task: RecordRow,
) {
  if (task.kind !== "task") fail(422, "TASK_REQUIRED", "Choose a task card.");
  if (
    !task.data.ownerId ||
    !task.data.performerId ||
    !task.data.evidenceIds.length
  )
    fail(
      422,
      "WORK_INCOMPLETE",
      "Resolve the accountable owner, performer and supporting evidence before requesting confirmation.",
    );
  if (task.data.conflict)
    fail(
      422,
      "CONFLICT_OPEN",
      "Resolve the conflicting work claim before review.",
    );
  const sources = (
    await db.query(
      "SELECT id,state FROM records WHERE company_id=$1 AND kind='evidence'",
      [company],
    )
  ).rows;
  if (
    task.data.evidenceIds.some(
      (id: string) =>
        !sources.some((s: any) => s.id === id && s.state === "accepted"),
    )
  )
    fail(
      422,
      "STALE_EVIDENCE",
      "A required source is unavailable. Revise the task and its evidence first.",
    );
  if (new Date(task.data.reviewDue + "T23:59:59Z").getTime() < Date.now())
    fail(422, "REVIEW_EXPIRED", "Set a current review due date first.");
  return putRecord(
    db,
    user,
    company,
    task.kind,
    task.title,
    { ...task.data, reviewed: true },
    "awaiting_confirmation",
    task,
    "Advisor reviewed the cited work description",
  );
}
