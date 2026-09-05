import { useEffect, useState, lazy, Suspense, type ReactNode } from "react";
import {
  ArrowRight,
  LayoutGrid,
  Mic,
  Network,
  Layers,
  Compass,
  ShieldCheck,
  Activity,
  FileText,
  Database,
  Settings,
  Search,
  Sun,
  Moon,
  Menu,
  Plus,
  LogOut,
  ChevronDown,
  Clock,
  Check,
  Upload,
  Download,
  AlertTriangle,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { api, setCsrf, downloadExport } from "./api.ts";
import {
  Badge,
  Button,
  Empty,
  ErrorBox,
  Field,
  Heading,
  Modal,
  Panel,
  Row,
  State,
  date,
} from "./ui.tsx";
import { RecordForm } from "./forms.tsx";
import { Graph } from "./Graph.tsx";
import { Engagement } from "./Engagement.tsx";
import { AiWorkbench } from "./AiWorkbench.tsx";
import { BusinessResearch } from "./BusinessResearch.tsx";
import { ProviderSettings } from "./ProviderSettings.tsx";
import { ClientReports } from "./ClientReports.tsx";
const Help = lazy(() =>
  import("./Help.tsx").then((module) => ({ default: module.Help })),
);
import { Detail } from "./Detail.tsx";
import { Participant, NetworkMark } from "./capture.tsx";
import type { Company, RecordRow, User } from "../../shared/domain.ts";
const nav = [
  { id: "overview", name: "Overview", icon: LayoutGrid, group: "" },
  {
    id: "discovery",
    name: "Discovery",
    icon: Mic,
    group: "DISCOVER THE BUSINESS",
  },
  { id: "graph", name: "Company graph", icon: Network, group: "" },
  { id: "tasks", name: "Task cards", icon: Layers, group: "" },
  { id: "workflows", name: "Workflows & cases", icon: Network, group: "" },
  {
    id: "strategy",
    name: "Strategy",
    icon: Compass,
    group: "FIND WHAT MATTERS",
  },
  {
    id: "governance",
    name: "Agent governance",
    icon: ShieldCheck,
    group: "GOVERN THE WORK",
  },
  {
    id: "weekly",
    name: "Weekly review",
    icon: Activity,
    group: "KEEP IT MOVING",
  },
  { id: "deliverables", name: "Deliverables", icon: FileText, group: "" },
  {
    id: "system",
    name: "System & connections",
    icon: Database,
    group: "WORKSPACE",
  },
  { id: "settings", name: "Workspace settings", icon: Settings, group: "" },
  { id: "help", name: "Help & training", icon: BookOpen, group: "" },
];
type ModalState =
  | { type: "record"; id: string }
  | {
      type: "form";
      kind: string;
      id?: string;
      preset?: Record<string, unknown>;
    }
  | { type: "search" }
  | { type: "roster" }
  | { type: "company" }
  | { type: "framework"; key: string }
  | null;
function Login({ onLogin }: { onLogin: (result: any) => void }) {
  const [mode, setMode] = useState("login"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [demo, setDemo] = useState(false);
  useEffect(() => {
    api("/auth/options")
      .then((r) => setDemo(r.demo))
      .catch(() => {});
  }, []);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      onLogin(
        await api(
          "/auth/" + (mode === "login" ? "login" : "register"),
          "POST",
          data,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-story">
        <div className="brand">
          <NetworkMark />
          <span>
            Duty Graph<small>CONNECTED COMPANY WORKSPACE</small>
          </span>
        </div>
        <div>
          <div className="eyebrow">ONE COMPANY. ONE CONNECTED RECORD.</div>
          <h1>
            Understand the work.
            <br />
            Keep the human
            <br />
            accountable.
          </h1>
          <p>
            Capture the evidence. Find what limits progress. Define the work
            before you delegate it.
          </p>
          <div className="login-chain">
            <span>
              <Mic />
              Discover
            </span>
            <ArrowRight />
            <span>
              <Compass />
              Diagnose
            </span>
            <ArrowRight />
            <span>
              <ShieldCheck />
              Govern
            </span>
          </div>
        </div>
        <small>Duty Graph · LiveFrameworks · Pedigree · Signet</small>
      </div>
      <div className="login-form">
        <div className="eyebrow">YOUR COMPANY WORKSPACE</div>
        <h2>
          {mode === "login" ? "Welcome back." : "Start with a bounded scope."}
        </h2>
        <p>
          {mode === "login"
            ? "Sign in to your evidence and work records."
            : "Create a separate account and company record."}
        </p>
        <ErrorBox error={error} />
        <form onSubmit={submit}>
          {mode === "register" && (
            <Field label="Your name">
              <input name="name" autoComplete="name" required />
            </Field>
          )}
          <Field label="Email">
            <input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              minLength={mode === "register" ? 10 : 1}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
            />
          </Field>
          {mode === "register" && (
            <>
              <Field label="Company name">
                <input name="companyName" required />
              </Field>
              <Field label="Work to understand">
                <input
                  name="scope"
                  placeholder="For example, supplier onboarding"
                  required
                />
              </Field>
              <Field label="Business outcome">
                <textarea name="goal" rows={2} required />
              </Field>
            </>
          )}
          <Button type="submit" primary disabled={busy}>
            {busy
              ? "Opening…"
              : mode === "login"
                ? "Sign in"
                : "Create workspace"}
            <ArrowRight size={16} />
          </Button>
        </form>
        <button
          className="text-link"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Create your own workspace"
            : "Already have an account? Sign in"}
        </button>
        {demo && (
          <div className="demo-entry">
            <p>Explore the supplied V2 scenario.</p>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  onLogin(await api("/auth/demo", "POST", {}));
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Open sample workspace <ArrowRight size={16} />
            </Button>
            <small>Synthetic Cobalt data. Saved locally in PostgreSQL.</small>
          </div>
        )}
        <p className="subtle">
          Advisor pilot · connect your API keys in Workspace settings.
        </p>
      </div>
    </div>
  );
}
function Invitation({
  token,
  onLogin,
}: {
  token: string;
  onLogin: (result: any) => void;
}) {
  const [info, setInfo] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/invitations/" + token)
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, [token]);
  return (
    <div className="invitation-page">
      <div className="brand">
        <NetworkMark />
        <span>
          Duty Graph<small>PRIVATE PARTICIPANT INVITATION</small>
        </span>
      </div>
      <Panel title={info ? "Welcome, " + info.name : "Your private invitation"}>
        <ErrorBox error={error} />
        {info && (
          <>
            <p>
              {info.company} invited you to respond to{" "}
              <strong>{info.title}</strong>.
            </p>
            <div className="notice">{info.notice}</div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                setBusy(true);
                setError("");
                try {
                  const result = await api(
                    "/invitations/" + token + "/enroll",
                    "POST",
                    { password: form.get("password"), acknowledged: true },
                  );
                  window.history.replaceState(null, "", "/");
                  onLogin(result);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Create your password (or use your existing participant password)">
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </Field>
              <label className="check">
                <input type="checkbox" required />I am the intended recipient
                and understand the notice.
              </label>
              <Button primary type="submit" disabled={busy}>
                {busy ? "Opening…" : "Open my assigned request"}
                <ArrowRight size={16} />
              </Button>
            </form>
          </>
        )}
        <p>
          <a href="/">Return to sign in</a>
        </p>
      </Panel>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true);
  const login = (r: any) => {
    setCsrf(r.csrf);
    setUser(r.user);
    setLoading(false);
  };
  useEffect(() => {
    api("/auth/me")
      .then(login)
      .catch(() => setLoading(false));
  }, []);
  const logout = async () => {
    try {
      await api("/auth/logout", "POST", {});
    } finally {
      setUser(null);
      setCsrf("");
      window.history.replaceState(null, "", "/");
    }
  };
  const token = window.location.pathname.match(
    /^\/invite\/([a-f0-9]{64})$/,
  )?.[1];
  if (token) return <Invitation token={token} onLogin={login} />;
  if (loading)
    return (
      <div className="boot">
        <NetworkMark />
        <p>Opening your workspace…</p>
      </div>
    );
  if (!user) return <Login onLogin={login} />;
  if (user.role === "participant")
    return <Participant user={user} onLogout={() => void logout()} />;
  return <Workspace user={user} logout={() => void logout()} />;
}
function Workspace({ user, logout }: { user: User; logout: () => void }) {
  const [companies, setCompanies] = useState<Company[]>([]),
    [companyId, setCompanyId] = useState(""),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(window.location.hash.slice(1) || "overview"),
    [tab, setTab] = useState("research"),
    [strategyTab, setStrategyTab] = useState("frameworks"),
    [modal, setModal] = useState<ModalState>(null),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [toast, setToast] = useState(""),
    [theme, setTheme] = useState(
      () => localStorage.getItem("dg-theme") || "dark",
    );
  const records: RecordRow[] = data?.records || [];
  const company: Company | undefined = data?.company;
  const items = (kind: string) => records.filter((r) => r.kind === kind);
  const loadCompanies = async () => {
    const c = await api<Company[]>("/v1/companies");
    setCompanies(c);
    setCompanyId((old) => (c.some((x) => x.id === old) ? old : c[0]?.id || ""));
  };
  const refresh = async () => {
    if (!companyId) return;
    try {
      const d = await api("/v1/companies/" + companyId + "/workspace");
      setData(d);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void loadCompanies().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setData(null);
    void refresh();
  }, [companyId]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("dg-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setModal({ type: "search" });
      }
    };
    window.addEventListener("keydown", key);
    const hash = () => {
      setPage(window.location.hash.slice(1) || "overview");
    };
    window.addEventListener("hashchange", hash);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  const go = (p: string) => {
    window.location.hash = p;
    setPage(p);
    setQuery("");
    setFilter("all");
    setMobile(false);
    window.scrollTo(0, 0);
  };
  const open = (r: RecordRow) => setModal({ type: "record", id: r.id });
  const create = (kind: string) => setModal({ type: "form", kind });
  const run = async (fn: () => Promise<any>, success?: string) => {
    try {
      await fn();
      await refresh();
      if (success) setToast(success);
    } catch (e) {
      setToast((e as Error).message);
    }
  };
  const recordModal =
    modal && (modal.type === "record" || (modal.type === "form" && modal.id))
      ? records.find((r) => r.id === modal.id)
      : undefined;
  const tasks = items("task"),
    confirmed = tasks.filter((t) => t.state === "confirmed"),
    evidence = items("evidence"),
    people = items("person"),
    responses = items("response"),
    candidate = items("candidate")[0],
    pending = responses.filter((r) => r.state === "returned"),
    conflicts = tasks.filter((t) => ["conflicting", "stale"].includes(t.state));
  const personName = (id: string) =>
    people.find((p) => p.id === id)?.title || "Unresolved";
  const rows = (list: RecordRow[]) =>
    list.length ? (
      list.map((r) => (
        <Row
          key={r.id}
          title={r.title}
          detail={
            r.kind === "person"
              ? `${r.data.role} · ${r.data.team}`
              : r.kind === "task"
                ? `${personName(r.data.ownerId)} · v${r.version}`
                : `${r.kind} · ${date(r.updated_at)}`
          }
          onClick={() => open(r)}
        >
          <State value={r.state} />
        </Row>
      ))
    ) : (
      <Empty
        title="No records yet"
        detail="Add a record when the supporting information is available."
      />
    );
  const makeExport = (kind: string) =>
    run(async () => {
      const r = await api(`/v1/companies/${companyId}/exports`, "POST", {
        kind,
      });
      open(r);
    }, "Frozen export created.");
  let body: ReactNode;
  if (!company)
    body = <div className="loading">Loading the company record…</div>;
  else if (page === "overview")
    body = (
      <>
        <Heading
          eyebrow="ONE COMPANY. ONE CONNECTED RECORD."
          title={company.name}
          description={`${company.scope} · ${people.length} participants across ${new Set(people.map((p) => p.data.team)).size} teams`}
          actions={
            <>
              <Button onClick={() => go("graph")}>
                <Network size={17} />
                View company graph
              </Button>
              <Button primary onClick={() => go("discovery")}>
                <ArrowRight size={17} />
                Continue discovery
              </Button>
            </>
          }
        />
        <div className="journey">
          {[
            ["01", "Discover", "Capture how work happens", "discovery", Mic],
            [
              "02",
              "Diagnose",
              "Find the next limiting factor",
              "strategy",
              Compass,
            ],
            [
              "03",
              "Govern",
              "Delegate with clear boundaries",
              "governance",
              ShieldCheck,
            ],
          ].map(([n, title, sub, to, Icon]: any) => (
            <button key={n} onClick={() => go(to)}>
              <span className="step-number">{n}</span>
              <Icon size={18} />
              <span className="grow">
                <strong>{title}</strong>
                <small>{sub}</small>
              </span>
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
        <div className="stats">
          {[
            [
              "Interview responses",
              responses.length,
              "/ " + people.length,
              "Review returned responses",
              "discovery",
              Mic,
            ],
            [
              "Task cards",
              tasks.length,
              "",
              `${confirmed.length} confirmed by their people`,
              "tasks",
              Layers,
            ],
            [
              "Evidence sources",
              evidence.length,
              "",
              "Every source keeps its origin",
              "discovery",
              FileText,
            ],
            [
              "Agent proposals",
              items("agent").length,
              "",
              "No agents deployed",
              "governance",
              ShieldCheck,
            ],
          ].map(([label, value, sub, detail, to, Icon]: any) => (
            <button className="stat" key={label} onClick={() => go(to)}>
              <span>
                {label}
                <Icon size={16} />
              </span>
              <strong>
                {value}
                <small>{sub}</small>
              </strong>
              <p>{detail} ↗</p>
            </button>
          ))}
        </div>
        <div className="overview-columns">
          <div className="stack">
            {candidate ? (
              <section className="candidate-hero">
                <div className="toolbar">
                  <span className="eyebrow">
                    <Compass size={15} /> THE NEXT THING TO UNDERSTAND
                  </span>
                  <State value={candidate.state} />
                </div>
                <h2>{candidate.title}</h2>
                <p>{candidate.data.pressure}</p>
                <div className="source-chips">
                  {candidate.data.evidenceIds.map((id: string) => {
                    const r = records.find((x) => x.id === id);
                    return (
                      r && (
                        <button key={id} onClick={() => open(r)}>
                          <FileText size={12} />
                          {r.title}
                        </button>
                      )
                    );
                  })}
                  <small>No measured impact yet</small>
                </div>
                <footer>
                  <span>
                    <strong>Next move:</strong> {candidate.data.discriminator}
                  </span>
                  <Button onClick={() => open(candidate)}>
                    <ArrowRight size={16} />
                    Review the evidence
                  </Button>
                </footer>
              </section>
            ) : (
              <Panel title="Start with the work you can observe">
                <p>
                  Set a bounded goal, collect original accounts, and compare the
                  evidence before naming a constraint.
                </p>
                <Button primary onClick={() => go("discovery")}>
                  Begin discovery
                  <ArrowRight size={16} />
                </Button>
              </Panel>
            )}
            <Panel
              title="From a finding to governed work"
              subtitle="The same evidence follows the decision all the way through."
              action={<span className="eyebrow small">CONNECTED RECORD</span>}
            >
              <div className="record-chain">
                {[
                  ["Evidence", "Employee accounts", FileText, "discovery"],
                  ["Finding", "Testable hypothesis", Compass, "strategy"],
                  ["Task card", "Meaningful work", Layers, "tasks"],
                  [
                    "Governance",
                    "Explicit boundaries",
                    ShieldCheck,
                    "governance",
                  ],
                ].map(([label, description, Icon, to]: any) => (
                  <button key={label} onClick={() => go(to)}>
                    <Icon size={16} />
                    <small>{label}</small>
                    <strong>{description}</strong>
                  </button>
                ))}
              </div>
              <div className="panel-footer">
                <span>Each step opens the record behind it.</span>
                <button className="text-link" onClick={() => go("graph")}>
                  Explore the graph <ArrowRight size={14} />
                </button>
              </div>
            </Panel>
            <Panel
              title="Your next moves"
              action={
                <Badge>
                  {pending.length +
                    conflicts.length +
                    (evidence.some((e) => e.state === "pending_review")
                      ? 1
                      : 0)}{" "}
                  to review
                </Badge>
              }
            >
              {pending.map((r) => (
                <Row
                  key={r.id}
                  title={"Review " + r.title}
                  detail="Read the original response before accepting it as evidence."
                  onClick={() => open(r)}
                >
                  <Badge tone="blue">Discovery</Badge>
                </Row>
              ))}
              {conflicts.slice(0, 3).map((r) => (
                <Row
                  key={r.id}
                  title={r.title}
                  detail="Resolve the uncertainty before requesting confirmation."
                  onClick={() => open(r)}
                >
                  <State value={r.state} />
                </Row>
              ))}
              <Row
                title="Fill the strategic context gaps"
                detail="Four intake buckets support sixteen framework lenses."
                onClick={() => go("strategy")}
              >
                <Badge>Strategy</Badge>
              </Row>
              <Row
                title="Review the proposed delegation boundaries"
                detail="Authority and runtime support need independent verification."
                onClick={() => go("governance")}
              >
                <Badge tone="amber">Governance</Badge>
              </Row>
            </Panel>
          </div>
          <div className="stack">
            <Panel
              title="Trust in the work record"
              action={<ShieldCheck size={19} />}
            >
              <div className="trust">
                <div
                  className="ring"
                  style={{
                    background: `conic-gradient(var(--sage) ${tasks.length ? (confirmed.length / tasks.length) * 360 : 0}deg, var(--line) 0deg)`,
                  }}
                >
                  <div>
                    <strong>
                      {confirmed.length}
                      <small> / {tasks.length}</small>
                    </strong>
                    <span>CONFIRMED</span>
                  </div>
                </div>
                <p>
                  <strong>The record is taking shape.</strong>
                  <span>
                    Confirmed work descriptions,
                    <br /> with a named human owner.
                  </span>
                </p>
              </div>
              <div className="status-line">
                <span>
                  <i className="dot sage" />
                  Human confirmed
                </span>
                <strong>{confirmed.length}</strong>
              </div>
              <div className="status-line">
                <span>
                  <i className="dot blue" />
                  Review or confirmation pending
                </span>
                <strong>
                  {tasks.length - confirmed.length - conflicts.length}
                </strong>
              </div>
              <div className="status-line">
                <span>
                  <i className="dot amber" />
                  Conflict or fresh review needed
                </span>
                <strong>{conflicts.length}</strong>
              </div>
              <div className="notice">
                Participation, work confirmation, and authority are different
                states.
              </div>
            </Panel>
            <Panel
              title="One model. Three lenses."
              action={<Network size={19} />}
            >
              <div className="mini-model">
                <span>Evidence</span>
                <span>Task card</span>
                <span>Human owner</span>
                <span>Agent proposal</span>
                <span>Authority</span>
                <svg viewBox="0 0 320 160">
                  <path d="M60 40L160 80L60 125M160 80L270 40M160 80L270 125" />
                </svg>
              </div>
              <div className="panel-footer">
                <span>Strategy → work → authority</span>
                <button className="text-link" onClick={() => go("graph")}>
                  Explore
                  <ArrowRight size={14} />
                </button>
              </div>
            </Panel>
            <Panel
              title="The latest in this record"
              action={<Clock size={18} />}
            >
              <div className="timeline">
                {data.events.slice(0, 5).map((e: any) => (
                  <div key={e.id}>
                    <i className="dot" />
                    <p>
                      {e.type.replaceAll(".", " · ").replaceAll("_", " ")}
                      <small>
                        {date(e.created_at)}
                        {e.detail?.version ? " · v" + e.detail.version : ""}
                      </small>
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </>
    );
  else if (page === "discovery") {
    const tabs = [
      ["research", "Business research"],
      ["plan", "Engagement & kickoff"],
      ["requests", "Requests & responses"],
      ["people", "People in scope"],
      ["evidence", "Evidence library"],
    ];
    body = (
      <>
        <Heading
          eyebrow="DISCOVER THE BUSINESS"
          title="Understand how the work happens."
          description="Capture original accounts. Preserve disagreements. Review before updating the work record."
          actions={
            <Button
              primary
              onClick={() =>
                create(
                  tab === "plan"
                    ? "engagement"
                    : tab === "people"
                      ? "person"
                      : tab === "evidence" || tab === "research"
                        ? "evidence"
                        : "request",
                )
              }
            >
              <Plus size={16} />{" "}
              {tab === "plan"
                ? "Create engagement plan"
                : tab === "people"
                  ? "Add participant"
                  : tab === "evidence" || tab === "research"
                    ? "Add source"
                    : "Prepare request"}
            </Button>
          }
        />
        <div className="toolbar">
          <div className="tabs">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
              >
                {label}
                {id === "requests" && pending.length > 0 && (
                  <Badge tone="amber">{pending.length}</Badge>
                )}
              </button>
            ))}
          </div>
          {tab === "people" && (
            <Button onClick={() => setModal({ type: "roster" })}>
              <Upload size={15} />
              Import roster CSV
            </Button>
          )}
        </div>
        {tab === "research" ? (
          <>
            <BusinessResearch
              key={company.id}
              company={company}
              create={() =>
                setModal({
                  type: "form",
                  kind: "evidence",
                  preset: {
                    type: "Public research",
                    classification: "Inferred",
                    bucket: "biz",
                  },
                })
              }
              open={open}
              kickoff={() => setTab("plan")}
              refresh={refresh}
            />
            <AiWorkbench
              key={company.id + "ai"}
              company={company.id}
              records={records}
              create={(preset) =>
                setModal({ type: "form", kind: "task", preset })
              }
            />
          </>
        ) : tab === "plan" ? (
          <Engagement
            company={company}
            records={records}
            create={create}
            open={open}
            refresh={refresh}
          />
        ) : tab === "requests" ? (
          <>
            <div className="notice blue">
              <Mic size={20} />
              <span>
                Participants receive a focused page with five prompts, voice or
                typed capture, and their exact task versions. Private links are
                shared manually or emailed through your configured Resend
                account.
              </span>
            </div>
            {pending.length > 0 && (
              <Panel
                title="Returned for your review"
                subtitle="A response becomes evidence only after you review the original."
              >
                {rows(pending)}
              </Panel>
            )}
            <Panel
              title="Requests"
              subtitle="Prepare → private link → participant response → advisor review"
            >
              {rows(items("request"))}
            </Panel>
            {responses.filter((r) => r.state === "accepted").length > 0 && (
              <Panel title="Reviewed responses">
                {rows(responses.filter((r) => r.state === "accepted"))}
              </Panel>
            )}
          </>
        ) : tab === "people" ? (
          <Panel
            title="The agreed engagement roster"
            subtitle="These people define participation coverage. Reporting and duty ownership remain separate claims."
          >
            {rows(people)}
          </Panel>
        ) : (
          <Panel
            title="Every source keeps its origin"
            subtitle="Original accounts, policies, and observed records. No source text is executed as an instruction."
          >
            {rows(evidence)}
          </Panel>
        )}
      </>
    );
  } else if (page === "tasks")
    body = (
      <>
        <Heading
          eyebrow="THE WORK RECORD"
          title="Meaningful work. Clear accountability."
          description="Each task binds the work, its evidence, a human owner, and an exact version."
          actions={
            <Button primary onClick={() => create("task")}>
              <Plus size={16} />
              Create task card
            </Button>
          }
        />
        <div className="toolbar">
          <div className="tabs">
            {[
              ["all", "All tasks"],
              ["proposed", "Proposed"],
              ["confirmed", "Human confirmed"],
              ["conflicting", "Conflicts"],
              ["stale", "Needs fresh review"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={filter === id ? "active" : ""}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Search task cards"
              placeholder="Find a task…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="task-grid">
          {tasks
            .filter(
              (t) =>
                (filter === "all" || t.state === filter) &&
                t.title.toLowerCase().includes(query.toLowerCase()),
            )
            .map((t) => (
              <button className="task-card" key={t.id} onClick={() => open(t)}>
                <div className="toolbar">
                  <Badge>v{t.version}</Badge>
                  <State value={t.state} />
                </div>
                <h2>{t.title}</h2>
                <p>{t.data.purpose}</p>
                <div className="task-owner">
                  <span className="avatar">
                    {personName(t.data.ownerId)
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <strong>{personName(t.data.ownerId)}</strong>
                    <small>Accountable human</small>
                  </div>
                </div>
                <footer>
                  <span>
                    <FileText size={13} />
                    {t.data.evidenceIds.length} source
                    {t.data.evidenceIds.length === 1 ? "" : "s"}
                  </span>
                  <span>
                    {t.data.mode.replaceAll("_", " ")}
                    <ArrowRight size={14} />
                  </span>
                </footer>
              </button>
            ))}
        </div>
        {!tasks.length && (
          <Empty
            title="Describe one evidence-backed task"
            detail="Start with an accepted source and named owner and performer."
            action={
              <Button onClick={() => go("discovery")}>Open discovery</Button>
            }
          />
        )}
        <div className="two-col work-model-panels">
          <Panel
            title="Standing duties"
            subtitle="Record duty accountability separately from individual task confirmations."
            action={<Button onClick={() => create("duty")}>Add duty</Button>}
          >
            {rows(items("duty"))}
          </Panel>
          <Panel
            title="Handoff contracts"
            subtitle="Define the condition, input, output, receiving check and exception owner between two tasks."
            action={
              <Button onClick={() => create("handoff")}>Add handoff</Button>
            }
          >
            {rows(items("handoff"))}
          </Panel>
        </div>
      </>
    );
  else if (page === "workflows")
    body = (
      <>
        <Heading
          eyebrow="COORDINATE THE WORK"
          title="Clear handoffs. Visible checkpoints."
          description="Review a workflow, then track each case through human steps, conditional handoffs and explicit escalation."
          actions={
            <Button primary onClick={() => create("workflow")}>
              Create workflow
            </Button>
          }
        />
        <Panel
          title="Workflow definitions"
          subtitle="Each definition pins task and handoff versions. Paths must be connected and acyclic."
        >
          {rows(items("workflow"))}
        </Panel>
        <Panel
          title="Work cases"
          subtitle="Checkpoints survive restarts. A timeout requires human review and never approves a step."
        >
          {rows(items("case"))}
        </Panel>
        <div className="notice">
          Create the task cards and their handoff contracts in Task cards first.
          Cases record human observations; external systems are not executed.
        </div>
      </>
    );
  else if (page === "graph")
    body = (
      <>
        <Heading
          eyebrow="THE CONNECTED RECORD"
          title="See how the company connects."
          description="Follow the work from its source to the people accountable for it. Relationships remain evidence-backed claims."
        />
        <Graph
          key={companyId}
          company={companyId}
          revision={company.revision}
          records={records}
          open={open}
        />
      </>
    );
  else if (page === "strategy")
    body = (
      <>
        <Heading
          eyebrow="LIVEFRAMEWORKS"
          title="Find what actually limits progress."
          description="One intake. Sixteen connected lenses. A diagnosis you can test."
          actions={
            <Button
              primary
              onClick={() =>
                create(
                  strategyTab === "metrics"
                    ? "metric"
                    : strategyTab === "outcomes"
                      ? "outcome"
                      : strategyTab === "interventions"
                        ? "intervention"
                        : "candidate",
                )
              }
            >
              <Plus size={16} />
              {strategyTab === "metrics"
                ? "Define a measure"
                : strategyTab === "outcomes"
                  ? "Review an outcome"
                  : strategyTab === "interventions"
                    ? "Propose intervention"
                    : "Add constraint hypothesis"}
            </Button>
          }
        />
        <div className="tabs">
          {[
            ["frameworks", "Frameworks"],
            ["constraints", "Constraint ledger"],
            ["metrics", "Measurements"],
            ["interventions", "Interventions"],
            ["outcomes", "Outcome reviews"],
          ].map(([id, name]) => (
            <button
              className={strategyTab === id ? "active" : ""}
              key={id}
              onClick={() => setStrategyTab(id)}
            >
              {name}
            </button>
          ))}
        </div>
        {strategyTab === "frameworks" ? (
          <>
            <div className="intake-grid">
              {[
                ["biz", "Business context"],
                ["leadership", "Leadership accounts"],
                ["calls", "Customer calls"],
                ["org", "People & work"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTab("evidence");
                    go("discovery");
                  }}
                >
                  <span className="eyebrow">{key}</span>
                  <h3>{label}</h3>
                  <strong>
                    {
                      evidence.filter(
                        (e) => e.data.bucket === key && e.state === "accepted",
                      ).length
                    }{" "}
                    <small>accepted sources</small>
                  </strong>
                </button>
              ))}
            </div>
            <div className="notice">
              Framework analyses are entered and reviewed by people in this
              build. No model-generated results are simulated. Upstream
              artifacts and source versions must be current.
            </div>
            <div className="framework-grid">
              {data.registry.frameworks.map((f: any, i: number) => {
                const r = items("framework").find((r) => r.data.key === f.key);
                return (
                  <button
                    className="framework-card"
                    key={f.key}
                    onClick={() =>
                      r ? open(r) : setModal({ type: "framework", key: f.key })
                    }
                  >
                    <div className="toolbar">
                      <span className="step-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <State value={r?.state || "needs_input"} />
                    </div>
                    <h3>{f.name}</h3>
                    <p>
                      {f.upstream.length
                        ? "Requires " + f.upstream.join(", ")
                        : "Starts from accepted business and leadership evidence."}
                    </p>
                    <footer>
                      <span>
                        {r ? "Open analysis" : "Write evidence-backed analysis"}
                      </span>
                      <ArrowRight size={15} />
                    </footer>
                  </button>
                );
              })}
            </div>
            <Button
              onClick={() =>
                setModal({ type: "framework", key: data.registry.order[0] })
              }
            >
              Create or revise a framework analysis
            </Button>
          </>
        ) : strategyTab === "constraints" ? (
          <Panel
            title="Keep the strongest alternative visible"
            subtitle="Pressure signals, independent sources, a global counterfactual, and a discriminating measurement."
          >
            {rows(items("candidate"))}
          </Panel>
        ) : strategyTab === "outcomes" ? (
          <Panel
            title="Did the predicted result happen?"
            subtitle="Compare the frozen prediction with observed measurements, coverage and competing explanations."
          >
            {rows(items("outcome"))}
          </Panel>
        ) : strategyTab === "metrics" ? (
          <>
            <div className="notice">
              Missing values stay missing. Zero means measured zero. A target
              needs a defensible basis.
            </div>
            <div className="metric-grid">
              {items("metric").map((m) => (
                <button
                  className="metric-card"
                  key={m.id}
                  onClick={() => open(m)}
                >
                  <State value={m.state} />
                  <h2>{m.title}</h2>
                  <strong>
                    {m.data.observations?.length
                      ? m.data.observations.at(-1).value
                      : (m.data.baseline ?? "—")}
                    <small>{m.data.unit}</small>
                  </strong>
                  <p>
                    {m.data.baseline === null
                      ? m.data.missingReason
                      : `Baseline: ${m.data.baseline} · Target: ${m.data.target ?? "Not established"}`}
                  </p>
                  <span>
                    {m.data.observations?.length || 0} observations ·{" "}
                    {personName(m.data.ownerId)}
                  </span>
                </button>
              ))}
            </div>
            {!items("metric").length && (
              <Empty
                title="Define the measure before predicting a change"
                detail="Capture the event, cohort, source, baseline window, and named owner."
              />
            )}
          </>
        ) : (
          <Panel
            title="The smallest plausible change"
            subtitle="One constraint → one intervention → one metric → one named human owner."
          >
            {rows(items("intervention"))}
          </Panel>
        )}
      </>
    );
  else if (page === "governance")
    body = (
      <>
        <Heading
          eyebrow="PEDIGREE & SIGNET"
          title="Delegate with a clear human boundary."
          description="A work description starts a proposal. Authority, approval, and enforcement are separate decisions."
          actions={
            <Button primary onClick={() => create("agent")}>
              <Plus size={16} />
              Propose an agent
            </Button>
          }
        />
        <div className="scope-stages">
          {[
            [
              "01",
              "Work confirmation",
              `${confirmed.length} current task descriptions`,
            ],
            ["02", "Authority approval", "Customer authority source required"],
            ["03", "Provisioning", "No target system configured"],
            ["04", "Observed execution", "No runtime is connected"],
          ].map(([n, title, description]) => (
            <div key={n}>
              <span>{n}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
          ))}
        </div>
        <div className="notice amber">
          <ShieldCheck size={20} />
          <span>
            Export-first pilot. Draft packages are instruction-compatible. They
            are not signed authority grants and do not provision or run agents.
          </span>
        </div>
        <Panel
          title="Agent proposals"
          subtitle="Each proposal binds one accountable human and exact versions of selected tasks."
        >
          {rows(items("agent"))}
        </Panel>
        <Panel title="What must be verified before a grant can be issued">
          <div className="control-grid">
            {[
              "Current human authority and effective access",
              "Existing customer approval chain",
              "Exact task and manifest versions",
              "Target runtime capabilities and restrictions",
              "Revocation, stop, and lifecycle behavior",
              "Observed action receipts and coverage gaps",
            ].map((t) => (
              <div key={t}>
                <ShieldCheck size={18} />
                <span>{t}</span>
                <Badge tone="amber">Not configured</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </>
    );
  else if (page === "weekly")
    body = (
      <>
        <Heading
          eyebrow="KEEP THE RECORD CURRENT"
          title="The next review starts with what changed."
          description="Resolve evidence gaps, check measurements, and assign the next useful action."
          actions={
            <Button primary onClick={() => create("review")}>
              <Plus size={16} />
              Record decision & owner
            </Button>
          }
        />
        <div className="two-col">
          <Panel
            title="Evidence-based agenda"
            subtitle="Derived from the current work record."
          >
            {pending.map((r) => (
              <Row
                key={r.id}
                title={"Review response: " + r.title}
                onClick={() => open(r)}
              >
                <Badge tone="blue">Evidence</Badge>
              </Row>
            ))}
            {conflicts.map((r) => (
              <Row key={r.id} title={r.title} onClick={() => open(r)}>
                <State value={r.state} />
              </Row>
            ))}
            {items("case")
              .filter((r) => r.state === "needs_attention")
              .map((r) => (
                <Row
                  key={r.id}
                  title={"Case needs attention: " + r.title}
                  onClick={() => open(r)}
                >
                  <State value={r.state} />
                </Row>
              ))}
            {items("metric")
              .filter((m) => m.data.baseline === null)
              .map((r) => (
                <Row
                  key={r.id}
                  title={"Collect baseline: " + r.title}
                  detail={r.data.missingReason}
                  onClick={() => open(r)}
                >
                  <Badge tone="amber">Measure</Badge>
                </Row>
              ))}
            {!pending.length &&
              !conflicts.length &&
              !items("case").some((r) => r.state === "needs_attention") &&
              !items("metric").some((m) => m.data.baseline === null) && (
                <Empty
                  title="No recorded exceptions"
                  detail="Check source coverage and missing observations before concluding that everything is current."
                />
              )}
          </Panel>
          <Panel
            title="Decisions & commitments"
            subtitle="Meeting decisions create work for review. They do not issue permission grants."
          >
            {rows(items("review"))}
          </Panel>
        </div>
      </>
    );
  else if (page === "deliverables")
    body = (
      <>
        <Heading
          eyebrow="REVIEWABLE OUTPUTS"
          title="Share a record you can trace."
          description="Freeze exact versions, show what is excluded, and keep the audience explicit."
        />
        <ClientReports
          company={company}
          records={records}
          open={open}
          refresh={refresh}
        />
        <div className="export-options">
          <Panel
            title="Internal workspace snapshot"
            subtitle="All task descriptions with their current validation state."
          >
            <p>
              Source metadata and named owners are included. Raw source text and
              recordings are excluded.
            </p>
            <Button primary onClick={() => void makeExport("workspace")}>
              <FileText size={16} />
              Create snapshot
            </Button>
          </Panel>
          <Panel
            title="Confirmed work packet"
            subtitle="Only current, reviewed owner and performer confirmations."
          >
            <p>
              {confirmed.length} of {tasks.length} tasks currently qualify.
              Every excluded task carries its reason.
            </p>
            <Button onClick={() => void makeExport("confirmed")}>
              <ShieldCheck size={16} />
              Freeze confirmed subset
            </Button>
          </Panel>
        </div>
        <Panel
          title="Frozen exports"
          subtitle="Each ZIP includes structured records, readable instructions, setup requirements, and checksums."
        >
          {rows(items("export"))}
        </Panel>
        <div className="notice">
          Client reports require review for their named audience. Workspace
          snapshots and agent packages are internal review artifacts. Downloaded
          packets are delivered manually.
        </div>
      </>
    );
  else if (page === "system")
    body = (
      <>
        <Heading
          eyebrow="SYSTEM & CONNECTIONS"
          title="Know what is actually connected."
          description="Coverage is explicit. A draft or configuration is never a successful integration."
          actions={
            <Button onClick={() => void refresh()}>
              <RefreshCw size={16} />
              Refresh status
            </Button>
          }
        />
        <div className="system-flow">
          <div>
            <Database />
            <strong>PostgreSQL</strong>
            <span>Authoritative records, versions & outbox</span>
            <Badge tone="sage">Connected</Badge>
          </div>
          <ArrowRight />
          <div>
            <Network />
            <strong>Derived graph</strong>
            <span>PostgreSQL projection</span>
            <Badge tone={data.projection.pending ? "amber" : "sage"}>
              {data.projection.pending
                ? data.projection.pending + " events pending"
                : "Current"}
            </Badge>
          </div>
          <ArrowRight />
          <div>
            <ShieldCheck />
            <strong>Runtime gateway</strong>
            <span>Independent authority checks required</span>
            <Badge>Not configured</Badge>
          </div>
        </div>
        <Panel title="Integration coverage">
          <div className="connections">
            {[
              [
                "PostgreSQL",
                "Durable work records, immutable versions, tenant row security",
                "Current",
              ],
              [
                "Audio storage",
                "Chunked database storage with checksums; unscanned",
                "Pilot",
              ],
              ["Neo4j", "Dedicated graph projection adapter", "Not configured"],
              [
                "Email",
                "Resend invitation sending; delivery tracking and reminders pending",
                "Configure in Settings",
              ],
              [
                "OpenAI discovery drafts",
                "Meeting briefs, task suggestions and hypotheses; transcription pending",
                "Configure in Settings",
              ],
              [
                "Fireflies",
                "Verified meeting ingestion and account coverage",
                "Not configured",
              ],
              [
                "Saviynt / ServiceNow",
                "Authoritative controls and customer request workflow",
                "Not configured",
              ],
              [
                "Oracle",
                "One exact application, resource, and bounded action",
                "Not configured",
              ],
              [
                "Signet / runtime",
                "Managed signing keys, reviewer assurance, enforced adapter",
                "Not configured",
              ],
            ].map(([name, scope, state]) => (
              <div className="connection-row" key={name}>
                <span className="connection-icon">
                  <Database size={18} />
                </span>
                <div className="grow">
                  <strong>{name}</strong>
                  <p>{scope}</p>
                </div>
                <Badge tone={state === "Current" ? "sage" : "neutral"}>
                  {state}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Projection recovery"
          subtitle="Rebuild the local derived graph from current company records. This does not replay business actions."
        >
          <Button
            onClick={() =>
              void run(
                () =>
                  api(`/v1/companies/${companyId}/graph/rebuild`, "POST", {
                    expectedRevision: company.revision,
                  }),
                "Derived graph rebuilt and verified.",
              )
            }
          >
            <RefreshCw size={16} />
            Rebuild derived graph
          </Button>
        </Panel>
        <Panel
          title="Recent audit events"
          subtitle="Append-only application events. Content hashes are not cryptographic approval signatures."
        >
          {data.events.map((e: any) => (
            <Row
              key={e.id}
              title={e.type.replaceAll(".", " · ").replaceAll("_", " ")}
              detail={e.detail.reason || ""}
            >
              <small>{new Date(e.created_at).toLocaleString()}</small>
            </Row>
          ))}
        </Panel>
      </>
    );
  else if (page === "settings")
    body = (
      <>
        <Heading
          eyebrow="WORKSPACE SETTINGS"
          title="Keep the scope explicit."
          description="Company settings guide discovery. Administrative access does not confer business authority."
        />
        <SettingsForm
          company={company}
          save={async (values: any) => {
            await api("/v1/companies/" + companyId, "PATCH", {
              expectedVersion: company.revision,
              ...values,
            });
            await refresh();
            await loadCompanies();
            setToast("Workspace settings saved.");
          }}
        />
        <Panel
          title="Explore a fictional company"
          subtitle="Load a private Cobalt sample workspace in your account. It contains fictional people and work; it does not contact anyone."
        >
          <Button
            onClick={async () => {
              try {
                const sample = await api("/v1/sample-company", "POST", {});
                await loadCompanies();
                setCompanyId(sample.id);
                go("graph");
              } catch (e) {
                setToast((e as Error).message);
              }
            }}
          >
            Open my sample company
          </Button>
        </Panel>
        <ProviderSettings key={companyId} company={companyId} />
        <Panel title="Your authenticated account">
          <dl className="details">
            <dt>Name</dt>
            <dd>{user.name}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Application role</dt>
            <dd>Advisor</dd>
            <dt>Identity assurance</dt>
            <dd>
              Password session. Enterprise identity and step-up signing are not
              configured.
            </dd>
          </dl>
          <Button onClick={logout}>
            <LogOut size={16} />
            Sign out
          </Button>
        </Panel>
      </>
    );
  else if (page === "help")
    body = (
      <Suspense fallback={<p>Opening the handbook…</p>}>
        <Help go={go} />
      </Suspense>
    );
  else
    body = (
      <Empty
        title="Page not found"
        detail="Choose a workspace page from the navigation."
        action={<Button onClick={() => go("overview")}>Open overview</Button>}
      />
    );
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      {mobile && (
        <button
          aria-label="Close navigation"
          className="nav-backdrop"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <div className="sidebar-head">
          <button className="brand" onClick={() => go("overview")}>
            <NetworkMark />
            <span>
              Duty Graph<small>COMPANY WORKSPACE</small>
            </span>
          </button>
          <label className="company-switch">
            <span className="company-avatar">
              {company?.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("") || "DG"}
            </span>
            <select
              aria-label="Select company"
              value={companyId}
              onChange={(e) => {
                if (e.target.value === "new") setModal({ type: "company" });
                else setCompanyId(e.target.value);
              }}
            >
              {companies.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="new">+ New company workspace</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>
        <nav aria-label="Workspace navigation">
          {nav.map((n) => (
            <div key={n.id}>
              {n.group && <div className="nav-group">{n.group}</div>}
              <button
                className={"nav-item " + (page === n.id ? "active" : "")}
                onClick={() => go(n.id)}
              >
                <n.icon size={17} />
                <span>{n.name}</span>
                {n.id === "discovery" && pending.length > 0 && (
                  <Badge tone="amber">{pending.length}</Badge>
                )}
                {page === n.id && <i />}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="local-status">
            <i className="dot sage" />
            Local advisor pilot<span>v0.2</span>
          </div>
          <button className="account" onClick={() => go("settings")}>
            <span className="avatar">
              {user.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.role} · Tier 4 workspace</small>
            </span>
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumbs">
            <span className="dot" />
            <span>{company?.name || "Workspace"}</span>
            <span>/</span>
            <strong>
              {nav.find((n) => n.id === page)?.name || "Overview"}
            </strong>
          </div>
          <div className="actions">
            {company?.sandbox && <Badge>Illustrative data</Badge>}
            <button
              className="search-shortcut"
              onClick={() => setModal({ type: "search" })}
              aria-label="Search workspace"
            >
              <Search size={17} />
              <kbd>⌘ K</kbd>
            </button>
            <Badge>Advisor account</Badge>
            <button
              className="icon-btn"
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Button
              onClick={() => {
                setTab("requests");
                go("discovery");
              }}
            >
              <Mic size={16} />
              Participant requests
            </Button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <ErrorBox error={error} />
          {error && (
            <Button onClick={() => void refresh()}>Retry loading</Button>
          )}
          {body}
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={12} />
            {company?.sandbox ? "Synthetic example" : "Advisor pilot"} · Saved
            in PostgreSQL ·{" "}
            {company ? "Revision " + company.revision : "Connecting"}
          </span>
          <span>Evidence first. People authorize.</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
      {modal?.type === "record" && recordModal && (
        <Modal
          title={recordModal.title}
          subtitle={recordModal.kind.toUpperCase() + " · EXACT RECORD"}
          onClose={() => setModal(null)}
          wide
        >
          <Detail
            key={recordModal.id}
            record={recordModal}
            company={companyId}
            records={records}
            edit={() =>
              setModal({
                type: "form",
                kind: recordModal.kind,
                id: recordModal.id,
              })
            }
            open={open}
            refresh={refresh}
            notify={setToast}
          />
        </Modal>
      )}
      {modal?.type === "form" && company && (
        <Modal
          title={
            modal.id
              ? "Revise " + modal.kind
              : "Add " +
                (modal.kind === "agent"
                  ? "agent proposal"
                  : modal.kind === "candidate"
                    ? "constraint hypothesis"
                    : modal.kind)
          }
          subtitle="EVIDENCE & ACCOUNTABILITY"
          onClose={() => setModal(null)}
          wide
        >
          <RecordForm
            kind={modal.kind}
            record={recordModal}
            records={records}
            notice={company.settings.notice}
            preset={modal.preset}
            onSave={async (values) => {
              const r = modal.id
                ? await api(
                    `/v1/companies/${companyId}/records/${modal.id}`,
                    "PATCH",
                    { expectedVersion: recordModal!.version, data: values },
                  )
                : await api(`/v1/companies/${companyId}/records`, "POST", {
                    kind: modal.kind,
                    data: values,
                  });
              await refresh();
              setModal({ type: "record", id: r.id });
              setToast("Record saved.");
            }}
          />
        </Modal>
      )}
      {modal?.type === "search" && (
        <Modal
          title="Find the work or the person"
          subtitle="SEARCH THIS WORKSPACE"
          onClose={() => setModal(null)}
        >
          <label className="search-field large">
            <Search size={20} />
            <input
              autoFocus
              aria-label="Search records"
              placeholder="Search tasks, people, sources…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {rows(
            records
              .filter((r) =>
                r.title.toLowerCase().includes(query.toLowerCase()),
              )
              .slice(0, 15),
          )}
        </Modal>
      )}
      {modal?.type === "roster" && (
        <Modal
          title="Import the engagement roster"
          subtitle="PREVIEW BEFORE APPLYING"
          onClose={() => setModal(null)}
          wide
        >
          <RosterImport
            company={companyId}
            onDone={async () => {
              await refresh();
              setModal(null);
              setToast("Valid roster rows imported.");
            }}
          />
        </Modal>
      )}
      {modal?.type === "company" && (
        <Modal
          title="Start a bounded company workspace"
          onClose={() => setModal(null)}
        >
          <CompanyForm
            onSave={async (values: any) => {
              const c = await api("/v1/companies", "POST", values);
              await loadCompanies();
              setCompanyId(c.id);
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal?.type === "framework" && company && (
        <Modal
          title="Write an evidence-backed framework analysis"
          subtitle="HUMAN-AUTHORED · VERSION-BOUND INPUTS"
          onClose={() => setModal(null)}
          wide
        >
          <FrameworkForm
            initial={modal.key}
            registry={data.registry}
            records={records}
            onSave={async (key, analysis, evidenceIds) => {
              const r = await api(
                `/v1/companies/${companyId}/frameworks/${key}/manual`,
                "POST",
                { analysis, evidenceIds, expectedRevision: company.revision },
              );
              await refresh();
              setModal({ type: "record", id: r.id });
            }}
          />
        </Modal>
      )}
    </div>
  );
}
function SettingsForm({
  company,
  save,
}: {
  company: Company;
  save: (v: any) => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Panel title="Company scope & participant notice">
      <form
        key={company.id}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await save(Object.fromEntries(new FormData(e.currentTarget)));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <ErrorBox error={error} />
        <div className="form-grid">
          <Field label="Company name">
            <input name="name" defaultValue={company.name} required />
          </Field>
          <Field label="Work in scope">
            <input name="scope" defaultValue={company.scope} required />
          </Field>
          <Field label="Business outcome" wide>
            <textarea name="goal" defaultValue={company.goal} required />
          </Field>
          <Field
            label="Participant visibility and capture notice"
            wide
            hint="Changes apply to new requests. Previously issued notices remain immutable."
          >
            <textarea
              name="notice"
              defaultValue={company.settings.notice}
              rows={4}
              required
            />
          </Field>
        </div>
        <div className="notice">
          Raw audio access expires after 30 days; a background job removes
          stored chunks. Enterprise retention policies, legal hold, and
          derivative deletion need production hardening.
        </div>
        <Button primary type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save workspace settings"}
        </Button>
      </form>
    </Panel>
  );
}
function CompanyForm({ onSave }: { onSave: (v: any) => Promise<void> }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          await onSave(Object.fromEntries(new FormData(e.currentTarget)));
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorBox error={error} />
      <Field label="Company name">
        <input name="name" required />
      </Field>
      <Field label="Bounded work in scope">
        <input name="scope" required />
      </Field>
      <Field label="Business outcome">
        <textarea name="goal" required />
      </Field>
      <p className="subtle">
        This creates an empty company record in your current account. Sample
        accounts create sample workspaces.
      </p>
      <Button primary type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create company workspace"}
      </Button>
    </form>
  );
}
function RosterImport({
  company,
  onDone,
}: {
  company: string;
  onDone: () => Promise<void>;
}) {
  const [csv, setCsv] = useState(""),
    [preview, setPreview] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div>
      <p>
        Headers: name, email, role, team, manager_email, external_id. The last
        two are optional. Duplicate, ambiguous, and cyclic rows are held for
        correction.
      </p>
      <label className="btn file-button">
        <Upload size={16} />
        Choose CSV
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              if (f.size > 500000)
                setError("Choose a CSV smaller than 500 KB.");
              else {
                setCsv(await f.text());
                setPreview(null);
              }
            }
          }}
        />
      </label>
      <Field label="CSV content">
        <textarea
          rows={6}
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setPreview(null);
          }}
        />
      </Field>
      <ErrorBox error={error} />
      <Button
        disabled={!csv || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setPreview(
              await api(`/v1/companies/${company}/roster/preview`, "POST", {
                csv,
              }),
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Validate & preview
      </Button>
      {preview && (
        <>
          <ErrorBox error={preview.errors.join(" ")} />
          <p>
            {preview.validCount} valid rows ·{" "}
            {preview.rows.length - preview.validCount} held for correction
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r: any) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.data.name}</td>
                    <td>{r.data.email}</td>
                    <td>{r.issues.join(" ") || "Ready"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            primary
            disabled={busy || !preview.validCount || preview.errors.length > 0}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api(`/v1/companies/${company}/roster/apply`, "POST", {
                  csv,
                });
                await onDone();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Import {preview.validCount} valid people
          </Button>
        </>
      )}
    </div>
  );
}
function FrameworkForm({
  initial,
  registry,
  records,
  onSave,
}: {
  initial: string;
  registry: any;
  records: RecordRow[];
  onSave: (key: string, analysis: string, ids: string[]) => Promise<void>;
}) {
  const [key, setKey] = useState(initial),
    [analysis, setAnalysis] = useState(""),
    [ids, setIds] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSave(key, analysis, ids);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorBox error={error} />
      <Field label="Canonical framework">
        <select value={key} onChange={(e) => setKey(e.target.value)}>
          {registry.frameworks.map((f: any) => (
            <option value={f.key} key={f.key}>
              {f.name}
            </option>
          ))}
        </select>
      </Field>
      <p className="subtle">
        Required upstream analyses:{" "}
        {registry.frameworks
          .find((f: any) => f.key === key)
          .upstream.join(", ") || "None"}
        . All must be current and reviewed.
      </p>
      <Field label="Analysis with exact source locators">
        <textarea
          rows={9}
          value={analysis}
          onChange={(e) => setAnalysis(e.target.value)}
          required
          minLength={20}
        />
      </Field>
      <Field label="Accepted evidence sources">
        <div className="check-list">
          {records
            .filter((r) => r.kind === "evidence" && r.state === "accepted")
            .map((r) => (
              <label className="check" key={r.id}>
                <input
                  type="checkbox"
                  checked={ids.includes(r.id)}
                  onChange={(e) =>
                    setIds(
                      e.target.checked
                        ? [...ids, r.id]
                        : ids.filter((id) => id !== r.id),
                    )
                  }
                />
                {r.title}
              </label>
            ))}
        </div>
      </Field>
      <Button primary type="submit" disabled={busy || !ids.length}>
        Save for review
      </Button>
    </form>
  );
}
