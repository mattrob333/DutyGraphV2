import { useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import {
  kickoffFields,
  kickoffPreparationSchema,
} from "../../shared/kickoff-preparation.ts";
import { previewRoster } from "../../shared/roster.ts";
import { Panel, Button, ErrorBox } from "./ui.tsx";
import { api } from "./api.ts";
import "./kickoff-preparation.css";

export function KickoffReturns({
  companyId,
  records,
  refresh,
  agenda,
}: {
  companyId: string;
  records: RecordRow[];
  refresh: () => Promise<void>;
  agenda: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const responses = records.filter(
    (r) => r.kind === "response" && r.data.kickoffPreparation,
  );
  if (!responses.length) return null;
  return (
    <Panel
      title="Returned kickoff preparation"
      subtitle="Review the people and leadership context, import the checked roster, then prepare the two-hour agenda."
    >
      <ErrorBox error={error} />
      {responses.map((r) => {
        const parsed = kickoffPreparationSchema.safeParse(
          r.data.kickoffPreparation,
        );
        if (!parsed.success)
          return (
            <p key={r.id}>
              This package needs review before it can be imported.
            </p>
          );
        const p = parsed.data;
        const rows = p.csv ? previewRoster(p.csv).rows : [];
        return (
          <article className="kickoff-return" key={r.id}>
            <h3>{r.title}</h3>
            <p>
              {rows.length} people · {p.executiveEmails.length} executive
              attendees · {p.participantEmails.length} pilot participants ·{" "}
              {r.data.kickoffRosterImported
                ? "Roster imported"
                : "Roster review pending"}
            </p>
            <details>
              <summary>Review team and attendee selections</summary>
              <div className="kickoff-roster-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Role / department</th>
                      <th>Reports to</th>
                      <th>Participation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.data.email}>
                        <td>
                          {row.data.name}
                          <br />
                          {row.data.email}
                        </td>
                        <td>
                          {row.data.role}
                          <br />
                          {row.data.team}
                        </td>
                        <td>{row.data.managerEmail || "Not stated"}</td>
                        <td>
                          {[
                            p.executiveEmails.includes(row.data.email) &&
                              "Executive kickoff",
                            p.participantEmails.includes(row.data.email) &&
                              "Pilot discovery",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Roster only"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            {p.rosterUnavailableReason && (
              <p>Roster follow-up: {p.rosterUnavailableReason}</p>
            )}
            <details>
              <summary>Review leadership context</summary>
              {kickoffFields.map((f) => (
                <section key={f.id}>
                  <h4>{f.title}</h4>
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {p.answers[f.id] || "Not supplied"}
                  </p>
                </section>
              ))}
            </details>
            <div className="actions">
              {!!rows.length && !r.data.kickoffRosterImported && (
                <Button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await api(
                        `/v1/companies/${companyId}/responses/${r.id}/kickoff-roster`,
                        "POST",
                        { expectedVersion: r.version },
                      );
                      await refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Confirm roster & populate org chart
                </Button>
              )}
              <Button primary onClick={agenda}>
                Prepare two-hour kickoff agenda →
              </Button>
            </div>
          </article>
        );
      })}
    </Panel>
  );
}
