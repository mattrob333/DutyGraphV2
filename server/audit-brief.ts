import { Router } from "express";
import { z } from "zod";
import type pg from "pg";
import {
  confirmationStatus,
  type RecordRow,
  type User,
} from "../shared/domain.ts";
import {
  activeWork,
  teamContext,
  validateTeamOutput,
} from "../shared/team-analysis.ts";
import { stageWorkMap } from "../shared/stage-work-map.ts";
import { assessWorkGaps } from "../shared/work-gaps.ts";
import {
  auditText,
  type AuditBrief,
  type AuditPriority,
} from "../shared/audit-brief.ts";
import { advisor, type AuthRequest } from "./auth.ts";
import { tx, command, companyCheck, hash, fail } from "./db.ts";
import { prepareClientReport, reportInput } from "./reports.ts";

const sourceKinds = new Set([
  "person",
  "task",
  "duty",
  "handoff",
  "workflow",
  "request",
  "response",
  "evidence",
  "engagement",
  "candidate",
  "metric",
  "intervention",
  "outcome",
  "review",
  "framework",
  "agent",
]);
const selectableKinds = new Set([
  "task",
  "duty",
  "handoff",
  "engagement",
  "candidate",
  "metric",
  "intervention",
  "review",
  "outcome",
  "framework",
]);
const terminalCommitment = new Set([
  "complete",
  "completed",
  "closed",
  "cancelled",
]);
export type AuditSourceBinding = {
  fingerprint: string;
  sourceRevision: number;
  records: { id: string; version: number; hash: string; state: string }[];
  analysis: {
    id: string;
    fingerprint: string;
    reviewVersion: number;
    resultHash: string;
  }[];
};
const dateOnly = (value: unknown) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : "";

/** Serialize with workspace commands; this function never invokes a provider or mutates records. */
export async function auditBriefContext(
  db: pg.PoolClient,
  user: User,
  companyId: string,
): Promise<{ brief: AuditBrief; sources: AuditSourceBinding }> {
  if (user.role !== "advisor")
    fail(403, "ADVISOR_REQUIRED", "An advisor must prepare the audit brief.");
  await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    "tenant-command:" + user.tenant_id,
  ]);
  const company = await companyCheck(db, user, companyId);
  const all: RecordRow[] = (
    await db.query(
      "SELECT * FROM records WHERE company_id=$1 ORDER BY id LIMIT 5001",
      [companyId],
    )
  ).rows;
  if (all.length > 5000)
    fail(
      422,
      "AUDIT_SCOPE",
      "This workspace exceeds the live brief's 5,000-record limit. No partial coverage was reported.",
    );
  const confirmations = (
    await db.query("SELECT * FROM confirmations WHERE company_id=$1", [
      companyId,
    ])
  ).rows;
  const jobs = (
    await db.query(
      "SELECT id,state,input->>'fingerprint' AS fingerprint,result FROM provider_jobs WHERE company_id=$1 AND kind='team_analysis' ORDER BY created_at DESC,id DESC LIMIT 101",
      [companyId],
    )
  ).rows;
  const relevant = all.filter((r) => sourceKinds.has(r.kind));
  const active = relevant.filter(activeWork);
  const people = active.filter((r) => r.kind === "person"),
    tasks = active.filter((r) => r.kind === "task"),
    duties = active.filter((r) => r.kind === "duty");
  const taskStates = new Map(
    tasks.map((r) => [r.id, confirmationStatus(r, confirmations)]),
  );
  const peopleIds = new Set(people.map((r) => r.id));
  const owner = (id: string) =>
    auditText(people.find((r) => r.id === id)?.title || "Not recorded", 200);
  const acceptedEvidence = new Set(
    active
      .filter((r) => r.kind === "evidence" && r.state === "accepted")
      .map((r) => r.id),
  );
  const evidenceCurrent = (r: RecordRow) =>
    (r.data.evidenceIds || []).length > 0 &&
    (r.data.evidenceIds || []).every((id: string) =>
      acceptedEvidence.has(id),
    ) &&
    (r.data.sourceBindings || []).every((b: any) =>
      active.some(
        (s) =>
          s.id === b.id &&
          s.version === b.version &&
          s.hash === b.hash &&
          s.state === "accepted",
      ),
    );
  const map = stageWorkMap(relevant, company.settings.businessProfile);
  const gaps = assessWorkGaps(relevant, company.settings.businessProfile);
  const workRequests = active.filter(
    (r) => r.kind === "request" && r.data.type === "work",
  );
  const respondedPeople = new Set(
    workRequests
      .filter(
        (r) =>
          ["returned", "accepted"].includes(r.state) &&
          peopleIds.has(r.data.personId),
      )
      .map((r) => r.data.personId),
  );
  const coverage: AuditBrief["coverage"] = {
    people: people.length,
    respondedPeople: respondedPeople.size,
    duties: duties.length,
    tasks: tasks.length,
    confirmedTasks: tasks.filter((r) => taskStates.get(r.id) === "confirmed")
      .length,
    reviewedTasks: tasks.filter(
      (r) =>
        r.data.reviewed &&
        !["stale", "conflicting"].includes(taskStates.get(r.id)!),
    ).length,
    stages: map.streams.reduce((n, s) => n + s.stages.length, 0),
    stagesWithWork: map.streams
      .flatMap((s) => s.stages)
      .filter((s) => s.tasks.length || s.duties.length).length,
    unmappedTasks: map.unmapped.tasks.length,
    unmappedDuties: map.unmapped.duties.length,
    acceptedEvidence: acceptedEvidence.size,
    tasksWithAcceptedEvidence: tasks.filter(evidenceCurrent).length,
    workflows: active.filter((r) => r.kind === "workflow").length,
    openRequests: workRequests.filter((r) =>
      ["draft", "sent"].includes(r.state),
    ).length,
  };
  const stages: AuditBrief["stages"] = map.streams.flatMap((stream) =>
    stream.stages.map((stage) => ({
      streamId: stream.id,
      stageId: stage.id,
      label: auditText(stage.name, 200),
      people: stage.people.length,
      duties: stage.duties.length,
      tasks: stage.tasks.length,
      confirmedTasks: stage.tasks.filter(
        (r) => taskStates.get(r.id) === "confirmed",
      ).length,
      gapCount: gaps.filter(
        (g) => g.streamId === stream.id && g.stageId === stage.id,
      ).length,
    })),
  );
  const priorities: AuditPriority[] = [];
  for (const task of tasks) {
    if (task.data.conflict || task.state === "conflicting")
      priorities.push({
        id: "conflict:" + task.id,
        kind: "conflict",
        priority: "high",
        title: auditText(task.title, 200),
        detail:
          "This task has conflicting accounts recorded. The difference has not been resolved.",
        nextAction:
          "Ask the accountable person to resolve the conflicting descriptions.",
        recordIds: [task.id],
        source: "record_gap",
      });
    if (
      !peopleIds.has(task.data.ownerId) ||
      !peopleIds.has(task.data.performerId)
    )
      priorities.push({
        id: "ownership:" + task.id,
        kind: "ownership",
        priority: "high",
        title: auditText(task.title, 200),
        detail:
          "An active owner or performer is not recorded. This does not prove that nobody does the work.",
        nextAction:
          "Confirm who performs the work and who is responsible for its result.",
        recordIds: [task.id],
        source: "record_gap",
      });
    if (!evidenceCurrent(task))
      priorities.push({
        id: "evidence:" + task.id,
        kind: "evidence",
        priority: "medium",
        title: auditText(task.title, 200),
        detail:
          "Current accepted supporting evidence is missing or its saved binding changed.",
        nextAction:
          "Review the original account and its connection to this task.",
        recordIds: [task.id],
        source: "record_gap",
      });
  }
  for (const gap of gaps.filter((g) => g.code !== "owner_missing"))
    priorities.push({
      id: gap.key,
      kind: "work_gap",
      priority: "medium",
      title: auditText(gap.title, 200),
      detail: auditText(gap.detail),
      nextAction: auditText(gap.questions[0]),
      recordIds: gap.recordIds,
      source: "record_gap",
    });
  for (const candidate of active.filter(
    (r) =>
      r.kind === "candidate" &&
      !["stale", "dismissed", "rejected", "cancelled"].includes(r.state),
  )) {
    const supported = evidenceCurrent(candidate);
    priorities.push({
      id: "candidate:" + candidate.id,
      kind: "constraint_hypothesis",
      priority: "medium",
      title: "Hypothesis: " + auditText(candidate.title, 180),
      detail: `Recorded hypothesis, not an established constraint. ${auditText(candidate.data.pressure)} ${supported ? "Current accepted sources are linked; the explanation still needs testing." : "Current accepted supporting evidence still needs review."}`,
      nextAction: auditText(
        candidate.data.discriminator ||
          "Record a test that could distinguish this explanation from an alternative.",
      ),
      recordIds: [
        candidate.id,
        ...(candidate.data.evidenceIds || []).filter((id: string) =>
          acceptedEvidence.has(id),
        ),
      ],
      source: "record_finding",
    });
  }
  const analysis: AuditBrief["analysis"] = {
    currentReviewed: 0,
    staleExcluded: 0,
    dismissedExcluded: 0,
    unreviewedExcluded: 0,
    unavailable: false,
  };
  const analysisBindings: AuditSourceBinding["analysis"] = [];
  let context: ReturnType<typeof teamContext> | undefined;
  try {
    context = teamContext(all, company.name);
  } catch {
    analysis.unavailable = true;
  }
  const currentFingerprint = context ? hash(context) : "";
  const seenFindings = new Set<string>();
  for (const job of jobs.slice(0, 100)) {
    if (job.state !== "complete") continue;
    const findings = job.result?.output?.findings || [];
    if (!context || job.fingerprint !== currentFingerprint) {
      analysis.staleExcluded += findings.length;
      continue;
    }
    let output;
    try {
      output = validateTeamOutput(job.result.output, context);
    } catch {
      analysis.staleExcluded += findings.length;
      continue;
    }
    analysisBindings.push({
      id: job.id,
      fingerprint: job.fingerprint,
      reviewVersion: job.result.reviewVersion || 0,
      resultHash: hash(job.result),
    });
    for (const finding of output.findings) {
      const recordIds = [...new Set(finding.citations.map((c) => c.sourceId))];
      const identity = hash({
        category: finding.category,
        title: finding.title,
        recordIds: recordIds.slice().sort(),
      });
      const superseded = seenFindings.has(identity);
      seenFindings.add(identity);
      const review = job.result.reviews?.[finding.id];
      if (review?.decision === "dismissed") {
        analysis.dismissedExcluded++;
        continue;
      }
      if (review?.decision !== "discuss") {
        analysis.unreviewedExcluded++;
        continue;
      }
      if (superseded) continue;
      analysis.currentReviewed++;
      priorities.push({
        id: `${job.id}:${finding.id}`,
        kind: "reviewed_finding",
        priority: finding.category === "conflict" ? "high" : "medium",
        title: auditText(finding.title, 200),
        detail: auditText(finding.observation),
        nextAction: auditText(finding.nextAction),
        recordIds,
        source: "reviewed_analysis",
        analysisRunId: job.id,
      });
    }
  }
  priorities.sort(
    (a, b) =>
      Number(a.priority !== "high") - Number(b.priority !== "high") ||
      a.id.localeCompare(b.id),
  );
  const missingInputs: AuditBrief["missingInputs"] = [];
  if (!coverage.people)
    missingInputs.push({
      id: "roster",
      title: "Engagement roster missing",
      detail:
        "No active people are recorded; coverage cannot describe the company's full workforce.",
      recordIds: [],
    });
  if (!coverage.stages)
    missingInputs.push({
      id: "stages",
      title: "Business stages not recorded",
      detail:
        "Review the company profile and save its relevant operating stages.",
      recordIds: [],
    });
  if (coverage.respondedPeople < coverage.people)
    missingInputs.push({
      id: "responses",
      title: "Work accounts still needed",
      detail: `${coverage.people - coverage.respondedPeople} of ${coverage.people} active roster members have no returned work request recorded.`,
      recordIds: people
        .filter((p) => !respondedPeople.has(p.id))
        .map((p) => p.id),
    });
  for (const gap of gaps)
    missingInputs.push({
      id: gap.key,
      title: auditText(gap.title, 200),
      detail: auditText(gap.detail),
      recordIds: gap.recordIds,
    });
  if (coverage.unmappedTasks || coverage.unmappedDuties)
    missingInputs.push({
      id: "mapping",
      title: "Work without a valid stage",
      detail: `${coverage.unmappedTasks} tasks and ${coverage.unmappedDuties} duties lack a valid recorded stage mapping.`,
      recordIds: [...map.unmapped.taskIds, ...map.unmapped.dutyIds],
    });
  const commitments: AuditBrief["commitments"] = active
    .filter(
      (r) =>
        ["review", "intervention"].includes(r.kind) &&
        !terminalCommitment.has(r.state),
    )
    .map((r) => {
      const dueDate = dateOnly(
        r.kind === "review" ? r.data.dueDate : r.data.reviewDate,
      );
      return {
        id: r.id,
        kind: r.kind as "review" | "intervention",
        title: auditText(r.title, 200),
        owner: owner(r.data.ownerId),
        action: auditText(
          r.kind === "review" ? r.data.nextAction : r.data.change,
        ),
        dueDate,
        overdue:
          !!dueDate &&
          Date.parse(dueDate + "T23:59:59Z") < Date.now() &&
          !["complete", "completed", "closed", "cancelled"].includes(r.state),
        state: r.state,
        recordIds: [r.id],
      };
    })
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        a.dueDate.localeCompare(b.dueDate) ||
        a.id.localeCompare(b.id),
    );
  const metrics: AuditBrief["metrics"] = active
    .filter((r) => r.kind === "metric")
    .map((r) => {
      const observations = (
        Array.isArray(r.data.observations) ? r.data.observations : []
      )
        .filter(
          (o: any) =>
            o &&
            typeof o.value === "number" &&
            Number.isFinite(o.value) &&
            typeof o.observedAt === "string" &&
            Number.isFinite(Date.parse(o.observedAt)),
        )
        .sort(
          (a: any, b: any) =>
            Date.parse(b.observedAt) - Date.parse(a.observedAt),
        );
      const latest = observations[0];
      return {
        id: r.id,
        title: auditText(r.title, 200),
        unit: auditText(r.data.unit, 200),
        owner: owner(r.data.ownerId),
        baseline:
          typeof r.data.baseline === "number" &&
          Number.isFinite(r.data.baseline)
            ? r.data.baseline
            : null,
        target:
          typeof r.data.target === "number" && Number.isFinite(r.data.target)
            ? r.data.target
            : null,
        observationCount: observations.length,
        ...(latest
          ? {
              latestObservation: {
                value: latest.value,
                observedAt: new Date(latest.observedAt).toISOString(),
              },
            }
          : {}),
        missingReason: auditText(
          r.data.missingReason ||
            (r.data.baseline == null
              ? "No measured baseline is recorded."
              : ""),
        ),
        state: r.state,
      };
    });
  if (!metrics.length)
    missingInputs.push({
      id: "metrics",
      title: "Measured baseline not recorded",
      detail:
        "No metric records are available. Savings, ROI and throughput effects have not been established.",
      recordIds: [],
    });
  for (const metric of metrics.filter((m) => m.baseline === null))
    missingInputs.push({
      id: "baseline:" + metric.id,
      title: "Baseline missing: " + metric.title,
      detail: metric.missingReason,
      recordIds: [metric.id],
    });
  const limitations = [
    "Coverage concerns the active engagement roster and saved work records, not a census of the company's operations.",
    "A documented stage or proposed task is not proof that the work is complete or performed as described.",
    "Reviewed team findings are discussion hypotheses; dismissed, unreviewed and stale findings are excluded.",
    "Metric values are reported as saved. No financial savings, ROI, causation or external execution is inferred.",
    "Source passages, recordings, private responses, contact addresses and provider credentials are excluded. An advisor must review the exact audience and report before delivery.",
  ];
  if (company.sandbox)
    limitations.unshift(
      "This workspace is fictional. Its coverage and measurements are illustrative only.",
    );
  if (analysis.unavailable)
    limitations.push(
      "The current workspace exceeds the team-analysis context limit; no previous findings were treated as current.",
    );
  if (jobs.length > 100)
    limitations.push(
      "Only the latest 100 team-analysis runs were considered; older runs are omitted.",
    );
  const eligibleSelection = active.filter(
    (r) =>
      selectableKinds.has(r.kind) &&
      !["stale", "dismissed", "rejected", "cancelled"].includes(r.state) &&
      (r.kind !== "framework" ||
        ["reviewed", "accepted", "complete"].includes(r.state)) &&
      !(
        ["review", "intervention"].includes(r.kind) &&
        terminalCommitment.has(r.state)
      ) &&
      !["stale", "conflicting"].includes(taskStates.get(r.id) || r.state) &&
      (r.data.evidenceIds || []).every((id: string) =>
        acceptedEvidence.has(id),
      ) &&
      (r.data.sourceBindings || []).every((b: any) =>
        active.some(
          (s) =>
            s.id === b.id &&
            s.version === b.version &&
            s.hash === b.hash &&
            (s.kind !== "evidence" || s.state === "accepted") &&
            s.state !== "stale",
        ),
      ) &&
      (r.data.upstreamBindings || []).every((b: any) =>
        active.some(
          (s) =>
            s.id === b.id &&
            s.version === b.version &&
            s.hash === b.hash &&
            s.state !== "stale",
        ),
      ),
  );
  const executiveKinds = [
    "engagement",
    "candidate",
    "metric",
    "intervention",
    "outcome",
    "review",
    "framework",
  ];
  const detailIds = new Set([
    ...priorities.slice(0, 6).flatMap((p) => p.recordIds),
    ...commitments.slice(0, 6).flatMap((c) => c.recordIds),
  ]);
  const executiveSelection = eligibleSelection
    .filter((r) => executiveKinds.includes(r.kind) || detailIds.has(r.id))
    .sort((a, b) => {
      const rank = (r: RecordRow) =>
        executiveKinds.includes(r.kind)
          ? executiveKinds.indexOf(r.kind)
          : executiveKinds.length;
      return rank(a) - rank(b) || a.id.localeCompare(b.id);
    });
  const selection = executiveSelection.slice(0, 40).map((r) => r.id);
  if (executiveSelection.length > 40)
    limitations.push(
      `${executiveSelection.length - 40} additional relevant detailed records are not preselected. The appendix starts with 40 records; the frozen stage overview and priorities cover the wider workspace.`,
    );
  const recordBindings = relevant.map((r) => ({
    id: r.id,
    version: r.version,
    hash: r.hash,
    state: taskStates.get(r.id) || r.state,
  }));
  // Job review changes do not bump company.revision, so bind them explicitly.
  const sourceFingerprint = hash({
    company: {
      name: company.name,
      scope: company.scope,
      goal: company.goal,
      sandbox: company.sandbox,
      profile: company.settings.businessProfile || null,
    },
    records: recordBindings,
    analyses: jobs.map((j) => ({
      id: j.id,
      state: j.state,
      fingerprint: j.fingerprint,
      resultHash: hash(j.result || null),
    })),
    commitments: commitments.map((c) => ({ id: c.id, overdue: c.overdue })),
  });
  const focus = priorities
    .filter(
      (p, index) =>
        priorities.findIndex(
          (other) => other.title.toLowerCase() === p.title.toLowerCase(),
        ) === index,
    )
    .slice(0, 2);
  const focusText = focus.length
    ? `Focus for review: ${focus.map((p) => `${p.title} — ${p.nextAction}`).join("; ")} These are open questions or recorded hypotheses, not established bottlenecks.`
    : "Confirm the scope and capture recent examples before drawing operating conclusions.";
  const summary = `${focusText}\n\nThe work map records ${coverage.duties} duties and ${coverage.tasks} tasks across ${coverage.stagesWithWork} of ${coverage.stages} saved stages; ${coverage.confirmedTasks} tasks are confirmed against their current content. ${coverage.respondedPeople} of ${coverage.people} active roster members have returned a work account; this describes recorded coverage, not proven operating completeness.`;
  const nextSteps =
    [
      ...priorities.slice(0, 5).map((p) => `${p.title}: ${p.nextAction}`),
      ...commitments
        .slice(0, 5)
        .map(
          (c) =>
            `${c.title}: ${c.action || "Review the recorded commitment"}${c.dueDate ? " (due " + c.dueDate + ")" : ""}.`,
        ),
    ].join("\n") ||
    "Confirm the engagement scope and roster, then capture a recent example of the work and its supporting evidence.";
  const brief: AuditBrief = {
    sourceRevision: company.revision,
    sourceFingerprint,
    generatedAt: new Date().toISOString(),
    scope: {
      companyName: auditText(company.name, 200),
      scope: auditText(company.scope, 2000),
      goal: auditText(company.goal, 2000),
      sandbox: company.sandbox,
    },
    coverage,
    stages,
    priorities: priorities.slice(0, 80),
    missingInputs: missingInputs.slice(0, 100),
    commitments: commitments.slice(0, 100),
    metrics: metrics.slice(0, 100),
    analysis,
    limitations,
    omitted: {
      priorities: Math.max(0, priorities.length - 80),
      missingInputs: Math.max(0, missingInputs.length - 100),
      commitments: Math.max(0, commitments.length - 100),
      metrics: Math.max(0, metrics.length - 100),
    },
    reportProposal: {
      title: `${auditText(company.name, 150)} — audit findings`,
      kind: "executive",
      purpose:
        "Review recorded work, evidence gaps and existing commitments with an explicitly named client audience.",
      summary,
      decisions:
        priorities
          .filter((p) => p.source === "reviewed_analysis")
          .slice(0, 8)
          .map((p) => `For discussion — ${p.title}: ${p.detail}`)
          .join("\n") ||
        "No reviewed current team finding is selected for a client decision.",
      nextSteps: nextSteps.slice(0, 12000),
      limitations: limitations.join("\n"),
      recordIds: selection,
      expectedRevision: company.revision,
    },
  };
  return {
    brief,
    sources: {
      fingerprint: sourceFingerprint,
      sourceRevision: company.revision,
      records: recordBindings,
      analysis: analysisBindings,
    },
  };
}

export function auditBriefRouter() {
  const router = Router({ mergeParams: true });
  router.use(advisor);
  router.get("/", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const user = (req as AuthRequest).actor,
      id = z
        .uuid()
        .parse(String((req.params as Record<string, string>).companyId));
    res.json(
      await tx(
        user.tenant_id,
        async (db) => (await auditBriefContext(db, user, id)).brief,
      ),
    );
  });
  router.post("/prepare", async (req, res) => {
    const user = (req as AuthRequest).actor,
      id = z
        .uuid()
        .parse(String((req.params as Record<string, string>).companyId));
    const input = reportInput
      .extend({ sourceFingerprint: z.string().length(64) })
      .parse(req.body);
    res.status(201).json(
      await command(
        user,
        req.header("Idempotency-Key"),
        { path: req.originalUrl, body: req.body },
        async (db) => {
          const current = await auditBriefContext(db, user, id);
          if (
            current.brief.sourceFingerprint !== input.sourceFingerprint ||
            current.brief.sourceRevision !== input.expectedRevision
          )
            fail(
              409,
              "AUDIT_BRIEF_STALE",
              "The work, evidence or analysis review changed. Refresh the live brief before preparing the report.",
            );
          const { sourceFingerprint: _fingerprint, ...report } = input;
          return prepareClientReport(
            db,
            user,
            await companyCheck(db, user, id),
            report,
            current.sources,
            current.brief,
          );
        },
      ),
    );
  });
  return router;
}
