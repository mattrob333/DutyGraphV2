import { useEffect, useState } from "react";
import { api } from "./api.ts";
import { KickoffPreparation } from "./KickoffPreparation.tsx";
import {
  emptyKickoffPreparation,
  kickoffPreparationSchema,
} from "../../shared/kickoff-preparation.ts";
import { Button, ErrorBox, Panel } from "./ui.tsx";

export function KickoffLink({ token, name }: { token: string; name: string }) {
  const [request, setRequest] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [message, setMessage] = useState("");
  const [value, setValue] = useState(emptyKickoffPreparation);
  useEffect(() => {
    api(`/invitations/${token}/kickoff`)
      .then((r) => {
        setRequest(r);
        try {
          const saved = localStorage.getItem(`dg-kickoff-link-${r.id}`);
          if (saved)
            setValue(kickoffPreparationSchema.parse(JSON.parse(saved)));
        } catch {
          /* Storage is optional. */
        }
      })
      .catch((e) => setError(e.message));
  }, [token]);
  if (done)
    return (
      <Panel title="Your preparation has been submitted">
        <p>
          Thank you, {name}. Your advisor can now review your team and prepare
          the executive kickoff agenda.
        </p>
        <p>You can close this page.</p>
      </Panel>
    );
  return (
    <Panel title="Prepare for your executive kickoff">
      <p>
        No account or password needed. This private link gives access only to
        this preparation request. Do not forward it.
      </p>
      <ErrorBox error={error} />
      {request && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api(`/invitations/${token}/kickoff`, "POST", {
                expectedVersion: request.version,
                acknowledged: true,
                kickoffPreparation: value,
              });
              setDone(true);
              try {
                localStorage.removeItem(`dg-kickoff-link-${request.id}`);
              } catch {
                /* Submission already succeeded. */
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>{request.notice}</p>
          {request.questions.length > 0 && (
            <details>
              <summary>Questions from your advisor</summary>
              <ul>
                {request.questions.map((q: string, i: number) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </details>
          )}
          <KickoffPreparation
            value={value}
            change={setValue}
            voiceAvailable={false}
          />
          <label className="check">
            <input type="checkbox" required />I am the intended recipient and
            approve sharing this preparation with my advisor.
          </label>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              try {
                localStorage.setItem(
                  `dg-kickoff-link-${request.id}`,
                  JSON.stringify(value),
                );
                setMessage(
                  "Draft saved on this device. Return using this link before it expires.",
                );
              } catch {
                setError(
                  "This browser cannot save drafts. Keep this page open until you submit.",
                );
              }
            }}
          >
            Save progress on this device
          </Button>
          <Button primary type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit preparation to advisor"}
          </Button>
          <p role="status">{message}</p>
          <small>
            Saving a draft does not send it. Submitting closes this request.
            Your advisor reviews the roster before importing it; attendee
            selections do not send invitations.
          </small>
        </form>
      )}
    </Panel>
  );
}
