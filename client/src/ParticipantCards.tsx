import { TaskReviewCard } from "./TaskReviewCard.tsx";
import { useState, useEffect } from "react";
import { api } from "./api.ts";
import { Button, Panel, Field, ErrorBox } from "./ui.tsx";
export function ParticipantCards({
  request,
  person,
  text,
  disabled,
  onChange,
}: {
  request: any;
  person?: string;
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
        <TaskReviewCard
          key={index}
          card={card}
          person={person}
          disabled={disabled}
          onChange={(next) =>
            update(cards.map((c, i) => (i === index ? next : c)))
          }
        />
      ))}
      {cards.length > 0 && (
        <p>
          {cards.filter((c) => c.decision).length} of {cards.length} cards
          reviewed. Approve your understanding, or flag a card for your advisor.
        </p>
      )}
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
