import { useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { standupQuestions } from "../../shared/standup.ts";
import { Panel, Button, Badge } from "./ui.tsx";
import "./review-deliverables.css";
export function StandupBrief({
  records,
  prepare,
}: {
  records: RecordRow[];
  prepare: (preset: Record<string, unknown>) => void;
}) {
  const people = records.filter((r) => r.kind === "person"),
    [person, setPerson] = useState(""),
    [dueDate, setDueDate] = useState(
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    ),
    [edited, setEdited] = useState<Record<string, string[]>>({});
  const selected = people.find((p) => p.id === person) || people[0];
  if (!selected)
    return (
      <Panel title="Prepare your first weekly review">
        <p>
          Add your engagement roster in Discovery. Then prepare a short update
          for each person before the meeting.
        </p>
      </Panel>
    );
  const questions =
    edited[selected.id] || standupQuestions(records, selected.id);
  const requests = records.filter(
    (r) =>
      r.kind === "request" &&
      (String(r.data.questionPlanVersion || "").startsWith("weekly-checkin:") ||
        r.title.startsWith("Weekly check-in")),
  );
  const latest = requests
    .filter((r) => r.data.personId === selected.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const draftCount = requests.filter((r) => r.state === "draft").length;
  const received = requests.filter((r) =>
    ["returned", "accepted"].includes(r.state),
  ).length;
  return (
    <Panel
      title="Ask for updates before the meeting"
      subtitle="Prepare a short update for each person. Use the replies to spend your meeting time on decisions and blocked work."
    >
      <div className="review-step-strip">
        <span>
          <b>01</b> Request an update
        </span>
        <span>
          <b>02</b> Discuss what changed
        </span>
        <span>
          <b>03</b> Record owners and next steps
        </span>
      </div>
      <div className="review-counts">
        <Badge>
          {draftCount} {draftCount === 1 ? "draft" : "drafts"}
        </Badge>
        <Badge tone="blue">
          {requests.filter((r) => r.state === "sent").length} awaiting a reply
        </Badge>
        <Badge tone="sage">{received} returned</Badge>
      </div>
      <div className="form-grid">
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
        <label className="standup-person">
          Response due
          <input
            type="date"
            aria-label="Standup response due"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
      </div>
      <p className="subtle">
        {[selected.data.role, selected.data.team].filter(Boolean).join(" · ")}
        {latest
          ? ` · Latest update: ${latest.state.replaceAll("_", " ")}`
          : " · No update requested yet"}
      </p>
      <ol className="standup-questions">
        {questions.map((q, index) => (
          <li key={index}>
            <textarea
              aria-label={`Standup question ${index + 1}`}
              value={q}
              rows={2}
              maxLength={200}
              onChange={(e) =>
                setEdited({
                  ...edited,
                  [selected.id]: questions.map((old, i) =>
                    i === index ? e.target.value : old,
                  ),
                })
              }
            />
          </li>
        ))}
      </ol>
      <Button
        disabled={!dueDate || questions.some((q) => !q.trim())}
        onClick={() =>
          prepare({
            title: `Weekly check-in — ${selected.title.slice(0, 170)}`,
            personId: selected.id,
            type: "work",
            dueDate,
            questionPlanVersion: "weekly-checkin:v1",
            questions: questions.join("\n"),
            taskIds: [], // Work updates do not request exact-version task confirmation.
          })
        }
      >
        Prepare this person’s update request
      </Button>
      <p className="subtle">
        Questions use this person’s current work and measurements. You can edit
        them here. Review the saved request and its email before sending.
        Updates are requested manually; no recurring schedule is active.
      </p>
    </Panel>
  );
}
