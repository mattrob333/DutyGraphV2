import { KickoffVoice } from "./KickoffVoice.tsx";
import { briefCategories } from "../../shared/business-brief.ts";
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
          <section
            className="kickoff-research"
            aria-label="Public company research"
          >
            <div className="kickoff-eyebrow">01 / CHECK OUR UNDERSTANDING</div>
            <h2>{request.publicContext?.name || "Your company"}</h2>
            <p>{request.publicContext?.industry}</p>
            <p className="kickoff-summary">{request.publicContext?.summary}</p>
            {request.publicContext?.website && (
              <a
                href={request.publicContext.website}
                target="_blank"
                rel="noreferrer"
              >
                Company website ↗
              </a>
            )}
            <p className="subtle">
              Public research draft
              {request.publicContext?.asOf
                ? ` · ${new Date(request.publicContext.asOf).toLocaleDateString()}`
                : ""}
              . Reported means a source states it; inferred means our
              interpretation. Please correct both.
            </p>
            <div className="kickoff-facts">
              {Object.entries(briefCategories).map(([key, label]) => (
                <article key={key}>
                  <h3>{label}</h3>
                  {(request.publicContext?.facts || []).filter(
                    (f: any) => f.category === key,
                  ).length ? (
                    (request.publicContext.facts || [])
                      .filter((f: any) => f.category === key)
                      .map((f: any, i: number) => (
                        <div key={i}>
                          <span className="kickoff-basis">{f.basis}</span>
                          <h4>{f.label}</h4>
                          <p>{f.value}</p>
                          {f.asOf && <small>{f.asOf}</small>}
                          {f.citations?.length > 0 && (
                            <details>
                              <summary>View sources</summary>
                              {f.citations.map((c: any, j: number) => (
                                <p key={j}>
                                  {c.url ? (
                                    <a
                                      href={c.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {c.title}
                                    </a>
                                  ) : (
                                    c.title
                                  )}
                                  <br />
                                  <small>{c.quote}</small>
                                </p>
                              ))}
                            </details>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="subtle">
                      Not established in the public research. Tell us what you
                      know.
                    </p>
                  )}
                </article>
              ))}
            </div>
            <div className="kickoff-streams">
              {request.publicContext?.streams?.map((stream: any, i: number) => (
                <details key={stream.id || i} open={i === 0}>
                  <summary>
                    <strong>{stream.name}</strong>
                    <span>
                      {i === 0
                        ? "Primary business stream"
                        : "Supporting business stream"}
                    </span>
                  </summary>
                  <ol>
                    {stream.stages?.map((stage: any, j: number) => (
                      <li key={j}>
                        <small>{j + 1}</small>
                        {stage.label || stage.name || stage.title || "Stage"}
                      </li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>
          </section>
          <div className="kickoff-eyebrow">02 / BRING THE RIGHT PEOPLE</div>
          <KickoffPreparation
            value={value}
            change={setValue}
            voiceAvailable={false}
            rosterOnly
          />
          <section className="kickoff-response">
            <div>
              <div className="kickoff-eyebrow">
                03 / TELL US WHAT TO CORRECT
              </div>
              <h2>Your perspective</h2>
              <p>
                Answer to the best of your ability. You may be coordinating on
                behalf of the leadership team — you do not need to know
                everything. Leave unknowns for the two-hour kickoff.
              </p>
              <ul>
                <li>
                  What did we get right or wrong about your company, services,
                  customers and team size?
                </li>
                <li>
                  Do the primary and supporting business streams and stages
                  reflect how work happens? What is missing or different?
                </li>
                <li>
                  Which departments do you have, what do they do, and who leads
                  them?
                </li>
                <li>
                  Who should attend the executive kickoff? Confirm the date,
                  time zone and meeting location or link.
                </li>
                <li>
                  What else would help us prepare? Tell us what needs
                  confirmation and who can help. Detailed vision, goals and KPIs
                  can wait for the executive team.
                </li>
              </ul>
              {request.questions.length > 0 && (
                <details>
                  <summary>
                    Additional questions from your advisor — optional
                  </summary>
                  <ul>
                    {request.questions.map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </details>
              )}
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
                rows={14}
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
        </form>
      )}
    </Panel>
  );
}
