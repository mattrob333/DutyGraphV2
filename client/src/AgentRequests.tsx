import { useEffect, useRef, useState } from "react";
import type { User } from "../../shared/domain.ts";
import {
  agentRequestStages,
  requestLabel,
} from "../../shared/agent-request.ts";
import { api, downloadFile } from "./api.ts";
import {
  Badge,
  Button,
  Empty,
  ErrorBox,
  Field,
  Heading,
  Panel,
} from "./ui.tsx";
import "./agent-requests.css";

export function AgentRequests({
  company,
  user,
}: {
  company: string;
  user: User;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [tab, setTab] = useState("requests"),
    [creating, setCreating] = useState(false),
    [selected, setSelected] = useState(""),
    [personId, setPerson] = useState("");
  const [scopes, setScopes] = useState([
    { system: "", resource: "", action: "" },
  ]);
  const [scenario, setScenario] = useState("standard");
  const generation = useRef(0);
  const endpoint = `/v1/companies/${company}/agent-requests`;
  async function load() {
    const g = generation.current;
    const next = await api(endpoint);
    if (g === generation.current) setData(next);
  }
  useEffect(() => {
    generation.current++;
    setData(null);
    setSelected("");
    setPerson("");
    setCreating(false);
    setError("");
    setMessage("");
    void load().catch((e) => setError(e.message));
    return () => {
      generation.current++;
    };
  }, [company]);
  async function run(fn: () => Promise<any>) {
    const g = generation.current;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await fn();
      if (g !== generation.current) return;
      await load();
      if (result?.message) setMessage(result.message);
      return result;
    } catch (e) {
      if (g === generation.current) setError((e as Error).message);
    } finally {
      if (g === generation.current) setBusy(false);
    }
  }
  const chosen = personId || data?.people[0]?.id || "";
  const request = data?.requests.find((r: any) => r.id === selected);
  const advisor = user.role === "advisor";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const result = await run(() =>
      api(endpoint, "POST", {
        title: f.get("title"),
        personId: chosen,
        purpose: f.get("purpose"),
        taskIds: f.getAll("taskIds"),
        requestedScopes: scopes.filter(
          (s) => s.system || s.action || s.resource,
        ),
        humanCheckpoint: f.get("humanCheckpoint"),
      }),
    );
    if (result?.id) {
      setSelected(result.id);
      setCreating(false);
      setScopes([{ system: "", resource: "", action: "" }]);
    }
  }
  return (
    <div className="agent-requests">
      <Heading
        eyebrow="SIGNET · AGENT GOVERNANCE"
        title="Request the help. Define the boundaries."
        description="Follow each agent request from the person's work to an exact manifest, review and issuance checks."
        actions={
          <>
            <Button disabled={busy} onClick={() => void run(load)}>
              Refresh
            </Button>
            <Button
              primary
              disabled={busy || !data?.people.length}
              onClick={() => {
                setCreating(!creating);
                setSelected("");
              }}
            >
              Request an agent
            </Button>
          </>
        }
      />
      <div className="agent-request-stages">
        {agentRequestStages.map(([name, detail], i) => (
          <div key={name}>
            <span>0{i + 1}</span>
            <strong>{name}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </div>
      <ErrorBox error={error} />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <p className="notice">
        Requests, manifest drafts and independent business reviews are
        available. Identity feeds, policy checks, notary authority and Signet
        issuance still need to be connected. No agent receives access from a
        draft.
      </p>
      <nav className="tabs" aria-label="Agent governance views">
        {[
          ["requests", "Requests & manifests"],
          ["access", "Identity & policy"],
          ["audit", "Auditor view"],
        ].map(([id, label]) => (
          <Button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </nav>
      {!data ? (
        <p role="status">Loading agent requests…</p>
      ) : (
        <>
          {data.demoAvailable && advisor && (
            <Panel
              title="See the connected example"
              subtitle="Fictional Tariq Ali requests a supplier assistant. Inspect vendor-shaped records, policy checks and a simulated notary review. No vendor is contacted."
            >
              <div className="demo-toolbar">
                <label htmlFor="demo-scenario">Example</label>
                <select
                  id="demo-scenario"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  <option value="standard">
                    Two allowed scopes · one excluded
                  </option>
                  <option value="inactive">Worker has left the company</option>
                  <option value="stale">Identity data is out of date</option>
                  <option value="conflict">Conflicting access</option>
                </select>
                <Button
                  primary
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      api(`${endpoint}/demo`, "POST", { scenario }),
                    ).then((r) => {
                      if (r?.id) {
                        setSelected(r.id);
                        setTab("requests");
                      }
                    })
                  }
                >
                  Create demo request
                </Button>
              </div>
            </Panel>
          )}
          {creating && (
            <Panel
              title="What would you like an agent to do?"
              subtitle="Describe the task in your own words. The system will retain the person and task versions used for the manifest."
            >
              <form onSubmit={submit} className="agent-request-form">
                <Field label="Person requesting help">
                  <select
                    value={chosen}
                    disabled={!advisor || busy}
                    onChange={(e) => setPerson(e.target.value)}
                  >
                    {data.people.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.title} · {p.department} · {p.role}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Agent request name">
                  <input
                    name="title"
                    required
                    maxLength={200}
                    placeholder="Help prepare supplier records"
                  />
                </Field>
                <Field label="What result do you need?">
                  <textarea
                    name="purpose"
                    required
                    minLength={10}
                    maxLength={4000}
                    rows={3}
                    placeholder="Describe the work, inputs and the result you want."
                  />
                </Field>
                <fieldset>
                  <legend>Related task cards</legend>
                  <p className="subtle">
                    Choose the work this person owns or performs. If it is not
                    mapped yet, submit the request and record the task before
                    issuance.
                  </p>
                  <div className="agent-task-choices" key={chosen}>
                    {data.tasks
                      .filter((t: any) =>
                        [t.ownerId, t.performerId].includes(chosen),
                      )
                      .map((t: any) => (
                        <label key={t.id}>
                          <input type="checkbox" name="taskIds" value={t.id} />
                          <span>{t.title}</span>
                        </label>
                      ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Requested software access</legend>
                  <p className="subtle">
                    These are requested actions. They do not grant permission.
                    Leave blank if you need help identifying the software.
                  </p>
                  {scopes.map((s, i) => (
                    <div className="agent-scope-row" key={i}>
                      {(["system", "resource", "action"] as const).map((k) => (
                        <Field
                          key={k}
                          label={
                            {
                              system: "Software",
                              resource: "Specific resource",
                              action: "Action needed",
                            }[k]
                          }
                        >
                          <input
                            value={s[k]}
                            maxLength={200}
                            required={!!(s.system || s.resource || s.action)}
                            placeholder={
                              {
                                system: "Google Drive",
                                resource: "Supplier intake folder",
                                action: "Read documents",
                              }[k]
                            }
                            onChange={(e) =>
                              setScopes(
                                scopes.map((x, n) =>
                                  n === i ? { ...x, [k]: e.target.value } : x,
                                ),
                              )
                            }
                          />
                        </Field>
                      ))}
                    </div>
                  ))}
                  <Button
                    disabled={scopes.length >= 20 || busy}
                    onClick={() =>
                      setScopes([
                        ...scopes,
                        { system: "", resource: "", action: "" },
                      ])
                    }
                  >
                    Add software access
                  </Button>
                </fieldset>
                <Field label="When should the agent stop and ask a person?">
                  <textarea
                    name="humanCheckpoint"
                    rows={2}
                    required
                    minLength={3}
                    maxLength={2000}
                    placeholder="Ask me before changing a record or contacting a supplier."
                  />
                </Field>
                <div className="actions">
                  <Button primary type="submit" disabled={busy || !chosen}>
                    {busy ? "Saving…" : "Submit request"}
                  </Button>
                  <Button disabled={busy} onClick={() => setCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Panel>
          )}
          {tab === "access" ? (
            <Panel
              title="Sources that establish authority"
              subtitle="Company role descriptions help explain the request. Effective permissions must be checked against current authoritative systems."
            >
              <div className="agent-authority-grid">
                {data.authorityChecks.map((c: any) => (
                  <section key={c.key}>
                    <Badge tone="amber">{c.status}</Badge>
                    <h3>{c.title}</h3>
                    <strong>{c.source}</strong>
                    <p>{c.detail}</p>
                  </section>
                ))}
              </div>
              <p className="subtle">
                Eligible scope must fit the task, the owner's delegable
                authority, company policy and runtime limits. A role title or an
                AI suggestion is not an access grant.
              </p>
            </Panel>
          ) : (
            <>
              <Panel
                title={
                  tab === "audit"
                    ? "Trace a request to its evidence"
                    : "Agent requests"
                }
                subtitle={
                  tab === "audit"
                    ? "Requested access and granted access stay separate. Select a request to inspect its versioned owner, tasks, software and review."
                    : "Select a request to prepare its manifest or inspect progress."
                }
              >
                {!data.requests.length ? (
                  <Empty
                    title="No agent requests yet"
                    detail="Start with a task someone needs help doing. Their request becomes a tracked record with a clear next step."
                    action={
                      <Button
                        primary
                        disabled={!data.people.length}
                        onClick={() => setCreating(true)}
                      >
                        Request an agent
                      </Button>
                    }
                  />
                ) : (
                  <div className="agent-request-list">
                    {data.requests.map((r: any) => (
                      <button
                        key={r.id}
                        className={selected === r.id ? "selected" : ""}
                        onClick={() => setSelected(r.id)}
                      >
                        <span>
                          <strong>{r.title}</strong>
                          <small>
                            {data.people.find(
                              (p: any) => p.id === r.data.personId,
                            )?.title || "Person record unavailable"}{" "}
                            · {r.data.requestedScopes.length} requested scopes ·
                            0 granted
                          </small>
                        </span>
                        <Badge tone={r.manifestCurrent ? "blue" : "neutral"}>
                          {r.data.manifest && !r.manifestCurrent
                            ? "Source changed · rebuild manifest"
                            : requestLabel(r.state)}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </Panel>
              {request && (
                <Panel
                  title={request.title}
                  subtitle={`Request version ${request.version} · ${requestLabel(request.state)}`}
                >
                  <p>{request.data.purpose}</p>
                  <div className="agent-trace">
                    <div>
                      <small>PERSON</small>
                      <strong>
                        {data.people.find(
                          (p: any) => p.id === request.data.personId,
                        )?.title || "Unavailable"}
                      </strong>
                    </div>
                    <span aria-hidden="true">→</span>
                    <div>
                      <small>REQUESTED AGENT</small>
                      <strong>{request.title}</strong>
                    </div>
                    <span aria-hidden="true">→</span>
                    <div>
                      <small>REQUESTED ACCESS</small>
                      <strong>
                        {request.data.requestedScopes.length} scopes · none
                        granted
                      </strong>
                    </div>
                  </div>
                  <h3>Software and scope</h3>
                  {request.data.requestedScopes.length ? (
                    <div className="agent-scope-table">
                      {request.data.requestedScopes.map((s: any, i: number) => (
                        <div key={i}>
                          <strong>{s.system}</strong>
                          <span>{s.resource}</span>
                          <span>{s.action}</span>
                          <Badge>Requested</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="subtle">
                      Software access has not been identified yet.
                    </p>
                  )}
                  <h3>Human checkpoint</h3>
                  <p>{request.data.humanCheckpoint}</p>
                  {request.data.simulation && (
                    <Badge tone="amber">Simulation · no live grants</Badge>
                  )}
                  {request.data.manifest?.authorityContext && (
                    <>
                      <h3>How the sources shape the manifest</h3>
                      <p>
                        Workday is the primary HR source; Okta is the primary
                        identity source. Oracle HCM and Entra illustrate
                        alternative adapters. Sample IDs link these records to
                        Tariq. The company policy fixture supplies the access
                        ceiling and SOP.
                      </p>
                      <div className="agent-authority-grid">
                        {request.data.manifest.authorityContext.snapshots.map(
                          (s: any) => (
                            <section key={s.id}>
                              <Badge>Simulated source</Badge>
                              <h3>{s.vendor}</h3>
                              <p>{s.version}</p>
                              <p>{s.format}</p>
                              <details>
                                <summary>Inspect source record</summary>
                                <p>{s.endpoint}</p>
                                <p>
                                  Captured:{" "}
                                  {new Date(s.capturedAt).toLocaleString()}
                                </p>
                                <pre className="agent-snapshot">
                                  {JSON.stringify(s.raw, null, 2)}
                                </pre>
                                {s.documentation && (
                                  <a
                                    href={s.documentation}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    API documentation
                                  </a>
                                )}
                              </details>
                            </section>
                          ),
                        )}
                      </div>
                      <h3>Requested access → eligible access</h3>
                      {request.data.manifest.scopeEvaluation.decisions.map(
                        (d: any, i: number) => (
                          <div className="agent-demo-result" key={i}>
                            <Badge tone={d.allowed ? "blue" : "amber"}>
                              {d.allowed ? "Eligible in demo" : "Excluded"}
                            </Badge>
                            <p>
                              <strong>
                                {d.scope.system} · {d.scope.resource} ·{" "}
                                {d.scope.action}
                              </strong>
                            </p>
                            <p>{d.reason}</p>
                          </div>
                        ),
                      )}
                      <h3>Instructions from SOP-SUP-004 · v3</h3>
                      <p>{request.data.manifest.instructions}</p>
                      <div className="actions">
                        <Button
                          disabled={
                            busy ||
                            !request.manifestCurrent ||
                            request.state === "withdrawn" ||
                            !!request.data.manifest.scopeEvaluation.blockers
                              .length
                          }
                          onClick={() =>
                            void run(() =>
                              api(
                                `${endpoint}/${request.id}/simulate`,
                                "POST",
                                {
                                  expectedVersion: request.version,
                                  manifestHash: request.data.manifestHash,
                                  action: "review",
                                },
                              ),
                            )
                          }
                        >
                          Simulate notary review
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            !request.manifestCurrent ||
                            request.state !== "demo_reviewed"
                          }
                          onClick={() =>
                            void run(() =>
                              api(
                                `${endpoint}/${request.id}/simulate`,
                                "POST",
                                {
                                  expectedVersion: request.version,
                                  manifestHash: request.data.manifestHash,
                                  action: "issue",
                                },
                              ),
                            )
                          }
                        >
                          Simulate issuance
                        </Button>
                      </div>
                      {request.data.demoReview && (
                        <p className="notice">
                          Sample review by {request.data.demoReview.notary}. The
                          excluded bank-change scope stays outside the proposed
                          grant. This is an unsigned demonstration.
                        </p>
                      )}
                      {request.data.demoIssuance && (
                        <p className="notice">
                          Issuance simulated for{" "}
                          {request.data.demoIssuance.eligibleScopes.length}{" "}
                          scopes. Sample expiry:{" "}
                          {new Date(
                            request.data.demoIssuance.expiresAt,
                          ).toLocaleString()}
                          . No identity, credential or runtime was created.
                        </p>
                      )}
                    </>
                  )}
                  {request.data.manifest && (
                    <>
                      <h3>Manifest and evidence</h3>
                      <p>
                        {request.data.manifest.owner.name} ·{" "}
                        {request.data.manifest.owner.department} ·{" "}
                        {request.data.manifest.owner.role}
                      </p>
                      <p className="subtle">
                        {request.data.manifest.owner.basis}.{" "}
                        {request.data.manifest.taskBindings.length} exact task
                        versions bound to this draft.
                      </p>
                      {request.data.manifest.tasks.map((t: any) => (
                        <details key={t.id}>
                          <summary>
                            {t.title} · v{t.version}
                          </summary>
                          <p className="agent-instructions">{t.instructions}</p>
                          <p>Checkpoint: {t.humanCheckpoint}</p>
                        </details>
                      ))}
                      {request.data.manifest.aiSuggestion && (
                        <details open>
                          <summary>AI draft · review required</summary>
                          <p>
                            {request.data.manifest.aiSuggestion.draft.summary}
                          </p>
                          {request.data.manifest.aiSuggestion.draft.tasks.map(
                            (t: any, i: number) => (
                              <div key={i}>
                                <h4>{t.title}</h4>
                                <p>{t.instructions}</p>
                              </div>
                            ),
                          )}
                          <ul>
                            {request.data.manifest.aiSuggestion.draft.questions.map(
                              (q: string, i: number) => (
                                <li key={i}>{q}</li>
                              ),
                            )}
                          </ul>
                        </details>
                      )}
                      <details>
                        <summary>Manifest hash and source bindings</summary>
                        <code className="agent-hash">
                          {request.data.manifestHash}
                        </code>
                        <p>
                          Owner record v{request.data.manifest.owner.version};
                          task versions remain in the downloaded package.
                        </p>
                      </details>
                    </>
                  )}
                  {request.data.review && (
                    <p className="notice">
                      {requestLabel(request.data.review.decision)} by{" "}
                      {request.data.review.actorName}:{" "}
                      {request.data.review.note}. This is a business review, not
                      a signed authority grant.
                    </p>
                  )}
                  <div className="actions">
                    {advisor && request.state !== "withdrawn" && (
                      <>
                        <Button
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              api(
                                `${endpoint}/${request.id}/manifest`,
                                "POST",
                                { expectedVersion: request.version },
                              ),
                            )
                          }
                        >
                          Prepare manifest
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            !data.aiConfigured ||
                            request.data.simulation
                          }
                          onClick={() =>
                            void run(() =>
                              api(
                                `${endpoint}/${request.id}/ai-draft`,
                                "POST",
                                {
                                  expectedVersion: request.version,
                                  consent: true,
                                },
                              ),
                            )
                          }
                        >
                          {busy ? "Working…" : "Draft manifest with AI"}
                        </Button>
                      </>
                    )}
                    {request.data.manifest && (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            downloadFile(
                              `/api${endpoint}/${request.id}/manifest`,
                              `agent-manifest-${request.id}.json`,
                            ),
                          )
                        }
                      >
                        Download draft manifest
                      </Button>
                    )}
                    {request.state !== "withdrawn" && (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            api(`${endpoint}/${request.id}/withdraw`, "POST", {
                              expectedVersion: request.version,
                            }),
                          )
                        }
                      >
                        Withdraw request
                      </Button>
                    )}
                  </div>
                  {advisor && (
                    <p className="subtle">
                      AI drafting sends this request, the person's role record
                      and linked task excerpts to the configured OpenAI account.{" "}
                      {data.aiConfigured
                        ? "The button starts a provider request. Up to 10 AI attempts per account per day."
                        : "Configure OpenAI in Workspace settings to enable it."}
                    </p>
                  )}
                  {advisor &&
                    !request.data.simulation &&
                    request.data.manifest &&
                    request.manifestCurrent &&
                    request.state !== "withdrawn" && (
                      <form
                        className="agent-request-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void run(() =>
                            api(`${endpoint}/${request.id}/review`, "POST", {
                              expectedVersion: request.version,
                              manifestHash: request.data.manifestHash,
                              decision: f.get("decision"),
                              note: f.get("note"),
                            }),
                          );
                        }}
                      >
                        <h3>Independent business review</h3>
                        <p className="subtle">
                          A different advisor reviews this exact manifest.
                          Notary authorization is a separate policy-backed step.
                        </p>
                        <Field label="Decision">
                          <select name="decision">
                            <option value="reviewed">
                              Business review complete
                            </option>
                            <option value="changes_requested">
                              Changes needed
                            </option>
                          </select>
                        </Field>
                        <Field label="Review note">
                          <textarea
                            name="note"
                            required
                            minLength={3}
                            maxLength={2000}
                          />
                        </Field>
                        <Button
                          type="submit"
                          disabled={
                            busy || request.data.requesterUserId === user.id
                          }
                        >
                          Record business review
                        </Button>
                        {request.data.requesterUserId === user.id && (
                          <p className="subtle">
                            You submitted this request. A different advisor must
                            review it.
                          </p>
                        )}
                      </form>
                    )}
                  <div className="notice amber">
                    <strong>Live issuance unavailable.</strong> Identity, policy, notary
                    authority and Signet/runtime connections are not configured.
                    No credential or agent has been issued.
                  </div>
                </Panel>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
export function TeamAgentPortal({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  return (
    <main className="team-agent-portal">
      <div className="actions">
        <a href="/">Back to my questions</a>
        <Button onClick={onLogout}>Sign out</Button>
      </div>
      <AgentRequests company={user.company_id!} user={user} />
    </main>
  );
}
