import { useState } from "react";
import { Save } from "lucide-react";
import {
  schemas,
  capturePrompts,
  type RecordRow,
} from "../../shared/domain.ts";
import { Button, Field, ErrorBox } from "./ui.tsx";
type Def = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
  hint?: string;
};
export const fieldSets: Record<string, Def[]> = {
  workflow: [
    { key: "title", label: "Workflow name" },
    {
      key: "documentationOnly",
      label: "Work description only",
      type: "checkbox",
    },
    { key: "purpose", label: "Purpose", type: "textarea" },
    { key: "ownerId", label: "Accountable case owner", type: "person" },
    { key: "taskIds", label: "Task steps", type: "tasks" },
    {
      key: "handoffIds",
      label: "Connecting handoff contracts",
      type: "handoffs",
      hint: "Connect every selected task. Create and review handoff contracts first.",
    },
    {
      key: "joinPolicy",
      label: "When paths meet",
      options: ["all", "any"],
      hint: "All waits for every incoming path to finish or be explicitly skipped. Any starts when the first selected incoming path completes.",
    },
    {
      key: "timeoutHours",
      label: "Escalate a ready step after (hours)",
      type: "number",
    },
    {
      key: "maxAttempts",
      label: "Maximum attempts per step, including the first",
      type: "number",
    },
    { key: "reason", label: "Reason for this version" },
  ],
  engagement: [
    { key: "title", label: "Engagement name" },
    { key: "sponsorId", label: "Executive sponsor", type: "personOptional" },
    {
      key: "totalHeadcount",
      label: "Total company headcount, if known",
      type: "number",
      required: false,
      hint: "Participation coverage is measured against the roster, not total headcount.",
    },
    { key: "outcome", label: "Business outcome", type: "textarea" },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    { key: "systems", label: "Systems in scope (one per line)", type: "lines" },
    { key: "locations", label: "Locations (one per line)", type: "lines" },
    { key: "inScope", label: "Work and teams in scope", type: "textarea" },
    { key: "outOfScope", label: "Explicit exclusions", type: "textarea" },
    {
      key: "sourcePolicy",
      label: "Approved source types and collection boundaries",
      type: "textarea",
    },
    {
      key: "visibility",
      label: "Who can see recordings, sources and summaries?",
      type: "textarea",
    },
    {
      key: "retentionDays",
      label: "Agreed record retention (days)",
      type: "number",
      hint: "The application applies its configured asset retention separately; record the engagement agreement here.",
    },
    { key: "reviewCadence", label: "Review cadence" },
    {
      key: "timezone",
      label: "Timezone",
      hint: "Use an IANA name, such as America/New_York.",
    },
    {
      key: "successCriteria",
      label: "How will success be judged?",
      type: "textarea",
    },
  ],
  duty: [
    { key: "title", label: "Standing duty" },
    {
      key: "ownerId",
      label: "Proposed accountable owner",
      type: "personOptional",
    },
    { key: "purpose", label: "Purpose", type: "textarea" },
    { key: "scope", label: "Scope and boundaries", type: "textarea" },
    { key: "taskIds", label: "Tasks supporting this duty", type: "tasks" },
    {
      key: "evidenceIds",
      label: "Evidence for duty accountability",
      type: "evidence",
    },
    { key: "reviewDue", label: "Review due", type: "date" },
    { key: "reason", label: "Reason for this version" },
  ],
  handoff: [
    { key: "title", label: "Handoff name" },
    { key: "sourceTaskId", label: "From task", type: "task" },
    { key: "targetTaskId", label: "To task", type: "task" },
    { key: "condition", label: "Handoff happens when", type: "textarea" },
    {
      key: "outputMapping",
      label: "Output being handed over",
      type: "textarea",
    },
    {
      key: "requiredInput",
      label: "Input the next task requires",
      type: "textarea",
    },
    {
      key: "acceptanceCheck",
      label: "How the receiving person checks completeness",
      type: "textarea",
    },
    {
      key: "exceptionOwnerId",
      label: "Person accountable for exceptions",
      type: "person",
    },
    { key: "timeoutHours", label: "Escalate after (hours)", type: "number" },
    { key: "maxRetries", label: "Maximum retries", type: "number" },
    {
      key: "failureAction",
      label: "What happens on rejection or timeout?",
      type: "textarea",
    },
    { key: "evidenceIds", label: "Supporting evidence", type: "evidence" },
    { key: "reason", label: "Reason for this version" },
  ],
  outcome: [
    { key: "title", label: "Outcome review name" },
    {
      key: "interventionId",
      label: "Intervention being evaluated",
      type: "intervention",
    },
    { key: "ownerId", label: "Reviewer", type: "person" },
    {
      key: "result",
      label: "What does the evidence support?",
      options: ["inconclusive", "supported", "falsified"],
    },
    { key: "observationWindow", label: "Observation window" },
    {
      key: "coverage",
      label: "Coverage and missing observations",
      type: "textarea",
    },
    {
      key: "confounders",
      label: "Other factors that could explain the result",
      type: "textarea",
    },
    {
      key: "interpretation",
      label: "Interpretation against the original prediction",
      type: "textarea",
    },
    { key: "nextAction", label: "Next action", type: "textarea" },
    { key: "evidenceIds", label: "Outcome evidence", type: "evidence" },
    { key: "reason", label: "Reason for this version" },
  ],
  person: [
    { key: "name", label: "Full name" },
    { key: "email", label: "Work email", type: "email" },
    { key: "role", label: "Role or job title" },
    { key: "team", label: "Team" },
    {
      key: "managerId",
      label: "Reported manager",
      type: "personOptional",
      hint: "A reporting claim needs its own verification.",
    },
    { key: "externalId", label: "External ID", required: false },
  ],
  evidence: [
    { key: "title", label: "Source title" },
    {
      key: "type",
      label: "Evidence kind",
      options: [
        "Employee account",
        "Leadership account",
        "Customer account",
        "Policy document",
        "System configuration",
        "Execution record",
        "Public research",
        "Other document",
      ],
    },
    { key: "personId", label: "Source person", type: "personOptional" },
    {
      key: "bucket",
      label: "Intake bucket",
      options: ["biz", "leadership", "calls", "org"],
    },
    {
      key: "locator",
      label: "Exact source location",
      hint: "For example: transcript 04:20–05:10, document page 3, or original response.",
    },
    { key: "sourceDate", label: "Source date", type: "date", required: false },
    { key: "text", label: "Exact excerpt or original text", type: "textarea" },
    {
      key: "classification",
      label: "Evidence label",
      options: ["Known", "Inferred", "Assumed", "Missing"],
    },
  ],
  task: [
    { key: "title", label: "Task name" },
    {
      key: "valueStage",
      label: "Value-chain stage",
      options: ["unmapped", "receive", "prepare", "check", "decide", "deliver"],
      hint: "A category for browsing work. Recorded handoffs define its actual sequence.",
    },
    { key: "duty", label: "Standing duty" },
    {
      key: "ownerId",
      label: "Accountable human owner",
      type: "personOptional",
      hint: "Unresolved ownership can be saved as a proposal; it blocks confirmation and delegation.",
    },
    {
      key: "performerId",
      label: "Person doing this work",
      type: "personOptional",
    },
    { key: "purpose", label: "Purpose", type: "textarea" },
    { key: "trigger", label: "Starts when", type: "textarea" },
    { key: "inputs", label: "Required inputs", type: "textarea" },
    { key: "instructions", label: "Steps / instructions", type: "textarea" },
    {
      key: "aiPrompt",
      label: "AI instructions / prompt",
      type: "textarea",
      required: false,
      hint: "Describe the AI role, input, output and limits. Saving a prompt does not deploy an agent.",
    },
    {
      key: "output",
      label: "Produces / completion evidence",
      type: "textarea",
    },
    { key: "systems", label: "Systems (one per line)", type: "lines" },
    {
      key: "allowed",
      label: "Actions described by this task (one per line)",
      type: "lines",
    },
    { key: "denied", label: "Not authorized (one per line)", type: "lines" },
    { key: "humanGate", label: "When a human must decide", type: "textarea" },
    {
      key: "stopConditions",
      label: "Stop conditions",
      type: "textarea",
      required: false,
    },
    {
      key: "mode",
      label: "Proposed operating mode",
      options: [
        "human_only",
        "ai_assist",
        "ai_draft",
        "ai_recommend",
        "ai_execute_with_approval",
        "ai_execute_bounded",
        "prohibited",
      ],
    },
    {
      key: "classification",
      label: "Claim classification",
      options: ["Known", "Inferred", "Assumed", "Missing"],
    },
    { key: "reviewDue", label: "Review due", type: "date" },
    {
      key: "evidenceIds",
      label: "Supporting evidence",
      type: "evidence",
      hint: "Accepted sources only. A source supports a claim; it does not authorize an action.",
    },
    {
      key: "conflict",
      label: "Conflicting evidence remains unresolved",
      type: "checkbox",
    },
    { key: "reason", label: "Reason for this version" },
  ],
  request: [
    { key: "title", label: "Request title" },
    { key: "personId", label: "Recipient", type: "person" },
    {
      key: "type",
      label: "Request type",
      options: ["work", "leadership", "confirmation"],
    },
    { key: "dueDate", label: "Due date", type: "date" },
    { key: "questions", label: "Questions (one per line)", type: "lines" },
    {
      key: "taskIds",
      label: "Tasks to confirm, when applicable",
      type: "tasks",
    },
    { key: "notice", label: "Participant notice", type: "textarea" },
  ],
  candidate: [
    { key: "title", label: "Constraint hypothesis" },
    { key: "flow", label: "Bounded value flow" },
    { key: "throughputUnit", label: "Throughput unit" },
    { key: "ownerId", label: "Accountable reviewer", type: "person" },
    {
      key: "pressure",
      label: "Where is the pressure / queue evidence?",
      type: "textarea",
    },
    {
      key: "alternative",
      label: "Strongest competing explanation",
      type: "textarea",
    },
    {
      key: "counterfactual",
      label: "What would limit total output if this were relieved?",
      type: "textarea",
    },
    {
      key: "discriminator",
      label: "Smallest useful measurement or question",
      type: "textarea",
    },
    { key: "evidenceIds", label: "Supporting sources", type: "evidence" },
    {
      key: "disconfirmingEvidenceIds",
      label: "Disconfirming sources",
      type: "evidence",
    },
  ],
  metric: [
    { key: "title", label: "Metric name" },
    { key: "ownerId", label: "Measurement owner", type: "person" },
    { key: "question", label: "Decision question", type: "textarea" },
    {
      key: "formula",
      label: "Exact formula or event definition",
      type: "textarea",
    },
    { key: "unit", label: "Unit" },
    { key: "population", label: "Population / cohort" },
    { key: "source", label: "Data source" },
    { key: "window", label: "Baseline / evaluation window" },
    {
      key: "baseline",
      label: "Measured baseline",
      type: "number",
      required: false,
      hint: "Leave blank when unknown. Zero means measured zero.",
    },
    {
      key: "target",
      label: "Target with a defensible basis",
      type: "number",
      required: false,
    },
    {
      key: "missingReason",
      label: "Why is a baseline missing?",
      required: false,
    },
    {
      key: "guardrail",
      label: "Quality or safety guardrail",
      type: "textarea",
    },
  ],
  intervention: [
    { key: "title", label: "Intervention name" },
    { key: "candidateId", label: "Constraint hypothesis", type: "candidate" },
    { key: "ownerId", label: "Accountable human", type: "person" },
    { key: "metricId", label: "Outcome measure", type: "metric" },
    { key: "change", label: "Smallest proposed change", type: "textarea" },
    {
      key: "prediction",
      label: "Expected movement and rationale",
      type: "textarea",
    },
    {
      key: "stopConditions",
      label: "Stop conditions and guardrails",
      type: "textarea",
    },
    { key: "reviewDate", label: "Review date", type: "date" },
  ],
  agent: [
    { key: "title", label: "Agent proposal name" },
    { key: "ownerId", label: "Accountable human owner", type: "person" },
    {
      key: "taskIds",
      label: "Exact work units",
      type: "tasks",
      hint: "Every selected task must share this owner. Saving pins each task version.",
    },
    {
      key: "purpose",
      label: "Purpose of the proposed delegation",
      type: "textarea",
    },
  ],
  review: [
    { key: "title", label: "Decision / commitment" },
    { key: "ownerId", label: "Named action owner", type: "person" },
    { key: "decision", label: "Reviewed meeting decision", type: "textarea" },
    { key: "nextAction", label: "Next action", type: "textarea" },
    { key: "dueDate", label: "Due date", type: "date" },
  ],
};
export function RecordForm({
  kind,
  record,
  records,
  notice,
  preset,
  onSave,
}: {
  kind: string;
  record?: RecordRow;
  records: RecordRow[];
  notice: string;
  preset?: Record<string, unknown>;
  onSave: (data: any) => Promise<void>;
}) {
  const defs = fieldSets[kind];
  const [values, setValues] = useState<any>(() => {
    const v: any = {};
    for (const d of defs) {
      v[d.key] =
        record?.data[d.key] ??
        (d.type === "checkbox"
          ? false
          : ["evidence", "tasks", "handoffs", "lines"].includes(d.type || "")
            ? []
            : d.options?.[0] || "");
      if (d.type === "lines") v[d.key] = (v[d.key] || []).join("\n");
    }
    if (!record) {
      if (kind === "workflow") {
        v.joinPolicy = "";
        v.timeoutHours = "";
        v.maxAttempts = "";
      }
      if (kind === "engagement") {
        v.retentionDays = 30;
        v.reviewCadence = "Weekly";
        v.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        v.visibility = notice;
      }
      if (kind === "handoff") {
        v.timeoutHours = 24;
        v.maxRetries = 0;
      }
      if (kind === "request") {
        v.questions = capturePrompts.join("\n");
        v.notice = notice;
      }
      for (const d of defs)
        if (d.type === "date")
          v[d.key] = new Date(
            Date.now() + (d.key === "sourceDate" ? 0 : 14 * 86400000),
          )
            .toISOString()
            .slice(0, 10);
    }
    return record ? v : { ...v, ...preset };
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const change = (k: string, v: any) =>
    setValues((prev: any) => ({ ...prev, [k]: v }));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const d = { ...values };
          if (kind === "request" && d.type !== "confirmation") d.taskIds = [];
          for (const f of defs) {
            if (f.type === "lines")
              d[f.key] = d[f.key]
                .split("\n")
                .map((x: string) => x.trim())
                .filter(Boolean);
            if (f.type === "number")
              d[f.key] = d[f.key] === "" ? null : Number(d[f.key]);
          }
          const parsed = schemas[kind as keyof typeof schemas].safeParse(d);
          if (!parsed.success)
            throw new Error(
              parsed.error.issues
                .map((i) => i.path.join(".") + ": " + i.message)
                .join(" "),
            );
          await onSave(parsed.data);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorBox error={error} />
      <div className="form-grid">
        {defs.map((f) => {
          if (
            kind === "request" &&
            f.key === "taskIds" &&
            values.type !== "confirmation"
          )
            return null;
          const documentationOnly =
            kind === "workflow" && !!values.documentationOnly;
          const executionField = [
            "ownerId",
            "handoffIds",
            "joinPolicy",
            "timeoutHours",
            "maxAttempts",
          ].includes(f.key);
          if (documentationOnly && executionField) {
            if (f.key !== "ownerId") return null;
            return (
              <div className="notice full" key="documentation-only-note">
                This is a work description. Execution rules are not configured,
                and no case can start from it.
              </div>
            );
          }
          const refKinds: Record<string, string> = {
            person: "person",
            personOptional: "person",
            candidate: "candidate",
            metric: "metric",
            task: "task",
            intervention: "intervention",
          };
          const refKind = refKinds[f.type || ""];
          const options = refKind
            ? records.filter((r) => r.kind === refKind && r.id !== record?.id)
            : [];
          if (f.type === "checkbox")
            return (
              <label className="check full" key={f.key}>
                <input
                  type="checkbox"
                  checked={!!values[f.key]}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (
                      kind === "workflow" &&
                      f.key === "documentationOnly" &&
                      !checked
                    )
                      setValues((previous: any) => ({
                        ...previous,
                        documentationOnly: false,
                        ownerId: "",
                        handoffIds: [],
                        joinPolicy: "",
                        timeoutHours: "",
                        maxAttempts: "",
                      }));
                    else change(f.key, checked);
                  }}
                />
                <span>
                  {f.label}
                  {kind === "workflow" && f.key === "documentationOnly" && (
                    <small>
                      {values.documentationOnly
                        ? "Execution rules are kept out of this description."
                        : "Set execution rules before review."}
                    </small>
                  )}
                </span>
              </label>
            );
          return (
            <Field
              key={f.key}
              label={f.label}
              wide={[
                "textarea",
                "lines",
                "evidence",
                "tasks",
                "handoffs",
              ].includes(f.type || "")}
              hint={f.hint}
            >
              {["evidence", "tasks", "handoffs"].includes(f.type || "") ? (
                <div className="check-list">
                  {records
                    .filter((r) =>
                      f.type === "evidence"
                        ? r.kind === "evidence" && r.state === "accepted"
                        : r.kind ===
                          (f.type === "handoffs" ? "handoff" : "task"),
                    )
                    .map((r) => (
                      <label className="check" key={r.id}>
                        <input
                          type="checkbox"
                          checked={values[f.key].includes(r.id)}
                          onChange={(e) =>
                            change(
                              f.key,
                              e.target.checked
                                ? [...values[f.key], r.id]
                                : values[f.key].filter(
                                    (id: string) => id !== r.id,
                                  ),
                            )
                          }
                        />
                        <span>
                          {r.title}
                          <small>v{r.version}</small>
                        </span>
                      </label>
                    ))}
                  {!records.some((r) =>
                    f.type === "evidence"
                      ? r.kind === "evidence" && r.state === "accepted"
                      : r.kind === (f.type === "handoffs" ? "handoff" : "task"),
                  ) && (
                    <small>
                      Add{" "}
                      {f.type === "evidence"
                        ? "and accept an evidence source"
                        : f.type === "handoffs"
                          ? "a handoff contract"
                          : "a task card"}{" "}
                      first.
                    </small>
                  )}
                </div>
              ) : refKind ? (
                <select
                  value={values[f.key]}
                  required={f.type !== "personOptional"}
                  onChange={(e) => change(f.key, e.target.value)}
                >
                  <option value="">
                    {f.type === "personOptional"
                      ? "Not specified"
                      : "Choose a record"}
                  </option>
                  {options.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              ) : f.options ? (
                <select
                  value={values[f.key]}
                  required={f.key === "joinPolicy"}
                  onChange={(e) => change(f.key, e.target.value)}
                >
                  {f.key === "joinPolicy" && (
                    <option value="">Choose how paths join</option>
                  )}
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              ) : ["textarea", "lines"].includes(f.type || "") ? (
                <textarea
                  rows={f.key === "text" ? 7 : 3}
                  value={values[f.key]}
                  required={f.required !== false && f.type !== "lines"}
                  onChange={(e) => change(f.key, e.target.value)}
                />
              ) : (
                <input
                  type={f.type || "text"}
                  step={f.type === "number" ? "any" : undefined}
                  value={values[f.key]}
                  required={f.required !== false}
                  onChange={(e) => change(f.key, e.target.value)}
                />
              )}
            </Field>
          );
        })}
      </div>
      {kind === "task" && (
        <div className="notice">
          Saving creates a new, unconfirmed version. Previous confirmations
          remain in history.
        </div>
      )}
      {kind === "agent" && (
        <div className="notice">
          This creates a draft proposal. Work confirmation, authority approval,
          provisioning, and execution remain separate.
        </div>
      )}
      <div className="form-actions">
        <Button primary type="submit" disabled={busy}>
          <Save size={16} />
          {busy ? "Saving…" : record ? "Save new version" : "Save record"}
        </Button>
      </div>
    </form>
  );
}
