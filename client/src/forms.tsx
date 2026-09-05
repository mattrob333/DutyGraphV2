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
    { key: "duty", label: "Standing duty" },
    { key: "ownerId", label: "Accountable human owner", type: "person" },
    { key: "performerId", label: "Person doing this work", type: "person" },
    { key: "purpose", label: "Purpose", type: "textarea" },
    { key: "trigger", label: "Starts when", type: "textarea" },
    { key: "inputs", label: "Required inputs", type: "textarea" },
    { key: "instructions", label: "Steps / instructions", type: "textarea" },
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
  onSave,
}: {
  kind: string;
  record?: RecordRow;
  records: RecordRow[];
  notice: string;
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
          : ["evidence", "tasks", "lines"].includes(d.type || "")
            ? []
            : d.options?.[0] || "");
      if (d.type === "lines") v[d.key] = (v[d.key] || []).join("\n");
    }
    if (!record) {
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
    return v;
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
          const refKinds: Record<string, string> = {
            person: "person",
            personOptional: "person",
            candidate: "candidate",
            metric: "metric",
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
                  onChange={(e) => change(f.key, e.target.checked)}
                />
                {f.label}
              </label>
            );
          return (
            <Field
              key={f.key}
              label={f.label}
              wide={["textarea", "lines", "evidence", "tasks"].includes(
                f.type || "",
              )}
              hint={f.hint}
            >
              {["evidence", "tasks"].includes(f.type || "") ? (
                <div className="check-list">
                  {records
                    .filter((r) =>
                      f.type === "evidence"
                        ? r.kind === "evidence" && r.state === "accepted"
                        : r.kind === "task",
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
                      : r.kind === "task",
                  ) && (
                    <small>
                      Add{" "}
                      {f.type === "evidence"
                        ? "and accept an evidence source"
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
                  onChange={(e) => change(f.key, e.target.value)}
                >
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
