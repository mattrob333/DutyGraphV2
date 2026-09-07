import { useState } from "react";
import {
  candidateTasks,
  type DemoTask,
} from "../../shared/discovery-demo-tasks.ts";
import {
  demoTeamFindings,
  demoHandoffs,
  originalReviewedTask,
  readoutMarkdown,
} from "../../shared/demo-team-review.ts";
import { DemoDelegationReview } from "./DemoDelegationReview.tsx";
import "./advisor-demo-inbox.css";
type Person = {
  id: string;
  name: string;
  role: string;
  team: string;
  duty: string;
};
export function AdvisorDemoInbox({
  people,
  returned,
  cards,
  answers,
  selected,
  onSelect,
  onComplete,
  onInvite,
}: {
  people: Person[];
  returned: string[];
  cards: Record<string, DemoTask[]>;
  answers: Record<string, string>;
  selected: string;
  onSelect: (id: string) => void;
  onComplete: () => void;
  onInvite: () => void;
}) {
  const [tab, setTab] = useState("people"),
    [filter, setFilter] = useState("all"),
    [analysis, setAnalysis] = useState(""),
    [included, setIncluded] = useState<string[]>([]),
    [notes, setNotes] = useState(""),
    [focus, setFocus] = useState<number | null>(null);
  const person = people.find((p) => p.id === selected)!;
  const all = people.flatMap((p) => cards[p.id] || []),
    mine = cards[selected] || [];
  const complete = people.every((p) => returned.includes(p.id));
  const fingerprint = JSON.stringify(cards);
  const analyzed = complete && analysis === fingerprint;
  const findings = analyzed ? demoTeamFindings(cards) : [];
  const selectedFindings = findings.filter((f) => included.includes(f.id));
  const candidateCount = candidateTasks(all).length;
  const status = (c: DemoTask) =>
    c.edited
      ? "Review suitability"
      : c.suitability === "candidate"
        ? "AI candidate"
        : c.suitability === "gap"
          ? "Ownership gap"
          : "Human task";
  const shown = mine
    .map((c, index) => ({ c, index }))
    .filter(
      ({ c }) =>
        filter === "all" ||
        (filter === "ai" && candidateTasks([c]).length > 0) ||
        (filter === "gaps" && (c.edited || c.suitability === "gap")),
    );
  function openTask(id: string, index: number) {
    onSelect(id);
    setFocus(index);
    setFilter("all");
    setTab("people");
  }
  function download() {
    const content = readoutMarkdown(
      selectedFindings,
      all.length,
      candidateCount,
      notes,
    );
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "cobalt-sample-discovery-readout.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="advisor-demo">
      <p className="dd-lead">
        Review the work people returned. Follow the evidence when needed, then
        prepare the decisions for the next client meeting.
      </p>
      <div className="dd-inbox-stats">
        <div>
          <strong>
            {returned.length} / {people.length}
          </strong>
          <span>People returned</span>
        </div>
        <div>
          <strong>{all.length}</strong>
          <span>Task cards returned</span>
        </div>
        <div>
          <strong>{candidateCount}</strong>
          <span>Sample AI candidates · not approvals</span>
        </div>
      </div>
      <div className="ad-next">
        <div>
          <strong>
            {complete
              ? "Team responses are complete"
              : "Keep collecting the team’s work"}
          </strong>
          <p>
            {complete
              ? "Review the combined picture, select findings, and prepare the all-hands discussion."
              : `${people.length - returned.length} people still need to respond. You can review returned task cards now.`}
          </p>
        </div>
        <div className="ad-actions">
          {!complete && (
            <button className="dd-secondary" onClick={onComplete}>
              Load remaining sample responses
            </button>
          )}
          <button
            className="dd-primary"
            disabled={!complete}
            onClick={() => {
              setAnalysis(fingerprint);
              setIncluded(demoTeamFindings(cards).map((f) => f.id));
              setTab("findings");
            }}
          >
            Review sample team findings
          </button>
        </div>
      </div>
      <p className="ad-disclosure">
        Interactive simulation. Loading samples adds fictional approved cards
        only for teammates still waiting. Findings below are prepared examples,
        not a live AI run.
      </p>
      <nav className="ad-tabs" aria-label="Advisor review views">
        {[
          ["people", "People & tasks"],
          ["findings", "Team findings"],
          ["readout", "All-hands readout"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            disabled={id !== "people" && !analyzed}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "people" && (
        <div className="dd-inbox-grid">
          <aside className="dd-inbox-list" aria-label="Team responses">
            {people.map((p) => (
              <button
                key={p.id}
                className={selected === p.id ? "selected" : ""}
                aria-pressed={selected === p.id}
                onClick={() => {
                  onSelect(p.id);
                  setFocus(null);
                  setFilter("all");
                }}
              >
                <strong>{p.name}</strong>
                <span>{p.team}</span>
                <small>
                  {returned.includes(p.id)
                    ? `${(cards[p.id] || []).length} tasks · ${candidateTasks(cards[p.id] || []).length} AI candidates`
                    : "Waiting for response"}
                </small>
              </button>
            ))}
          </aside>
          <section className="dd-evidence" key={selected}>
            <p className="dd-eyebrow">RETURNED WORK · FICTIONAL SAMPLE</p>
            <h3>{person.name}</h3>
            <p>
              {person.role} · {person.duty}
            </p>
            {!returned.includes(selected) ? (
              <>
                <p>This person has not returned a response yet.</p>
                <button className="dd-secondary" onClick={onInvite}>
                  Follow this teammate’s invitation →
                </button>
              </>
            ) : (
              <>
                <details className="ad-transcript">
                  <summary>Open original transcript</summary>
                  <blockquote>{answers[selected]}</blockquote>
                </details>
                <div className="ad-filters" aria-label="Task filters">
                  {[
                    ["all", "All tasks"],
                    ["ai", "AI candidates"],
                    ["gaps", "Gaps & review"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      aria-pressed={filter === id}
                      onClick={() => {
                        setFilter(id);
                        setFocus(null);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="ad-task-grid">
                  {shown.map(({ c, index }) => (
                    <article
                      key={index}
                      className={`ad-task ad-task-${c.edited ? "gap" : c.suitability}`}
                    >
                      <span className="dd-chip">{status(c)}</span>
                      <h4>{c.title}</h4>
                      <p>
                        <strong>Output:</strong> {c.output}
                      </p>
                      <details open={focus === index ? true : undefined}>
                        <summary>View task card</summary>
                        <dl>
                          <dt>Duty</dt>
                          <dd>{c.duty}</dd>
                          <dt>Inputs & dependencies</dt>
                          <dd>{c.inputs}</dd>
                          <dt>Actions</dt>
                          <dd>
                            <ol>
                              {c.instructions.split("\n").map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ol>
                          </dd>
                          <dt>Handoff</dt>
                          <dd>{c.handoff}</dd>
                          <dt>Software</dt>
                          <dd>{c.software}</dd>
                          <dt>Participant confirmation</dt>
                          <dd>
                            {c.decision === "correct"
                              ? "Approved as their understanding"
                              : "Needs review"}
                          </dd>
                          <dt>Delegation review</dt>
                          <dd>
                            {c.edited
                              ? "The task was edited; reassess its suitability."
                              : c.rationale}
                          </dd>
                        </dl>
                      </details>
                    </article>
                  ))}
                </div>
                {!shown.length && <p>No tasks match this filter.</p>}
                <details className="ad-governance">
                  <summary>
                    Prepare a request from this person’s AI candidates
                  </summary>
                  <DemoDelegationReview
                    key={selected}
                    cards={mine}
                    person={person}
                  />
                </details>
              </>
            )}
          </section>
        </div>
      )}
      {tab === "findings" && analyzed && (
        <section className="ad-team-findings">
          <h3>What should the client decide next?</h3>
          <p>
            No confirmed cross-team conflict or measured bottleneck is claimed
            in this sample. These evidence-linked questions show what an advisor
            would investigate. Edited source cards suppress the affected
            prepared findings.
          </p>
          <div className="ad-findings-grid">
            {findings.map((f) => (
              <article key={f.id}>
                <span className="dd-chip">{f.label}</span>
                <h4>{f.title}</h4>
                <p>{f.observation}</p>
                <p>
                  <strong>Next action:</strong> {f.action}
                </p>
                <details>
                  <summary>Inspect source task cards ({f.refs.length})</summary>
                  {f.refs.map((r) => (
                    <button
                      key={r.person + r.index}
                      className="dd-text-button"
                      onClick={() => openTask(r.person, r.index)}
                    >
                      {people.find((p) => p.id === r.person)?.name} ·{" "}
                      {cards[r.person][r.index].title} →
                    </button>
                  ))}
                </details>
                <label>
                  <input
                    type="checkbox"
                    checked={included.includes(f.id)}
                    onChange={(e) =>
                      setIncluded((ids) =>
                        e.target.checked
                          ? [...ids, f.id]
                          : ids.filter((id) => id !== f.id),
                      )
                    }
                  />{" "}
                  Include in the client readout
                </label>
              </article>
            ))}
          </div>
          {!findings.length && (
            <p>
              No prepared findings apply to the current cards. Review the edited
              work and build a fresh analysis.
            </p>
          )}
          <h3>Follow the work across people</h3>
          <p>
            Selected handoff paths from the unchanged sample cards. Open a node
            to inspect its task. This is a partial work map, not a complete
            company graph.
          </p>
          {demoHandoffs
            .filter((path) =>
              path.refs.every((r) => originalReviewedTask(cards, r)),
            )
            .map((path) => (
              <div className="ad-handoff" key={path.label}>
                <h4>{path.label}</h4>
                <div>
                  {path.refs.map((r, i) => (
                    <div key={r.person + r.index}>
                      {i > 0 && <span aria-hidden="true">→</span>}
                      <button onClick={() => openTask(r.person, r.index)}>
                        <small>
                          {people.find((p) => p.id === r.person)?.name}
                        </small>
                        <strong>{cards[r.person][r.index].title}</strong>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          <div className="ad-next">
            <p>
              <strong>{candidateCount} sample AI-assistance candidates</strong>{" "}
              across the returned tasks. Review them by person before choosing
              what to send for governance checks.
            </p>
            <button
              className="dd-secondary"
              onClick={() => {
                setFilter("ai");
                setTab("people");
              }}
            >
              Inspect candidate task cards
            </button>
          </div>
          <button className="dd-primary" onClick={() => setTab("readout")}>
            Prepare all-hands readout →
          </button>
        </section>
      )}
      {tab === "readout" && analyzed && (
        <section className="ad-readout">
          <p className="dd-eyebrow">CLIENT MEETING · DRAFT READOUT</p>
          <h3>Agree on the work. Choose the next improvement.</h3>
          <p>
            {people.length} people · {all.length} task cards ·{" "}
            {selectedFindings.length} selected findings · {candidateCount}{" "}
            sample AI candidates.
          </p>
          <p>
            <strong>Bring:</strong> the executive sponsor, department heads, and
            the people who own the affected work. The supplier approval
            authority still needs to be identified.
          </p>
          <h4>Suggested 30-minute agenda</h4>
          <ol>
            <li>Confirm duty and task coverage — 5 minutes.</li>
            <li>Walk through handoffs and source cards — 10 minutes.</li>
            <li>
              Resolve the selected ownership and coverage questions — 10
              minutes.
            </li>
            <li>
              Assign each action an owner, due date, and measure — 5 minutes.
            </li>
          </ol>
          {selectedFindings.map((f) => (
            <article key={f.id}>
              <h4>{f.title}</h4>
              <p>{f.observation}</p>
              <p>
                <strong>Decision to make:</strong> {f.question}
              </p>
              <p>
                <strong>Proposed action:</strong> {f.action}
              </p>
            </article>
          ))}
          {!selectedFindings.length && (
            <p>
              No findings selected. Return to Team findings to choose the
              questions for this meeting.
            </p>
          )}
          <label>
            Advisor discussion notes
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add proposed owners, questions, and measures. Download your notes before leaving this screen."
            />
          </label>
          <p>
            Validate changes with the team. Measure wait time, errors, and
            effort before claiming savings or choosing a technology solution. AI
            candidates still need identity, policy, and approval checks.
          </p>
          <button className="dd-primary" onClick={download}>
            Download meeting readout
          </button>
          <p className="ad-disclosure">
            Downloads a local Markdown draft. No meeting invitation or client
            message is sent.
          </p>
        </section>
      )}
    </div>
  );
}
