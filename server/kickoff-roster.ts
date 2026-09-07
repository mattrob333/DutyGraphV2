import { z } from "zod";
import { validateKickoffPreparation } from "../shared/kickoff-preparation.ts";
import { createOrEdit } from "./records.ts";
import { fail, getRecord, putRecord } from "./db.ts";
import type { User } from "../shared/domain.ts";
import type pg from "pg";

/** Caller checks advisor/company access and executes inside an idempotent transaction. */
export async function importKickoffRoster(
  db: pg.PoolClient,
  user: User,
  companyId: string,
  responseId: string,
  body: unknown,
) {
  const { expectedVersion } = z
    .object({ expectedVersion: z.number().int().positive() })
    .strict()
    .parse(body);
  await db.query("SELECT id FROM companies WHERE id=$1 FOR UPDATE", [
    companyId,
  ]);
  const response = await getRecord(db, companyId, responseId, true);
  if (response.kind !== "response" || !response.data.kickoffPreparation)
    fail(422, "KICKOFF_PACKAGE_REQUIRED", "Choose a returned kickoff package.");
  if (response.version !== expectedVersion)
    fail(
      409,
      "VERSION_CONFLICT",
      "The package changed. Refresh before importing.",
    );
  if (response.data.kickoffRosterImported)
    return { imported: 0, alreadyImported: true };
  const request = await getRecord(db, companyId, response.data.requestId);
  if (
    request.kind !== "request" ||
    !String(request.data.questionPlanVersion).startsWith("discovery-contact:")
  )
    fail(
      422,
      "KICKOFF_REQUEST_REQUIRED",
      "This package is not attached to a kickoff request.",
    );
  const { preview } = validateKickoffPreparation(
    response.data.kickoffPreparation,
  );
  if (!preview.rows.length)
    fail(422, "ROSTER_MISSING", "The contact has not supplied a roster yet.");
  const existing = (
    await db.query(
      "SELECT * FROM records WHERE company_id=$1 AND kind='person'",
      [companyId],
    )
  ).rows;
  const byEmail = new Map<string, any>(
    existing.map((p) => [p.data.email.toLowerCase(), p]),
  );
  const placeholder = (p: any) =>
    p.id === request.data.personId &&
    p.data.role === "Engagement contact" &&
    p.data.team === "Not yet provided";
  // Never silently overwrite a previously reviewed person or reporting relationship.
  for (const row of preview.rows) {
    const p = byEmail.get(row.data.email);
    if (p && !placeholder(p)) {
      const manager =
        existing.find((m) => m.id === p.data.managerId)?.data.email || "";
      if (
        ["name", "role", "team"].some(
          (k) => p.data[k] !== (row.data as any)[k],
        ) ||
        manager !== row.data.managerEmail ||
        (row.data.externalId && p.data.externalId !== row.data.externalId)
      )
        fail(
          409,
          "ROSTER_CONFLICT",
          `The CSV differs from the saved record for ${row.data.email}. Review that person before importing; no rows were changed.`,
        );
    }
  }
  const changed = new Set<string>();
  for (const row of preview.rows) {
    const previous = byEmail.get(row.data.email);
    if (previous && !placeholder(previous)) continue;
    const { managerEmail, ...data } = row.data;
    const person = await createOrEdit(
      db,
      user,
      companyId,
      "person",
      { ...data, managerId: "" },
      previous,
    );
    byEmail.set(data.email, person);
    changed.add(data.email);
  }
  for (const row of preview.rows) {
    if (!changed.has(row.data.email) || !row.data.managerEmail) continue;
    const person = byEmail.get(row.data.email);
    await createOrEdit(
      db,
      user,
      companyId,
      "person",
      { ...person.data, managerId: byEmail.get(row.data.managerEmail)!.id },
      person,
    );
  }
  await putRecord(
    db,
    user,
    companyId,
    "response",
    response.title,
    {
      ...response.data,
      kickoffRosterImported: true,
      kickoffPersonIds: preview.rows.map((r) => byEmail.get(r.data.email)!.id),
      kickoffImportedAt: new Date().toISOString(),
    },
    response.state,
    response,
    "Advisor reviewed and imported kickoff roster",
  );
  return { imported: changed.size, linked: preview.rows.length };
}
