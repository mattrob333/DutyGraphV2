/** Advisor-facing live record summary. No source passages or contact addresses. */
export type AuditPriority = {
  id: string;
  kind:
    | "conflict"
    | "ownership"
    | "evidence"
    | "work_gap"
    | "constraint_hypothesis"
    | "reviewed_finding";
  priority: "high" | "medium";
  title: string;
  detail: string;
  nextAction: string;
  recordIds: string[];
  source: "record_gap" | "record_finding" | "reviewed_analysis";
  analysisRunId?: string;
};
export type AuditReportProposal = {
  title: string;
  kind: "executive" | "weekly" | "audit";
  purpose: string;
  summary: string;
  decisions: string;
  nextSteps: string;
  limitations: string;
  recordIds: string[];
  expectedRevision: number;
};
export type AuditBrief = {
  sourceRevision: number;
  sourceFingerprint: string;
  generatedAt: string;
  scope: { companyName: string; scope: string; goal: string; sandbox: boolean };
  coverage: {
    people: number;
    respondedPeople: number;
    duties: number;
    tasks: number;
    confirmedTasks: number;
    reviewedTasks: number;
    stages: number;
    stagesWithWork: number;
    unmappedTasks: number;
    unmappedDuties: number;
    acceptedEvidence: number;
    tasksWithAcceptedEvidence: number;
    workflows: number;
    openRequests: number;
  };
  stages: {
    streamId: string;
    stageId: string;
    label: string;
    people: number;
    duties: number;
    tasks: number;
    confirmedTasks: number;
    gapCount: number;
  }[];
  priorities: AuditPriority[];
  missingInputs: {
    id: string;
    title: string;
    detail: string;
    recordIds: string[];
  }[];
  commitments: {
    id: string;
    kind: "review" | "intervention";
    title: string;
    owner: string;
    action: string;
    dueDate: string;
    overdue: boolean;
    state: string;
    recordIds: string[];
  }[];
  metrics: {
    id: string;
    title: string;
    unit: string;
    owner: string;
    baseline: number | null;
    target: number | null;
    observationCount: number;
    latestObservation?: { value: number; observedAt: string };
    missingReason: string;
    state: string;
  }[];
  analysis: {
    currentReviewed: number;
    staleExcluded: number;
    dismissedExcluded: number;
    unreviewedExcluded: number;
    unavailable: boolean;
  };
  reportProposal: AuditReportProposal;
  limitations: string[];
  omitted: {
    priorities: number;
    missingInputs: number;
    commitments: number;
    metrics: number;
  };
};
export type AuditPrepareInput = AuditReportProposal & {
  audience: string[];
  sourceFingerprint: string;
};

/** Contact addresses do not belong in generated client-facing narratives. */
export function auditText(value: unknown, max = 2000): string {
  return String(value ?? "")
    .replace(
      /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+/gi,
      "[contact address omitted]",
    )
    .replace(
      /https?:\/\/[^\s]*\/(?:invite|respond)\b[^\s]*/gi,
      "[private link omitted]",
    )
    .slice(0, max);
}
