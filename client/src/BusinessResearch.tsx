import { useEffect, useState } from "react";
import type { Company, RecordRow } from "../../shared/domain.ts";
import {
  researchChecklist,
  researchFocuses,
  researchQuery,
  type ResearchRun,
} from "../../shared/research.ts";
import { api } from "./api.ts";
import { Badge, Button, ErrorBox, Field, Panel } from "./ui.tsx";
type Status = {
  configured: boolean;
  used: number;
  limit: number;
  runs: ResearchRun[];
};
type Attempt = {
  key: string;
  publicName: string;
  website: string;
  focus?: string;
  remaining?: string[];
};
function savedAttempt(company: string): Attempt | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(`research-attempt:${company}`) || "null",
    );
    return value &&
      /^[a-f0-9-]{36}$/.test(value.key) &&
      typeof value.publicName === "string" &&
      typeof value.website === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function BusinessResearch({
  company,
  create,
  open,
  kickoff,
  refresh,
  resultsOnly = false,
}: {
  company: Company;
  create: () => void;
  open: (r: RecordRow) => void;
  kickoff: () => void;
  refresh: () => Promise<void>;
  resultsOnly?: boolean;
}) {
  const [attempt, setAttempt] = useState<Attempt | null>(() =>
    savedAttempt(company.id),
  );
  const [status, setStatus] = useState<Status | null>(null),
    [publicName, setPublicName] = useState(
      attempt?.publicName ||
        company.settings.businessIntake?.name ||
        company.name,
    ),
    [website, setWebsite] = useState(
      attempt?.website || company.settings.businessIntake?.website || "",
    ),
    [focuses, setFocuses] = useState<string[]>(
      attempt
        ? [attempt.focus || "company", ...(attempt.remaining || [])]
        : researchFocuses.map((f) => f.id),
    ),
    [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const path = `/v1/companies/${company.id}/research`;
  useEffect(() => {
    if (!attempt && company.settings.businessIntake) {
      setPublicName(company.settings.businessIntake.name);
      setWebsite(company.settings.businessIntake.website);
    }
  }, [company.settings.businessIntake]);
  const resuming =
    !!attempt &&
    attempt.publicName === publicName.trim() &&
    attempt.website === website.trim();
  const remember = (value: Attempt | null) => {
    setAttempt(value);
    try {
      if (value)
        sessionStorage.setItem(
          `research-attempt:${company.id}`,
          JSON.stringify(value),
        );
      else sessionStorage.removeItem(`research-attempt:${company.id}`);
    } catch {
      /* The in-memory attempt still prevents a duplicate while this page remains open. */
    }
  };
  const load = () => api<Status>(path).then(setStatus);
  useEffect(() => {
    let active = true;
    api<Status>(path)
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path]);
  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    let current: Attempt | null = resuming
      ? attempt!
      : {
          key: crypto.randomUUID(),
          publicName: publicName.trim(),
          website: website.trim(),
          focus: focuses[0],
          remaining: focuses.slice(1),
        };
    remember(current);
    try {
      while (current) {
        const run = await api<ResearchRun>(
          path,
          "POST",
          {
            publicName: current.publicName,
            website: current.website,
            ...(current.focus ? { focus: current.focus } : {}),
            acknowledgePublicQuery: true,
          },
          current.key,
        );
        await load();
        if (!["complete", "failed", "unknown"].includes(run.state)) break;
        if (run.state !== "complete") {
          setError(
            run.message ||
              "This search did not finish. Review the saved result before starting more research.",
          );
          remember(null);
          break;
        }
        const remaining: string[] = current.remaining || [];
        current = remaining.length
          ? {
              ...current,
              key: crypto.randomUUID(),
              focus: remaining[0],
              remaining: remaining.slice(1),
            }
          : null;
        remember(current);
      }
    } catch (e) {
      setError(
        (e as Error).message +
          " Refresh research or resume this saved request before starting another search.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function importSource(run: ResearchRun, index: number) {
    setBusy(true);
    setError("");
    try {
      const r = await api<RecordRow>(
        `${path}/${run.id}/sources/${index}/import`,
        "POST",
        {},
      );
      await Promise.all([load(), refresh()]);
      open(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ErrorBox error={error} />
      {!resultsOnly && (
        <div className="two-col research-layout">
          <Panel
            title="Research the business"
            subtitle="Exa searches public sources and retrieves page text. No private interview or workspace evidence is sent."
          >
            <Badge tone={status?.configured ? "sage" : "amber"}>
              {status?.configured
                ? "Exa configured · operator enabled"
                : status
                  ? "Exa not configured"
                  : "Checking connection settings…"}
            </Badge>
            <form onSubmit={search} className="research-form">
              <Field label="What should we research?">
                <div className="discovery-source-list">
                  {researchFocuses.map((f) => (
                    <label className="discovery-source" key={f.id}>
                      <input
                        type="checkbox"
                        checked={focuses.includes(f.id)}
                        disabled={busy || !!attempt}
                        onChange={(e) =>
                          setFocuses(
                            e.target.checked
                              ? [...focuses, f.id]
                              : focuses.filter((id) => id !== f.id),
                          )
                        }
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Public business name">
                <input
                  disabled={busy || !!attempt}
                  value={publicName}
                  onChange={(e) => setPublicName(e.target.value)}
                  minLength={2}
                  maxLength={160}
                  required
                />
              </Field>
              <Field label="Official website (optional)">
                <input
                  disabled={busy || !!attempt}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  type="url"
                  placeholder="https://company.com"
                  maxLength={500}
                />
              </Field>
              <p className="subtle">
                Company overview can be limited to the official website.
                Community, competitor and industry searches use the wider public
                web. Each run requests up to five sources. Finding a channel
                does not subscribe to it or start daily monitoring.
              </p>
              <div className="research-query">
                <small>QUERY SENT TO EXA</small>
                {focuses.map((focus) => (
                  <p key={focus}>
                    {researchQuery(publicName, focus, "").query}
                  </p>
                ))}
              </div>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />{" "}
                This name and website are public, and this research is within
                the engagement scope.
              </label>
              <Button
                primary
                type="submit"
                disabled={
                  busy ||
                  !status?.configured ||
                  !ack ||
                  !focuses.length ||
                  (status.limit - status.used < focuses.length && !resuming)
                }
              >
                {busy
                  ? "Working…"
                  : resuming
                    ? "Resume saved request"
                    : "Collect public sources"}
              </Button>
              {resuming && (
                <p className="subtle">
                  This browser saved an unfinished request. Resume uses its
                  original key; a recorded provider call will not be repeated.
                </p>
              )}
              {status && (
                <p className="subtle">
                  {status.used} of {status.limit} requests used in the account’s
                  rolling 24-hour window. This selection uses {focuses.length}{" "}
                  requests. Provider charges may apply; no automatic retries.
                </p>
              )}
              {status && !status.configured && (
                <p className="subtle">
                  Add your Exa API key in Workspace settings. You can also add
                  public sources manually. OpenAI drafting is available below
                  once its key is configured.
                </p>
              )}
            </form>
            <Button onClick={create}>Add a public source manually</Button>
          </Panel>
          <Panel
            title="What the research helps you understand"
            subtitle="Collected research carries into the contact email and meeting guide automatically. Internal roles and duties come from the leadership meeting."
          >
            <div className="research-checklist">
              {researchChecklist.map(([title, detail]) => (
                <div key={title}>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
              ))}
            </div>
            <Button onClick={kickoff}>Prepare the contact email</Button>
          </Panel>
        </div>
      )}
      <div className="discovery-section">
        <Panel
          title="Research evidence library"
          subtitle="Retrieved pages are working material, not established facts. The business brief above selects supported findings. Expand this library to inspect the original excerpts."
          action={
            <Button
              onClick={() => {
                setError("");
                load().catch((e) => setError(e.message));
              }}
            >
              Refresh research
            </Button>
          }
        >
          {resultsOnly && (
            <div className="actions">
              <Button onClick={create}>Add a public source manually</Button>
              <Button onClick={kickoff}>Prepare the contact email</Button>
            </div>
          )}
          {!status && <p role="status">Loading saved research…</p>}
          {status && !status.runs.length && (
            <p>
              No research runs yet. Manual sources appear in the Evidence
              library.
            </p>
          )}
          <details><summary>Inspect retrieved pages · {status?.runs.length || 0} searches</summary>
          {status?.runs.map((run) => (
            <details className="research-run" key={run.id}>
              <summary>
                {run.query} <Badge>{run.state}</Badge>
                <small>
                  {new Date(run.created_at).toLocaleString()} ·{" "}
                  {run.results.length} sources
                </small>
              </summary>
              {run.message && <p className="notice">{run.message}</p>}
              {["reserved", "running"].includes(run.state) && (
                <p>
                  The request is in progress. Refresh to check its saved result;
                  starting another search creates a separate request.
                </p>
              )}
              {run.state === "complete" && !run.results.length && (
                <p>
                  No usable page text returned. Try a more precise public name
                  or add a source manually.
                </p>
              )}
              {run.results.map((source, index) => (
                <article className="research-source" key={source.url}>
                  <h3>{source.title}</h3>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open original source ↗
                  </a>
                  <p className="subtle">
                    Collected {new Date(source.retrievedAt).toLocaleString()}
                    {source.publishedDate
                      ? ` · Published ${source.publishedDate}`
                      : ""}
                    {source.excerpted
                      ? " · First 6,000 characters retained"
                      : ""}
                  </p>
                  <details>
                    <summary>Inspect captured text</summary>
                    <pre>{source.text}</pre>
                  </details>
                  <Button
                    disabled={busy}
                    onClick={() => importSource(run, index)}
                  >
                    {source.importedId
                      ? "Open imported evidence"
                      : "Import as unreviewed evidence"}
                  </Button>
                </article>
              ))}
            </details>
          ))}</details>
        </Panel>
      </div>
    </>
  );
}
