import { useEffect, useRef, useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Button, ErrorBox, Badge } from "./ui.tsx";
export function EmailInvitation({
  company,
  record,
  recipient,
  refresh,
}: {
  company: string;
  record: RecordRow;
  recipient: string;
  refresh: () => Promise<void>;
}) {
  const [jobs, setJobs] = useState<any[]>([]),
    [preview, setPreview] = useState<{ subject: string; html: string } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const sendKey = useRef(crypto.randomUUID());
  const load = () =>
    api(`/v1/companies/${company}/requests/${record.id}/emails`).then(setJobs);
  useEffect(() => {
    setPreview(null);
    sendKey.current = crypto.randomUUID();
    load().catch((e) => setError(e.message));
  }, [company, record.id, record.version]);
  return (
    <section className="provider-setting">
      <h3>Email this invitation</h3>
      <p>
        Send a private seven-day link to <strong>{recipient}</strong>. A
        replacement invitation revokes earlier unused links. Configure Resend
        and your verified sender in Workspace settings.
      </p>
      <ErrorBox error={error} />
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
      {["draft", "sent"].includes(record.state) && (
        <Button
          disabled={busy || !recipient}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api(
                `/v1/companies/${company}/requests/${record.id}/email`,
                "POST",
                { expectedVersion: record.version, confirmSend: true },
                sendKey.current,
              );
              sendKey.current = crypto.randomUUID();
              await load();
              await refresh();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Sending invitation…" : "Send invitation email"}
        </Button>
      )}
      {jobs.map((j) => (
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
    </section>
  );
}
