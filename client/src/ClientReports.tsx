import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { AuditBrief as Brief } from "../../shared/audit-brief.ts";
import type { Company, RecordRow } from "../../shared/domain.ts";
import { AuditBrief } from "./AuditBrief.tsx";
import { api } from "./api.ts";
import { Button, ErrorBox, Field, Panel, Row, State } from "./ui.tsx";
import "./review-deliverables.css";
export function ClientReports({
  company,
  records,
  open,
  refresh,
  navigate,
}: {
  company: Company;
  records: RecordRow[];
  open: (r: RecordRow) => void;
  refresh: () => Promise<void>;
  navigate: (page: string) => void;
}) {
  const [prepared, setPrepared] = useState<Brief | null>(null);
  const [draftRevision, setDraftRevision] = useState(company.revision);
  const activeCompany = useRef(company.id);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  activeCompany.current = company.id;
  const builder = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    setExpanded(false);
    setSelected([]);
    setQuery("");
    setError("");
    setPrepared(null);
  }, [company.id]);
  useEffect(() => {
    if (expanded) {
      builder.current?.scrollIntoView({ block: "start" });
      builder.current?.focus();
    }
  }, [expanded]);
  const eligible = records.filter(
    (r) =>
      [
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
      ].includes(r.kind) &&
      !["stale", "retracted", "withdrawn", "superseded"].includes(r.state),
  );
  const reports = records.filter((r) => r.kind === "brief");
  const groupNames: Record<string, string> = {
    person: "People",
    task: "Task cards",
    candidate: "Possible constraints",
    metric: "Measurements",
    intervention: "Changes to test",
    outcome: "Results",
    duty: "Duties",
    handoff: "Handoffs",
    engagement: "Engagement scope",
    agent: "Agent proposals",
    review: "Decisions",
    framework: "Frameworks",
  };
  const recommended = eligible
    .filter((r) =>
      [
        "engagement",
        "candidate",
        "metric",
        "intervention",
        "outcome",
        "review",
        "framework",
      ].includes(r.kind),
    )
    .slice(0, 150)
    .map((r) => r.id);
  const draft = prepared?.reportProposal;
  return (
    <>
      {!expanded && (
        <AuditBrief
          company={company}
          records={records}
          open={open}
          navigate={navigate}
          prepare={(brief) => {
            setPrepared(brief);
            setDraftRevision(brief.sourceRevision);
            setSelected(brief.reportProposal.recordIds);
            setError("");
            setExpanded(true);
          }}
        />
      )}
      {expanded && (
        <div className="report-builder-heading" ref={builder} tabIndex={-1}>
          <Button onClick={() => setExpanded(false)}>
            <ArrowLeft size={15} /> Back to live brief
          </Button>
          <h2>Prepare the client’s report</h2>
          <p>
            {prepared
              ? `Assembled from revision ${prepared.sourceRevision}. Refine the narrative and name the audience before review.`
              : "Write the narrative and select the evidence for this audience."}
          </p>
        </div>
      )}
      <Panel
        className="client-report-archive"
        title={expanded ? "Review the narrative" : "Client reports"}
        subtitle={
          expanded
            ? "Save a draft, inspect the printable report, then approve its exact content for the audience."
            : "Saved snapshots stay fixed as the live brief develops. Open a report to preview, review or download it."
        }
        action={
          !expanded && (
            <Button
              onClick={() => {
                setPrepared(null);
                setDraftRevision(company.revision);
                setSelected(recommended);
                setExpanded(true);
              }}
            >
              Write a custom report
            </Button>
          )
        }
      >
        <ErrorBox error={error} />
        {expanded && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setBusy(true);
              try {
                const values = Object.fromEntries(
                  new FormData(e.currentTarget),
                );
                const report = await api(
                  `/v1/companies/${company.id}/${prepared ? "audit-brief/prepare" : "reports"}`,
                  "POST",
                  {
                    ...values,
                    audience: String(values.audience)
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    recordIds: selected,
                    expectedRevision: draftRevision,
                    ...(prepared
                      ? { sourceFingerprint: prepared.sourceFingerprint }
                      : {}),
                  },
                );
                if (!mounted.current || activeCompany.current !== company.id)
                  return;
                await refresh();
                setExpanded(false);
                open(report);
              } catch (err) {
                if (mounted.current) setError((err as Error).message);
              } finally {
                if (mounted.current) setBusy(false);
              }
            }}
          >
            <div className="review-step-strip">
              <span>
                <b>01</b> Refine the summary
              </span>
              <span>
                <b>02</b> Check supporting records
              </span>
              <span>
                <b>03</b> Preview and approve
              </span>
            </div>
            <p className="subtle">
              Start with the decisions your audience needs to make. The
              suggested record selection includes strategy findings,
              measurements and commitments. Add task detail when it helps
              explain those decisions.
            </p>
            <div className="form-grid">
              <Field label="Report title">
                <input
                  name="title"
                  defaultValue={
                    draft?.title || `${company.name} — executive brief`
                  }
                  required
                  minLength={3}
                />
              </Field>
              <Field label="Report type">
                <select name="kind" defaultValue={draft?.kind || "executive"}>
                  <option value="executive">Executive brief</option>
                  <option value="weekly">Weekly review brief</option>
                  <option value="audit">Audit review packet</option>
                </select>
              </Field>
              <Field
                label="Named audience (one person or group per line)"
                wide
                hint="This audience is bound to the report review. The package is downloaded for manual delivery."
              >
                <textarea
                  name="audience"
                  required
                  placeholder={"Executive sponsor\nNamed client review team"}
                />
              </Field>
              <Field label="Purpose" wide>
                <textarea
                  name="purpose"
                  required
                  defaultValue={
                    draft?.purpose ||
                    `Review the work and evidence within ${company.scope}.`
                  }
                />
              </Field>
              <Field
                label="Executive summary"
                wide
                hint="Separate established facts, hypotheses and missing measurements."
              >
                <textarea
                  name="summary"
                  defaultValue={draft?.summary || ""}
                  required
                  minLength={20}
                  maxLength={12000}
                  rows={5}
                  placeholder="What did we learn? What limits progress? Which finding needs a decision? Include what is still uncertain."
                />
              </Field>
              <Field label="Decisions for the client" wide>
                <textarea
                  name="decisions"
                  defaultValue={draft?.decisions || ""}
                  rows={3}
                  maxLength={12000}
                  placeholder="Decision needed · Why it matters · Person who decides"
                />
              </Field>
              <Field label="Next steps, owners and dates" wide>
                <textarea
                  name="nextSteps"
                  defaultValue={draft?.nextSteps || ""}
                  required
                  minLength={5}
                  maxLength={12000}
                  rows={3}
                  placeholder="Next action · Accountable owner · Due date · How we will check the result"
                />
              </Field>
              <Field label="Scope and limitations" wide>
                <textarea
                  name="limitations"
                  required
                  minLength={5}
                  defaultValue={
                    draft?.limitations ||
                    "This review covers the agreed engagement roster and selected records. Unconfirmed work descriptions and constraint hypotheses require further review. Measured impact and system authority are not established by this report."
                  }
                  rows={4}
                />
              </Field>
            </div>
            <Field
              label="Records to include"
              wide
              hint="Raw source text, recordings, private participant responses and invitation tokens are excluded."
            >
              <div className="report-selection-tools">
                <input
                  aria-label="Find a report record"
                  placeholder="Find a task, person or finding…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button onClick={() => setSelected(recommended)}>
                  Use executive selection
                </Button>
                <Button onClick={() => setSelected([])}>Clear selection</Button>
              </div>
              <div className="report-selection-groups">
                {Object.entries(groupNames).map(([kind, label]) => {
                  const group = eligible.filter(
                    (r) =>
                      r.kind === kind &&
                      r.title.toLowerCase().includes(query.toLowerCase()),
                  );
                  if (!group.length) return null;
                  return (
                    <details key={kind} open={query ? true : undefined}>
                      <summary>
                        {label}
                        <span>
                          {group.filter((r) => selected.includes(r.id)).length}{" "}
                          / {group.length} included
                        </span>
                      </summary>
                      <div className="check-list report-record-selection">
                        {group.map((r) => (
                          <label className="check" key={r.id}>
                            <input
                              type="checkbox"
                              checked={selected.includes(r.id)}
                              disabled={
                                selected.length >= 150 &&
                                !selected.includes(r.id)
                              }
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, r.id].slice(0, 150)
                                    : selected.filter((id) => id !== r.id),
                                )
                              }
                            />
                            <span>
                              {r.title}
                              <small>
                                Version {r.version} ·{" "}
                                {r.state.replaceAll("_", " ")}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>
                  );
                })}
                {!eligible.some((r) =>
                  r.title.toLowerCase().includes(query.toLowerCase()),
                ) && <p className="subtle">No records match this search.</p>}
              </div>
            </Field>
            <div className="form-actions">
              <span className="subtle">
                {selected.length} of 150 records included · Draft first; review
                before download
              </span>
              <Button primary type="submit" disabled={busy}>
                {busy ? "Preparing…" : "Save report draft"}
              </Button>
            </div>
          </form>
        )}
        {!expanded &&
          reports.map((r) => (
            <Row
              key={r.id}
              title={r.title}
              detail={`${r.data.packet.kind} · ${r.data.packet.audience.join("; ")} · revision ${r.data.packet.sourceRevision}`}
              onClick={() => open(r)}
            >
              <State value={r.state} />
            </Row>
          ))}
        {!reports.length && !expanded && (
          <p className="subtle">
            No client reports prepared yet. A saved report includes a printable
            document, a record summary and data files.
          </p>
        )}
      </Panel>
    </>
  );
}
