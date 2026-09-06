import { useState, useEffect } from "react";
import { api } from "./api.ts";
import { Button, Panel, Field, ErrorBox } from "./ui.tsx";
export function ParticipantCards({
  request,
  text,
  disabled,
  onChange,
}: {
  request: any;
  text: string;
  disabled: boolean;
  onChange: (cards: any[] | null) => void;
}) {
  const storageKey = "dg-task-review:" + request.id;
  const [cards, setCards] = useState<any[]>(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
        return saved?.text === text ? saved.cards : [];
      } catch {
        return [];
      }
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [gaps, setGaps] = useState<string[]>([]),
    [fallback, setFallback] = useState(false);
  useEffect(() => {
    onChange(cards.length && cards.every((c) => c.decision) ? cards : null);
  }, []);
  function update(next: any[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ text, cards: next }));
    } catch {}
    setCards(next);
    onChange(next.length && next.every((c) => c.decision) ? next : null);
  }
  return (
    <Panel
      title="Check what we understood"
      subtitle="Confirm the description of your work. This does not approve company policy or give an agent permission."
    >
      <p>
        Prefer to talk? A real example helps us capture the steps, exceptions,
        and frustrations. You can type instead.
      </p>
      <ErrorBox error={error} />
      {!cards.length && (
        <Button
          disabled={disabled || busy || text.trim().length < 20}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const r = await api<any>(
                `/v1/participant/requests/${request.id}/task-draft`,
                "POST",
                { expectedVersion: request.version, text, acknowledged: true },
              );
              setGaps(r.gaps);
              update(r.cards.map((c: any) => ({ ...c, decision: "" })));
              setFallback(false);
              if (!r.cards.length)
                setError(
                  "No clear tasks were found. Add a recent example, or send your answer for advisor review.",
                );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Creating your task cards…" : "Create my task cards"}
        </Button>
      )}
      {!cards.length && (
        <p className="subtle">
          For a recording, create and check its transcript first. Your original
          answer stays saved while AI prepares the cards.
        </p>
      )}
      {cards.map((card, index) => (
        <article key={index} className="participant-task-card">
          <h3>Task {index + 1}</h3>
          {(
            [
              "title",
              "duty",
              "inputs",
              "instructions",
              "output",
              "handoff",
              "software",
            ] as const
          ).map((field) => (
            <Field
              key={field}
              label={
                {
                  title: "Task name",
                  duty: "Responsibility",
                  inputs: "What I receive",
                  instructions: "What I do",
                  output: "What I produce",
                  handoff: "Where the output goes",
                  software: "Software I use",
                }[field]
              }
            >
              <textarea
                disabled={disabled}
                maxLength={
                  field === "title" || field === "duty"
                    ? 200
                    : field === "software"
                      ? 1000
                      : 3000
                }
                value={card[field]}
                onChange={(e) =>
                  update(
                    cards.map((c, i) =>
                      i === index
                        ? { ...c, [field]: e.target.value, decision: "" }
                        : c,
                    ),
                  )
                }
              />
            </Field>
          ))}
          <Field label="Does this describe your work?">
            <select
              disabled={disabled}
              value={card.decision}
              onChange={(e) =>
                update(
                  cards.map((c, i) =>
                    i === index ? { ...c, decision: e.target.value } : c,
                  ),
                )
              }
            >
              <option value="">Choose after reviewing</option>
              <option value="correct">This matches my understanding</option>
              <option value="not_mine">Remove — this is not my task</option>
              <option value="unsure">I'm not sure — ask the advisor</option>
            </select>
          </Field>
        </article>
      ))}
      {gaps.length > 0 && <p>Still unclear: {gaps.join(" ")}</p>}
      {!cards.length && (
        <label>
          <input
            type="checkbox"
            disabled={disabled || busy}
            checked={fallback}
            onChange={(e) => {
              setFallback(e.target.checked);
              onChange(e.target.checked ? [] : null);
            }}
          />{" "}
          Send my answer for advisor review without task cards.
        </label>
      )}
    </Panel>
  );
}
