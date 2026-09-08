import { useEffect, useRef, useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { TeamLink } from "./TeamLink.tsx";
import { api } from "./api.ts";
import { KickoffPreparation } from "./KickoffPreparation.tsx";
import { emptyKickoffPreparation } from "../../shared/kickoff-preparation.ts";
import { Button, ErrorBox, Badge } from "./ui.tsx";
export function EmailInvitation({
  company,
  record,
  recipient,
  recipientName,
  refresh,
}: {
  company: string;
  record: RecordRow;
  recipient: string;
  recipientName?: string;
  refresh: () => Promise<void>;
}) {
  const [jobs, setJobs] = useState<any[]>([]),
    [preview, setPreview] = useState<{ subject: string; html: string } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [formPreview, setFormPreview] = useState(false);
  const [sample, setSample] = useState(emptyKickoffPreparation);
  const [replacement, setReplacement] = useState(false);
  const latest = jobs[0];
  const accepted = latest?.state === "accepted";
  const kickoff = String(record.data.questionPlanVersion || "").startsWith(
    "discovery-contact:",
  );
  const work = record.data.type === "work";
  const sendKey = useRef(crypto.randomUUID());
  const load = () =>
    api(`/v1/companies/${company}/requests/${record.id}/emails`).then(setJobs);
  useEffect(() => {
    setPreview(null);
    setError("");
    sendKey.current = crypto.randomUUID();
    load().catch((e) => setError(e.message));
  }, [company, record.id, record.version]);
  return (
    <section className="provider-setting">
      <h3>Send this person their questions</h3>
      <p>
        Send a private seven-day link to <strong>{recipient}</strong>. A
        replacement email replaces earlier unused links.
      </p>
      <ErrorBox error={error} />
      {latest && (
        <div
          role="status"
          className="notice"
          style={
            accepted
              ? {
                  borderLeft: "4px solid #77ad8c",
                  background: "rgba(119,173,140,.12)",
                }
              : {}
          }
        >
          <strong>
            {accepted
              ? "✓ Email sent — accepted by Resend"
              : latest.state === "failed"
                ? "Latest email attempt failed"
                : "Email status needs checking"}
          </strong>
          <p>
            {accepted
              ? `Sent to ${recipient}. Open the newest email; earlier unused invitation links no longer work. Inbox delivery is not tracked by the app.`
              : latest.message}
          </p>
          <small>{new Date(latest.created_at).toLocaleString()}</small>
        </div>
      )}
      {(kickoff || work) && (
        <Button
          onClick={() => {
            setSample(emptyKickoffPreparation());
            setFormPreview(true);
          }}
        >
          Preview response form
        </Button>
      )}
      {formPreview && work && (
        <section aria-label="Work response preview" role="dialog" aria-modal="true" className="team-form-preview kickoff-page">
          <Button onClick={() => setFormPreview(false)}>
            Close form preview
          </Button>
          <TeamLink
            name={recipientName || "there"}
            previewRequest={{
              id: record.id,
              version: record.version,
              title: record.title,
              questions: record.data.questions || [],
              notice: record.data.notice,
              voiceConfigured: false,
            }}
          />
        </section>
      )}
      {formPreview && kickoff && (
        <section aria-label="Kickoff form preview" className="notice">
          <h2>Kickoff form preview</h2>
          <p>
            Advisor preview only. This uses the participant's team-upload and
            leadership-context form. Nothing entered here is saved or submitted,
            and your account stays signed in as an advisor.
          </p>
          <Button onClick={() => setFormPreview(false)}>
            Close form preview
          </Button>
          {(record.data.kickoffBusinessStreams || []).map((stream: any) => (
            <p key={stream.id}>
              <strong>
                {stream.focus === "primary"
                  ? "Primary business"
                  : "Supporting business stream"}
                :
              </strong>{" "}
              {stream.name}
            </p>
          ))}
          <KickoffPreparation value={sample} change={setSample} />
          <h3>Questions from your advisor</h3>
          <ol>
            {(record.data.questions || []).map((q: string, i: number) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
          <Button disabled>Preview only — submission disabled</Button>
          <Button onClick={() => setFormPreview(false)}>
            Close form preview
          </Button>
        </section>
      )}
      <Button
        onClick={async () => {
          setError("");
          try {
            setPreview(
              await api(
                `/v1/companies/${company}/requests/${record.id}/email-preview`,
              ),
            );
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Preview email
      </Button>
      {preview && (
        <div className="invitation-preview">
          <p>
            <strong>Subject:</strong> {preview.subject}
          </p>
          <iframe
            title="Invitation email preview"
            sandbox=""
            srcDoc={preview.html}
            style={{
              width: "100%",
              height: 540,
              border: "1px solid var(--line)",
              borderRadius: 8,
            }}
          />
          <p className="subtle">
            Preview only. The private link is created when you send the
            invitation.
          </p>
        </div>
      )}
      {accepted && (
        <label className="check-line">
          <input
            type="checkbox"
            checked={replacement}
            onChange={(e) => setReplacement(e.target.checked)}
          />{" "}
          Send a replacement invitation. This invalidates earlier unused links.
        </label>
      )}
      {["draft", "sent"].includes(record.state) && (
        <Button
          disabled={busy || !recipient || (accepted && !replacement)}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await api(
                `/v1/companies/${company}/requests/${record.id}/email`,
                "POST",
                { expectedVersion: record.version, confirmSend: true },
                sendKey.current,
              );
              sendKey.current = crypto.randomUUID();
              setJobs((previous) => [
                result,
                ...previous.filter((j) => j.id !== result.id),
              ]);
              setReplacement(false);
              try {
                await refresh();
                await load();
              } catch {
                setError(
                  "The send result is shown above, but the workspace could not refresh. Reload to check the latest status before sending again.",
                );
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? "Sending questions…"
            : accepted
              ? "Send replacement email"
              : "Send questions to this person"}
        </Button>
      )}
      {jobs.length > 1 && (
        <details>
          <summary>Previous email attempts ({jobs.length - 1})</summary>
          {jobs.slice(1).map((j) => (
            <div key={j.id}>
              <p>
                <Badge>
                  {j.state === "accepted" ? "Accepted by Resend" : j.state}
                </Badge>{" "}
                {new Date(j.created_at).toLocaleString()}
              </p>
              <p className="subtle">
                {j.message ||
                  "Attempt in progress. Refresh this record to check its result."}
              </p>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
