import { useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { Badge, Button, Panel } from "./ui.tsx";

/** Explicit selection is required; viewing or previewing a person never sends mail. */
export function TeamQuestionDelivery({
  requests,
  people,
  responseFor,
  open,
  send,
  busy,
  blocked,
  results,
}: {
  requests: RecordRow[];
  people: RecordRow[];
  responseFor: (request: RecordRow) => RecordRow | undefined;
  open: (record: RecordRow) => void;
  send: (requests: RecordRow[]) => Promise<unknown>;
  busy: boolean;
  blocked: boolean;
  results: Record<string, string>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const chosen = requests.filter(
    (r) =>
      selected.includes(r.id) &&
      !responseFor(r) &&
      ["draft", "sent"].includes(r.state),
  );
  const recipient = (r: RecordRow) =>
    people.find((p) => p.id === r.data.personId);
  return (
    <Panel
      title="Send the team their questions"
      subtitle="Choose who receives an email. Each person gets a private page to describe their work."
    >
      <p>
        {requests.filter(responseFor).length} of {requests.length} responses
        received
      </p>
      <p className="subtle">
        For a test, select only yourself. Use “Review & preview” to inspect a
        person's form without sending an email.
      </p>
      {blocked && (
        <p className="notice amber">
          Save the new question sets above before sending.
        </p>
      )}
      {requests.map((r) => {
        const person = recipient(r),
          response = responseFor(r);
        const eligible =
          !response &&
          ["draft", "sent"].includes(r.state) &&
          !!person?.data.email;
        return (
          <article key={r.id} className="journey-request">
            <div className="journey-row">
              <label className="check-line">
                <input
                  type="checkbox"
                  aria-label={`Send questions to ${person?.title || r.title}`}
                  disabled={busy || !eligible}
                  checked={eligible && selected.includes(r.id)}
                  onChange={(e) => {
                    setReviewing(false);
                    setSelected((ids) =>
                      e.target.checked
                        ? [...ids, r.id]
                        : ids.filter((id) => id !== r.id),
                    );
                  }}
                />
                <span>
                  <strong>{person?.title || r.title}</strong>
                  <span style={{ display: "block", marginTop: 4 }}>
                    {person?.data.email || "Email needed"} ·{" "}
                    {person?.data.team || ""}
                  </span>
                </span>
              </label>
              <Badge tone={response ? "sage" : "neutral"}>
                {response
                  ? "Response received"
                  : r.state === "draft"
                    ? "Ready to send"
                    : "Link ready"}
              </Badge>
            </div>
            <Button onClick={() => open(response || r)}>
              {response ? "Read response" : "Review & preview"}
            </Button>
            {results[r.id] && <p role="status">{results[r.id]}</p>}
          </article>
        );
      })}
      <div className="journey-row" style={{ marginTop: 24 }}>
        <p>{chosen.length} people selected</p>
        <Button
          primary
          disabled={busy || blocked || !chosen.length}
          onClick={() => setReviewing(true)}
        >
          Review selected recipients
        </Button>
      </div>
      {reviewing && chosen.length > 0 && (
        <section className="notice" aria-label="Confirm email recipients">
          <h3>
            Send questions to these {chosen.length === 1 ? "person" : "people"}?
          </h3>
          <ul>
            {chosen.map((r) => (
              <li key={r.id}>
                {recipient(r)?.title} —{" "}
                <strong>{recipient(r)?.data.email}</strong>
              </li>
            ))}
          </ul>
          <p>
            Only the people listed here will be sent an email. Requests already
            accepted by the email service are skipped.
          </p>
          <div className="journey-row">
            <Button disabled={busy} onClick={() => setReviewing(false)}>
              Change selection
            </Button>
            <Button
              primary
              disabled={busy || blocked}
              onClick={() => {
                void send(chosen).then(() => {
                  setReviewing(false);
                });
              }}
            >
              {busy
                ? "Sending…"
                : `Send questions to ${chosen.length} selected ${chosen.length === 1 ? "person" : "people"}`}
            </Button>
          </div>
        </section>
      )}
    </Panel>
  );
}
