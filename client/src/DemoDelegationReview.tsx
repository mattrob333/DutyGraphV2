import { useState } from "react";
import {
  candidateTasks,
  type DemoTask,
} from "../../shared/discovery-demo-tasks.ts";
export function DemoDelegationReview({
  cards,
  person,
}: {
  cards: DemoTask[];
  person: { name: string; role: string; team: string };
}) {
  const eligible = candidateTasks(cards);
  const [selected, setSelected] = useState<string[]>([]),
    [manifest, setManifest] = useState<DemoTask[] | null>(null);
  return (
    <section className="dd-delegation">
      <h3>From discovered work to AI candidates</h3>
      <p>
        {cards.length} task descriptions returned ·{" "}
        {cards.filter((c) => c.decision === "correct").length} approved as
        understood · {eligible.length} unchanged sample tasks suggested for AI
        assistance.
      </p>
      <p>
        These are prepared recommendations for the fictional example. Editing a
        task sends its suitability back for review. Employee approval confirms
        the description, not permission to automate it.
      </p>
      {cards.map((card, i) => (
        <article key={i}>
          <h4>{card.title}</h4>
          <span className="dd-chip">
            {card.decision !== "correct"
              ? "Participant clarification needed"
              : card.edited
                ? "Suitability needs fresh review"
                : card.suitability === "candidate"
                  ? "AI assistance candidate"
                  : card.suitability === "human"
                    ? "Human task"
                    : "Resolve ownership first"}
          </span>
          <p>{card.rationale}</p>
          <p>
            <strong>Boundary:</strong> {card.boundary}
          </p>
          {eligible.includes(card) && (
            <label>
              <input
                type="checkbox"
                checked={selected.includes(card.title)}
                onChange={(e) => {
                  setManifest(null);
                  setSelected((s) =>
                    e.target.checked
                      ? [...s, card.title]
                      : s.filter((t) => t !== card.title),
                  );
                }}
              />{" "}
              Include this task in the simulated governance request
            </label>
          )}
        </article>
      ))}
      <button
        className="dd-primary"
        disabled={!selected.length}
        onClick={() =>
          setManifest(eligible.filter((c) => selected.includes(c.title)))
        }
      >
        Preview in AI Governance Studio →
      </button>
      {manifest && (
        <section className="dd-note" aria-live="polite">
          <p className="dd-eyebrow">AI GOVERNANCE STUDIO · SIMULATION</p>
          <h3>Draft manifest request</h3>
          <p>
            <strong>Human owner:</strong> {person.name} · {person.role} ·{" "}
            {person.team}
          </p>
          <p>
            <strong>State:</strong> Awaiting identity, access-policy, and
            authorized reviewer checks. No agent issued.
          </p>
          <ol>
            {manifest.map((c) => (
              <li key={c.title}>
                <strong>{c.title}</strong>
                <p>Requested work: {c.output}</p>
                <p>Software to check: {c.software}</p>
                <p>Proposed boundary: {c.boundary}</p>
              </li>
            ))}
          </ol>
          <p>
            <strong>Scopes granted:</strong> None. A real request must match
            these operations against the person’s current access and the
            organization’s policies.
          </p>
          <p>
            <strong>Next:</strong> Check identity and employment → check
            permitted scopes and separation-of-duties rules → authorized human
            reviews the exact manifest → issue only after approval.
          </p>
          <p>
            This preview stays on this page. It does not call an identity
            provider, create an agent, or save a live governance request.
          </p>
        </section>
      )}
    </section>
  );
}
