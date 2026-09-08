import { useEffect, useState } from "react";
import { api } from "./api.ts";
import { Button, ErrorBox, Panel } from "./ui.tsx";
import { KickoffVoice } from "./KickoffVoice.tsx";
import "./kickoff-link.css";
import "./team-link.css";

export type TeamRequest = {
  id: string;
  version: number;
  title: string;
  questions: string[];
  notice?: string;
  voiceConfigured?: boolean;
};

// The preview uses the same fields, but cannot read a link, save a draft, or submit.
export function TeamLink({
  token,
  name,
  previewRequest,
}: {
  token?: string;
  name: string;
  previewRequest?: TeamRequest;
}) {
  const preview = !!previewRequest;
  const [request, setRequest] = useState<TeamRequest | null>(
    previewRequest || null,
  );
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pendingAudio, setPendingAudio] = useState(false);
  useEffect(() => {
    if (preview || !token) return;
    let active = true;
    api(`/invitations/${token}/team`)
      .then((r) => {
        if (!active) return;
        setRequest(r);
        try {
          setText(localStorage.getItem(`dg-team-link-${r.id}`) || "");
        } catch {
          /* Draft storage is optional. */
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token, preview]);
  if (done)
    return (
      <Panel title="Your response has been sent">
        <p>
          Thank you, {name}. Your advisor can now review your notes about your
          work.
        </p>
        <p>
          Your response does not change your duties or give anyone permission to
          act. You can close this page.
        </p>
      </Panel>
    );
  return (
    <Panel title={request?.title || "Tell us about your work"}>
      <div className="team-link-intro">
        <span className="kickoff-eyebrow">YOUR WORK, IN YOUR WORDS</span>
        <h2>Hello, {name}.</h2>
        <p>
          Help your advisor understand what you do and where work slows down.
          Use a recent example. Tell us what happens, even when it differs from
          the usual process.
        </p>
        <p>
          {preview
            ? "Preview only. You can try the fields. Nothing will be saved or sent."
            : "No account or password needed. This private link opens only your questions. Do not share it."}
        </p>
      </div>
      <ErrorBox error={error} />
      {!request && !error && <p role="status">Loading your questions…</p>}
      {request && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (preview || !token || busy) return;
            setBusy(true);
            setError("");
            try {
              await api(`/invitations/${token}/team`, "POST", {
                expectedVersion: request.version,
                acknowledged: true,
                text,
              });
              setDone(true);
              try {
                localStorage.removeItem(`dg-team-link-${request.id}`);
              } catch {
                /* Already saved on server. */
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="team-link-grid">
            <section aria-label="Your questions">
              <h2>Use these questions as a guide</h2>
              <p>
                Answer what you know. Say “I do not know” where needed. Keep
                separate types of work separate. You can answer in any order.
              </p>
              <ol className="team-link-questions">
                {request.questions.map((question, i) => (
                  <li key={i}>{question}</li>
                ))}
              </ol>
            </section>
            <section aria-label="Your response">
              <label htmlFor="team-response">
                <strong>Your notes</strong>
              </label>
              <p>
                Type or speak into one space. Review your words before you send
                them.
              </p>
              <textarea
                id="team-response"
                rows={18}
                required
                maxLength={100000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="A recent example of my work was…"
              />
              {!preview && token && (
                <KickoffVoice
                  token={token}
                  endpoint={`/api/invitations/${token}/team/transcribe`}
                  enabled={!!request.voiceConfigured}
                  busy={busy}
                  onPending={setPendingAudio}
                  append={(value) => {
                    const combined = [text, value].filter(Boolean).join("\n\n");
                    if (combined.length > 100000)
                      throw new Error(
                        "Your notes are too long. Download the recording and shorten your notes before trying again.",
                      );
                    setText(combined);
                  }}
                />
              )}
              {preview && (
                <p className="muted">
                  The live form also offers voice recording when your advisor
                  has set up transcription.
                </p>
              )}
            </section>
          </div>
          <div className="team-link-send">
            <p>
              Only share information approved for this work. Leave out
              passwords, access keys and private customer details. Your advisor
              reviews your response before using it to describe tasks.
            </p>
            <label className="check">
              <input type="checkbox" required disabled={preview} />I am the
              intended person. I agree to share these notes with my advisor.
            </label>
            <div className="actions">
              <Button
                type="button"
                disabled={busy || preview}
                onClick={() => {
                  try {
                    localStorage.setItem(`dg-team-link-${request.id}`, text);
                    setMessage(
                      "Draft saved on this device. It has not been sent.",
                    );
                  } catch {
                    setError(
                      "This browser cannot save a draft. Keep this page open until you send your response.",
                    );
                  }
                }}
              >
                Save draft on this device
              </Button>
              <Button
                primary
                type="submit"
                disabled={busy || pendingAudio || preview}
              >
                {busy ? "Sending…" : "Send my response"}
              </Button>
            </div>
            <p role="status">{message}</p>
            <small>
              Sending closes this request. Your notes remain your account of the
              work; they do not grant authority or change company policy.
            </small>
          </div>
        </form>
      )}
    </Panel>
  );
}
