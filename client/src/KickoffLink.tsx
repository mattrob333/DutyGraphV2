import { KickoffVoice } from "./KickoffVoice.tsx";
import { KickoffSnapshot } from "./KickoffSnapshot.tsx";
import { kickoffContactPrompts } from "../../shared/kickoff-prompts.ts";
import "./kickoff-link.css";
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
  const [capturePending, setCapturePending] = useState(false);
  const [value, setValue] = useState(emptyKickoffPreparation);
  useEffect(() => {
    api(`/invitations/${token}/kickoff`)
      .then((r) => {
        setRequest(r);
        try {
          const saved = localStorage.getItem(`dg-kickoff-link-${r.id}`);
          if (saved) {
            const draft = kickoffPreparationSchema.parse(JSON.parse(saved));
            setValue({
              ...draft,
              responseText:
                draft.responseText ||
                Object.entries(draft.answers)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n\n"),
            });
          }
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
    <Panel title="A clearer picture before we meet">
      <p>
        Scan your company snapshot, correct what we found, and share what you
        know. No account needed. Keep this link private.
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
          <KickoffSnapshot context={request.publicContext} />
          <section className="kickoff-response">
            <div>
              <div className="kickoff-eyebrow">02 / ADD WHAT YOU KNOW</div>
              <h2>Help us see how the business works.</h2>
              <p>
                Use these eight prompts as a guide for one quick brain dump.
                Answer only what you know; corrections and real examples matter
                most. We will ask the executive team about vision and detailed
                goals at kickoff.
              </p>
              <ol className="kickoff-prompts">
                {kickoffContactPrompts.map((q, i) => (
                  <li key={q.title}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{q.title}</h3>
                      <p>{q.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <label htmlFor="kickoff-response">
                <strong>Your notes and corrections</strong>
              </label>
              <p>
                Type here, use Wispr Flow, or record your voice below. One
                response is enough; follow the prompts in any order.
              </p>
              <textarea
                id="kickoff-response"
                required
                rows={12}
                maxLength={30000}
                value={value.responseText || ""}
                onChange={(e) =>
                  setValue({ ...value, responseText: e.target.value })
                }
                placeholder="Here is what you got right, what I would change, and what our leadership team can confirm…"
              />
              <KickoffVoice
                onPending={setCapturePending}
                token={token}
                enabled={!!request.voiceConfigured}
                busy={busy}
                append={(text) => {
                  const combined = [value.responseText, text]
                    .filter(Boolean)
                    .join("\n\n");
                  if (combined.length > 30000)
                    throw new Error(
                      "This transcript exceeds the response limit. Download the recording and shorten your notes before retrying.",
                    );
                  setValue((current) => ({
                    ...current,
                    responseText: combined,
                  }));
                }}
              />
            </div>
          </section>
          <section className="kickoff-team-section">
            <div className="kickoff-eyebrow">
              03 / PEOPLE FOR THE CONVERSATION
            </div>
            <KickoffPreparation
              value={value}
              change={setValue}
              voiceAvailable={false}
              rosterOnly
            />
          </section>
          <div className="kickoff-submit">
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
            <Button primary type="submit" disabled={busy || capturePending}>
              {busy ? "Submitting…" : "Submit preparation to advisor"}
            </Button>
            <p role="status">{message}</p>
            <small>
              Saving a draft does not send it. Submitting closes this request.
              Your advisor reviews the roster before importing it; attendee
              selections do not send invitations.
            </small>
          </div>
        </form>
      )}
    </Panel>
  );
}
