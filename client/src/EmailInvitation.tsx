import { useEffect, useState } from "react";
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
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = () =>
    api(`/v1/companies/${company}/requests/${record.id}/emails`).then(setJobs);
  useEffect(() => {
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
              );
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
