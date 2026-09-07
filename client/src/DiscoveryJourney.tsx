import { BusinessProfilePanel } from "./BusinessProfilePanel.tsx";
import {
  kickoffGuide,
  composeKickoffNotes,
} from "../../shared/kickoff-guide.ts";
import { TeamAnalysis } from "./TeamAnalysis.tsx";
import { FrameworkWorkspace } from "./FrameworkWorkspace.tsx";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Mail,
  Mic,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import type { Company, RecordRow } from "../../shared/domain.ts";
import type { DiscoveryStage } from "../../shared/discovery.ts";
import { api } from "./api.ts";
import { Badge, Button, ErrorBox, Field, Panel, State } from "./ui.tsx";
import { BusinessResearch } from "./BusinessResearch.tsx";
import { EmailInvitation } from "./EmailInvitation.tsx";
import "./discovery.css";

const stages: { id: DiscoveryStage; title: string; hint: string }[] = [
  {
    id: "contact",
    title: "Research & contact",
    hint: "Prepare the first conversation",
  },
  {
    id: "agenda",
    title: "Leadership meeting",
    hint: "Understand the goals and team",
  },
  {
    id: "roster",
    title: "Review the team",
    hint: "People, departments and duties",
  },
  {
    id: "interviews",
    title: "Team interviews",
    hint: "Ask each person about their work",
  },
  {
    id: "tasks",
    title: "Review task cards",
    hint: "Turn responses into clear work",
  },
];
type Job = {
  id: string;
  kind: string;
  state: string;
  message: string;
  stale: boolean;
  input: any;
  result: any;
  created_at: string;
};
export function DiscoveryJourney({
  company,
  records,
  refresh,
  open,
  addSource,
  goTasks,
  prepareConfirmation,
  settings,
  initialStage = "contact",
  writeFramework,
}: {
  initialStage?: DiscoveryStage;
  writeFramework: (key: string) => void;
  company: Company;
  records: RecordRow[];
  refresh: () => Promise<void>;
  open: (r: RecordRow) => void;
  addSource: () => void;
  goTasks: () => void;
  prepareConfirmation: () => void;
  settings: () => void;
}) {
  const [industryOpen, setIndustryOpen] = useState(false);
  const [researchVersion, setResearchVersion] = useState(0);
  const [stage, setStage] = useState<DiscoveryStage>(initialStage),
    [jobs, setJobs] = useState<Job[]>([]),
    [configured, setConfigured] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [draftValue, setDraft] = useState<any>(null),
    [draftFor, setDraftFor] = useState(""),
    [contact, setContact] = useState({ name: "", email: "", meetingAt: "" }),
    [dueDate, setDueDate] = useState(
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    );
  const [meeting, setMeeting] = useState(""),
    [emailResults, setEmailResults] = useState<Record<string, string>>({});
  const [meetingAnswers, setMeetingAnswers] = useState<Record<string, string>>(
    {},
  );
  const meetingGuide = kickoffGuide(company.settings.businessProfile);
  const meetingText = composeKickoffNotes(
    company.settings.businessProfile,
    meetingAnswers,
    meeting,
  );
  useEffect(() => {
    setMeeting("");
    setMeetingAnswers({});
  }, [company.id]);
  const base = `/v1/companies/${company.id}/discovery`;
  const load = async () => {
    const r = await api(base);
    setJobs(r.jobs);
    setConfigured(r.configured);
    setLoading(false);
  };
  useEffect(() => {
    load().catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  }, [company.id, records]);
  const job = jobs.find((j) => j.kind === `discovery_${stage}`);
  const draft = draftFor === `${stage}:${job?.id}` ? draftValue : null;
  useEffect(() => {
    const saved = job?.result?.reviewedDraft || job?.result?.draft;
    setDraft(saved ? structuredClone(saved) : null);
    setDraftFor(`${stage}:${job?.id}`);
    if (stage === "contact" && job?.input.contact)
      setContact(job.input.contact);
  }, [job?.id, job?.state, !!job?.result?.applied, stage]);
  const working = busy || job?.state === "running";
  const perform = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await refresh();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const generate = () =>
    perform(async () => {
      await api(base + "/draft", "POST", {
        stage,
        ...(stage === "contact" ? { contact } : {}),
        consent: true,
      });
      await load();
    });
  const apply = () =>
    perform(async () => {
      await api(
        `${base}/${job!.id}/apply`,
        "POST",
        { reviewed: true, draft, dueDate },
        `discovery-apply:${job!.id}`,
      );
      setNotice(
        stage === "contact"
          ? "The contact request is ready. Preview the email below, then send it."
          : stage === "roster"
            ? "The team dossiers are saved. Create the personal interviews next."
            : stage === "interviews"
              ? "The personal requests are ready. Review the recipients, then send them."
              : "Your review is saved. Complete cards are ready for their people to confirm; cards with missing details stay proposed.",
      );
    });
  const update = (key: string, value: any) =>
    setDraft((d: any) => ({ ...d, [key]: value }));
  const updateItem = (key: string, index: number, field: string, value: any) =>
    update(
      key,
      draft[key].map((x: any, i: number) =>
        i === index ? { ...x, [field]: value } : x,
      ),
    );
  const people = records.filter((r) => r.kind === "person");
  const requestList = (prefix: string) =>
    records.filter(
      (r) =>
        r.kind === "request" &&
        String(r.data.questionPlanVersion).startsWith(prefix) &&
        r.state !== "withdrawn",
    );
  const contactRequests = requestList("discovery-contact:");
  const rosterJob = jobs.find(
    (j) => j.kind === "discovery_roster" && j.result?.applied,
  );
  const reviewedPeople = people.filter((p) =>
    rosterJob?.result.applied.personIds.includes(p.id),
  );
  const teamRequests = requestList("discovery-team:");
  const currentTeamRequests = job?.result?.applied?.requestIds
    ? teamRequests.filter((r) => job.result.applied.requestIds.includes(r.id))
    : teamRequests;
  const responseFor = (r: RecordRow) =>
    records.find(
      (x) =>
        x.kind === "response" &&
        x.data.requestId === r.id &&
        ["returned", "accepted"].includes(x.state),
    );
  const meetingNotes = records.filter(
    (r) =>
      r.kind === "evidence" &&
      r.data.originId === "discovery-meeting" &&
      r.state === "accepted",
  );
  const contactResponse = contactRequests.some(responseFor);
  const applied = !!job?.result?.applied;
  const savedTasks = records.filter(
    (r) => r.kind === "task" && job?.result?.applied?.recordIds?.includes(r.id),
  );
  const confirmationTasks = savedTasks.filter(
    (r) => r.state === "awaiting_confirmation" && r.data.reviewed,
  );
  const confirmationRequests = requestList(`discovery-confirmation:${job?.id}`);
  const createConfirmations = () =>
    perform(async () => {
      const groups = new Map<string, RecordRow[]>();
      for (const task of confirmationTasks)
        for (const personId of new Set<string>([
          task.data.ownerId,
          task.data.performerId,
        ])) {
          if (!personId) continue;
          groups.set(personId, [...(groups.get(personId) || []), task]);
        }
      for (const [personId, tasks] of groups) {
        const pending = tasks.filter(
          (t) =>
            !confirmationRequests.some(
              (r) =>
                r.data.personId === personId &&
                r.data.taskSnapshots?.some(
                  (s: any) =>
                    s.id === t.id &&
                    s.version === t.version &&
                    s.hash === t.hash,
                ),
            ),
        );
        if (!pending.length) continue;
        const body = {
          kind: "request",
          data: {
            title: "Review your task cards",
            personId,
            type: "confirmation",
            questions: [
              "Read each task card below. Does it describe the work you own or perform?",
              "Confirm the cards that are correct. Explain any changes that are needed.",
              "Check the inputs, outputs, tools and who receives the completed work.",
            ],
            questionPlanVersion: `discovery-confirmation:${job!.id}`,
            taskIds: pending.map((t) => t.id),
            dueDate,
            notice: company.settings.notice,
            emailSubject: `${company.name}: review your task cards`.slice(
              0,
              200,
            ),
            emailBody:
              "We have prepared task cards from the team's responses. Please use your private link to check the work you own or perform. Each card includes its instructions, inputs and result. Confirm what is correct and describe any changes. Thank you.",
          },
        };
        const bytes = new TextEncoder().encode(
          JSON.stringify({
            body,
            versions: pending.map((t) => [t.id, t.version, t.hash]),
          }),
        );
        const digest = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
          (b) => b.toString(16).padStart(2, "0"),
        ).join("");
        await api(
          `/v1/companies/${company.id}/records`,
          "POST",
          body,
          `discovery-check:${digest}`,
        );
      }
      setNotice(
        "Personal task checks are ready below. Each request includes that person's exact task versions. Preview the emails, then send them.",
      );
    });
  const contactChanged =
    stage === "contact" &&
    !!job?.input.contact &&
    JSON.stringify(contact) !== JSON.stringify(job.input.contact);
  const ready =
    stage === "contact"
      ? !!contact.name.trim() &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
      : stage === "roster"
        ? meetingNotes.length > 0
        : stage === "interviews"
          ? reviewedPeople.length > 0
          : stage === "tasks"
            ? teamRequests.some(responseFor)
            : true;
  const next = () =>
    setStage(
      stages[Math.min(4, stages.findIndex((s) => s.id === stage) + 1)].id,
    );
  const questions = (value: string[], onChange: (v: string[]) => void) => (
    <Field
      label="Questions"
      wide
      hint="One question per line. Keep each question under 200 characters."
    >
      <textarea
        rows={Math.max(4, value.length + 1)}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
    </Field>
  );
  const requestRows = (list: RecordRow[], email: boolean) =>
    list.map((r) => {
      const person = people.find((p) => p.id === r.data.personId),
        response = responseFor(r);
      return (
        <article className="journey-request" key={r.id}>
          <div className="journey-row">
            <div>
              <strong>{person?.title || r.title}</strong>
              <p>
                {person?.data.email} · {person?.data.team}
              </p>
            </div>
            <Badge tone={response ? "sage" : "neutral"}>
              {response
                ? "Response received"
                : r.state === "draft"
                  ? "Ready to send"
                  : "Waiting for response"}
            </Badge>
          </div>
          <Button onClick={() => open(response || r)}>
            {response ? "Read response" : "Review questions & request"}
          </Button>
          {email && (
            <EmailInvitation
              company={company.id}
              record={r}
              recipient={person?.data.email || ""}
              refresh={refresh}
            />
          )}
          {emailResults[r.id] && <p role="status">{emailResults[r.id]}</p>}
        </article>
      );
    });
  const sendAll = (requests: RecordRow[] = currentTeamRequests) =>
    perform(async () => {
      for (const r of requests) {
        if (responseFor(r)) continue;
        const path = `/v1/companies/${company.id}/requests/${r.id}`;
        const attempts = await api(path + "/emails");
        if (attempts.some((a: any) => a.state === "accepted")) {
          setEmailResults((v) => ({
            ...v,
            [r.id]: "Already accepted by the email service.",
          }));
          continue;
        }
        if (
          attempts.some((a: any) =>
            ["sending", "running", "unknown"].includes(a.state),
          )
        )
          throw new Error(
            "An earlier email has an uncertain result. Open that person's request and check delivery before retrying.",
          );
        const keyName = `discovery-email:${company.id}:${r.id}`;
        const key = sessionStorage.getItem(keyName) || crypto.randomUUID();
        sessionStorage.setItem(keyName, key);
        const result = await api(
          path + "/email",
          "POST",
          { expectedVersion: r.version, confirmSend: true },
          key,
        );
        setEmailResults((v) => ({
          ...v,
          [r.id]:
            result.state === "accepted"
              ? "Accepted by the email service."
              : "Check delivery in this person's request.",
        }));
        const latest = await api(path + "/emails");
        if (!latest.some((a: any) => a.state === "accepted"))
          throw new Error(
            "Sending paused because delivery was not confirmed. Review that request before continuing.",
          );
      }
      setNotice(
        "Invitation attempts are complete. Delivery receipts are available in each person's request.",
      );
    });
  return (
    <div className="discovery-journey">
      <p className="subtle">
        <a href="/?demo=discovery" target="_blank" rel="noopener noreferrer">
          Preview the participant journey ↗
        </a>{" "}
        · Five-person sample. No emails are sent.
      </p>
      <nav className="journey-steps" aria-label="Discovery steps">
        {stages.map((s, i) => (
          <button
            key={s.id}
            className={stage === s.id ? "active" : ""}
            aria-current={stage === s.id ? "step" : undefined}
            onClick={() => {
              setStage(s.id);
              setError("");
              setNotice("");
            }}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <strong>{s.title}</strong>
            <small>{s.hint}</small>
          </button>
        ))}
      </nav>
      <ErrorBox error={error} />
      {notice && (
        <div className="notice sage" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      {["contact", "agenda"].includes(stage) && (
        <BusinessProfilePanel
          key={company.id + stage}
          company={company}
          refresh={refresh}
          openIndustry={() => setIndustryOpen(true)}
          researched={() => setResearchVersion((v) => v + 1)}
        />
      )}
      {stage === "contact" && (
        <BusinessResearch
          key={company.id + researchVersion}
          resultsOnly
          company={company}
          create={addSource}
          open={open}
          refresh={refresh}
          kickoff={() => {
            document
              .getElementById("journey-draft")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
            document
              .getElementById("discovery-contact-name")
              ?.focus({ preventScroll: true });
          }}
        />
      )}
      {stage === "contact" && (
        <Panel
          title="Map the industry before kickoff"
          subtitle="Turn collected research into a dated industry baseline: ecosystem, technology, economics, leaders and strategic questions."
        >
          <p>
            Run public research first. Open the map to review sources, generate
            a structured draft, or revisit a saved version. Later strategy
            frameworks reuse the current map.
          </p>
          <Button onClick={() => setIndustryOpen(true)}>
            Open industry map
          </Button>
        </Panel>
      )}
      {industryOpen && (
        <FrameworkWorkspace
          companyId={company.id}
          frameworkKey="industrymap"
          records={records}
          close={() => setIndustryOpen(false)}
          openRecord={open}
          write={writeFramework}
          navigate={() => {}}
          saved={() => {
            void refresh();
          }}
        />
      )}
      {stage === "agenda" && (
        <Panel
          title="Before the leadership meeting"
          subtitle="Use the research and your contact's reply to ask about the gaps."
        >
          <div className="journey-metrics">
            <div>
              <strong>{contactRequests.length}</strong>
              <span>Contact requests</span>
            </div>
            <div>
              <strong>{contactResponse ? "Received" : "Waiting"}</strong>
              <span>Preliminary reply</span>
            </div>
            <div>
              <strong>{meetingNotes.length}</strong>
              <span>Saved meeting notes</span>
            </div>
          </div>
          {contactRequests.length ? (
            requestRows(contactRequests, false)
          ) : (
            <p>
              Start with Research & contact to prepare the first email. You can
              also prepare an agenda from public research alone.
            </p>
          )}
        </Panel>
      )}
      {stage === "roster" && !meetingNotes.length && (
        <Panel title="The team comes from the leadership meeting">
          <p>
            Save the kickoff notes first. DutyGraph will use the people,
            departments and responsibilities discussed in that meeting.
          </p>
          <Button onClick={() => setStage("agenda")}>
            Open leadership meeting <ArrowRight size={15} />
          </Button>
        </Panel>
      )}
      {stage === "interviews" && (
        <Panel
          title="One interview for each person"
          subtitle="Questions use the reviewed role and duties, plus the leadership context."
        >
          <div className="journey-metrics">
            <div>
              <strong>{reviewedPeople.length}</strong>
              <span>People in the reviewed team</span>
            </div>
            <div>
              <strong>{teamRequests.filter(responseFor).length}</strong>
              <span>Responses received</span>
            </div>
            <div>
              <strong>{teamRequests.length}</strong>
              <span>Interview requests</span>
            </div>
          </div>
          {!reviewedPeople.length ? (
            <Button onClick={() => setStage("roster")}>
              Review the team first
            </Button>
          ) : (
            <div className="journey-people-strip">
              {reviewedPeople.map((p) => (
                <button key={p.id} onClick={() => open(p)}>
                  <Users size={16} />
                  <span>
                    {p.title}
                    <small>
                      {p.data.role} · {p.data.team}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      )}
      {stage === "tasks" && (
        <Panel
          title="Returned task cards"
          subtitle="Review each person’s returned cards. Their confirmation records their understanding of the work."
        >
          {records
            .filter((r) => r.kind === "response" && r.data.taskCards?.length)
            .map((r) => (
              <article key={r.id} style={{ marginBottom: 16 }}>
                <Button onClick={() => open(r)}>
                  Review{" "}
                  {people.find((p) => p.id === r.data.personId)?.title ||
                    r.title}
                </Button>
                {r.data.taskCards.map((card: any, i: number) => (
                  <div
                    key={i}
                    style={{ padding: 12, borderBottom: "1px solid #555" }}
                  >
                    <strong>{card.title}</strong>
                    <p>
                      {card.decision === "correct"
                        ? "Confirmed by participant"
                        : "Needs review"}{" "}
                      · {card.output || "Output not recorded"}
                    </p>
                  </div>
                ))}
              </article>
            ))}
          {teamRequests.some(responseFor) ? (
            requestRows(teamRequests.filter(responseFor), false)
          ) : (
            <p>
              Task cards become available after the first team interview
              response arrives.
            </p>
          )}
        </Panel>
      )}
      {stage === "tasks" && (
        <TeamAnalysis
          key={company.id}
          companyId={company.id}
          revision={company.revision}
          records={records}
          open={open}
        />
      )}
      <div id="journey-draft">
        <Panel
          title={
            stage === "contact"
              ? "Prepare the contact email"
              : stage === "agenda"
                ? "Your meeting guide"
                : stage === "roster"
                  ? "People and their responsibilities"
                  : stage === "interviews"
                    ? "Create the personal question sets"
                    : "Draft the task cards"
          }
          subtitle={
            stage === "contact"
              ? "Ask your contact to bring the right leaders, the team list and their goals."
              : "DutyGraph carries forward the relevant information from the previous steps."
          }
        >
          {stage === "contact" && (
            <div className="form-grid">
              <Field label="Point of contact">
                <input
                  id="discovery-contact-name"
                  value={contact.name}
                  maxLength={200}
                  onChange={(e) =>
                    setContact({ ...contact, name: e.target.value })
                  }
                  placeholder="Full name"
                />
              </Field>
              <Field label="Contact email">
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) =>
                    setContact({ ...contact, email: e.target.value })
                  }
                  placeholder="name@company.com"
                />
              </Field>
              <Field label="Meeting details (optional)" wide>
                <input
                  value={contact.meetingAt}
                  maxLength={200}
                  onChange={(e) =>
                    setContact({ ...contact, meetingAt: e.target.value })
                  }
                  placeholder="Date, time, time zone and meeting format, if agreed"
                />
              </Field>
            </div>
          )}
          {!loading && !configured && (
            <div className="notice">
              <span>Add your OpenAI key to prepare these drafts.</span>
              <Button onClick={settings}>Open provider settings</Button>
            </div>
          )}
          <div className="journey-row">
            <p className="subtle">
              AI uses this company's relevant research and responses. Provider
              charges apply. Review the result before saving or sending.
            </p>
            <Button
              primary
              disabled={!configured || working || !ready}
              onClick={() => void generate()}
            >
              {working
                ? "Preparing…"
                : draft
                  ? "Prepare a fresh draft"
                  : stage === "interviews"
                    ? "Create question sets"
                    : stage === "tasks"
                      ? "Draft task cards"
                      : stage === "roster"
                        ? "Build team dossiers"
                        : stage === "agenda"
                          ? "Prepare meeting guide"
                          : "Draft contact email"}
            </Button>
          </div>
          {job && (
            <div className="journey-run">
              <State value={job.state} />
              <span>{job.input.sourceCount} sources carried forward</span>
              <Button
                disabled={busy}
                onClick={() => void load().catch((e) => setError(e.message))}
              >
                <RefreshCw size={14} />
                Refresh
              </Button>
              {job.input.omitted > 0 && (
                <span>
                  {job.input.omitted} older sources exceed this run's limit.
                </span>
              )}
            </div>
          )}
          {job && job.state !== "complete" && (
            <p role="status">{job.message}</p>
          )}
          {job?.stale && !applied && (
            <div className="notice amber">
              The input changed since this draft. Prepare a fresh draft before
              saving.
            </div>
          )}
          {contactChanged && draft && !applied && (
            <div className="notice amber">
              The contact details changed. Prepare a fresh draft so the request
              goes to the right person.
            </div>
          )}
          {draft && (
            <div className="journey-draft">
              <p className="journey-summary">{draft.summary}</p>
              {draft.gaps?.length > 0 && (
                <details className="journey-gaps" open>
                  <summary>
                    Questions still to resolve · {draft.gaps.length}
                  </summary>
                  <ul>
                    {draft.gaps.map((g: string, i: number) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </details>
              )}
              {stage === "contact" && (
                <>
                  <Field label="Email subject">
                    <input
                      value={draft.emailSubject}
                      maxLength={200}
                      onChange={(e) => update("emailSubject", e.target.value)}
                      disabled={applied}
                    />
                  </Field>
                  <Field label="Email message">
                    <textarea
                      rows={10}
                      value={draft.emailBody}
                      onChange={(e) => update("emailBody", e.target.value)}
                      disabled={applied}
                    />
                  </Field>
                  {!applied ? (
                    questions(draft.questions, (v) => update("questions", v))
                  ) : (
                    <ol>
                      {draft.questions.map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ol>
                  )}
                </>
              )}
              {stage === "agenda" && (
                <div className="journey-agenda">
                  {draft.sections.map((s: any, i: number) => (
                    <section key={i}>
                      <span className="eyebrow">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{s.title}</h3>
                        <p>{s.purpose}</p>
                        <ol>
                          {s.questions.map((q: string, k: number) => (
                            <li key={k}>{q}</li>
                          ))}
                        </ol>
                      </div>
                    </section>
                  ))}
                </div>
              )}
              {stage === "roster" && (
                <div className="journey-dossiers">
                  {draft.people.map((p: any, i: number) => (
                    <article className="journey-dossier" key={i}>
                      <div className="journey-row">
                        <Badge tone="blue">Person {i + 1}</Badge>
                        {!applied && (
                          <Button
                            onClick={() =>
                              update(
                                "people",
                                draft.people.filter(
                                  (_: any, k: number) => k !== i,
                                ),
                              )
                            }
                          >
                            Remove person
                          </Button>
                        )}
                      </div>
                      <div className="form-grid">
                        {(
                          [
                            ["name", "Name"],
                            ["email", "Email"],
                            ["role", "Role"],
                            ["department", "Department"],
                            ["managerEmail", "Manager email (if known)"],
                          ] as const
                        ).map(([key, label]) => (
                          <Field key={key} label={label}>
                            <input
                              value={p[key]}
                              disabled={applied}
                              onChange={(e) =>
                                updateItem("people", i, key, e.target.value)
                              }
                            />
                          </Field>
                        ))}
                      </div>
                      <h4>Duties described in the meeting</h4>
                      {p.duties.map((d: any, k: number) => (
                        <div className="journey-duty" key={k}>
                          <input
                            aria-label={`Duty ${k + 1} for ${p.name}`}
                            value={d.title}
                            disabled={applied}
                            placeholder="Responsibility"
                            onChange={(e) =>
                              updateItem(
                                "people",
                                i,
                                "duties",
                                p.duties.map((x: any, n: number) =>
                                  n === k ? { ...x, title: e.target.value } : x,
                                ),
                              )
                            }
                          />
                          <textarea
                            aria-label={`Duty detail ${k + 1} for ${p.name}`}
                            rows={2}
                            value={d.description}
                            disabled={applied}
                            placeholder="What this person is responsible for"
                            onChange={(e) =>
                              updateItem(
                                "people",
                                i,
                                "duties",
                                p.duties.map((x: any, n: number) =>
                                  n === k
                                    ? { ...x, description: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                          {!applied && (
                            <Button
                              onClick={() =>
                                updateItem(
                                  "people",
                                  i,
                                  "duties",
                                  p.duties.filter(
                                    (_: any, n: number) => n !== k,
                                  ),
                                )
                              }
                            >
                              Remove duty
                            </Button>
                          )}
                        </div>
                      ))}
                      {!applied && (
                        <Button
                          onClick={() =>
                            updateItem("people", i, "duties", [
                              ...p.duties,
                              { title: "", description: "" },
                            ])
                          }
                        >
                          <Plus size={14} />
                          Add duty
                        </Button>
                      )}
                    </article>
                  ))}
                  {!applied && (
                    <Button
                      onClick={() =>
                        update("people", [
                          ...draft.people,
                          {
                            name: "",
                            email: "",
                            role: "",
                            department: "",
                            managerEmail: "",
                            duties: [],
                            sourceIds:
                              job?.input.sources
                                .filter((s: any) => s.kind === "evidence")
                                .map((s: any) => s.id)
                                .slice(0, 30) || [],
                          },
                        ])
                      }
                    >
                      <Plus size={15} />
                      Add a person from the meeting
                    </Button>
                  )}
                </div>
              )}
              {stage === "interviews" && (
                <div className="journey-dossiers">
                  {draft.interviews.map((p: any, i: number) => (
                    <article className="journey-dossier" key={p.personId}>
                      <h3>{people.find((x) => x.id === p.personId)?.title}</h3>
                      <p>
                        {people.find((x) => x.id === p.personId)?.data.email}
                      </p>
                      {!applied ? (
                        <>
                          <Field label="Request title">
                            <input
                              value={p.title}
                              onChange={(e) =>
                                updateItem(
                                  "interviews",
                                  i,
                                  "title",
                                  e.target.value,
                                )
                              }
                            />
                          </Field>
                          {questions(p.questions, (v) =>
                            updateItem("interviews", i, "questions", v),
                          )}
                          <details>
                            <summary>Email message</summary>
                            <Field label="Subject">
                              <input
                                value={p.emailSubject}
                                onChange={(e) =>
                                  updateItem(
                                    "interviews",
                                    i,
                                    "emailSubject",
                                    e.target.value,
                                  )
                                }
                              />
                            </Field>
                            <Field label="Message">
                              <textarea
                                rows={5}
                                value={p.emailBody}
                                onChange={(e) =>
                                  updateItem(
                                    "interviews",
                                    i,
                                    "emailBody",
                                    e.target.value,
                                  )
                                }
                              />
                            </Field>
                          </details>
                        </>
                      ) : (
                        <ol>
                          {p.questions.map((q: string, k: number) => (
                            <li key={k}>{q}</li>
                          ))}
                        </ol>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {stage === "tasks" && (
                <div className="journey-dossiers">
                  {draft.tasks.map((t: any, i: number) => (
                    <article className="journey-dossier" key={i}>
                      <div className="journey-row">
                        <Badge>Proposed task</Badge>
                        {!applied && (
                          <Button
                            onClick={() =>
                              update(
                                "tasks",
                                draft.tasks.filter(
                                  (_: any, k: number) => i !== k,
                                ),
                              )
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <Field label="Task">
                        <input
                          value={t.title}
                          disabled={applied}
                          onChange={(e) =>
                            updateItem("tasks", i, "title", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Duty">
                        <input
                          value={t.duty}
                          disabled={applied}
                          onChange={(e) =>
                            updateItem("tasks", i, "duty", e.target.value)
                          }
                        />
                      </Field>
                      <div className="form-grid">
                        {(
                          [
                            ["ownerId", "Accountable person"],
                            ["performerId", "Person doing the work"],
                          ] as const
                        ).map(([k, label]) => (
                          <Field key={k} label={label}>
                            <select
                              value={t[k]}
                              disabled={applied}
                              onChange={(e) =>
                                updateItem("tasks", i, k, e.target.value)
                              }
                            >
                              <option value="">Not yet established</option>
                              {reviewedPeople.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.title}
                                </option>
                              ))}
                            </select>
                          </Field>
                        ))}
                      </div>
                      {(
                        [
                          ["purpose", "Purpose"],
                          ["trigger", "Starts when"],
                          ["inputs", "Needs"],
                          ["instructions", "Instructions"],
                          ["output", "Produces"],
                          ["humanGate", "Human decisions"],
                        ] as const
                      ).map(([k, label]) => (
                        <Field key={k} label={label}>
                          <textarea
                            rows={k === "instructions" ? 4 : 2}
                            disabled={applied}
                            value={t[k]}
                            onChange={(e) =>
                              updateItem("tasks", i, k, e.target.value)
                            }
                          />
                        </Field>
                      ))}
                      <Field label="Software and tools (one per line)">
                        <textarea
                          rows={2}
                          value={t.systems.join("\n")}
                          disabled={applied}
                          onChange={(e) =>
                            updateItem(
                              "tasks",
                              i,
                              "systems",
                              e.target.value.split("\n").filter(Boolean),
                            )
                          }
                        />
                      </Field>
                    </article>
                  ))}
                </div>
              )}
              {stage !== "agenda" && !applied && (
                <div className="journey-save">
                  <Field
                    label={
                      stage === "contact" || stage === "interviews"
                        ? "Response due"
                        : "Review due"
                    }
                  >
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </Field>
                  <p>
                    Saving records your review of this draft and the source
                    material. Requests are saved before any email is sent.
                  </p>
                  <Button
                    primary
                    disabled={
                      working || job?.stale || contactChanged || !dueDate
                    }
                    onClick={() => void apply()}
                  >
                    {stage === "contact"
                      ? "Save contact request"
                      : stage === "roster"
                        ? "Save reviewed team"
                        : stage === "interviews"
                          ? "Save all personal requests"
                          : "Save reviewed task cards"}
                  </Button>
                </div>
              )}
              {applied && (
                <div className="journey-row">
                  <Badge tone="sage">Saved</Badge>
                  {stage !== "tasks" ? (
                    <Button onClick={next}>
                      Continue to{" "}
                      {stages[
                        stages.findIndex((s) => s.id === stage) + 1
                      ].title.toLowerCase()}{" "}
                      <ArrowRight size={15} />
                    </Button>
                  ) : (
                    <>
                      <Button onClick={goTasks}>View task cards</Button>
                    </>
                  )}
                </div>
              )}
              <details className="journey-sources">
                <summary>Sources used for this draft</summary>
                {job?.input.sources.length ? (
                  job.input.sources.map((s: any) => (
                    <p key={s.id}>
                      {s.title} <small>· {s.kind.replaceAll("_", " ")}</small>
                    </p>
                  ))
                ) : (
                  <p>
                    No research collected yet. This draft uses only the company
                    name and contact details.
                  </p>
                )}
              </details>
            </div>
          )}
        </Panel>
      </div>
      {stage === "contact" && contactRequests.length > 0 && (
        <Panel
          title="Contact requests"
          subtitle="Preview the message, then send the private response link to your contact."
        >
          {requestRows(contactRequests, true)}
        </Panel>
      )}
      {stage === "agenda" && (
        <Panel
          title="Capture the leadership meeting"
          subtitle="Use the business-specific guide to capture the context behind the work. Add guided notes, a transcript, or both."
        >
          <p>
            The kickoff maps the business and responsibilities. Employees will
            supply the detailed task procedures in their personal interviews.
          </p>
          {meetingGuide.profileMissing ? (
            <p className="subtle">
              No operating model selected yet. Confirm how this business
              delivers value before assuming a process.
            </p>
          ) : (
            meetingGuide.models.map((model, i) => (
              <section key={i} className="notice kickoff-model">
                <strong>
                  {model.name === model.model
                    ? model.name
                    : `${model.name} · ${model.model}`}
                </strong>
                <p>Proposed flow to validate: {model.stages.join(" → ")}</p>
                <p>{model.probe}</p>
              </section>
            ))
          )}
          <div className="stack">
            {meetingGuide.sections.map((section) => (
              <details key={section.id}>
                <summary>
                  {section.title}
                  {meetingAnswers[section.id]?.trim() ? " · Notes added" : ""}
                </summary>
                <ul>
                  {section.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
                <Field label={`${section.title} — meeting notes`}>
                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={meetingAnswers[section.id] || ""}
                    onChange={(e) =>
                      setMeetingAnswers((previous) => ({
                        ...previous,
                        [section.id]: e.target.value,
                      }))
                    }
                    placeholder="Record what the team said, named owners, disagreements and follow-up questions. Leave unknown facts unresolved."
                  />
                </Field>
              </details>
            ))}
          </div>
          <Field label="Transcript or additional meeting notes">
            <textarea
              rows={12}
              value={meeting}
              maxLength={20000}
              onChange={(e) => setMeeting(e.target.value)}
              placeholder="Paste the executive kickoff transcript or write your meeting notes here…"
            />
          </Field>
          <p className="subtle">
            {meetingText.length.toLocaleString()} / 20,000 characters. Guided
            notes are optional when the transcript already covers these topics.
            Review gaps before saving; missing notes do not prove missing work.
          </p>
          {meetingText.length > 20000 && (
            <ErrorBox error="The combined notes exceed 20,000 characters. Shorten them before saving; nothing will be silently truncated." />
          )}
          <div className="journey-row">
            <p className="subtle">
              Review these notes before saving. They become the source for the
              team dossiers.
            </p>
            <Button
              primary
              disabled={
                busy ||
                [meeting, ...Object.values(meetingAnswers)].join(" ").trim()
                  .length < 20 ||
                meetingText.length > 20000
              }
              onClick={() =>
                void perform(async () => {
                  await api(base + "/meeting", "POST", {
                    title: "Executive kickoff notes",
                    text: meetingText,
                  });
                  setMeeting("");
                  setMeetingAnswers({});
                  setNotice(
                    "Meeting notes saved. Build the team dossiers next.",
                  );
                  setStage("roster");
                })
              }
            >
              <Mic size={16} />
              Save reviewed meeting notes
            </Button>
          </div>
          {meetingNotes.map((n) => (
            <p key={n.id}>
              <Button onClick={() => open(n)}>Read saved kickoff notes</Button>
            </p>
          ))}
        </Panel>
      )}
      {stage === "tasks" && applied && (
        <Panel
          title="One check from the people who do the work"
          subtitle="Each person gets the cards they own or perform, with the exact version you reviewed."
        >
          <div className="journey-metrics">
            <div>
              <strong>{confirmationTasks.length}</strong>
              <span>Cards awaiting a personal check</span>
            </div>
            <div>
              <strong>
                {savedTasks.filter((t) => !t.data.reviewed).length}
              </strong>
              <span>Cards that still need details</span>
            </div>
            <div>
              <strong>{confirmationRequests.filter(responseFor).length}</strong>
              <span>Checks returned</span>
            </div>
          </div>
          {confirmationTasks.length > 0 && (
            <div className="journey-row">
              <Field label="Task check due">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
              <Button
                primary
                disabled={busy || !dueDate}
                onClick={() => void createConfirmations()}
              >
                Prepare personal task checks
              </Button>
            </div>
          )}
          {savedTasks.some((t) => !t.data.reviewed) && (
            <p>
              Some cards still need an owner, performer or current evidence.
              Open Task cards to complete those details.
            </p>
          )}
          {confirmationRequests.length > 0 && (
            <>
              <div className="journey-row">
                <p>Review the requests below before sending.</p>
                <Button
                  primary
                  disabled={busy}
                  onClick={() => void sendAll(confirmationRequests)}
                >
                  <Mail size={16} />
                  Send pending task checks
                </Button>
              </div>
              {requestRows(confirmationRequests, true)}
            </>
          )}
          <details>
            <summary>Prepare a different check</summary>
            <Button onClick={prepareConfirmation}>
              Create a custom confirmation request
            </Button>
          </details>
        </Panel>
      )}
      {stage === "interviews" && currentTeamRequests.length > 0 && (
        <Panel
          title="Invitations and responses"
          subtitle="Send the prepared questions to the team. Each person gets their own private page."
        >
          <div className="journey-row">
            <p>
              {currentTeamRequests.filter(responseFor).length} of{" "}
              {currentTeamRequests.length} responses received
            </p>
            <Button
              primary
              disabled={busy || (!!draft && !applied)}
              onClick={() => void sendAll()}
            >
              <Mail size={16} />
              {busy ? "Sending…" : "Send pending team invitations"}
            </Button>
          </div>
          {!!draft && !applied && (
            <p className="notice amber">
              Save the new question sets above before sending. Earlier requests
              remain listed below.
            </p>
          )}
          {requestRows(currentTeamRequests, false)}
        </Panel>
      )}
    </div>
  );
}
