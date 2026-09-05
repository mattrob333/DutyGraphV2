import { useState } from "react";
import type { Company, RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Button, ErrorBox, Field, Panel, Row, State } from "./ui.tsx";
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
    [selected, setSelected] = useState<string[]>([]);
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
  return (
    <Panel
      title="Client reports & review packets"
      subtitle="Prepare the summary, select the exact work to include, preview it, then approve that version for the named audience."
      action={
        <Button primary onClick={() => setExpanded(!expanded)}>
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
                placeholder="Executive sponsor\nNamed client review team"
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
              <textarea name="summary" required minLength={20} rows={5} />
            </Field>
            <Field label="Decisions for the client" wide>
              <textarea name="decisions" rows={3} />
            </Field>
            <Field label="Next steps, owners and dates" wide>
              <textarea name="nextSteps" required minLength={5} rows={3} />
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
            <div className="check-list report-record-selection">
              {eligible.map((r) => (
                <label className="check" key={r.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, r.id]
                          : selected.filter((id) => id !== r.id),
                      )
                    }
                  />
                  <span>
                    {r.title}
                    <small>
                      {r.kind} · v{r.version} · {r.state.replaceAll("_", " ")}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <div className="form-actions">
            <span className="subtle">{selected.length} records selected</span>
            <Button primary type="submit" disabled={busy}>
              {busy ? "Preparing…" : "Freeze draft for review"}
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
          No client reports prepared yet. A frozen report includes a printable
          HTML document, a record register, structured data and checksums.
        </p>
      )}
    </Panel>
  );
}
