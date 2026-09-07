import assert from "node:assert/strict";
import type { PoolClient } from "pg";
import type { User } from "../shared/domain.ts";
import { schemas } from "../shared/domain.ts";
import { putRecord, fail } from "./db.ts";
import { createOrEdit } from "./records.ts";
export async function ensureControlExamples(
  db: PoolClient,
  user: User,
  company: string,
) {
  const co = (
    await db.query(
      "SELECT name,sandbox FROM companies WHERE id=$1 FOR UPDATE",
      [company],
    )
  ).rows[0];
  if (!co?.sandbox || co.name !== "Cobalt Industrial Supply")
    fail(
      422,
      "SAMPLE_ONLY",
      "Control examples require the fictional Cobalt workspace.",
    );
  const rows = (
    await db.query("SELECT * FROM records WHERE company_id=$1", [company])
  ).rows;
  const person = (name: string) => {
    const p = rows.find((r) => r.kind === "person" && r.title === name);
    assert.ok(p, name);
    return p.id;
  };
  const priya = person("Priya Shah"),
    maya = person("Maya Chen");
  const add = async (kind: string, data: any) =>
    rows.find((r) => r.kind === kind && r.title === data.title) ||
    (await createOrEdit(db, user, company, kind, data));
  const title = "Access review walkthrough — fictional relationship demo";
  let evidence = rows.find((r) => r.kind === "evidence" && r.title === title);
  if (!evidence) {
    const data = schemas.evidence.parse({
      title,
      type: "Other document",
      text: "FICTIONAL DEMO ONLY. Priya Shah prepares a read-only comparison of an Okta account export, Workday employment roster, and Saviynt entitlement export. Maya Chen reviews procurement access exceptions and records an approval or escalation. Missing or unmatched identities stop the review. No permission is granted by these records. Software connections and permissions are illustrative, not live.",
      locator: "Synthetic Cobalt relationship scenario",
      classification: "Assumed",
      bucket: "org",
    });
    evidence = await putRecord(
      db,
      user,
      company,
      "evidence",
      title,
      data,
      "accepted",
      undefined,
      "User-authorized fictional graph fixture",
    );
  }
  const common = {
    duty: "Review procurement system access",
    purpose:
      "Fictional demo: show the evidence and human handoff behind an access review.",
    trigger: "The monthly procurement access review opens.",
    inputs:
      "Fictional Okta account export, Workday roster, and Saviynt entitlement export.",
    output:
      "An access comparison with unmatched identities and excess access flagged.",
    systems: ["Okta", "Workday", "Saviynt", "Google Sheets"],
    allowed: ["Compare supplied read-only exports"],
    denied: ["Grant access", "Revoke access", "Issue credentials"],
    humanGate:
      "A responsible person reviews every exception. This sample grants no authority.",
    evidenceIds: [evidence.id],
    mode: "human_only",
    classification: "Assumed",
    reviewDue: "2026-10-06",
    reason: "User-authorized fictional relationship demo",
  };
  const prepare = await add("task", {
    ...common,
    title: "Prepare the access comparison — fictional",
    ownerId: priya,
    performerId: priya,
    instructions:
      "Match people by employee ID. List unmatched identities, inactive people with accounts, and access needing owner review. Keep source references.",
    destination: "Maya Chen, procurement review queue",
    valueStage: "prepare",
  });
  const review = await add("task", {
    ...common,
    title: "Review procurement access exceptions — fictional",
    ownerId: maya,
    performerId: maya,
    inputs:
      "The comparison prepared by Priya Shah, including source references.",
    instructions:
      "Check each exception against the person’s work. Record the reason to retain access or request a change. Escalate unclear authority to IT. Do not change permissions from this task.",
    output: "A documented review decision for each exception.",
    destination: "Priya Shah, IT change-review queue",
    valueStage: "check",
  });
  const duty = await add("duty", {
    title: "Review procurement system access — fictional",
    ownerId: maya,
    purpose: common.purpose,
    scope:
      "Fictional procurement access review. Read-only source comparisons and human decisions; no provisioning.",
    taskIds: [prepare.id, review.id],
    evidenceIds: [evidence.id],
    reviewDue: common.reviewDue,
    reason: common.reason,
  });
  await add("handoff", {
    title: "IT comparison to procurement review — fictional",
    sourceTaskId: prepare.id,
    targetTaskId: review.id,
    condition: "Source references and all unmatched identities are listed.",
    outputMapping:
      "Comparison rows become the procurement exception review input.",
    requiredInput: "Dated comparison with source references.",
    acceptanceCheck:
      "Maya can trace each flagged account to the supplied source.",
    exceptionOwnerId: priya,
    timeoutHours: 48,
    maxRetries: 0,
    failureAction:
      "Ask Priya to resolve missing evidence; do not approve access automatically.",
    evidenceIds: [evidence.id],
    reason: common.reason,
  });
  for (const scenario of [
    {
      area: "Access review",
      title: "Compare inactive identities — fictional",
      agent: "Access Review Assistant — fictional",
      owner: priya,
      systems: ["Okta", "Workday", "Saviynt"],
      instructions:
        "Compare supplied employment status and account exports. Flag inactive people with active accounts. Never disable an account.",
      output: "An exception list with source references.",
    },
    {
      area: "Change review",
      title: "Check change approval evidence — fictional",
      agent: "Change Evidence Assistant — fictional",
      owner: priya,
      systems: ["ServiceNow", "GitHub"],
      instructions:
        "Compare a supplied change ticket with its approval and deployment record. Flag missing approval or a mismatched change ID. Never deploy code.",
      output: "A change evidence checklist with missing approvals flagged.",
    },
    {
      area: "Confidential data",
      title: "Prepare a redacted supplier summary — fictional",
      agent: "Supplier Summary Assistant — fictional",
      owner: maya,
      systems: ["Google Drive", "SAP"],
      instructions:
        "Draft a supplier summary from supplied documents. Exclude bank account details and personal contact data. A human must review before sharing.",
      output: "A redacted draft summary for human review.",
    },
  ]) {
    const task = await add("task", {
      ...common,
      title: scenario.title,
      ownerId: scenario.owner,
      performerId: scenario.owner,
      mode: "ai_draft",
      controlAreas: [scenario.area],
      systems: scenario.systems,
      inputs:
        "Fictional source documents supplied for this scenario; no live connector.",
      instructions: scenario.instructions,
      aiPrompt: scenario.instructions,
      output: scenario.output,
      destination: "Named human owner for review",
      valueStage: "prepare",
    });
    await add("agent", {
      title: scenario.agent,
      ownerId: scenario.owner,
      taskIds: [task.id],
      purpose:
        "FICTIONAL DEMO ONLY. Proposed assistance with " +
        scenario.area +
        ". No credentials, deployment, or access grant. Source mappings are illustrative and need control-owner review.",
    });
  }
  return {
    dutyId: duty.id,
    taskIds: [prepare.id, review.id],
    people: [priya, maya],
  };
}
