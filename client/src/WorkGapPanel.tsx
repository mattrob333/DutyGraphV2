import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, MessageCircle, Pause, Play, Settings } from "lucide-react";
import { api } from "./api.ts";
import { Button, ErrorBox, Modal } from "./ui.tsx";
import { TeamLink } from "./TeamLink.tsx";
import { buildGapFollowups, type WorkGap } from "../../shared/work-gaps.ts";
import "./work-gap.css";

type Person = { id: string; name: string; email: string; eligible: boolean };
type Request = {
  id: string;
  title: string;
  personId: string;
  state: string;
  questions: string[];
  gapKeys: string[];
  emailState?: string;
  replyState?: string;
  message?: string;
  streamId?: string;
  stageId?: string;
};
type Snapshot = {
  gaps: WorkGap[];
  policy: {
    enabled: boolean;
    message?: string;
    recipients: { personId: string; email: string }[];
  };
  people: Person[];
  capabilities: {
    emailConfigured: boolean;
    aiConfigured: boolean;
    sandbox: boolean;
  };
  profileHash: string;
  requests: Request[];
};
const pending = new Set([
  "queued",
  "running",
  "waiting_configuration",
  "sent",
  "draft",
]);

export function WorkGapPanel({
  companyId,
  streamId,
  stageId,
  refresh,
  revisionKey,
  openFollowup,
}: {
  companyId: string;
  streamId?: string;
  stageId?: string;
  refresh?: () => Promise<void>;
  revisionKey?: string;
  openFollowup?: (requestId: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [chosenStage, setChosenStage] = useState(stageId || ""),
    [automatic, setAutomatic] = useState(true),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const companyScope = useMemo(() => ({ companyId }), [companyId]);
  const companyRef = useRef(companyScope);
  companyRef.current = companyScope;
  const mounted = useRef(true),
    completed = useRef(new Set<string>()),
    knownGapScopes = useRef(
      new Map<string, { streamId: string; stageId: string }>(),
    );
  const load = async () => {
    const next = await api(`/v1/companies/${companyId}/work-gaps`);
    if (mounted.current && companyRef.current === companyScope)
      setSnapshot(next);
    return next as Snapshot;
  };
  useEffect(() => {
    mounted.current = true;
    setSnapshot(null);
    setError("");
    setSelected([]);
    setChosenStage(stageId || "");
    completed.current.clear();
    knownGapScopes.current.clear();
    void load().catch(
      (e) =>
        mounted.current &&
        companyRef.current === companyScope &&
        setError((e as Error).message),
    );
    return () => {
      mounted.current = false;
    };
  }, [companyId]);
  useEffect(() => {
    void load().catch(() => {});
  }, [revisionKey]);
  useEffect(() => setChosenStage(stageId || ""), [stageId]);
  useEffect(() => {
    snapshot?.gaps.forEach((gap) =>
      knownGapScopes.current.set(gap.key, {
        streamId: gap.streamId,
        stageId: gap.stageId,
      }),
    );
  }, [snapshot]);
  const allGaps = useMemo(
    () =>
      (snapshot?.gaps || []).filter(
        (gap) => !streamId || gap.streamId === streamId,
      ),
    [snapshot, streamId],
  );
  const choices = useMemo(
    () => [
      ...new Map(allGaps.map((gap) => [gap.stageId, gap.stageLabel])).entries(),
    ],
    [allGaps],
  );
  const activeStage = stageId || chosenStage;
  const gaps = useMemo(
    () => allGaps.filter((gap) => !activeStage || gap.stageId === activeStage),
    [allGaps, activeStage],
  );
  const history = useMemo(
    () =>
      (snapshot?.requests || []).filter((request) =>
        request.gapKeys.some((key) => {
          const scope =
            (request.streamId && request.stageId
              ? { streamId: request.streamId, stageId: request.stageId }
              : undefined) ||
            snapshot?.gaps.find((gap) => gap.key === key) ||
            knownGapScopes.current.get(key);
          return (
            !!scope &&
            (!streamId || scope.streamId === streamId) &&
            (!activeStage || scope.stageId === activeStage)
          );
        }),
      ),
    [snapshot, streamId, activeStage],
  );
  const asked = useMemo(
    () => new Set(history.flatMap((request) => request.gapKeys)),
    [history],
  );
  const available = useMemo(
    () => gaps.filter((gap) => !asked.has(gap.key)),
    [gaps, asked],
  );
  const people = useMemo(() => {
    const ids = new Set(available.flatMap((gap) => gap.personIds));
    return (snapshot?.people || []).filter((person) => ids.has(person.id));
  }, [snapshot, available]);
  const sandbox = !!snapshot?.capabilities.sandbox;
  const selectable = useMemo(
    () =>
      people.filter((person) => sandbox || (person.eligible && !!person.email)),
    [people, sandbox],
  );
  useEffect(() => {
    if (!open) return;
    const ids = selectable.map((person) => person.id);
    const preferred = buildGapFollowups(available, ids).map(
      (group) => group.personId,
    );
    setSelected((current) => {
      const retained = current.filter((id) => ids.includes(id));
      return retained.length ? retained : preferred;
    });
    setAutomatic(
      snapshot?.policy.recipients.length ? snapshot.policy.enabled : true,
    );
  }, [open, activeStage, snapshot?.profileHash]);
  const recipients = people.filter(
    (person) =>
      selected.includes(person.id) &&
      (sandbox || (person.eligible && !!person.email)),
  );
  const followups = useMemo(
    () => buildGapFollowups(available, selected),
    [available, selected],
  );
  const polling = history.some(
    (request) =>
      pending.has(request.emailState || "") ||
      pending.has(request.replyState || "") ||
      request.state === "sent",
  );
  useEffect(() => {
    if (!polling) return;
    const timer = window.setInterval(() => void load().catch(() => {}), 5000);
    return () => window.clearInterval(timer);
  }, [polling, companyId]);
  useEffect(() => {
    history.forEach((request) => {
      if (
        ["complete", "needs_review"].includes(request.replyState || "") &&
        !completed.current.has(request.id)
      ) {
        completed.current.add(request.id);
        void refresh?.()
          .then(() => load())
          .catch(() => {});
      }
    });
  }, [history, refresh]);
  const send = async () => {
    if (!snapshot || !activeStage || !available.length || !recipients.length)
      return;
    setBusy(true);
    setError("");
    try {
      const next = await api(
        `/v1/companies/${companyId}/work-gaps/run`,
        "POST",
        {
          streamId: streamId || available[0].streamId,
          stageId: activeStage,
          recipients: recipients.map(({ id, email }) => ({
            personId: id,
            email,
          })),
          automatic,
          profileHash: snapshot.profileHash,
        },
      );
      if (mounted.current && companyRef.current === companyScope) {
        setSnapshot(next);
        setOpen(false);
      }
    } catch (e) {
      if (mounted.current && companyRef.current === companyScope)
        setError((e as Error).message);
    } finally {
      if (mounted.current && companyRef.current === companyScope)
        setBusy(false);
    }
  };
  const policy = async () => {
    if (!snapshot) return;
    setBusy(true);
    try {
      const next = await api(
        `/v1/companies/${companyId}/work-gaps/policy`,
        "POST",
        {
          enabled: !snapshot.policy.enabled,
          recipients: snapshot.policy.recipients,
          profileHash: snapshot.profileHash,
        },
      );
      if (mounted.current && companyRef.current === companyScope)
        setSnapshot(next);
    } catch (e) {
      if (mounted.current && companyRef.current === companyScope)
        setError((e as Error).message);
    } finally {
      if (mounted.current && companyRef.current === companyScope)
        setBusy(false);
    }
  };
  if (!snapshot)
    return error ? (
      <section className="work-gap-panel">
        <ErrorBox error={error} />
        <Button
          onClick={() => {
            setError("");
            void load().catch((e) => setError((e as Error).message));
          }}
        >
          Retry gap check
        </Button>
      </section>
    ) : null;
  if (!gaps.length && !history.length && !snapshot.policy.recipients.length)
    return null;
  const status = (request: Request) =>
    request.message ||
    (request.emailState === "failed" || request.replyState === "failed"
      ? "Follow-up needs attention."
      : request.replyState === "complete"
        ? "Saved response was added to the work map."
        : request.replyState === "needs_review"
          ? "Saved response needs advisor review."
          : request.emailState === "accepted" && request.state === "sent"
            ? "Question sent; waiting for a response."
            : request.emailState === "paused"
              ? "Automatic follow-up is paused."
              : "Follow-up status is being checked.");
  return (
    <section
      className={`work-gap-panel${available.length ? "" : " work-gap-settled"}`}
      aria-labelledby="work-gap-title"
    >
      <div>
        <p className="eyebrow">WORK TO CLARIFY</p>
        <h3 id="work-gap-title">
          {available.length
            ? `${available.length} ${available.length === 1 ? "detail" : "details"} to fill in`
            : gaps.length
              ? "Follow-up status"
              : "Work details updated"}
        </h3>
        {available.length > 0 && (
          <p>Ask the people who do this work to fill in the missing details.</p>
        )}
      </div>
      <ErrorBox error={error || snapshot.policy.message || ""} />
      {!stageId && choices.length > 0 && (
        <label className="work-gap-stage">
          <span>Choose a stage to ask about</span>
          <select
            value={chosenStage}
            onChange={(e) => setChosenStage(e.target.value)}
          >
            <option value="">Choose a stage</option>
            {choices.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      {available.length > 0 && (
        <div className="work-gap-list">
          {available.slice(0, 3).map((gap) => (
            <article key={gap.key}>
              <strong>{gap.title}</strong>
              <p>{gap.detail}</p>
            </article>
          ))}
          {available.length > 3 && (
            <details>
              <summary>{available.length - 3} more details to fill in</summary>
              {available.slice(3).map((gap) => (
                <article key={gap.key}>
                  <strong>{gap.title}</strong>
                  <p>{gap.detail}</p>
                </article>
              ))}
            </details>
          )}
        </div>
      )}
      {history.length > 0 && (
        <details className="work-gap-history">
          <summary>Follow-up history ({history.length})</summary>
          {history.map((request) => (
            <p key={request.id}>
              <strong>
                {snapshot.people.find(
                  (person) => person.id === request.personId,
                )?.name || request.title}
                :
              </strong>{" "}
              {status(request)}
              {openFollowup && (
                <button
                  className="link"
                  onClick={() => openFollowup(request.id)}
                >
                  {request.replyState ? "Review reply" : "Open questions"}
                </button>
              )}
            </p>
          ))}
        </details>
      )}
      {snapshot.policy.recipients.length > 0 && (
        <div className="work-gap-policy">
          <span>
            {snapshot.policy.enabled
              ? "Automatic follow-up is on for"
              : "Automatic follow-up is paused for"}{" "}
            {snapshot.policy.recipients
              .map((recipient) => recipient.email)
              .join(", ")}
            .
          </span>
          <Button disabled={busy} onClick={() => void policy()}>
            {snapshot.policy.enabled ? <Pause size={15} /> : <Play size={15} />}
            {snapshot.policy.enabled ? "Pause" : "Resume"} follow-up
          </Button>
        </div>
      )}
      {available.length > 0 && (
        <div className="work-gap-actions">
          {(!snapshot.capabilities.emailConfigured ||
            !snapshot.capabilities.aiConfigured) &&
            !sandbox && (
              <a href="#settings">
                <Settings size={14} /> Configure{" "}
                {snapshot.capabilities.emailConfigured ? "AI" : "email"} in
                Workspace settings
              </a>
            )}
          <Button
            primary
            disabled={
              busy ||
              !activeStage ||
              !available.length ||
              !selectable.length ||
              (!snapshot.capabilities.emailConfigured && !sandbox)
            }
            onClick={() => setOpen(true)}
          >
            <MessageCircle size={16} /> Ask about this work
          </Button>
        </div>
      )}
      {available.length > 0 && !activeStage && (
        <p className="work-gap-unavailable">
          Choose one stage before preparing questions so each recipient sees
          only the work you selected.
        </p>
      )}
      {available.length > 0 && activeStage && !selectable.length && (
        <p className="work-gap-unavailable">
          No known eligible person is linked to these questions yet. Review the
          stage or its work assignments before sending a follow-up.
        </p>
      )}
      {open && (
        <Modal
          title={
            sandbox ? "Question preview" : "Send questions about this work"
          }
          subtitle="PRIVATE FOLLOW-UP"
          wide
          className="work-gap-modal"
          onClose={() => !busy && setOpen(false)}
        >
          <p>
            {sandbox
              ? "No emails sent. This is the same password-free response form a known person would receive."
              : "Review the exact recipients and questions before sending."}
          </p>
          <ErrorBox error={error} />
          <div className="work-gap-recipients">
            {people.map((person) => (
              <label
                key={person.id}
                className={
                  !sandbox && (!person.eligible || !person.email)
                    ? "blocked"
                    : ""
                }
              >
                <input
                  type="checkbox"
                  checked={selected.includes(person.id)}
                  disabled={!sandbox && (!person.eligible || !person.email)}
                  onChange={(e) =>
                    setSelected((current) =>
                      e.target.checked
                        ? [...current, person.id]
                        : current.filter((id) => id !== person.id),
                    )
                  }
                />
                <span>
                  <strong>{person.name}</strong>
                  <small>
                    {sandbox
                      ? "Preview recipient"
                      : person.email || "No stored email"}
                    {!sandbox && !person.eligible
                      ? " · unavailable for follow-up"
                      : ""}
                  </small>
                </span>
              </label>
            ))}
          </div>
          {sandbox ? (
            <div className="work-gap-form-preview">
              <TeamLink
                name={
                  people.find((person) => person.id === followups[0]?.personId)
                    ?.name || "there"
                }
                previewRequest={{
                  id: "work-gap-preview",
                  version: 1,
                  title: available[0]?.stageLabel || "Work follow-up",
                  questions: followups[0]?.questions || [],
                  gapFollowup: true,
                  stageLabel: available[0]?.stageLabel,
                }}
              />
            </div>
          ) : (
            <>
              {followups.map((followup) => (
                <div className="work-gap-followup" key={followup.personId}>
                  <strong>
                    {people.find((person) => person.id === followup.personId)
                      ?.name || "Selected person"}
                  </strong>
                  <ol className="work-gap-questions">
                    {followup.questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ol>
                </div>
              ))}
              <label className="check">
                <input
                  type="checkbox"
                  checked={automatic}
                  onChange={(e) => setAutomatic(e.target.checked)}
                />
                <span>
                  <strong>Keep checking for missing details</strong>
                  <small>
                    Future follow-ups go only to the selected known people.
                  </small>
                </span>
              </label>
              <div className="actions">
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  primary
                  disabled={busy || !followups.length}
                  onClick={() => void send()}
                >
                  <Mail size={16} /> {busy ? "Sending…" : "Send questions"}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </section>
  );
}
