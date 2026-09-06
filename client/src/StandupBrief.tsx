import { useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { standupQuestions } from "../../shared/standup.ts";
import { Panel, Button } from "./ui.tsx";
export function StandupBrief({
  records,
  prepare,
}: {
  records: RecordRow[];
  prepare: (preset: Record<string, unknown>) => void;
}) {
  const people = records.filter((r) => r.kind === "person"),
    [person, setPerson] = useState("");
  const selected = people.find((p) => p.id === person) || people[0];
  if (!selected) return null;
  const questions = standupQuestions(records, selected.id);
  return (
    <Panel
      title="Prepare the standup"
      subtitle="Four questions based on the current tasks and measures. These are rule-based prompts; no scheduled email or AI meeting summary runs yet."
    >
      <label className="standup-person">
        Participant
        <select
          aria-label="Standup participant"
          value={selected.id}
          onChange={(e) => setPerson(e.target.value)}
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <ol className="standup-questions">
        {questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      <Button
        onClick={() =>
          prepare({
            title: `Weekly check-in — ${selected.title.slice(0, 170)}`,
            personId: selected.id,
            type: "work",
            questions: questions.join("\n"),
            taskIds: [], // Work updates do not request exact-version task confirmation.
          })
        }
      >
        Review participant request
      </Button>
      <p className="subtle">
        Save and review the request, then send it through the existing
        invitation flow. Nothing is sent from this button.
      </p>
    </Panel>
  );
}
