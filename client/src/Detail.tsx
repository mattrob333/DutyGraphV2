import { useState } from "react";
import {
  Edit3,
  Check,
  Link,
  Download,
  History,
  AlertTriangle,
  Copy,
} from "lucide-react";
import type { RecordRow } from "../../shared/domain.ts";
import { Button, Field, ErrorBox, State, Badge, Row, date } from "./ui.tsx";
import { api, downloadExport, downloadFile } from "./api.ts";
import { fieldSets } from "./forms.tsx";
import { EmailInvitation } from "./EmailInvitation.tsx";
import { FrameworkInstructions } from "./StrategyViews.tsx";
import { ModeBadge, SoftwareChips } from "./TaskCards.tsx";
import { taskMode, stages } from "../../shared/task-presentation.ts";
import { AdvisorTranscript } from "./AdvisorTranscript.tsx";
import { WorkflowDetail } from "./WorkflowDetail.tsx";
export function Detail({
  record: r,
  company,
  records,
  edit,
  open,
  refresh,
  notify,
}: {
  record: RecordRow;
  company: string;
  records: RecordRow[];
  edit: () => void;
  open: (r: RecordRow) => void;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState(""),
    [history, setHistory] = useState<any[] | null>(null),
    [note, setNote] = useState(""),
    [value, setValue] = useState(""),
    [tested, setTested] = useState(false);
  const call = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const action = (name: string, extra: any = {}) =>
    call(async () => {
      await api(`/v1/companies/${company}/records/${r.id}/actions`, "POST", {
        expectedVersion: r.version,
        action: name,
        ...extra,
      });
      notify("Record updated.");
    });
  const person = (id: string) =>
    records.find((p) => p.id === id)?.title || "Unresolved";
  const linked = (ids: string[]) =>
    ids.map((id) => {
      const x = records.find((a) => a.id === id);
      return x ? (
        <Row
          key={id}
          title={x.title}
          detail={`${x.kind} · v${x.version}`}
          onClick={() => open(x)}
        >
          <State value={x.state} />
        </Row>
      ) : (
        <p key={id}>Source unavailable in this workspace.</p>
      );
    });
  const editable = ![
    "evidence",
    "response",
    "request",
    "export",
    "framework",
    "brief",
    "case",
  ].includes(r.kind);
  return (
    <div className="detail">
      <div className="toolbar">
        <State value={r.state} />
        <div className="actions">
          <Badge>Version {r.version}</Badge>
          {editable && (
            <Button onClick={edit}>
              <Edit3 size={15} />
              Edit record
            </Button>
          )}
        </div>
      </div>
      <ErrorBox error={error} />
      {r.kind === "framework" && (
        <FrameworkInstructions frameworkKey={r.data.key} />
      )}
      {r.kind === "brief" && (
        <>
          <dl className="details">
            <dt>Audience</dt>
            <dd>{r.data.packet.audience.join("; ")}</dd>
            <dt>Purpose</dt>
            <dd>{r.data.packet.purpose}</dd>
            <dt>Company version in this report</dt>
            <dd>{r.data.packet.sourceRevision}</dd>
            <dt>Selected records</dt>
            <dd>{r.data.packet.records.length}</dd>
          </dl>
          <h3>Executive summary</h3>
          <p className="preserve-lines">{r.data.packet.summary}</p>
          <h3>Next steps</h3>
          <p className="preserve-lines">{r.data.packet.nextSteps}</p>
          <h3>Limitations</h3>
          <p>{r.data.packet.limitations}</p>
          {r.state !== "withdrawn" && (
            <a
              className="btn"
              href={`/api/v1/companies/${company}/reports/${r.id}/preview`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Preview client document
            </a>
          )}
          {r.state === "draft" && (
            <>
              <div className="notice">
                Review the complete preview and the named audience. Approval
                applies to this exact report; changing records or audience
                requires a new draft.
              </div>
              <Field label="Why is this report ready to share?">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
              <Button
                primary
                disabled={busy || note.trim().length < 5}
                onClick={() =>
                  void call(async () => {
                    await api(
                      `/v1/companies/${company}/reports/${r.id}/review`,
                      "POST",
                      {
                        expectedVersion: r.version,
                        contentHash: r.hash,
                        decision: "approve",
                        note,
                      },
                    );
                    notify("Report reviewed for the named audience.");
                  })
                }
              >
                Approve for manual delivery
              </Button>
            </>
          )}
          {r.state === "approved" && (
            <>
              <div className="notice">
                Approved for {r.data.packet.audience.join("; ")}. Download the
                packet and deliver it through your agreed client channel.
              </div>
              <Button
                primary
                disabled={busy}
                onClick={() =>
                  void call(() =>
                    downloadFile(
                      `/api/v1/companies/${company}/reports/${r.id}/download`,
                      `DutyGraph-Client-${r.id.slice(0, 8)}.zip`,
                    ),
                  )
                }
              >
                Download client packet
              </Button>
              <Field label="Reason to withdraw this report">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
              <Button
                disabled={busy || note.trim().length < 5}
                onClick={() =>
                  void call(async () => {
                    await api(
                      `/v1/companies/${company}/reports/${r.id}/review`,
                      "POST",
                      {
                        expectedVersion: r.version,
                        contentHash: r.hash,
                        decision: "withdraw",
                        note,
                      },
                    );
                    notify(
                      "Future downloads withdrawn. Copies already delivered remain outside the workspace.",
                    );
                  })
                }
              >
                Withdraw future downloads
              </Button>
            </>
          )}
        </>
      )}
      {["workflow", "case"].includes(r.kind) && (
        <WorkflowDetail
          record={r}
          company={company}
          records={records}
          open={open}
          refresh={refresh}
        />
      )}
      {["engagement", "duty", "handoff", "outcome", "workflow"].includes(
        r.kind,
      ) && (
        <>
          <dl className="details">
            {fieldSets[r.kind]
              .filter(
                (f) =>
                  ![
                    "title",
                    "reason",
                    "taskIds",
                    "evidenceIds",
                    "handoffIds",
                  ].includes(f.key),
              )
              .map((f) => {
                const value = r.data[f.key];
                const linkedRecord = f.key.endsWith("Id")
                  ? records.find((x) => x.id === value)
                  : null;
                return (
                  <div key={f.key}>
                    <dt>{f.label}</dt>
                    <dd>
                      {f.key === "joinPolicy" ? (
                        value === "all" ? (
                          "All required incoming steps must finish."
                        ) : (
                          "Any one accepted incoming path can continue."
                        )
                      ) : linkedRecord ? (
                        <button
                          className="text-link"
                          onClick={() => open(linkedRecord)}
                        >
                          {linkedRecord.title}
                        </button>
                      ) : Array.isArray(value) ? (
                        value.join(", ") || "Not recorded"
                      ) : value === null || value === "" ? (
                        "Not recorded"
                      ) : (
                        String(value)
                      )}
                    </dd>
                  </div>
                );
              })}
          </dl>
          {r.data.handoffIds && (
            <>
              <h3>Handoff contracts</h3>
              {linked(r.data.handoffIds)}
            </>
          )}
          {r.data.taskIds && (
            <>
              <h3>Supporting tasks</h3>
              {linked(r.data.taskIds)}
            </>
          )}
          {r.data.evidenceIds && (
            <>
              <h3>Supporting evidence</h3>
              {linked(r.data.evidenceIds)}
            </>
          )}
          {r.kind === "outcome" && (
            <>
              <h3>
                Original prediction — version{" "}
                {r.data.predictionSnapshot.version}
              </h3>
              <p>{r.data.predictionSnapshot.prediction}</p>
              <p>
                Measurement snapshot: baseline{" "}
                {r.data.measurementSnapshot.baseline ?? "missing"} · target{" "}
                {r.data.measurementSnapshot.target ?? "not set"} ·{" "}
                {r.data.measurementSnapshot.observations.length} observations
              </p>
              <div className="notice">
                A reviewed falsified prediction reopens the constraint
                candidate. It does not rewrite the original intervention.
              </div>
            </>
          )}
          {r.kind === "duty" && (
            <div className="notice">
              Duty accountability is a separate claim. Reviewing this record
              does not confirm its tasks or authorize an agent.
            </div>
          )}
          {r.kind === "handoff" && (
            <div className="notice">
              This contract pins the linked task versions and describes the
              receiving check and exception path.
            </div>
          )}
          {r.state !== "reviewed" && (
            <>
              <Field label="Review rationale">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
              <Button
                primary
                disabled={busy || !note.trim()}
                onClick={() => void action("review", { note })}
              >
                Record advisor review
              </Button>
            </>
          )}
        </>
      )}
      {r.kind === "task" && (
        <>
          <div
            className={`task-detail-banner mode-${taskMode(r.data.mode).id}`}
          >
            <ModeBadge mode={r.data.mode} />
            <span>
              {stages.find((s) => s.id === r.data.valueStage)?.label ||
                "Stage not mapped"}{" "}
              · {r.data.duty}
            </span>
            <h2>{r.title}</h2>
            <p>{r.data.purpose}</p>
            <small>
              {taskMode(r.data.mode).detail}. This record does not establish an
              active deployment.
            </small>
          </div>
          <div className="ownership">
            <div>
              <span>Accountable human</span>
              <strong>{person(r.data.ownerId)}</strong>
            </div>
            <div>
              <span>Performer</span>
              <strong>{person(r.data.performerId)}</strong>
            </div>
          </div>
          <div className="task-io">
            <section>
              <small>01 / REQUIRED INPUT</small>
              <p>{r.data.inputs}</p>
            </section>
            <section>
              <small>02 / WORK PRODUCT</small>
              <p>{r.data.output}</p>
            </section>
          </div>
          <h3>Software used in this task</h3>
          <SoftwareChips systems={r.data.systems || []} />
          <p className="subtle">
            Described software. These chips do not verify credentials or an
            active connection.
          </p>
          <section className="task-instructions">
            <h3>Human work instructions</h3>
            <p className="preserve-lines">{r.data.instructions}</p>
          </section>
          {r.data.mode !== "human_only" && (
            <section className="task-prompt">
              <h3>
                AI instructions / prompt <span className="badge">Proposed</span>
              </h3>
              <p className="preserve-lines">
                {r.data.aiPrompt ||
                  "No AI prompt has been recorded. Add its input, output and limits before proposing an agent."}
              </p>
            </section>
          )}
          <dl className="details">
            {[
              ["Standing duty", "duty"],
              ["Starts when", "trigger"],
              ["Stop conditions", "stopConditions"],
            ].map(([label, key]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{r.data[key] || "Not supplied"}</dd>
              </div>
            ))}
          </dl>
          <div className="two-col">
            <section>
              <h3>Actions in the work description</h3>
              <ul>
                {r.data.allowed.map((s: string) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Not authorized</h3>
              <ul>
                {r.data.denied.map((s: string) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          </div>
          <div className="notice amber">
            <AlertTriangle size={18} />
            <span>
              <strong>Human checkpoint:</strong> {r.data.humanGate}
            </span>
          </div>
          <h3>Supporting evidence</h3>
          {linked(r.data.evidenceIds)}
          <h3>Task confirmation history</h3>
          {r.confirmations?.length ? (
            r.confirmations.map((c: any) => (
              <Row
                key={c.id}
                title={person(c.person_id)}
                detail={`v${c.version} · ${c.decision.replaceAll("_", " ")} · ${date(c.created_at)}`}
              >
                <Badge
                  tone={
                    c.version === r.version && c.accepted ? "sage" : "amber"
                  }
                >
                  {c.version !== r.version
                    ? "Historical"
                    : c.accepted
                      ? "Advisor reviewed"
                      : "Awaiting review"}
                </Badge>
              </Row>
            ))
          ) : (
            <p className="subtle">
              No authenticated participant confirmations have been received.
            </p>
          )}
          <div className="notice">
            Confirmations describe work. They do not grant application access or
            approve an agent.
          </div>
          {!r.data.reviewed && (
            <Button
              primary
              disabled={busy || r.data.conflict}
              onClick={() => void action("review")}
            >
              <Check size={16} />
              Mark advisor-reviewed
            </Button>
          )}
          {r.data.reviewed && (
            <p className="subtle">
              Create a confirmation request in Discovery for the named owner and
              performer.
            </p>
          )}
        </>
      )}
      {r.kind === "person" && (
        <>
          <dl className="details">
            <dt>Role</dt>
            <dd>{r.data.role}</dd>
            <dt>Team</dt>
            <dd>{r.data.team}</dd>
            <dt>Work email</dt>
            <dd>{r.data.email}</dd>
            <dt>Reported manager</dt>
            <dd>
              {r.data.managerId
                ? person(r.data.managerId)
                : "Unresolved / not supplied"}
            </dd>
          </dl>
          <div className="notice">
            A roster entry is a reported identity and role. It does not
            establish verified reporting lines or delegation authority.
          </div>
          <h3>Work in this engagement</h3>
          {linked(
            records
              .filter(
                (t) =>
                  t.kind === "task" &&
                  [t.data.ownerId, t.data.performerId].includes(r.id),
              )
              .map((t) => t.id),
          )}
        </>
      )}
      {r.kind === "evidence" && (
        <>
          <div className="source-meta">
            <Badge tone="blue">{r.data.type}</Badge>
            <Badge>{r.data.classification}</Badge>
            <span>
              {r.data.personId ? person(r.data.personId) : "Document source"}
            </span>
          </div>
          <p className="subtle">{r.data.locator}</p>
          <blockquote className="source-text">{r.data.text}</blockquote>
          {r.data.assetId && (
            <audio
              controls
              src={`/api/v1/companies/${company}/assets/${r.data.assetId}/content`}
            />
          )}
          <p className="subtle">
            Original source text is immutable. A correction should be added as a
            new source.
          </p>
          {r.state === "pending_review" && (
            <Button
              primary
              disabled={busy}
              onClick={() => void action("accept")}
            >
              <Check size={16} />
              Accept reviewed source
            </Button>
          )}
          {r.state !== "retracted" && (
            <details className="disclosure">
              <summary>Retract this source</summary>
              <p>
                Dependent tasks, analyses, and proposals will require a fresh
                review. The original source remains in history.
              </p>
              <Field label="Reason for retraction">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
              <Button
                disabled={busy || !note.trim()}
                onClick={() => void action("retract", { note })}
              >
                Retract and flag dependent records
              </Button>
            </details>
          )}
        </>
      )}
      {r.kind === "request" && (
        <>
          <dl className="details">
            <dt>Recipient</dt>
            <dd>{person(r.data.personId)}</dd>
            <dt>Due</dt>
            <dd>{r.data.dueDate}</dd>
            <dt>Channel</dt>
            <dd>Private participant link; send by email or share manually.</dd>
          </dl>
          <ol>
            {r.data.questions.map((q: string, i: number) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
          <div className="notice">{r.data.notice}</div>
          {r.data.taskSnapshots?.length > 0 && (
            <>
              <h3>Task versions included</h3>
              {r.data.taskSnapshots.map((s: any) => (
                <Row key={s.id} title={s.title}>
                  <Badge>v{s.version}</Badge>
                </Row>
              ))}
            </>
          )}
          {["draft", "sent"].includes(r.state) && (
            <Button
              primary
              disabled={busy}
              onClick={() =>
                void call(async () => {
                  const result = await api(
                    `/v1/companies/${company}/requests/${r.id}/issue`,
                    "POST",
                    { expectedVersion: r.version },
                  );
                  if (result.url) setLink(result.url);
                  else
                    notify(
                      result.message ||
                        "Link already issued. Create a fresh link to rotate it.",
                    );
                })
              }
            >
              <Link size={16} />
              {r.state === "sent"
                ? "Create a replacement private link"
                : "Create private participant link"}
            </Button>
          )}
          <EmailInvitation
            company={company}
            record={r}
            recipient={
              records.find((p) => p.id === r.data.personId)?.data.email || ""
            }
            refresh={refresh}
          />
          {link && (
            <div className="link-result">
              <strong>Private invitation · expires in 7 days</strong>
              <input
                aria-label="Private invitation link"
                readOnly
                value={link}
              />
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    notify("Private link copied.");
                  } catch {
                    setError("Select and copy the link above.");
                  }
                }}
              >
                <Copy size={15} />
                Copy link
              </Button>
              <p>
                The participant creates their own password. This link does not
                open the advisor workspace.
              </p>
            </div>
          )}
          {!["accepted", "withdrawn"].includes(r.state) && (
            <details className="disclosure">
              <summary>Withdraw request</summary>
              <p>
                This closes the request and revokes unused invitations. Prior
                submissions remain in history.
              </p>
              <Button disabled={busy} onClick={() => void action("withdraw")}>
                Withdraw this request
              </Button>
            </details>
          )}
        </>
      )}
      {r.kind === "response" && (
        <>
          <Badge tone="blue">Original participant submission</Badge>
          {r.data.text && (
            <blockquote className="source-text">{r.data.text}</blockquote>
          )}
          {r.data.assetId && (
            <audio
              controls
              src={`/api/v1/companies/${company}/assets/${r.data.assetId}/content`}
            />
          )}
          {r.data.assetId && (
            <AdvisorTranscript
              company={company}
              response={r}
              records={records}
              refresh={refresh}
              open={open}
            />
          )}
          <p>{r.data.note}</p>
          {Object.entries(r.data.decisions || {}).map(([id, decision]) => (
            <Row
              key={id}
              title={records.find((t) => t.id === id)?.title || "Task"}
            >
              <Badge>{String(decision).replaceAll("_", " ")}</Badge>
            </Row>
          ))}
          <div className="notice">
            Accepting a response preserves its original evidence. Only
            exact-version participant responses can confirm a current task.
          </div>
          {r.state === "returned" && (
            <Button
              primary
              disabled={busy}
              onClick={() => void action("accept")}
            >
              <Check size={16} />I reviewed the original — accept response
            </Button>
          )}
        </>
      )}
      {r.kind === "candidate" && (
        <>
          <dl className="details">
            {[
              ["Flow", "flow"],
              ["Output unit", "throughputUnit"],
              ["Pressure evidence", "pressure"],
              ["Strongest alternative", "alternative"],
              ["Global counterfactual", "counterfactual"],
              ["Next discriminating measurement", "discriminator"],
            ].map(([label, key]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{r.data[key]}</dd>
              </div>
            ))}
          </dl>
          <h3>Evidence and provenance</h3>
          {linked(r.data.evidenceIds)}
          <div className="notice amber">
            A hypothesis is a question to test. An interview, graph position, or
            reviewer approval does not prove causation.
          </div>
          <Field label="Discriminating test result and source locator">
            <textarea
              rows={4}
              value={note || r.data.discriminatorResult || ""}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={tested}
              onChange={(e) => setTested(e.target.checked)}
            />
            The leading alternative was tested.
          </label>
          <div className="actions">
            <Button
              disabled={busy || !note.trim()}
              onClick={() =>
                void action("test_diagnosis", {
                  note,
                  alternativeTested: tested,
                })
              }
            >
              Save test result
            </Button>
            <Button
              primary
              disabled={busy}
              onClick={() => void action("review_diagnosis")}
            >
              Check readiness & review diagnosis
            </Button>
          </div>
        </>
      )}
      {r.kind === "metric" && (
        <>
          <dl className="details">
            {[
              ["Decision question", "question"],
              ["Definition", "formula"],
              ["Unit", "unit"],
              ["Population", "population"],
              ["Source", "source"],
              ["Window", "window"],
              ["Guardrail", "guardrail"],
            ].map(([label, key]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{r.data[key]}</dd>
              </div>
            ))}
          </dl>
          <div className="ownership">
            <div>
              <span>Baseline</span>
              <strong>{r.data.baseline ?? "Not measured"}</strong>
            </div>
            <div>
              <span>Target</span>
              <strong>{r.data.target ?? "Not established"}</strong>
            </div>
          </div>
          {r.data.baseline === null && (
            <p className="subtle">{r.data.missingReason}</p>
          )}
          <h3>Measured observations</h3>
          {(r.data.observations || []).map((o: any) => (
            <Row
              key={o.id}
              title={`${o.value} ${r.data.unit}`}
              detail={o.source}
            >
              <span>{date(o.observedAt)}</span>
            </Row>
          ))}
          <div className="form-grid">
            <Field label="Observed value">
              <input
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </Field>
            <Field label="Source / exact observation locator">
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
          <Button
            primary
            disabled={busy || value === "" || !note}
            onClick={() =>
              void action("observe", {
                value: Number(value),
                observedAt: new Date().toISOString(),
                note,
              })
            }
          >
            Record observation
          </Button>
        </>
      )}
      {r.kind === "agent" && (
        <>
          <p className="lead">{r.data.purpose}</p>
          <div className="ownership">
            <div>
              <span>Accountable human</span>
              <strong>{person(r.data.ownerId)}</strong>
            </div>
            <div>
              <span>Runtime state</span>
              <strong>Not deployed</strong>
            </div>
          </div>
          <h3>Task versions in this proposal</h3>
          {r.data.taskBindings?.map((b: any) => {
            const t = records.find((x) => x.id === b.id);
            return (
              <Row
                key={b.id}
                title={t?.title || "Unavailable task"}
                detail={`Uses version ${b.version} · Current task version ${t?.version || "?"}`}
                onClick={t ? () => open(t) : undefined}
              >
                <Badge tone={t?.version === b.version ? "neutral" : "amber"}>
                  {t?.version === b.version
                    ? "Version current"
                    : "Task changed"}
                </Badge>
              </Row>
            );
          })}
          <div className="scope-stages">
            {["Requested", "Approved", "Provisioned", "Observed"].map(
              (label, i) => (
                <div key={label}>
                  <span>0{i + 1}</span>
                  <strong>{label}</strong>
                  <p>
                    {i === 0
                      ? "Draft task scope"
                      : i === 1
                        ? "No authority approvals"
                        : i === 2
                          ? "No target configured"
                          : "No execution evidence"}
                  </p>
                </div>
              ),
            )}
          </div>
          <div className="notice amber">
            This proposal defines the work and its limits. Customer approval,
            system access and agent execution still need to be set up.
          </div>
          <Button
            disabled={busy}
            onClick={() =>
              void call(async () => {
                const e = await api(
                  `/v1/companies/${company}/exports`,
                  "POST",
                  { kind: "agent", agentId: r.id },
                );
                await downloadExport(company, e.id);
                notify(
                  "Draft package downloaded. Ineligible or stale tasks are listed as excluded.",
                );
              })
            }
          >
            <Download size={16} />
            Export eligible draft work package
          </Button>
        </>
      )}
      {r.kind === "framework" && (
        <>
          <Badge tone="blue">{r.data.authorship}</Badge>
          <div className="source-text">{r.data.analysis}</div>
          <h3>Exact input sources</h3>
          {linked(r.data.sourceBindings.map((b: any) => b.id))}
          {r.state === "review_required" && (
            <Button
              primary
              disabled={busy}
              onClick={() => void action("review")}
            >
              I reviewed this analysis
            </Button>
          )}
        </>
      )}
      {r.kind === "intervention" && (
        <>
          <dl className="details">
            <dt>Accountable human</dt>
            <dd>{person(r.data.ownerId)}</dd>
            <dt>Smallest change</dt>
            <dd>{r.data.change}</dd>
            <dt>Prediction</dt>
            <dd>{r.data.prediction}</dd>
            <dt>Stop conditions</dt>
            <dd>{r.data.stopConditions}</dd>
            <dt>Review date</dt>
            <dd>{r.data.reviewDate}</dd>
          </dl>
          {linked([r.data.candidateId, r.data.metricId])}
          <div className="notice">
            A strategy proposal does not authorize purchases, production writes,
            or expanded agent permissions.
          </div>
        </>
      )}
      {r.kind === "review" && (
        <>
          <p className="lead">{r.data.decision}</p>
          <dl className="details">
            <dt>Next action</dt>
            <dd>{r.data.nextAction}</dd>
            <dt>Owner</dt>
            <dd>{person(r.data.ownerId)}</dd>
            <dt>Due date</dt>
            <dd>{r.data.dueDate}</dd>
          </dl>
          {r.state === "open" && (
            <Button
              primary
              disabled={busy}
              onClick={() => void action("complete")}
            >
              <Check size={16} />
              Mark commitment complete
            </Button>
          )}
        </>
      )}
      {r.kind === "export" && (
        <>
          <div className="notice">{r.data.packet.coverage}</div>
          <dl className="details">
            <dt>Audience</dt>
            <dd>{r.data.packet.audience}</dd>
            <dt>Source revision</dt>
            <dd>{r.data.packet.sourceRevision}</dd>
            <dt>Included tasks</dt>
            <dd>{r.data.packet.tasks.length}</dd>
            <dt>Excluded tasks</dt>
            <dd>{r.data.packet.excluded.length}</dd>
            <dt>Generated</dt>
            <dd>{date(r.data.packet.generatedAt)}</dd>
          </dl>
          <h3>Excluded records and reasons</h3>
          {r.data.packet.excluded.map((t: any) => (
            <Row key={t.id} title={t.title}>
              <State value={t.reason} />
            </Row>
          ))}
          <Button
            primary
            disabled={busy}
            onClick={() => void call(async () => downloadExport(company, r.id))}
          >
            <Download size={16} />
            Download frozen package
          </Button>
        </>
      )}
      <details className="disclosure">
        <summary>Version history & integrity</summary>
        <p className="hash">SHA-256 · {r.hash}</p>
        <p className="subtle">
          Content hashing detects mismatched versions. It is not a Signet
          approval signature.
        </p>
        <Button
          onClick={() =>
            void call(async () =>
              setHistory(
                await api(`/v1/companies/${company}/records/${r.id}/history`),
              ),
            )
          }
        >
          <History size={15} />
          Load version history
        </Button>
        {history?.map((v) => (
          <div className="history-entry" key={v.version}>
            <strong>
              Version {v.version} · {date(v.created_at)}
            </strong>
            <p>{v.reason}</p>
            <details>
              <summary>View exact version content</summary>
              <pre>{JSON.stringify(v.data, null, 2)}</pre>
            </details>
          </div>
        ))}
      </details>
    </div>
  );
}
