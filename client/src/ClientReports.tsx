import { useEffect, useState } from "react";
import type { Company, RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Button, ErrorBox, Field, Panel, Row, State } from "./ui.tsx";
import "./review-deliverables.css";
export function ClientReports({
  company,
  records,
  open,
  refresh,
}: {
  company: Company;
  records: RecordRow[];
  open: (r: RecordRow) => void;
  refresh: () => Promise<void>;
}) {
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
  }, [company.id]);
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
      ].includes(r.kind) && !["stale", "retracted"].includes(r.state),
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
  return (
    <Panel
      title="Client reports & review packets"
      subtitle="Prepare the summary, select the exact work to include, preview it, then approve that version for the named audience."
      action={
        <Button
          primary
          onClick={() => {
            if (!expanded && !selected.length) setSelected(recommended);
            setExpanded(!expanded);
          }}
        >
          {expanded ? "Close report builder" : "Prepare client report"}
        </Button>
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
              const values = Object.fromEntries(new FormData(e.currentTarget));
              const report = await api(
                `/v1/companies/${company.id}/reports`,
                "POST",
                {
                  ...values,
                  audience: String(values.audience)
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  recordIds: selected,
                  expectedRevision: company.revision,
                },
              );
              await refresh();
              setExpanded(false);
              open(report);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="review-step-strip">
            <span>
              <b>01</b> Write the client’s summary
            </span>
            <span>
              <b>02</b> Check supporting records
            </span>
            <span>
              <b>03</b> Preview and approve
            </span>
          </div>
          <p className="subtle">
            Start with the decisions your audience needs to make. The suggested
            record selection includes strategy findings, measurements and
            commitments. Add task detail when it helps explain those decisions.
          </p>
          <div className="form-grid">
            <Field label="Report title">
              <input
                name="title"
                defaultValue={`${company.name} — executive brief`}
                required
                minLength={3}
              />
            </Field>
            <Field label="Report type">
              <select name="kind">
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
                defaultValue={`Review the work and evidence within ${company.scope}.`}
              />
            </Field>
            <Field
              label="Executive summary"
              wide
              hint="Separate established facts, hypotheses and missing measurements."
            >
              <textarea
                name="summary"
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
                rows={3}
                maxLength={12000}
                placeholder="Decision needed · Why it matters · Person who decides"
              />
            </Field>
            <Field label="Next steps, owners and dates" wide>
              <textarea
                name="nextSteps"
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
                defaultValue="This review covers the agreed engagement roster and selected records. Unconfirmed work descriptions and constraint hypotheses require further review. Measured impact and system authority are not established by this report."
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
                        {group.filter((r) => selected.includes(r.id)).length} /{" "}
                        {group.length} included
                      </span>
                    </summary>
                    <div className="check-list report-record-selection">
                      {group.map((r) => (
                        <label className="check" key={r.id}>
                          <input
                            type="checkbox"
                            checked={selected.includes(r.id)}
                            disabled={
                              selected.length >= 150 && !selected.includes(r.id)
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
      {reports.map((r) => (
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
  );
}
