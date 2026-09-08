import express from "express";
import { z } from "zod";
import JSZip from "jszip";
import { reportTheme } from "./report-theme.ts";
import { renderAuditSnapshot } from "./report-audit.ts";
import { createHash } from "node:crypto";
import type { RecordRow, Company, User } from "../shared/domain.ts";
import type pg from "pg";
import { auditText, type AuditBrief } from "../shared/audit-brief.ts";
import type { AuditSourceBinding } from "./audit-brief.ts";
import { confirmationStatus } from "../shared/domain.ts";
import { coverageSummary } from "../shared/work-model.ts";
import { advisor, type AuthRequest } from "./auth.ts";
import {
  tx,
  command,
  companyCheck,
  getRecord,
  putRecord,
  fail,
  setState,
  audit,
} from "./db.ts";

export const reportKinds = ["executive", "weekly", "audit"] as const;
export const reportInput = z
  .object({
    title: z.string().trim().min(3).max(200),
    kind: z.enum(reportKinds),
    audience: z.array(z.string().trim().min(3).max(200)).min(1).max(50),
    purpose: z.string().trim().min(5).max(2000),
    summary: z.string().trim().min(20).max(12000),
    decisions: z.string().max(12000),
    nextSteps: z.string().trim().min(5).max(12000),
    limitations: z.string().trim().min(5).max(6000),
    recordIds: z.array(z.uuid()).max(150),
    expectedRevision: z.number().int().positive(),
  })
  .strict();
const allowedKinds = [
  "person",
  "task",
  "candidate",
  "metric",
  "intervention",
  "outcome",
  "duty",
  "handoff",
  "engagement",
  "agent",
  "review",
  "framework",
];
const inactiveReportStates = new Set(["withdrawn", "retracted", "superseded"]);
const unavailableForReport = (r: RecordRow) =>
  inactiveReportStates.has(r.state) || r.state === "stale";

export function reportRecord(r: RecordRow, all: RecordRow[]) {
  const name = (id: string) =>
    all.find((p) => p.id === id)?.title || "Not recorded";
  const d = r.data;
  const fields: Record<string, unknown> =
    r.kind === "person"
      ? { Role: d.role, Team: d.team }
      : r.kind === "task"
        ? {
            Purpose: d.purpose,
            Duty: d.duty,
            "Accountable owner": name(d.ownerId),
            Performer: name(d.performerId),
            Trigger: d.trigger,
            Inputs: d.inputs,
            Output: d.output,
            "Human checkpoint": d.humanGate,
            "Described actions": d.allowed,
            "Not authorized": d.denied,
          }
        : r.kind === "candidate"
          ? {
              Hypothesis: d.pressure,
              "Competing explanation": d.alternative,
              "Discriminating test": d.discriminator,
              "Global counterfactual": d.counterfactual,
              "Throughput unit": d.throughputUnit,
            }
          : r.kind === "metric"
            ? {
                Question: d.question,
                Formula: d.formula,
                Unit: d.unit,
                Cohort: d.population,
                Baseline: d.baseline,
                Target: d.target,
                "Missing-data reason": d.missingReason,
                Guardrail: d.guardrail,
                "Observation count": d.observations?.length || 0,
              }
            : r.kind === "intervention"
              ? {
                  Change: d.change,
                  Prediction: d.prediction,
                  "Accountable owner": name(d.ownerId),
                  "Stop conditions": d.stopConditions,
                  "Review date": d.reviewDate,
                }
              : r.kind === "outcome"
                ? {
                    Result: d.result,
                    "Original prediction": d.predictionSnapshot.prediction,
                    Coverage: d.coverage,
                    Confounders: d.confounders,
                    Interpretation: d.interpretation,
                    "Next action": d.nextAction,
                  }
                : r.kind === "duty"
                  ? {
                      Purpose: d.purpose,
                      Scope: d.scope,
                      "Proposed duty owner": name(d.ownerId),
                      "Linked tasks": d.taskIds.map(name),
                    }
                  : r.kind === "handoff"
                    ? {
                        From: name(d.sourceTaskId),
                        To: name(d.targetTaskId),
                        Condition: d.condition,
                        Output: d.outputMapping,
                        "Required input": d.requiredInput,
                        "Receiving check": d.acceptanceCheck,
                        "Exception owner": name(d.exceptionOwnerId),
                        "Escalation hours": d.documentationOnly
                          ? "Not configured"
                          : d.timeoutHours,
                        "Maximum retries": d.documentationOnly
                          ? "Not configured"
                          : d.maxRetries,
                        "Failure action": d.failureAction,
                      }
                    : r.kind === "engagement"
                      ? {
                          Outcome: d.outcome,
                          "In scope": d.inScope,
                          "Out of scope": d.outOfScope,
                          Systems: d.systems,
                          "Success criteria": d.successCriteria,
                          "Review cadence": d.reviewCadence,
                        }
                      : r.kind === "agent"
                        ? {
                            Purpose: d.purpose,
                            "Accountable human": name(d.ownerId),
                            Tasks: d.taskIds.map(name),
                            Authorization: "None — proposal only",
                            Deployment: d.runtimeState || "not_deployed",
                          }
                        : r.kind === "review"
                          ? {
                              Decision: d.decision,
                              "Next action": d.nextAction,
                              Owner: name(d.ownerId),
                              Due: d.dueDate,
                            }
                          : r.kind === "framework"
                            ? {
                                Analysis: d.analysis,
                                Authorship: d.authorship,
                                "Source references":
                                  d.sourceBindings?.length || 0,
                              }
                            : {};
  return {
    id: r.id,
    version: r.version,
    hash: r.hash,
    kind: r.kind,
    title: r.title,
    state: r.state,
    fields,
  };
}
const escape = (value: unknown) =>
  String(value ?? "Not measured")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const csv = (value: unknown) =>
  `"${(/^[\s]*[=+\-@\t\r]/.test(String(value ?? "")) ? "'" : "") + String(value ?? "").replaceAll('"', '""')}"`;
export function renderReport(packet: any, approved = false) {
  const paragraph = (text: string) =>
    `<p>${escape(text).replaceAll("\n", "<br>")}</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(packet.title)}</title><style>
  ${reportTheme}
  </style></head><body><main><header><div class="brand"><svg aria-hidden="true" viewBox="0 0 86 83"><path fill="currentColor" d="M24 0H62V24H25V61H8Q0 61 0 53V24Q0 0 24 0Z"/><path fill="currentColor" d="M62 24H78Q86 24 86 32V59Q86 83 62 83H25V61H62Z"/></svg><span>DutyGraph <small>CLIENT BRIEF</small></span></div><h1>${escape(packet.title)}</h1><p>${escape(packet.purpose)}</p><div class="meta">${approved ? "Approved snapshot · delivery eligibility checked on download" : "DRAFT — review before delivery"} · ${escape(packet.generatedAt.slice(0, 10))} · Company revision ${packet.sourceRevision}</div><div class="meta">Audience: ${packet.audience.map(escape).join("; ")}</div></header>
  ${packet.sandbox ? '<div class="notice"><strong>Synthetic training example.</strong> This company and its people, claims and measurements are illustrative. This is not an actual client finding.</div>' : ""}
  <div class="stats"><div><strong>${packet.coverage.participants}</strong>people in the engagement roster</div><div><strong>${packet.coverage.responded} / ${packet.coverage.participants}</strong>people with a returned response</div><div><strong>${packet.coverage.confirmedTasks} / ${packet.coverage.totalTasks}</strong>tasks with current human confirmations</div></div>
  <section id="executive-summary" class="report-section"><div class="section-label">THE EXECUTIVE VIEW</div><h2>Executive summary</h2>${paragraph(packet.summary)}</section>${renderAuditSnapshot(packet.auditBrief)}<h2>Decisions for the client</h2>${paragraph(packet.decisions || "No decision recorded.")}<h2>Next steps</h2>${paragraph(packet.nextSteps)}<h2>Scope and limitations</h2>${paragraph(packet.limitations)}<p class="muted">Scope: ${escape(packet.company.scope)}. ${escape(packet.collectionNotice)}</p>
  <div class="report-appendix"><div class="section-label">SUPPORTING DETAIL</div><h2>Selected work and findings</h2><p class="muted">The detailed records selected for this audience. Original sources remain in the company workspace.</p>${
    packet.records.length
      ? packet.records
          .map(
            (r: any) =>
              `<article><div class="meta">${escape(r.kind)} · v${r.version} · ${escape(r.state.replaceAll("_", " "))}</div><h3>${escape(r.title)}</h3><dl>${Object.entries(
                r.fields,
              )
                .map(
                  ([key, value]) =>
                    `<dt>${escape(key)}</dt><dd>${Array.isArray(value) ? value.map(escape).join("; ") || "None recorded" : escape(value)}</dd>`,
                )
                .join(
                  "",
                )}</dl><p class="muted">Record ${escape(r.id)} · content hash ${escape(r.hash)}</p></article>`,
          )
          .join("")
      : "<p>No detailed records selected.</p>"
  }
  ${packet.auditEvents ? `<h2>Recorded activity</h2><p>${escape(packet.auditCoverage)}</p><table><thead><tr><th>When</th><th>Recorded event</th><th>Record</th></tr></thead><tbody>${packet.auditEvents.map((e: any) => `<tr><td>${escape(e.created_at)}</td><td>${escape(e.type)}</td><td>${escape(e.record_id || "Workspace")}</td></tr>`).join("")}</tbody></table>` : ""}
  </div><footer>Frozen review packet. Source text, recordings, passwords and invitation tokens are excluded. Work confirmation, business authority, deployment and observed execution are distinct. This document grants no system permission.</footer></main></body></html>`.replace(
    /[ \t]+$/gm,
    "",
  );
}
export async function reportZip(record: RecordRow) {
  const packet = record.data.packet;
  const files: Record<string, string> = {
    "client-report.html": renderReport(packet, true),
    "report.json": JSON.stringify(packet, null, 2),
    "record-register.csv": [
      ["Type", "Title", "Version", "Status", "Record ID"].map(csv).join(","),
      ...packet.records.map((r: any) =>
        [r.kind, r.title, r.version, r.state, r.id].map(csv).join(","),
      ),
    ].join("\r\n"),
    "READ-ME.md": `# ${packet.title}\n\nOpen client-report.html in a browser; use Print / Save as PDF for a paper copy.\n\nAudience: ${packet.audience.join("; ")}\n\nThis is a frozen, reviewed manual-delivery packet. No email was sent. The source remains the company workspace. Raw evidence and credentials are excluded.\n`,
  };
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  zip.file(
    "checksums.json",
    JSON.stringify(
      {
        algorithm: "SHA-256 of UTF-8 bytes",
        recordHash: record.hash,
        files: Object.fromEntries(
          Object.entries(files).map(([name, content]) => [
            name,
            createHash("sha256").update(content).digest("hex"),
          ]),
        ),
      },
      null,
      2,
    ),
  );
  return zip.generateAsync({ type: "nodebuffer" });
}
async function checkSources(
  db: any,
  company: string,
  record: RecordRow,
  user: User,
) {
  if (record.data.auditSource) {
    const { auditBriefContext } = await import("./audit-brief.ts");
    const current = await auditBriefContext(db, user, company);
    if (current.sources.fingerprint !== record.data.auditSource.fingerprint)
      fail(
        409,
        "REPORT_STALE",
        "The audit sources or reviewed analysis changed. Prepare and review a fresh report; this frozen snapshot remains unchanged.",
      );
  }
  for (const binding of record.data.bindings) {
    const current = await getRecord(db, company, binding.id);
    if (unavailableForReport(current))
      fail(
        409,
        "REPORT_STALE",
        "A selected record is no longer active or current. Generate and review a fresh report.",
      );
    if (current.kind === "task")
      current.state = confirmationStatus(
        current,
        (
          await db.query(
            "SELECT * FROM confirmations WHERE company_id=$1 AND record_id=$2",
            [company, current.id],
          )
        ).rows,
      );
    if (
      current.version !== binding.version ||
      current.hash !== binding.hash ||
      current.state !== binding.state ||
      ["retracted", "stale"].includes(current.state)
    )
      fail(
        409,
        "REPORT_STALE",
        "A selected record or its evidence changed. Generate and review a fresh report.",
      );
  }
}
function clientSafeValue(value: any): any {
  if (typeof value === "string") return auditText(value, 20000);
  if (Array.isArray(value)) return value.map(clientSafeValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clientSafeValue(item)]),
    );
  return value;
}

export async function prepareClientReport(
  db: pg.PoolClient,
  u: User,
  c: Company,
  body: unknown,
  auditSource?: AuditSourceBinding,
  auditBrief?: AuditBrief,
) {
  const d = reportInput.parse(body);
  if (c.revision !== d.expectedRevision)
    fail(
      409,
      "STALE_INPUT",
      "The workspace changed. Refresh before preparing the report.",
    );
  const all = (
    await db.query(
      "SELECT * FROM records WHERE company_id=$1 ORDER BY created_at,id",
      [c.id],
    )
  ).rows as RecordRow[];
  const confirmations = (
    await db.query("SELECT * FROM confirmations WHERE company_id=$1", [c.id])
  ).rows;
  for (const r of all)
    if (r.kind === "task" && !unavailableForReport(r))
      r.state = confirmationStatus(r, confirmations);
  const chosen = [...new Set(d.recordIds)].map(
    (id) =>
      all.find((r) => r.id === id) ||
      fail(404, "NOT_FOUND", "A selected record is outside this workspace."),
  );
  if (
    chosen.some(
      (r) => !allowedKinds.includes(r.kind) || unavailableForReport(r),
    )
  )
    fail(
      422,
      "INVALID_SELECTION",
      "Choose current work or analysis records. Raw evidence is excluded from client reports.",
    );
  const bindings = chosen.map((r) => ({
    id: r.id,
    version: r.version,
    hash: r.hash,
    state: r.state,
  }));
  const requiredEvidence = new Set(
    chosen.flatMap((r) => r.data.evidenceIds || []),
  );
  for (const selected of chosen)
    for (const pinned of [
      ...(selected.data.sourceBindings || []),
      ...(selected.data.upstreamBindings || []),
    ]) {
      const source = all.find((r) => r.id === pinned.id);
      if (
        !source ||
        source.version !== pinned.version ||
        source.hash !== pinned.hash ||
        unavailableForReport(source)
      )
        fail(
          409,
          "SOURCE_STALE",
          "A selected record's saved source or upstream version changed. Refresh its analysis before preparing a report.",
        );
    }
  const sourceIds = new Set(
    chosen.flatMap((r) => [
      ...(r.data.evidenceIds || []),
      ...(r.data.sourceBindings || []).map((b: any) => b.id),
      ...(r.data.upstreamBindings || []).map((b: any) => b.id),
    ]),
  );
  for (const id of sourceIds) {
    const source =
      all.find((r) => r.id === id) ||
      fail(
        409,
        "SOURCE_UNAVAILABLE",
        "A selected record relies on unavailable evidence.",
      );
    if (
      unavailableForReport(source) ||
      ((requiredEvidence.has(id) || source.kind === "evidence") &&
        source.state !== "accepted")
    )
      fail(
        409,
        "SOURCE_UNAVAILABLE",
        "A selected record relies on unavailable evidence.",
      );
    if (!bindings.some((b) => b.id === id))
      bindings.push({
        id: source.id,
        version: source.version,
        hash: source.hash,
        state: source.state,
      });
  }
  const auditEvents =
    d.kind === "audit"
      ? (
          await db.query(
            "SELECT sequence,type,record_id,created_at FROM audit_events WHERE company_id=$1 ORDER BY sequence DESC LIMIT 500",
            [c.id],
          )
        ).rows
      : undefined;
  const { reportProposal: _proposal, ...auditSnapshot } = auditBrief || {};
  const packet = {
    auditBrief: auditBrief ? auditSnapshot : undefined,
    auditSource: auditSource
      ? {
          fingerprint: auditSource.fingerprint,
          sourceRevision: auditSource.sourceRevision,
          analysis: auditSource.analysis,
        }
      : undefined,
    schemaVersion: "0.2.0",
    title: d.title,
    kind: d.kind,
    audience: d.audience,
    purpose: d.purpose,
    summary: d.summary,
    decisions: d.decisions,
    nextSteps: d.nextSteps,
    limitations: d.limitations,
    company: { id: c.id, name: c.name, scope: c.scope, goal: c.goal },
    sourceRevision: c.revision,
    generatedAt: new Date().toISOString(),
    sandbox: c.sandbox,
    coverage: auditBrief
      ? {
          ...auditBrief.coverage,
          participants: auditBrief.coverage.people,
          responded: auditBrief.coverage.respondedPeople,
          totalTasks: auditBrief.coverage.tasks,
        }
      : coverageSummary(
          all.filter(
            (r) => r.kind === "person" && !inactiveReportStates.has(r.state),
          ),
          all.filter(
            (r) => r.kind === "task" && !inactiveReportStates.has(r.state),
          ),
          all.filter(
            (r) =>
              r.kind === "request" &&
              r.data.type === "work" &&
              !inactiveReportStates.has(r.state),
          ),
        ),
    collectionNotice:
      "Coverage concerns this engagement roster. Raw sources and private response content are excluded.",
    records: chosen.map((r) => reportRecord(r, all)),
    auditEvents,
    auditCoverage: auditEvents
      ? "Latest 500 application events in this company. No external execution logs, provisioning receipts or independently signed ledger checkpoints are available."
      : undefined,
  };
  return putRecord(
    db,
    u,
    c.id,
    "brief",
    d.title,
    {
      packet: auditSource ? clientSafeValue(packet) : packet,
      bindings,
      approval: null,
      ...(auditSource ? { auditSource } : {}),
    },
    "draft",
    undefined,
    "Frozen report prepared for an explicit audience",
  );
}

export function reportsRouter() {
  const router = express.Router({ mergeParams: true });
  router.use(advisor);
  const user = (req: express.Request) => (req as AuthRequest).actor;
  const company = (req: express.Request) =>
    z.uuid().parse(String(req.params.companyId));
  const run = (req: express.Request, fn: any) =>
    command(
      user(req),
      req.header("Idempotency-Key"),
      { path: req.originalUrl, body: req.body },
      fn,
    );
  router.post("/", async (req, res) =>
    res.status(201).json(
      await run(req, async (db: any) => {
        const c = await companyCheck(db, user(req), company(req));
        return prepareClientReport(db, user(req), c, req.body);
      }),
    ),
  );
  router.post("/:reportId/review", async (req, res) =>
    res.json(
      await run(req, async (db: any) => {
        const c = await companyCheck(db, user(req), company(req));
        const r = await getRecord(
          db,
          c.id,
          z.uuid().parse(req.params.reportId),
          true,
        );
        const d = z
          .object({
            expectedVersion: z.number().int(),
            contentHash: z.string(),
            decision: z.enum(["approve", "withdraw"]),
            note: z.string().trim().min(5).max(4000),
          })
          .strict()
          .parse(req.body);
        if (r.kind !== "brief") fail(404, "NOT_FOUND", "Report not found.");
        if (r.version !== d.expectedVersion || r.hash !== d.contentHash)
          fail(
            409,
            "VERSION_CONFLICT",
            "Review the exact current report and audience.",
          );
        if (d.decision === "approve") {
          if (r.state !== "draft")
            fail(409, "INVALID_STATE", "Only a draft report can be approved.");
          await checkSources(db, c.id, r, user(req));
        }
        await setState(
          db,
          user(req),
          c.id,
          r,
          d.decision === "approve" ? "approved" : "withdrawn",
          "report." + d.decision,
        );
        await audit(db, user(req), c.id, "report.review_binding", r.id, {
          contentHash: r.hash,
          version: r.version,
          audience: r.data.packet.audience,
          note: d.note,
          decision: d.decision,
        });
        return { ok: true };
      }),
    ),
  );
  router.get("/:reportId/:format", async (req, res) => {
    const format = z.enum(["preview", "download"]).parse(req.params.format);
    const r = await tx(user(req).tenant_id, async (db) => {
      const c = await companyCheck(db, user(req), company(req));
      const r = await getRecord(db, c.id, z.uuid().parse(req.params.reportId));
      if (r.kind !== "brief") fail(404, "NOT_FOUND", "Report not found.");
      if (
        r.state === "withdrawn" ||
        (format === "download" && r.state !== "approved")
      )
        fail(
          409,
          "REVIEW_REQUIRED",
          "Review this exact report and audience before delivery.",
        );
      if (format === "download") {
        await checkSources(db, c.id, r, user(req));
        await audit(db, user(req), c.id, "report.downloaded", r.id);
      }
      return r;
    });
    if (format === "preview") {
      res
        .type("html")
        .send(renderReport(r.data.packet, r.state === "approved"));
      return;
    }
    res
      .type("application/zip")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="DutyGraph-Client-${r.id.slice(0, 8)}.zip"`,
      );
    res.send(await reportZip(r));
  });
  return router;
}
