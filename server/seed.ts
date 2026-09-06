import { randomBytes, randomUUID } from "node:crypto";
import { pool, tx, putRecord, setState, fail } from "./db.ts";
import { passwordHash, publicUser, defaultSettings } from "./auth.ts";
import { capturePrompts } from "../shared/domain.ts";
import { populateCobaltExamples } from "./sample-examples.ts";

export async function ensureCobaltExamples(
  db: import("pg").PoolClient,
  user: import("../shared/domain.ts").User,
  company: string,
) {
  const target = (
    await db.query("SELECT sandbox FROM companies WHERE id=$1 FOR UPDATE", [
      company,
    ])
  ).rows[0];
  if (!target?.sandbox)
    fail(
      422,
      "SAMPLE_ONLY",
      "Examples may only be added to a synthetic workspace.",
    );
  const { rows } = await db.query(
    "SELECT r.*, EXISTS(SELECT 1 FROM confirmations c WHERE c.company_id=r.company_id AND c.record_id=r.id) AS has_confirmations FROM records r WHERE r.company_id=$1 ORDER BY r.created_at",
    [company],
  );
  const knownSample = rows.some(
    (r) =>
      r.kind === "evidence" &&
      r.data.locator === "Synthetic V2 example · full excerpt",
  );
  if (!knownSample)
    fail(422, "SAMPLE_ONLY", "This workspace is not the Cobalt sample.");
  return populateCobaltExamples(
    rows,
    async (kind, title, data, state, existing) => {
      const result = await putRecord(
        db,
        user,
        company,
        kind,
        title,
        data,
        state,
        existing,
        "Enriched fictional Cobalt examples; preserved edited records",
      );
      if (existing?.kind === "task") {
        // Keep the same binding invalidation guarantees as normal task edits.
        const dependents = await db.query(
          "SELECT * FROM records WHERE company_id=$1 AND kind IN ('agent','duty','handoff','workflow')",
          [company],
        );
        for (const dependent of dependents.rows) {
          if (
            dependent.data.taskIds?.includes(existing.id) ||
            dependent.data.taskBindings?.some((b: any) => b.id === existing.id)
          )
            await setState(
              db,
              user,
              company,
              dependent,
              "stale",
              "manifest.binding_stale",
            );
        }
      }
      return result;
    },
  );
}
export async function demoUser() {
  // A demo is always isolated in its own synthetic-data tenant. It grants no production access.
  const existing = await pool.query(
    "SELECT * FROM users WHERE email='demo@dutygraph.invalid'",
  );
  if (existing.rowCount) return publicUser(existing.rows[0]);
  const tenant = randomUUID(),
    id = randomUUID(),
    company = randomUUID();
  return tx(tenant, async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(77194317)");
    const again = await db.query(
      "SELECT * FROM users WHERE email='demo@dutygraph.invalid'",
    );
    if (again.rowCount) return publicUser(again.rows[0]);
    await db.query("INSERT INTO tenants(id,name) VALUES($1,$2)", [
      tenant,
      "Cobalt sandbox",
    ]);
    const { rows } = await db.query(
      "INSERT INTO users(id,tenant_id,email,name,password_hash,role) VALUES($1,$2,'demo@dutygraph.invalid','Sample Advisor',$3,'advisor') RETURNING *",
      [id, tenant, passwordHash(randomBytes(24).toString("hex"))],
    );
    const user = publicUser(rows[0]);
    await db.query(
      "INSERT INTO companies(id,tenant_id,name,scope,goal,settings,sandbox) VALUES($1,$2,$3,$4,$5,$6,true)",
      [
        company,
        tenant,
        "Cobalt Industrial Supply",
        "Supplier onboarding",
        "Reduce supplier-onboarding uncertainty without weakening financial controls.",
        defaultSettings(),
      ],
    );
    await seedRecords(db, user, company);
    return user;
  });
}

export async function seedRecords(
  db: import("pg").PoolClient,
  user: import("../shared/domain.ts").User,
  company: string,
) {
  const people = [];
  for (const [name, role, team] of [
    ["Elena Torres", "Executive sponsor", "Leadership"],
    ["Maya Chen", "Procurement manager", "Procurement"],
    ["Tariq Ali", "Procurement analyst", "Procurement"],
    ["Dana Brooks", "AP manager", "Finance"],
    ["Karl Jensen", "Operations supervisor", "Operations"],
    ["Sofia Rivera", "Legal counsel", "Legal"],
    ["Priya Shah", "Systems administrator", "IT"],
    ["Noah Reed", "Buyer", "Procurement"],
  ])
    people.push(
      await putRecord(
        db,
        user,
        company,
        "person",
        name,
        {
          name,
          role,
          team,
          email: name.toLowerCase().replace(" ", ".") + "@cobalt.example",
          managerId: "",
          externalId: "",
        },
        "reported",
      ),
    );
  const evidence = [];
  const sources = [
    [
      "Executive kickoff",
      "Leadership account",
      0,
      "We want a clear handoff from supplier intake to activation. Payment execution is outside this engagement.",
      "leadership",
    ],
    [
      "Procurement account",
      "Employee account",
      1,
      "We call the completed bank check an approval. Once Finance clears it, Operations should activate the supplier.",
      "org",
    ],
    [
      "Finance account",
      "Employee account",
      3,
      "We verify the bank details. That is not the business decision to approve the supplier. Someone needs to own that decision.",
      "org",
    ],
    [
      "Supplier role matrix",
      "System configuration",
      6,
      "Procurement can create draft supplier records. Finance records a verification result. Operations can activate approved suppliers. Technical access alone does not establish delegated authority.",
      "biz",
    ],
    [
      "Legal review notes",
      "Employee account",
      5,
      "Nonstandard terms come to Legal. We review the contract and return our comments. Supplier activation is a separate task.",
      "org",
    ],
    [
      "Record preparation walkthrough",
      "Employee account",
      2,
      "I create the draft record from a complete document packet and route it to Finance. When a bank name differs, I ask the buyer for corrected documents.",
      "org",
    ],
    [
      "Operations walkthrough",
      "Employee account",
      4,
      "I activate a record once the approval is recorded. When there is no named approver, the record waits. We have not measured the waiting time.",
      "org",
    ],
  ] as const;
  for (const [title, type, p, text, bucket] of sources)
    evidence.push(
      await putRecord(
        db,
        user,
        company,
        "evidence",
        title,
        {
          title,
          type,
          text,
          personId: people[p].id,
          locator: "Synthetic V2 example · full excerpt",
          originId: randomUUID(),
          classification: "Known",
          bucket,
          assetId: "",
          sourceDate: "2026-09-04",
        },
        "accepted",
      ),
    );
  const tasks = [];
  const defs = [
    ["Check supplier packet", 1, 7, 5],
    ["Create draft supplier record", 1, 2, 5],
    ["Verify bank details", 3, 3, 2],
    ["Record the verification result", 3, 3, 2],
    ["Approve the supplier", 1, 4, 1],
    ["Activate an approved supplier", 4, 4, 6],
    ["Resolve a bank-name mismatch", 1, 2, 5],
    ["Review nonstandard contract terms", 5, 5, 4],
  ] as const;
  for (const [title, o, p, e] of defs)
    tasks.push(
      await putRecord(
        db,
        user,
        company,
        "task",
        title,
        {
          title,
          duty: "Supplier onboarding",
          ownerId: people[o].id,
          performerId: people[p].id,
          purpose:
            "Move a complete supplier record to the next accountable person.",
          trigger: "A supplier packet reaches this step.",
          inputs: "Supplier packet and the previous review result.",
          instructions:
            "Check the source packet, record the result, and route exceptions to the named human owner.",
          output: "A documented result with a clear next owner.",
          systems: ["Supplier portal", "ERP"],
          allowed: [
            "Read the assigned supplier packet",
            "Prepare a draft result",
          ],
          denied: [
            "Release payments",
            "Change banking data",
            "Grant system access",
          ],
          humanGate:
            "A named human must resolve exceptions and approve any external change.",
          evidenceIds: [evidence[e].id],
          mode: "ai_draft",
          classification: "Inferred",
          conflict: title === "Approve the supplier",
          stopConditions:
            "Stop when required information or authority is missing.",
          reviewDue: "2026-12-31",
          reason:
            "Imported synthetic V2 work description; local confirmations were not imported.",
          reviewed: false,
        },
        title === "Approve the supplier" ? "conflicting" : "proposed",
      ),
    );
  await putRecord(
    db,
    user,
    company,
    "candidate",
    "Supplier approval is falling between two teams.",
    {
      title: "Supplier approval is falling between two teams.",
      flow: "Supplier onboarding",
      pressure:
        "Procurement and Finance describe the approval boundary differently.",
      alternative:
        "Incomplete supplier packets may be the larger source of delay.",
      counterfactual:
        "Clarifying approval ownership may reduce waiting only if complete packets are already available.",
      discriminator:
        "Measure complete-packet waiting time at each handoff for two weeks.",
      evidenceIds: [evidence[1].id, evidence[2].id],
      disconfirmingEvidenceIds: [],
      ownerId: people[0].id,
      throughputUnit: "Activated suppliers per week",
    },
    "constraint_hypothesis",
  );
  await putRecord(
    db,
    user,
    company,
    "metric",
    "Supplier activation throughput",
    {
      title: "Supplier activation throughput",
      question:
        "Does clearer approval ownership increase completed activations?",
      formula: "Count supplier activation events per calendar week.",
      unit: "Suppliers / week",
      population: "Suppliers in this onboarding engagement",
      source: "ERP activation event report",
      ownerId: people[4].id,
      baseline: null,
      target: null,
      missingReason: "No event report has been collected.",
      window: "Two-week baseline",
      guardrail: "No activation without a recorded human approval.",
      observations: [],
    },
    "missing_baseline",
  );
  await putRecord(
    db,
    user,
    company,
    "request",
    "Walk through supplier record preparation",
    {
      title: "Walk through supplier record preparation",
      personId: people[2].id,
      type: "work",
      questions: capturePrompts,
      taskIds: [],
      taskSnapshots: [],
      dueDate: "2026-09-12",
      notice: defaultSettings().notice,
    },
    "draft",
  );
  await putRecord(
    db,
    user,
    company,
    "agent",
    "Supplier Packet Assistant",
    {
      title: "Supplier Packet Assistant",
      ownerId: people[1].id,
      taskIds: [tasks[0].id, tasks[1].id],
      taskBindings: tasks
        .slice(0, 2)
        .map((t) => ({ id: t.id, version: t.version, hash: t.hash })),
      purpose: "Help prepare and route a complete supplier packet.",
      requestedScope: ["Read the assigned packet", "Prepare draft results"],
      approvedScope: [],
      provisionedScope: [],
      observedScope: [],
      runtimeState: "not_deployed",
    },
    "draft",
  );
  await ensureCobaltExamples(db, user, company);
}
