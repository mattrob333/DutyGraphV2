import { useState } from "react";
import "./task-review-card.css";
const fields: Record<string, string> = {
  title: "Task name",
  duty: "Responsibility",
  inputs: "Inputs · what I receive and from whom",
  instructions: "Actions · how I do the work",
  output: "Output · what complete looks like",
  handoff: "Handoff · who depends on my result",
  software: "Software I use",
};
export function TaskReviewCard({
  card,
  person,
  disabled = false,
  onChange,
}: {
  card: any;
  person?: string;
  disabled?: boolean;
  onChange: (c: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <article className="task-review-card">
      <header>
        <small>MY WORK · TASK DESCRIPTION</small>
        <h3>{card.title}</h3>
        {person && <p>{person}</p>}
        <strong aria-live="polite">
          {card.decision === "correct"
            ? "Approved — matches my understanding"
            : "Ready for your review"}
        </strong>
      </header>
      {editing ? (
        <div className="task-review-fields">
          {Object.entries(fields).map(([key, label]) => (
            <label key={key}>
              {label}
              <textarea
                aria-label={label}
                rows={key === "instructions" ? 5 : 2}
                maxLength={
                  key === "title" || key === "duty"
                    ? 200
                    : key === "software"
                      ? 1000
                      : 3000
                }
                value={card[key] || ""}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...card, [key]: e.target.value, decision: "" })
                }
              />
            </label>
          ))}
        </div>
      ) : (
        <dl>
          {Object.entries(fields)
            .filter(([k]) => k !== "title")
            .map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {key === "instructions" && card[key] ? (
                    <ol>
                      {card[key]
                        .split(/\n+/)
                        .filter(Boolean)
                        .map((s: string, i: number) => (
                          <li key={i}>{s.replace(/^\d+[.)]\s*/, "")}</li>
                        ))}
                    </ol>
                  ) : (
                    card[key] ||
                    "Not stated in your account — review with your advisor."
                  )}
                </dd>
              </div>
            ))}
        </dl>
      )}
      <footer>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (editing) setEditing(false);
            else onChange({ ...card, decision: "correct" });
          }}
        >
          {editing ? "Save edits and review" : "Approve"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setEditing(!editing);
            if (!editing) onChange({ ...card, decision: "" });
          }}
        >
          {editing ? "Close editor" : "Edit"}
        </button>
      </footer>
    </article>
  );
}
