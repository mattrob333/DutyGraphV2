import { BusinessBrief } from "./BusinessBrief.tsx";
import { useEffect, useState } from "react";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { profileFromClassification } from "../../shared/business-classification.ts";
import type { Company } from "../../shared/domain.ts";
import {
  backbone,
  businessTemplates,
  type BusinessProfile,
  businessProfileSchema,
} from "../../shared/business-types.ts";
import { api } from "./api.ts";
import { Button, Panel, ErrorBox } from "./ui.tsx";
import "./business-profile.css";
import { researchFocuses } from "../../shared/research.ts";
import { BusinessTypeCatalog } from "./BusinessTypeCatalog.tsx";
import {
  collectInitialResearch,
  readResearchPlan,
  rememberResearchPlan,
  type ResearchPlan,
} from "./initial-research.ts";
export function BusinessProfilePanel({
  company,
  refresh,
  openIndustry,
  researched,
  contactComplete = false,
}: {
  company: Company;
  refresh: () => Promise<void>;
  openIndustry: () => void;
  researched?: () => void;
  contactComplete?: boolean;
}) {
  const [plan, setPlan] = useState<ResearchPlan | null>(() =>
    readResearchPlan(company.id),
  );
  const [focuses, setFocuses] = useState<string[]>(
    plan?.focuses || researchFocuses.map((f) => f.id),
  );
  const checkpoint = (next: ResearchPlan | null) => {
    setPlan(next);
    rememberResearchPlan(company.id, next);
    researched?.();
  };
  const [intake, setIntake] = useState(
    plan?.intake ||
      company.settings.businessIntake || {
        name: company.name,
        website: "",
        description: "",
      },
  );
  const [classification, setClassification] = useState<any>(null);
  const [briefJob, setBriefJob] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [baseRevision, setBaseRevision] = useState(company.revision);
  const classificationPath = `/v1/companies/${company.id}/business-classification`;
  const loadClassification = async () => {
    const data = await api(classificationPath);
    setClassification(data);
    return data;
  };
  const recoverAnalysis = async () => {
    try {
      const data = await loadClassification();
      const job = data.jobs?.[0];
      if (job?.state === "complete") {
        if (job.input.revision !== company.revision)
          throw new Error(
            "The company changed since this suggestion. Request an updated profile.",
          );
        setIntake({
          name: job.input.name,
          website: job.input.website,
          description: job.input.description,
        });
        setAnalysis(job);
        setBriefJob(job);
        setBaseRevision(job.input.revision);
        update(profileFromClassification(job.result.draft));
        setError("");
      } else
        setError(
          job?.message || "The analysis is still running. Check again shortly.",
        );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    let active = true;
    api(classificationPath)
      .then((data) => {
        if (!active) return;
        setClassification(data);
        const savedBrief = data.jobs?.find(
          (j: any) =>
            j.state === "complete" &&
            j.result?.draft?.brief &&
            ["name", "website", "description"].every(
              (k) =>
                j.input[k] ===
                (company.settings.businessIntake || intake)[
                  k as keyof typeof intake
                ],
            ),
        );
        setBriefJob(savedBrief || data.latestBrief || null);
        const latest = data.jobs?.[0];
        if (latest?.input && !company.settings.businessIntake && !plan)
          setIntake({
            name: latest.input.name,
            website: latest.input.website,
            description: latest.input.description,
          });
        if (
          latest?.state === "complete" &&
          !company.settings.businessProfile &&
          latest.input.revision === company.revision
        ) {
          setAnalysis(latest);
          setBriefJob(latest);
          setProfile(profileFromClassification(latest.result.draft));
          setDirty(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [classificationPath]);
  const suggest = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const normalized = plan?.intake || {
        ...intake,
        website:
          intake.website.trim() && !/^https?:\/\//i.test(intake.website.trim())
            ? `https://${intake.website.trim()}`
            : intake.website.trim(),
      };
      setIntake(normalized);
      let current: ResearchPlan = plan || {
        version: 2,
        intake: normalized,
        focuses: classification?.researchConfigured
          ? researchFocuses
              .map((f) => f.id)
              .filter((id) => focuses.includes(id))
          : [],
        index: 0,
        keys: focuses.map(() => crypto.randomUUID()),
        runIds: [],
        classificationKey: crypto.randomUUID(),
        revision: company.revision,
      };
      if (current.failed) {
        const keys = [...current.keys];
        keys[current.index] = crypto.randomUUID();
        current = {
          ...current,
          keys,
          classificationKey: crypto.randomUUID(),
          failed: false,
        };
      }
      checkpoint(current);
      current = await collectInitialResearch(company.id, current, checkpoint);
      if (!classification?.configured) {
        checkpoint(null);
        setNotice(
          "Your public research is ready below. Connect OpenAI in Workspace settings to add the business profile and kickoff analysis.",
        );
        return;
      }
      const { id } = await api(
        classificationPath,
        "POST",
        {
          ...normalized,
          expectedRevision: current.revision,
          consent: true,
          researchRunIds: current.runIds,
        },
        current.classificationKey,
      );
      const data = await loadClassification();
      const job = data.jobs.find((j: any) => j.id === id);
      if (job?.state !== "complete") {
        if (["failed", "unknown"].includes(job?.state))
          checkpoint({ ...current, failed: true });
        throw new Error(
          job?.message ||
            "Analysis is still running. Refresh its status shortly.",
        );
      }
      checkpoint(null);
      setAnalysis(job);
      setBriefJob(job);
      setBaseRevision(job.input.revision);
      update(profileFromClassification(job.result.draft));
      requestAnimationFrame(() => {
        document
          .getElementById("business-brief")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        document
          .getElementById("business-brief")
          ?.focus({ preventScroll: true });
      });
      setNotice(
        "Your business brief is ready. Review the findings and confirm the business streams below.",
      );
    } catch (e) {
      setError((e as Error).message);
      await loadClassification().catch(() => {});
    } finally {
      setBusy(false);
    }
  };
  const [profile, setProfile] = useState<BusinessProfile>(
    () =>
      company.settings.businessProfile || {
        industry: "",
        status: "proposed",
        rationale: "",
        streams: [],
      },
  );
  const [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [suggestions, setSuggestions] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    api(`/v1/companies/${company.id}/framework-runs/industrymap`)
      .then((d) => {
        if (active) {
          const j = d.jobs?.find(
            (j: any) => j.state === "complete" && !j.stale,
          );
          setSuggestions(
            j?.result?.output?.sections
              .find((s: any) => s.id === "business_types")
              ?.items.filter((i: any) => i.basis !== "Missing") || [],
          );
        }
      })
      .catch(() => {
        if (active) setSuggestions([]);
      });
    return () => {
      active = false;
    };
  }, [company.id, company.revision]);
  const update = (next: BusinessProfile) => {
    setProfile({ ...next, status: "proposed" });
    setDirty(true);
    setNotice("");
  };
  const add = (id: string, name?: string) => {
    if (profile.streams.length >= 8) return;
    const t = businessTemplates.find((t) => t.id === id);
    if (!t && id !== "custom") return;
    const key = crypto.randomUUID();
    update({
      ...profile,
      streams: [
        ...profile.streams,
        {
          id: key,
          templateId: id,
          name: name || t?.label || "Custom business flow",
          stages: structuredClone(
            t?.stages ||
              backbone.map((f) => ({
                id: crypto.randomUUID(),
                name: f.label,
                functionIds: [f.id],
              })),
          ),
        },
      ],
    });
  };
  const changeStream = (index: number, changes: any) =>
    update({
      ...profile,
      streams: profile.streams.map((s, i) =>
        i === index ? { ...s, ...changes } : s,
      ),
    });
  const save = async (status: BusinessProfile["status"]) => {
    setError("");
    setBusy(true);
    try {
      if (
        analysis &&
        (analysis.input.revision !== company.revision ||
          ["name", "website", "description"].some(
            (k) => analysis.input[k] !== intake[k as keyof typeof intake],
          ))
      )
        throw new Error(
          "The company details changed after this suggestion. Request an updated profile before using it.",
        );
      const next = businessProfileSchema.parse({ ...profile, status });
      const saved = await api(
        `/v1/companies/${company.id}/business-profile`,
        "PUT",
        {
          expectedRevision: baseRevision,
          profile: next,
          intake,
        },
      );
      setProfile(next);
      setDirty(false);
      setBaseRevision(saved.revision);
      setAnalysis(null);
      await refresh();
      setNotice(
        status === "advisor_reviewed"
          ? "Business profile saved as advisor reviewed."
          : "Proposed business profile saved.",
      );
      return true;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel
      title={briefJob ? "Company profile" : "Start with the company. We’ll build the research brief."}
      subtitle="Enter the company once. Get a sourced business overview, competitive context and the questions to take into your first meeting."
    >
      <details className="research-intake-disclosure" key={briefJob?.id || "new"} open={!briefJob || !!plan}>
        <summary>{briefJob ? "Edit company details / research again" : "Company details"}</summary>
      <div className="business-intake">
        <div className="business-fields">
          <label>
            Company name
            <input
              value={intake.name}
              maxLength={160}
              disabled={busy || !!plan}
              onChange={(e) => setIntake({ ...intake, name: e.target.value })}
            />
          </label>
          <label>
            Website <span className="subtle">optional with a description</span>
            <input
              value={intake.website}
              maxLength={500}
              disabled={busy || !!plan}
              placeholder="tier4intelligence.com"
              onChange={(e) =>
                setIntake({ ...intake, website: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          What does the company do?
          <textarea
            value={intake.description}
            rows={3}
            maxLength={4000}
            disabled={busy || !!plan}
            placeholder="For example: We help businesses discover where AI can improve their operations, then advise on implementation."
            onChange={(e) =>
              setIntake({ ...intake, description: e.target.value })
            }
          />
        </label>
        <details className="business-research-options">
          <summary>Research coverage · {focuses.length} areas selected</summary>
          <p>
            These are included by default. Uncheck anything outside your
            engagement.
          </p>
          {researchFocuses.map((f) => (
            <label className="check-line" key={f.id}>
              <input
                type="checkbox"
                checked={focuses.includes(f.id)}
                disabled={busy || !!plan}
                onChange={(e) =>
                  setFocuses(
                    e.target.checked
                      ? [...focuses, f.id]
                      : focuses.filter((id) => id !== f.id),
                  )
                }
              />
              {f.label}
            </label>
          ))}
          <p className="subtle">
            Company overview uses the official site when supplied. The other
            searches cover the wider public web. Up to five sources per search;
            the deeper Industry Map remains a separate step.
          </p>
        </details>
        <div className="actions">
          <Button
            primary
            disabled={
              busy ||
              !classification ||
              (!classification.configured &&
                !classification.researchConfigured) ||
              intake.name.trim().length < 2 ||
              (!intake.description.trim() && !intake.website.trim())
            }
            onClick={suggest}
          >
            <Sparkles size={16} />
            {busy
              ? plan && plan.index < plan.focuses.length
                ? `Researching ${researchFocuses.find((f) => f.id === plan.focuses[plan.index])?.label.toLowerCase()}…`
                : "Preparing the business profile…"
              : plan
                ? plan.failed
                  ? "Retry unfinished step"
                  : "Resume research pass"
                : classification?.researchConfigured && focuses.length
                  ? "Research this company"
                  : "Suggest my business profile"}
          </Button>
          {plan && !busy && (
            <Button
              onClick={() => {
                checkpoint(null);
                setError("");
              }}
            >
              End this pass / change details
            </Button>
          )}
          {classification?.jobs?.[0]?.input?.revision === company.revision && (
            <Button disabled={busy} onClick={() => void recoverAnalysis()}>
              Recover latest suggestion
            </Button>
          )}
        </div>
        <p className="subtle">
          By starting, you send the company name, URL, description and selected
          official-site excerpts to Exa for contextual public research, and the
          description and collected excerpts to OpenAI for a draft.{" "}
          {classification?.researchConfigured
            ? `This pass uses ${focuses.length} searches and one AI analysis when configured. Provider charges apply.`
            : "Based on your description; enable Exa in Workspace settings to include website research."}{" "}
          Ten searches and ten business analyses per account per 24 hours. No
          automatic retries.
        </p>
        {busy && (
          <p role="status">
            Keep this page open while the sequence runs. Completed searches are
            saved. You can resume an interrupted pass in this browser.
          </p>
        )}
        {classification?.configured === false && (
          <p className="notice">
            Connect OpenAI in Workspace settings to get AI suggestions. You can
            still choose a business type in the catalog below.
          </p>
        )}
      </div>
      </details>
      <ErrorBox error={error} />
      {notice && <p role="status">{notice}</p>}
      {briefJob && (
        <BusinessBrief
          key={briefJob.id}
          job={briefJob}
          company={company}
          refresh={refresh}
          reviewDisabled={dirty}
          reviewed={setBaseRevision}
          changed={["name", "website", "description"].some(
            (k) => briefJob.input[k] !== intake[k as keyof typeof intake],
          )}
          busy={busy}
          prepare={() => {
            const section = document.getElementById("business-stream-review") as HTMLDetailsElement | null;
            if (section) { section.open = true; section.scrollIntoView({ behavior: "smooth", block: "start" }); }
          }}
        />
      )}
      {!briefJob && !!profile.streams.length && (
        <p className="notice">
          This saved operating profile has no business research brief yet.
          Select “Research this company” above to build the company overview,
          size, offerings and comparable-company evidence.
        </p>
      )}
      {!!profile.streams.length && (
        <details open={dirty || !briefJob}
          id="business-stream-review"
          className="business-recommendation"
          aria-label="Suggested business profile"
        >
          <summary>Review or change business streams</summary>
          <div className="eyebrow">
            {dirty
              ? "Suggested profile · ready to review"
              : profile.status === "advisor_reviewed"
                ? "Advisor reviewed profile"
                : "Saved proposed profile"}
          </div>
          <h3>{profile.industry}</h3>
          <p>
            {briefJob?.result?.draft?.brief
              ? "Confirm the operating streams for this engagement. Primary is the starting focus, not a claim about revenue share. Shared departments can support both streams."
              : analysis?.result?.draft.summary || profile.rationale}
          </p>
          {profile.streams.map((stream, streamIndex) => {
            const recommendation = analysis?.result?.draft.recommendations.find(
              (r: any) => r.templateId === stream.templateId,
            );
            return (
              <article className="business-stream-card" key={stream.id}>
                <h4>{stream.name}</h4>
                <span className="stream-role">
                  {streamIndex === 0
                    ? "Primary for this engagement"
                    : "Supporting business stream"}
                </span>
                {recommendation && (
                  <p>
                    {recommendation.reason}{" "}
                    <span className="subtle business-stream-confidence">
                      {recommendation.confidence} confidence
                    </span>
                  </p>
                )}
                <details
                  className="business-stream-stages"
                  open={streamIndex === 0}
                >
                  <summary>View the operating stages</summary>
                  <div className="business-flow-preview">
                    {stream.stages.map((s, i) => (
                      <span key={s.id}>
                        <small>{i + 1}</small>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </details>
                <div className="actions business-stream-actions">
                  {streamIndex > 0 && (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        update({
                          ...profile,
                          streams: [
                            stream,
                            ...profile.streams.filter(
                              (s) => s.id !== stream.id,
                            ),
                          ],
                        })
                      }
                    >
                      Make primary
                    </Button>
                  )}
                  {profile.streams.length > 1 && (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        update({
                          ...profile,
                          streams: profile.streams.filter(
                            (s) => s.id !== stream.id,
                          ),
                        })
                      }
                    >
                      Remove this stream
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
          {!!analysis?.result?.draft?.alternatives?.length && (
            <details>
              <summary>
                Other possible classifications · choose only if they fit
              </summary>
              {analysis.result.draft.alternatives.map((a: any) => (
                <article key={a.templateId}>
                  <h4>
                    {
                      businessTemplates.find((t) => t.id === a.templateId)
                        ?.label
                    }
                  </h4>
                  <p>{a.reason}</p>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      const t = businessTemplates.find(
                        (t) => t.id === a.templateId,
                      )!;
                      update({
                        ...profile,
                        streams: [
                          {
                            id: `suggested-${t.id}`,
                            templateId: t.id,
                            name: t.label,
                            stages: structuredClone(t.stages),
                          },
                        ],
                      });
                    }}
                  >
                    Use this instead of the suggested streams
                  </Button>
                </article>
              ))}
            </details>
          )}
          {analysis && (
            <details>
              <summary>Why AI suggested this</summary>
              <p>{analysis.input.lookupNote}</p>
              {analysis.result.draft.questions.map((q: string) => (
                <p key={q}>Confirm at kickoff: {q}</p>
              ))}
              {analysis.input.sources
                .filter((s: any) =>
                  analysis.result.draft.recommendations.some((r: any) =>
                    r.sourceIds.includes(s.id),
                  ),
                )
                .map((s: any) => (
                  <p key={s.id}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.title}
                    </a>
                  </p>
                ))}
            </details>
          )}
          <div className="actions business-profile-actions">
            <Button
              primary
              disabled={busy}
              onClick={async () => {
                if (dirty && !(await save("proposed"))) return;
                if (contactComplete) { setNotice("Business streams saved. Your returned preparation remains available above."); return; }
                document
                  .getElementById("journey-draft")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                document
                  .getElementById("discovery-contact-name")
                  ?.focus({ preventScroll: true });
              }}
            >
              {dirty ? <ArrowRight size={15} /> : <Check size={15} />}
              {contactComplete ? "Save business streams" : `Confirm ${profile.streams.length > 1 ? `${profile.streams.length} streams` : "stream"} & prepare kickoff request`}
            </Button>
          </div>
          <p className="subtle">
            All retained streams inform the kickoff; the primary stream sets the
            starting focus. This saves your selection and opens email
            preparation. It does not run more research or send an email.
          </p>
        </details>
      )}
      <BusinessTypeCatalog
        selectedIds={profile.streams.map((s) => s.templateId)}
        disabled={busy || profile.streams.length >= 8}
        add={add}
      />
      <details className="business-manual">
        <summary>Edit the profile and stages</summary>
        <div className="business-fields">
          <label>
            Industry or sector
            <input
              value={profile.industry}
              maxLength={200}
              placeholder="For example: industrial supplies"
              onChange={(e) => update({ ...profile, industry: e.target.value })}
            />
          </label>
          <p>
            {dirty
              ? "Unsaved changes"
              : profile.streams.length
                ? profile.status === "advisor_reviewed"
                  ? "Advisor reviewed"
                  : "Proposed · confirm during kickoff"
                : "Not classified yet"}
          </p>
        </div>
        {suggestions.length > 0 && (
          <div className="business-suggestions">
            <h3>Research suggests</h3>
            {suggestions.map((item, i) => {
              const value = (k: string) =>
                item.values.find((v: any) => v.key === k)?.value;
              return (
                <article key={i}>
                  <strong>{value("business_stream") || item.title}</strong>
                  <p>{value("why_it_fits") || item.detail}</p>
                  <p>{value("leadership_question")}</p>
                  <small>
                    {item.basis} · {item.confidence} confidence
                  </small>
                  <Button
                    disabled={profile.streams.length >= 8}
                    onClick={() =>
                      add(value("template_id"), value("business_stream"))
                    }
                  >
                    Use as a proposed flow
                  </Button>
                </article>
              );
            })}
          </div>
        )}
        <Button
          disabled={profile.streams.length >= 8}
          onClick={() => add("custom")}
        >
          Create custom flow
        </Button>
        <div className="business-streams">
          {profile.streams.map((stream, i) => (
            <details key={stream.id}>
              <summary>
                {stream.name} · {stream.stages.length} stages
              </summary>
              <div className="business-fields">
                <label>
                  Flow name
                  <input
                    value={stream.name}
                    maxLength={200}
                    onChange={(e) => changeStream(i, { name: e.target.value })}
                  />
                </label>
                <Button
                  onClick={() =>
                    update({
                      ...profile,
                      streams: profile.streams.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remove flow
                </Button>
              </div>
              <div className="business-stages">
                {stream.stages.map((stage, j) => (
                  <div key={stage.id}>
                    <label>
                      Stage {j + 1}
                      <input
                        value={stage.name}
                        maxLength={100}
                        onChange={(e) =>
                          changeStream(i, {
                            stages: stream.stages.map((s, k) =>
                              j === k ? { ...s, name: e.target.value } : s,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Common function
                      <select
                        value={stage.functionIds[0]}
                        onChange={(e) =>
                          changeStream(i, {
                            stages: stream.stages.map((s, k) =>
                              j === k
                                ? { ...s, functionIds: [e.target.value] }
                                : s,
                            ),
                          })
                        }
                      >
                        {backbone.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="actions">
                      <Button
                        disabled={j === 0}
                        onClick={() => {
                          const stages = [...stream.stages];
                          [stages[j - 1], stages[j]] = [
                            stages[j],
                            stages[j - 1],
                          ];
                          changeStream(i, { stages });
                        }}
                      >
                        Move earlier
                      </Button>
                      <Button
                        disabled={stream.stages.length === 1}
                        onClick={() =>
                          changeStream(i, {
                            stages: stream.stages.filter((_, k) => k !== j),
                          })
                        }
                      >
                        Remove stage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                disabled={stream.stages.length >= 16}
                onClick={() =>
                  changeStream(i, {
                    stages: [
                      ...stream.stages,
                      {
                        id: crypto.randomUUID(),
                        name: "New stage",
                        functionIds: ["do"],
                      },
                    ],
                  })
                }
              >
                Add stage
              </Button>
            </details>
          ))}
        </div>
        <label>
          Why this fits / questions for leadership
          <textarea
            value={profile.rationale}
            maxLength={3000}
            rows={3}
            onChange={(e) => update({ ...profile, rationale: e.target.value })}
          />
        </label>
        <div className="actions">
          <Button
            primary
            disabled={busy || !profile.streams.length}
            onClick={() => void save("proposed")}
          >
            Save proposed profile
          </Button>
          <Button
            disabled={busy || !profile.streams.length}
            onClick={() => void save("advisor_reviewed")}
          >
            Save as advisor reviewed
          </Button>
          <Button onClick={openIndustry}>Research this in Industry Map</Button>
        </div>
        <p className="subtle">
          A template describes a possible operating flow. It does not create
          employee duties, measure bottlenecks, or authorize agents. You can
          keep up to eight flows per company.
        </p>
      </details>
    </Panel>
  );
}
