import {
  sampleTasks,
  sampleTranscript,
  granularWorkGuide,
  type DemoTask,
} from "../../shared/discovery-demo-tasks.ts";
import { DemoDelegationReview } from "./DemoDelegationReview.tsx";
import { TaskReviewCard } from "./TaskReviewCard.tsx";
import { useEffect, useRef, useState } from "react";
import "./DiscoveryDemo.css";

const people = [
  {
    id: "maya",
    name: "Maya Chen",
    role: "Procurement manager",
    team: "Procurement",
    duty: "Keep supplier records complete",
    question:
      "Walk us through a recent supplier setup. What did you receive, what did you check, and who needed the result?",
    example:
      "I receive a supplier packet from the buyer. I check the company details and required documents, then send the bank details to Finance. We sometimes wait because no one knows who owns the final approval. I track that handoff in a shared sheet.",
  },
  {
    id: "dana",
    name: "Dana Brooks",
    role: "Accounts payable manager",
    team: "Finance",
    duty: "Verify supplier bank details",
    question:
      "How do you verify a supplier's bank details? What makes you pause or ask someone for help?",
    example:
      "I check the bank details against the supporting documents and follow our verification procedure. If the information does not match, I stop and ask Procurement to resolve it. I record the result before the supplier can be approved.",
  },
  {
    id: "jordan",
    name: "Jordan Lee",
    role: "Sales manager",
    team: "Sales",
    duty: "Set a reliable delivery promise",
    question:
      "How do you turn a customer's request into a delivery promise? Where do you need information from another team?",
    example:
      "I check the customer's order and ask the warehouse to confirm stock. If stock is short, I ask Procurement for a delivery date before I promise one to the customer. The delay is usually waiting for that date.",
  },
  {
    id: "riley",
    name: "Riley Parker",
    role: "Warehouse lead",
    team: "Warehouse",
    duty: "Prepare accurate shipments",
    question:
      "Describe how an order reaches your team and becomes a checked shipment. What information must be complete?",
    example:
      "We receive a released picking list with the stock reservation. A teammate picks the order and another checks the quantities. We need a clear delivery address and shipping instructions before dispatch.",
  },
  {
    id: "karl",
    name: "Karl Jensen",
    role: "Operations supervisor",
    team: "Operations",
    duty: "Coordinate dispatch and exceptions",
    question:
      "What do you check before dispatch? How do you handle an order that cannot move forward?",
    example:
      "I check that the shipment has passed its checks and the carrier booking is ready. When an order is blocked, I contact the owner of the missing information. I record the carrier reference and send it to Sales.",
  },
];
const steps = [
  "Prepare",
  "Invitation",
  "Private link",
  "Respond",
  "Review cards",
  "Submit",
  "Advisor inbox",
];

/** A self-contained public illustration. Never calls an API or sends participant data. */
export function DiscoveryDemo() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(people[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [returned, setReturned] = useState<string[]>([]);
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Record<string, string>
  >({});
  const [cards, setCards] = useState<DemoTask[]>([]);
  const [submittedCards, setSubmittedCards] = useState<
    Record<string, DemoTask[]>
  >({});
  const [saved, setSaved] = useState(false);
  const [voiceExample, setVoiceExample] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const person = people.find((item) => item.id === selected)!;
  const answer = answers[selected] || "";
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  function reset() {
    setStep(0);
    setSelected(people[0].id);
    setAnswers({});
    setSubmittedAnswers({});
    setSubmittedCards({});
    setCards([]);
    setReturned([]);
    setSaved(false);
    setVoiceExample(false);
  }
  function select(id: string) {
    setSelected(id);
    setCards([]);
    setSaved(false);
    setVoiceExample(false);
  }
  function submit() {
    setSubmittedAnswers((items) => ({ ...items, [selected]: answer }));
    setReturned((items) =>
      items.includes(selected) ? items : [...items, selected],
    );
    setSubmittedCards((items) => ({
      ...items,
      [selected]: cards.map((c) => ({ ...c })),
    }));
    setStep(5);
  }
  return (
    <div className="discovery-demo">
      <header className="dd-header">
        <a className="dd-brand" href="/landing/" aria-label="DutyGraph home">
          <span className="dd-mark" aria-hidden="true" />
          DutyGraph
        </a>
        <a href="/landing/#pilot">
          Join the pilot <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main>
        <div className="dd-intro">
          <div>
            <p className="dd-eyebrow">DISCOVERY, FROM BOTH SIDES</p>
            <h1>
              One invitation.
              <br />A clearer picture of the work.
            </h1>
            <p>
              Follow five fictional teammates from a tailored request to an
              answer the advisor can review.
            </p>
          </div>
          <div className="dd-simulation">
            <span className="dd-dot" />
            Interactive simulation
            <p>
              No email is sent. No microphone is used. Your sample answers stay
              in this page and disappear when you reload.
            </p>
          </div>
        </div>
        <ol className="dd-steps" aria-label="Discovery walkthrough progress">
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={step === index ? "step" : undefined}
              className={
                step === index ? "current" : step > index ? "complete" : ""
              }
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </li>
          ))}
        </ol>
        <section className="dd-stage" aria-labelledby="dd-stage-title">
          <div className="dd-stage-bar">
            <span>
              {step === 0 || step === 6 ? "ADVISOR VIEW" : "PARTICIPANT VIEW"}{" "}
              <span className="dd-separator">/</span> COBALT INDUSTRIAL SUPPLY
            </span>
            <button onClick={reset} className="dd-text-button">
              Start over
            </button>
          </div>
          <div className="dd-stage-content">
            <p className="dd-eyebrow">STEP {step + 1} OF 7</p>
            <h2 id="dd-stage-title" tabIndex={-1} ref={heading}>
              {
                [
                  "The team is ready. Make it personal.",
                  "A clear request, in their inbox.",
                  "Their invitation opens their own page.",
                  "Let them explain the work.",
                  "Check what we understood.",
                  "Their part is done.",
                  "The answers come back together.",
                ][step]
              }
            </h2>
            {step === 0 && (
              <>
                <p className="dd-lead">
                  The leadership kickoff has supplied this sample roster and
                  draft duties. The advisor checks them, then prepares a
                  different question set for each person.
                </p>
                <div className="dd-roster">
                  {people.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => select(item.id)}
                      aria-pressed={selected === item.id}
                      className={selected === item.id ? "selected" : ""}
                    >
                      <span className="dd-avatar">
                        {item.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <strong>{item.name}</strong>
                      <span>{item.team}</span>
                      <small>{item.duty}</small>
                      <span className="dd-chip">
                        {returned.includes(item.id)
                          ? "Response returned"
                          : "Questions prepared"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="dd-question-preview">
                  <span className="dd-eyebrow">
                    A QUESTION FOR {person.name.toUpperCase()}
                  </span>
                  <p>{person.question}</p>
                  <small>
                    Each set also asks about inputs, decisions, handoffs, and
                    points where work stops.
                  </small>
                </div>
                <div className="dd-actions">
                  <span>
                    5 prepared invitations · Select a person to follow their
                    experience.
                  </span>
                  <button className="dd-primary" onClick={() => setStep(1)}>
                    Simulate sending 5 invitations →
                  </button>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <p className="dd-lead">
                  You are viewing {person.name}'s sample email. Each teammate
                  receives their own questions and private link.
                </p>
                <article className="dd-email">
                  <div className="dd-email-envelope">
                    <span>
                      To: {person.name} &lt;{person.id}@cobalt.example&gt;
                    </span>
                    <strong>
                      Your work, in your words · Cobalt Industrial Supply
                    </strong>
                  </div>
                  <div className="dd-email-body">
                    <div className="dd-email-brand">
                      DutyGraph <small>COBALT INDUSTRIAL SUPPLY</small>
                    </div>
                    <p className="dd-eyebrow">YOUR WORK, IN YOUR WORDS</p>
                    <h3>Hello {person.name.split(" ")[0]}.</h3>
                    <p>
                      Help us understand how your work happens. You can answer
                      when it fits your day. A recent example is more useful
                      than a polished explanation.
                    </p>
                    <div className="dd-email-questions">
                      <strong>Here is what to talk about</strong>
                      <ol>
                        <li>{person.question}</li>
                        <li>
                          What starts the task? Name the person or team
                          supplying the data, the documents or fields you
                          receive, and what must be complete.
                        </li>
                        <li>
                          Describe each action in order. Name the software you
                          use at each step and the checks you make.
                        </li>
                        <li>
                          What does the finished output contain? Who receives
                          it, how do you send it, and what do they do next?
                        </li>
                        <li>
                          Where does work wait, and who helps you move it
                          forward?
                        </li>
                      </ol>
                    </div>
                    <p>
                      Open your private page. Type your answers or record your
                      voice. Save a draft if you need a break, then review and
                      send your response.
                    </p>
                    <button className="dd-email-cta" onClick={() => setStep(2)}>
                      Open your private response page →
                    </button>
                    <small>
                      In a real invitation, the link expires in 7 days. On your
                      first visit, create a password to protect your responses.
                      Do not forward your link.
                    </small>
                  </div>
                </article>
              </>
            )}
            {step === 2 && (
              <>
                <p className="dd-lead">
                  The real invitation identifies the person and company before
                  they create a password or sign in. This preview skips account
                  creation.
                </p>
                <div className="dd-private">
                  <span className="dd-chip">
                    PRIVATE PARTICIPANT PAGE · PREVIEW
                  </span>
                  <h3>Welcome, {person.name.split(" ")[0]}.</h3>
                  <p>
                    Cobalt Industrial Supply has invited you to describe your
                    work.
                  </p>
                  <dl>
                    <div>
                      <dt>Your role</dt>
                      <dd>{person.role}</dd>
                    </div>
                    <div>
                      <dt>Your team</dt>
                      <dd>{person.team}</dd>
                    </div>
                    <div>
                      <dt>What we will cover</dt>
                      <dd>{person.duty}</dd>
                    </div>
                  </dl>
                  <p className="dd-note">
                    Your assigned advisor reviews your response. You can point
                    out anything that is missing or incorrect.
                  </p>
                  <button className="dd-primary" onClick={() => setStep(3)}>
                    Continue to sample questions →
                  </button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p className="dd-lead">
                  {person.name} · {person.role}. Voice is preferred: a real
                  example helps us capture the steps, exceptions, and
                  frustrations. You can type instead.
                </p>
                <div className="dd-response-grid">
                  <div>
                    <h3>Use these points to guide you</h3>
                    <p>
                      Leadership identified this duty:{" "}
                      <strong>{person.duty}</strong>. Describe the separate
                      tasks that make it happen. There is no required task
                      count.
                    </p>
                    <ol className="dd-prompts">
                      {granularWorkGuide.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ol>
                    <div className="dd-note">
                      In the working participant page, voice capture requires
                      microphone permission. This demo only inserts a fictional
                      transcript.
                    </div>
                  </div>
                  <div className="dd-answer">
                    <label htmlFor="dd-answer">Your sample response</label>
                    <textarea
                      id="dd-answer"
                      rows={9}
                      value={answer}
                      onChange={(e) => {
                        setAnswers((a) => ({
                          ...a,
                          [selected]: e.target.value,
                        }));
                        setSaved(false);
                        setVoiceExample(false);
                        setCards([]);
                      }}
                      placeholder="Describe several regular tasks, or load the detailed fictional voice example below."
                    />
                    <button
                      onClick={() => {
                        setAnswers((a) => ({
                          ...a,
                          [selected]: sampleTranscript(selected),
                        }));
                        setVoiceExample(true);
                        setSaved(false);
                      }}
                      className="dd-secondary"
                    >
                      Load simulated voice response
                    </button>
                    <p className="dd-status" role="status">
                      {voiceExample
                        ? "Fictional transcript inserted. No audio was recorded."
                        : saved
                          ? "Draft kept for this walkthrough only. Reloading clears it."
                          : "Please use fictional information in this public demo."}
                    </p>
                    <div className="dd-response-actions">
                      <button
                        disabled={!answer.trim()}
                        className="dd-secondary"
                        onClick={() => setSaved(true)}
                      >
                        Save sample draft
                      </button>
                      <button
                        disabled={!answer.trim()}
                        className="dd-primary"
                        onClick={() => {
                          setCards(sampleTasks(selected));
                          setStep(4);
                        }}
                      >
                        Create my sample task cards →
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {step === 4 && cards.length > 0 && (
              <div className="dd-answer">
                <p>
                  Prepared task breakdown based on this person’s detailed sample
                  account. This public simulation does not analyze custom text.
                  In the real flow, AI drafts cards from your transcript and
                  assigned work context. Read the card, approve it, or edit only
                  what needs correcting.
                </p>
                <div className="dd-note">
                  <strong>{person.duty}</strong>
                  <p>
                    One duty → {cards.length} repeatable tasks. Each card
                    describes a result that another person could take over.
                  </p>
                  <p aria-live="polite">
                    {cards.filter((c) => c.decision).length} of {cards.length}{" "}
                    reviewed. Review each card before sending.
                  </p>
                </div>
                {cards.map((card, index) => (
                  <TaskReviewCard
                    key={selected + index}
                    card={card}
                    person={person.name + " · " + person.role}
                    onChange={(next) =>
                      setCards((cs) =>
                        cs.map((c, i) =>
                          i === index
                            ? {
                                ...next,
                                edited:
                                  c.edited ||
                                  [
                                    "title",
                                    "duty",
                                    "inputs",
                                    "instructions",
                                    "output",
                                    "handoff",
                                    "software",
                                  ].some((f) => (c as any)[f] !== next[f]),
                              }
                            : c,
                        ),
                      )
                    }
                  />
                ))}
                <p>
                  This records your understanding. Differences between teammates
                  can be resolved after their cards return.
                </p>
                <button
                  className="dd-primary"
                  disabled={!cards.length || cards.some((c) => !c.decision)}
                  onClick={submit}
                >
                  Send my answer and reviewed cards →
                </button>
              </div>
            )}
            {step === 5 && (
              <div className="dd-success">
                <span className="dd-success-icon" aria-hidden="true">
                  ✓
                </span>
                <h3>Thanks, {person.name.split(" ")[0]}.</h3>
                <p>
                  Your sample response is ready for the advisor's inbox. In the
                  real flow, your reviewed cards and original answer arrive
                  together.
                </p>
                <span className="dd-chip">SIMULATED SUBMISSION</span>
                <button className="dd-primary" onClick={() => setStep(6)}>
                  See what the advisor receives →
                </button>
              </div>
            )}
            {step === 6 && (
              <>
                <p className="dd-lead">
                  Each return stays connected to its person and request. The
                  advisor can read the original account before checking any
                  draft duties or task cards.
                </p>
                <div className="dd-inbox-stats">
                  <div>
                    <strong>5</strong>
                    <span>Sample requests</span>
                  </div>
                  <div>
                    <strong>{returned.length} / 5</strong>
                    <span>Responses returned</span>
                  </div>
                  <div>
                    <strong>{returned.length}</strong>
                    <span>Awaiting advisor review</span>
                  </div>
                </div>
                <div className="dd-inbox-grid">
                  <div className="dd-inbox-list">
                    {people.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => select(item.id)}
                        aria-pressed={selected === item.id}
                        className={selected === item.id ? "selected" : ""}
                      >
                        <strong>{item.name}</strong>
                        <span>{item.team}</span>
                        <small>
                          {returned.includes(item.id)
                            ? "Response returned · Review needed"
                            : "Waiting for response"}
                        </small>
                      </button>
                    ))}
                  </div>
                  <article className="dd-evidence">
                    <p className="dd-eyebrow">
                      {returned.includes(selected)
                        ? "ORIGINAL RESPONSE · SAMPLE"
                        : "REQUEST · SAMPLE"}
                    </p>
                    <h3>{person.name}</h3>
                    <p>{person.duty}</p>
                    {returned.includes(selected) ? (
                      <>
                        <blockquote>{submittedAnswers[selected]}</blockquote>
                        <span className="dd-chip">
                          Participant review received
                        </span>
                        {(submittedCards[selected] || []).map((c, i) => (
                          <div key={i}>
                            <h4>{c.title}</h4>
                            <p>
                              {c.decision === "correct"
                                ? "Matches their understanding"
                                : c.decision === "not_mine"
                                  ? "Not their task"
                                  : "Needs clarification"}
                            </p>
                            <p>Output: {c.output}</p>
                            <p>Goes to: {c.handoff}</p>
                          </div>
                        ))}
                        <DemoDelegationReview
                          key={selected}
                          cards={submittedCards[selected] || []}
                          person={person}
                        />
                        <p className="dd-note">
                          The participant has reviewed their description. The
                          advisor now checks gaps, overlapping responsibilities
                          and handoffs across the team. A material change may
                          need the person to check it again.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="dd-note">
                          This teammate has not returned a sample response yet.
                        </p>
                        <button
                          className="dd-secondary"
                          onClick={() => setStep(1)}
                        >
                          Follow this teammate's invitation →
                        </button>
                      </>
                    )}
                  </article>
                </div>
                <div className="dd-actions">
                  <span>
                    A shared view of progress. A personal experience for each
                    teammate.
                  </span>
                  <a className="dd-primary" href="/landing/#pilot">
                    Join the pilot →
                  </a>
                </div>
              </>
            )}
          </div>
          <footer className="dd-stage-footer">
            {step > 0 ? (
              <button
                className="dd-text-button"
                onClick={() => setStep(step - 1)}
              >
                ← Previous step
              </button>
            ) : (
              <span>
                Leadership kickoff → agreed roster → tailored requests
              </span>
            )}
            <span>Fictional company. Illustrative responses.</span>
          </footer>
        </section>
        <p className="dd-bottom-note">
          Discovery that fits around the work. Your team can contribute without
          arranging a separate call for every answer.
        </p>
      </main>
    </div>
  );
}
