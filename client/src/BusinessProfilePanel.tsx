import { useEffect, useState } from "react";
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
export function BusinessProfilePanel({
  company,
  refresh,
  openIndustry,
}: {
  company: Company;
  refresh: () => Promise<void>;
  openIndustry: () => void;
}) {
  const [profile, setProfile] = useState<BusinessProfile>(
    () =>
      company.settings.businessProfile || {
        industry: "",
        status: "proposed",
        rationale: "",
        streams: [],
      },
  );
  const [search, setSearch] = useState(""),
    [group, setGroup] = useState(""),
    [templateId, setTemplateId] = useState(""),
    [dirty, setDirty] = useState(false),
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
      const next = businessProfileSchema.parse({ ...profile, status });
      await api(`/v1/companies/${company.id}/business-profile`, "PUT", {
        expectedRevision: company.revision,
        profile: next,
      });
      setProfile(next);
      setDirty(false);
      await refresh();
      setNotice(
        status === "advisor_reviewed"
          ? "Business profile saved as advisor reviewed."
          : "Proposed business profile saved.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const matches = businessTemplates.filter(
    (t) =>
      (!group || t.group === group) &&
      (t.label + " " + t.description)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const selected = matches.find((t) => t.id === templateId);
  return (
    <Panel
      title="What kind of business is this?"
      subtitle="Choose how this company operates. Industry and operating model are different; a hybrid company can have several flows."
    >
      <div className="business-backbone">
        {backbone.map((f, i) => (
          <span key={f.id}>
            <small>{i + 1}</small>
            {f.label}
          </span>
        ))}
      </div>
      <p>
        Common functions, company-specific names. These starting templates can
        be renamed and adapted with leadership. Supporting departments may
        enable several stages.
      </p>
      <ErrorBox error={error} />
      {notice && <p role="status">{notice}</p>}
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
      <details open={!profile.streams.length}>
        <summary>
          Browse {businessTemplates.length} business types or create a custom
          flow
        </summary>
        <div className="business-fields">
          <label>
            Search business types
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setTemplateId("");
              }}
              placeholder="Manufacturing, SaaS, advisory…"
            />
          </label>
          <label>
            Business family
            <select
              value={group}
              onChange={(e) => {
                setGroup(e.target.value);
                setTemplateId("");
              }}
            >
              <option value="">All families</option>
              {[...new Set(businessTemplates.map((t) => t.group))].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Starting template
          <select
            value={selected?.id || ""}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">Choose from {matches.length} types</option>
            {matches.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <div className="business-template">
            <p>{selected.description}</p>
            <div className="business-flow-preview">
              {selected.stages.map((s) => (
                <span key={s.id}>
                  {s.name}
                  <small>
                    {s.functionIds
                      .map((id) => backbone.find((f) => f.id === id)?.label)
                      .join(", ")}
                  </small>
                </span>
              ))}
            </div>
            <Button
              disabled={profile.streams.length >= 8}
              onClick={() => add(selected.id)}
            >
              Add this business flow
            </Button>
          </div>
        )}
        <Button
          disabled={profile.streams.length >= 8}
          onClick={() => add("custom")}
        >
          Create custom flow
        </Button>
      </details>
      <div className="business-streams">
        {profile.streams.map((stream, i) => (
          <details key={stream.id} open>
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
                        [stages[j - 1], stages[j]] = [stages[j], stages[j - 1]];
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
        employee duties, measure bottlenecks, or authorize agents. You can keep
        up to eight flows per company.
      </p>
    </Panel>
  );
}
