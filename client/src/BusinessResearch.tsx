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
}: {
  company: Company;
  create: () => void;
  open: (r: RecordRow) => void;
  kickoff: () => void;
  refresh: () => Promise<void>;
}) {
  const [attempt, setAttempt] = useState<Attempt | null>(() =>
    savedAttempt(company.id),
  );
  const [status, setStatus] = useState<Status | null>(null),
    [publicName, setPublicName] = useState(attempt?.publicName || company.name),
    [website, setWebsite] = useState(attempt?.website || ""),
    [focus, setFocus] = useState(attempt?.focus || "company"),
    [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const path = `/v1/companies/${company.id}/research`;
  const resuming =
    !!attempt &&
    attempt.publicName === publicName.trim() &&
    attempt.website === website.trim() &&
    (attempt.focus || "company") === focus;
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
    const current = resuming
      ? attempt!
      : {
          key: crypto.randomUUID(),
          publicName: publicName.trim(),
          website: website.trim(),
          focus,
        };
    remember(current);
    try {
      const run = await api<ResearchRun>(
        path,
        "POST",
        {
          publicName: current.publicName,
          website: current.website,
          ...(current.focus ? { focus: current.focus } : {}),
          acknowledgePublicQuery: ack,
        },
        current.key,
      );
      if (["complete", "failed", "unknown"].includes(run.state)) remember(null);
      await load();
      if (run.state === "failed") setError(run.message);
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
      <div className="research-stages">
        <div>
          <span>01 / BEFORE THE MEETING</span>
          <h3>Build a public-source picture</h3>
          <p>
            Collect the business’s own pages and relevant public context. Keep
            links and dates.
          </p>
        </div>
        <div>
          <span>02 / FIRST MEETING</span>
          <h3>Let the team correct it</h3>
          <p>
            Review the draft together. Capture corrections, competing accounts
            and missing information.
          </p>
        </div>
        <div>
          <span>03 / AFTER THE MEETING</span>
          <h3>Validate the work</h3>
          <p>
            Revise task descriptions, then ask the owners and performers to
            confirm their exact work.
          </p>
        </div>
      </div>
      <ErrorBox error={error} />
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
              <select value={focus} onChange={(e) => setFocus(e.target.value)}>
                {researchFocuses.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Public business name">
              <input
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
                minLength={2}
                maxLength={160}
                required
              />
            </Field>
            <Field label="Official website (optional)">
              <input
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
              web. Each run requests up to five sources. Finding a channel does
              not subscribe to it or start daily monitoring.
            </p>
            <div className="research-query">
              <small>QUERY SENT TO EXA</small>
              <p>{researchQuery(publicName, focus, "").query}</p>
            </div>
            <label className="check-line">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />{" "}
              This name and website are public, and this research is within the
              engagement scope.
            </label>
            <Button
              primary
              type="submit"
              disabled={
                busy ||
                !status?.configured ||
                !ack ||
                (status.used >= status.limit && !resuming)
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
                rolling 24-hour window. Provider charges may apply; no automatic
                retries.
              </p>
            )}
            {status && !status.configured && (
              <p className="subtle">
                Add your Exa API key in Workspace settings. You can also add
                public sources manually. OpenAI drafting is available below once
                its key is configured.
              </p>
            )}
          </form>
          <Button onClick={create}>Add a public source manually</Button>
        </Panel>
        <Panel
          title="What to bring to the first meeting"
          subtitle="A draft to verify, with clear gaps. A public claim is not proof of an internal process."
        >
          <div className="research-checklist">
            {researchChecklist.map(([title, detail]) => (
              <div key={title}>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            ))}
          </div>
          <Button onClick={kickoff}>Prepare engagement & kickoff</Button>
        </Panel>
      </div>
      <Panel
        title="Collected sources"
        subtitle="Open the source, inspect its content, then import it for review. Import does not accept the source or confirm work."
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
        {!status?.runs.length && (
          <p>
            No research runs yet. Manual sources appear in the Evidence library.
          </p>
        )}
        {status?.runs.map((run, i) => (
          <details className="research-run" key={run.id} open={i === 0}>
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
                No usable page text returned. Try a more precise public name or
                add a source manually.
              </p>
            )}
            {run.results.map((source, index) => (
              <article className="research-source" key={source.url}>
                <h3>{source.title}</h3>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  Open original source ↗
                </a>
                <p className="subtle">
                  Collected {new Date(source.retrievedAt).toLocaleString()}
                  {source.publishedDate
                    ? ` · Published ${source.publishedDate}`
                    : ""}
                  {source.excerpted ? " · First 6,000 characters retained" : ""}
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
        ))}
      </Panel>
    </>
  );
}
