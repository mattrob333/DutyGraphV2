import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  frameworkSpecs,
  type FrameworkSection,
} from "../../shared/framework-specs.ts";
import { frameworkGuides } from "../../shared/framework-guides.ts";
import type {
  FrameworkOutput,
  FrameworkSource,
} from "../../shared/framework-output.ts";
import type { RecordRow } from "../../shared/domain.ts";
import { api } from "./api.ts";
import { Badge, Button, ErrorBox, Modal, State } from "./ui.tsx";
import "./frameworks.css";

type Item = FrameworkOutput["sections"][number]["items"][number];
function Citations({
  ids,
  cite,
}: {
  ids: string[];
  cite: (id: string) => void;
}) {
  return (
    <span className="framework-citations">
      {ids.map((id, i) => (
        <button
          type="button"
          key={id}
          onClick={() => cite(id)}
          title="Inspect supporting source"
        >
          Source {i + 1}
        </button>
      ))}
    </span>
  );
}
function Finding({ item, cite }: { item: Item; cite: (id: string) => void }) {
  return (
    <article
      className={`framework-finding ${item.basis === "Missing" ? "is-missing" : ""}`}
    >
      <strong>{item.title}</strong>
      <p>{item.detail}</p>
      <div className="framework-finding-meta">
        <Badge tone={item.basis === "Missing" ? "amber" : "neutral"}>
          {item.basis}
        </Badge>
        <span title={item.confidenceReason}>{item.confidence} confidence</span>
      </div>
      <Citations ids={item.sourceIds} cite={cite} />
      {item.nextStep && (
        <p className="framework-next-step">
          <span>Next:</span> {item.nextStep}
        </p>
      )}
    </article>
  );
}
function CanvasSection({
  definition,
  items,
  cite,
}: {
  definition: FrameworkSection;
  items?: Item[];
  cite: (id: string) => void;
}) {
  return (
    <section
      className={`framework-canvas-section section-${definition.id}`}
      aria-label={definition.label}
    >
      <header>
        <h3>{definition.label}</h3>
        {!items && <Badge>Awaiting analysis</Badge>}
      </header>
      {!items ? (
        <p className="framework-section-placeholder">
          {definition.instruction}
        </p>
      ) : definition.columns ? (
        <div className="framework-table-scroll">
          <table className="framework-data-table">
            <thead>
              <tr>
                <th scope="col">Work / finding</th>
                {definition.columns.map((c) => (
                  <th scope="col" key={c.key}>
                    {c.label}
                  </th>
                ))}
                <th scope="col">Basis</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <th scope="row">
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    {item.nextStep && (
                      <p className="framework-next-step">
                        Next: {item.nextStep}
                      </p>
                    )}
                  </th>
                  {definition.columns!.map((c) => (
                    <td key={c.key}>
                      {item.values.find((v) => v.key === c.key)?.value ||
                        "Missing"}
                    </td>
                  ))}
                  <td>
                    <Badge
                      tone={item.basis === "Missing" ? "amber" : "neutral"}
                    >
                      {item.basis}
                    </Badge>
                    <p title={item.confidenceReason}>
                      {item.confidence} confidence
                    </p>
                    <Citations ids={item.sourceIds} cite={cite} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="framework-section-items">
          {items.map((item, i) => (
            <Finding key={i} item={item} cite={cite} />
          ))}
        </div>
      )}
    </section>
  );
}
export function FrameworkCanvas({
  frameworkKey,
  output,
  cite = () => {},
}: {
  frameworkKey: string;
  output?: FrameworkOutput;
  cite?: (id: string) => void;
}) {
  const spec = frameworkSpecs[frameworkKey];
  return (
    <div
      className={`framework-canvas layout-${spec.layout} canvas-${frameworkKey}`}
    >
      {spec.sections.map((s) => (
        <CanvasSection
          key={s.id}
          definition={s}
          items={output?.sections.find((v) => v.id === s.id)?.items}
          cite={cite}
        />
      ))}
    </div>
  );
}
export function FrameworkWorkspace({
  companyId,
  frameworkKey,
  records,
  close,
  openRecord,
  write,
  navigate,
  saved,
  initialJobId,
}: {
  companyId: string;
  frameworkKey: string;
  initialJobId?: string;
  records: RecordRow[];
  close: () => void;
  openRecord: (r: RecordRow) => void;
  write: (key: string) => void;
  navigate: (key: string, jobId?: string) => void;
  saved: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(initialJobId || ""),
    [sourceId, setSourceId] = useState(""),
    [excerpt, setExcerpt] = useState<{ key: string; text: string } | null>(
      null,
    ),
    [loadingExcerpt, setLoadingExcerpt] = useState("");
  const spec = frameworkSpecs[frameworkKey],
    guide = frameworkGuides[frameworkKey],
    path = `/v1/companies/${companyId}/framework-runs/${frameworkKey}`,
    readPath = initialJobId
      ? `${path}?version=${encodeURIComponent(initialJobId)}`
      : path;
  useEffect(() => {
    let alive = true;
    const load = () =>
      api(readPath)
        .then((d) => {
          if (alive) setData(d);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 10000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [readPath]);
  const jobs = data?.jobs || [],
    job =
      jobs.find((j: any) => j.id === selected) ||
      jobs.find((j: any) => j.state === "complete") ||
      jobs[0],
    output = job?.result?.output as FrameworkOutput | undefined;
  const source = (job?.input.sources || data?.sources || []).find(
    (s: FrameworkSource) => s.id === sourceId,
  ) as FrameworkSource | undefined;
  const sourceKey = `${job?.id}:${sourceId}`,
    currentSource = records.find((r) => r.id === sourceId);
  const manual = records.find(
    (r) => r.kind === "framework" && r.data.key === frameworkKey,
  );
  const running = busy || jobs.some((j: any) => j.state === "running"),
    missing: string[] = data?.missingUpstream || [];
  async function generate() {
    if (running) return;
    setBusy(true);
    setError("");
    try {
      const result = await api(path, "POST", { consent: true });
      setSelected(result.id);
      setData(await api(readPath));
      saved();
    } catch (e: any) {
      setError(e.message);
      try {
        setData(await api(readPath));
      } catch {}
    } finally {
      setBusy(false);
    }
  }
  function sourceRecord() {
    const r = records.find((r) => r.id === sourceId);
    if (r) {
      close();
      openRecord(r);
    }
  }
  async function inspectExcerpt() {
    if (!job || !source) return;
    const key = sourceKey;
    if (excerpt?.key === key) {
      setExcerpt(null);
      return;
    }
    setLoadingExcerpt(key);
    try {
      const result = await api(
        `${path}/${job.id}/source?sourceId=${encodeURIComponent(sourceId)}`,
      );
      setExcerpt({ key, text: result.source.text });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingExcerpt("");
    }
  }
  return (
    <Modal
      title={spec.name}
      subtitle="Live framework · evidence to decisions"
      wide
      className="framework-workspace-dialog"
      onClose={close}
    >
      <div className="framework-workspace-lead">
        <div>
          <p className="framework-question">{guide.question}</p>
          <p className="muted">
            {guide.cadence}. Run an update when you want a fresh analysis.
          </p>
        </div>
        <div className="actions">
          <Button
            disabled={
              !data?.configured ||
              !data?.sourceCount ||
              running ||
              missing.length > 0
            }
            primary
            onClick={generate}
          >
            <Sparkles size={15} />
            {running
              ? "Analyzing…"
              : output
                ? "Update this analysis"
                : "Run this framework"}
          </Button>
          <Button
            onClick={() =>
              api(readPath)
                .then(setData)
                .catch((e) => setError(e.message))
            }
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>
      <ErrorBox error={error} />
      {!data && !error && (
        <p role="status">Loading the company's sources and saved analyses…</p>
      )}
      {data && !data.configured && (
        <div className="notice">
          Add an OpenAI API key in Workspace settings to run this framework. The
          canvas and instructions are available below.
        </div>
      )}
      {!!missing.length && (
        <div className="framework-dependency-note">
          <strong>Complete these analyses first</strong>
          <p>
            Each provides context this framework needs. Updated inputs also
            require updated upstream analyses.
          </p>
          <div className="actions">
            {missing.map((key) => (
              <Button key={key} onClick={() => navigate(key)}>
                {frameworkSpecs[key].name}
                <ArrowRight size={13} />
              </Button>
            ))}
          </div>
        </div>
      )}
      {data && !data.sourceCount && (
        <div className="notice">
          Start with company research or accepted evidence in Discovery. The
          canvas below shows what this framework will produce.
        </div>
      )}
      <div className="framework-run-context">
        <span>
          {data?.sourceCount || 0} sources available automatically ·{" "}
          {data?.omitted || 0} outside the excerpt window
        </span>
        <span>
          Each run uses your OpenAI account and saves a new draft version.
        </span>
      </div>
      {job?.stale && (
        <div className="notice amber">
          Inputs changed after this version was saved. Its conclusions need a
          fresh analysis. Historical sources are shown for reference.
        </div>
      )}
      {job && job.state !== "complete" && (
        <div className="notice" role="status">
          {job.state === "running"
            ? "The framework is running. You can leave this page and return to its saved history."
            : job.message}
        </div>
      )}
      {output && (
        <section className="framework-executive-summary">
          <div className="eyebrow">What this means</div>
          <h3>{output.scope}</h3>
          <p>{output.summary}</p>
          <span className="muted">
            AI draft. Use the citations and confidence notes to check the
            reasoning.
          </span>
        </section>
      )}
      {source && (
        <aside className="framework-source-peek" aria-label="Supporting source">
          <div>
            <strong>{source.title}</strong>
            <p>
              Version {source.version} · {source.state.replaceAll("_", " ")}
              {source.excerpted ? " · excerpt used" : ""}
            </p>
            <p>{source.locator}</p>
          </div>
          <div className="actions">
            {source.kind !== "framework_analysis" && (
              <Button
                disabled={loadingExcerpt === sourceKey}
                onClick={() => void inspectExcerpt()}
              >
                {loadingExcerpt === sourceKey
                  ? "Loading excerpt…"
                  : excerpt?.key === sourceKey
                    ? "Hide used excerpt"
                    : "Read used excerpt"}
              </Button>
            )}
            {currentSource && (
              <Button onClick={sourceRecord}>
                {currentSource.version === source.version
                  ? "Open source record"
                  : `Open current record · v${currentSource.version}`}
              </Button>
            )}
            {source.kind === "framework_analysis" && source.frameworkKey && (
              <Button onClick={() => navigate(source.frameworkKey!, source.id)}>
                Open cited analysis
              </Button>
            )}
            {/^https?:\/\//.test(source.locator) && (
              <a
                className="btn"
                href={source.locator}
                target="_blank"
                rel="noreferrer"
              >
                Read public source
              </a>
            )}
            <Button onClick={() => setSourceId("")}>Close source</Button>
          </div>
          {excerpt?.key === sourceKey && (
            <div className="framework-used-excerpt">
              <strong>
                Text used in this analysis · version {source.version}
              </strong>
              <p>{excerpt.text}</p>
            </div>
          )}
        </aside>
      )}
      <FrameworkCanvas
        frameworkKey={frameworkKey}
        output={output}
        cite={setSourceId}
      />
      {!!jobs.length && (
        <div className="framework-version-bar">
          <label>
            Saved version
            <select
              value={job?.id || ""}
              onChange={(e) => {
                setSelected(e.target.value);
                setSourceId("");
              }}
            >
              {jobs.map((j: any) => (
                <option key={j.id} value={j.id}>
                  v{j.input.version} · {new Date(j.created_at).toLocaleString()}{" "}
                  · {j.state}
                  {j.stale ? " · inputs changed" : ""}
                </option>
              ))}
            </select>
          </label>
          <State value={job?.state || "draft"} />
          <span>
            Prompt {job?.input.promptVersion} · {job?.input.model}
          </span>
        </div>
      )}

      <div className="framework-detail-grid">
        <section>
          <h3>Inputs used by this framework</h3>
          <p className="muted">
            Source availability is separate from whether the source answers the
            question.
          </p>
          {spec.inputs.map((v) => {
            const assessment = output?.inputs.find((i) => i.key === v.key);
            return (
              <article className="framework-input-assessment" key={v.key}>
                <div>
                  <strong>{v.label}</strong>
                  <Badge
                    tone={
                      assessment?.status === "Missing" ? "amber" : "neutral"
                    }
                  >
                    {assessment?.status || "To assess"}
                  </Badge>
                </div>
                <p>{assessment?.value || v.lookFor}</p>
                {assessment && (
                  <Citations ids={assessment.sourceIds} cite={setSourceId} />
                )}
              </article>
            );
          })}
        </section>
        <section>
          <h3>Questions to resolve</h3>
          {output?.questions.length ? (
            <ol>
              {output.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          ) : (
            <p className="muted">
              The analysis will identify the questions that most affect the next
              decision.
            </p>
          )}
          {!!output?.warnings.length && (
            <>
              <h3>Coverage and uncertainty</h3>
              <ul>
                {output.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
      <details className="framework-method">
        <summary>
          <BookOpen size={15} />
          Method and instructions
        </summary>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {spec.instructions.map((step) => (
          <p key={step}>{step}</p>
        ))}
        <p>
          Claims use Reported, Inferred, Assumed or Missing. Confidence is Low,
          Medium or High with a reason. No output grants authority or changes
          the work record.
        </p>
        <p>
          Prompt version: {data?.promptVersion || "Loading"}. The model receives
          bounded evidence excerpts and complete current direct upstream
          analyses; saved versions retain those exact inputs.
        </p>
      </details>
      <footer className="framework-manual-footer">
        <div>
          <strong>Advisor analysis</strong>
          <p>
            Keep your own reviewed interpretation alongside the AI versions.
          </p>
        </div>
        <Button
          onClick={() => {
            close();
            manual ? openRecord(manual) : write(frameworkKey);
          }}
        >
          <FileText size={15} />
          {manual ? "Open advisor analysis" : "Write advisor analysis"}
        </Button>
      </footer>
    </Modal>
  );
}
