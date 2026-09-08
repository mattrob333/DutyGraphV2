import { StageHelp } from "./StageHelp.tsx";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { businessTemplates } from "../../shared/business-types.ts";
import { businessTypeExamples } from "./business-type-examples.ts";
import { Button } from "./ui.tsx";

export function BusinessTypeCatalog({
  selectedIds,
  disabled,
  add,
}: {
  selectedIds: string[];
  disabled: boolean;
  add: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [notice, setNotice] = useState("");
  const matches = businessTemplates.filter((t) => {
    const example = businessTypeExamples[t.id];
    return (
      (!group || t.group === group) &&
      `${t.id} ${t.label} ${t.description} ${t.group} ${example.name} ${example.context}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );
  });
  return (
    <details className="business-catalog">
      <summary>
        <span>About business types · examples and alternatives</span>
      </summary>
      <div className="business-catalog-content">
        <p>
          Find a business that works like yours. These are operating patterns,
          not industries: a company can use more than one. Stage counts vary.
          These are suggested starting points; add, combine or remove stages to fit the company.
        </p>
        <div className="business-fields">
          <label>
            Search types or example companies
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Try Wesco, Salesforce, retail or consulting…"
            />
          </label>
          <label>
            Business family
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">All families</option>
              {[...new Set(businessTemplates.map((t) => t.group))].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="business-catalog-toolbar">
          <p role="status">
            Showing {matches.length} of {businessTemplates.length} types
          </p>
          {(search || group) && (
            <Button
              onClick={() => {
                setSearch("");
                setGroup("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        <p className="subtle">
          Examples illustrate part of each organization’s business; these are
          not customer claims or endorsements. Their actual processes can differ
          from these starting templates.
        </p>
        <p role="status" className="business-catalog-notice">
          {notice}
        </p>
        {!matches.length && (
          <p>
            No matching types. Try a broader name or clear the filters. You can
            also create a custom flow under “Edit the profile and stages.”
          </p>
        )}
        <div className="business-type-grid">
          {matches.map((t) => {
            const example = businessTypeExamples[t.id];
            const selected = selectedIds.includes(t.id);
            return (
              <article
                key={t.id}
                className={`business-type-card ${selected ? "is-selected" : ""}`}
              >
                <span className="eyebrow">{t.group}</span>
                <h3>{t.label}</h3>
                <p>{t.description}</p>
                <div className="business-type-example">
                  <span className="subtle">
                    {example.url ? "Think of" : "For example"}
                  </span>
                  <strong>
                    {example.url ? (
                      <a href={example.url} target="_blank" rel="noreferrer">
                        {example.name} ↗
                      </a>
                    ) : (
                      example.name
                    )}
                  </strong>
                  <p>{example.context}</p>
                </div>
                <details>
                  <summary>Preview suggested stages · {t.stages.length}</summary>
                  <ol>
                    {t.stages.map((stage) => (
                      <li key={stage.id}>{stage.name} <StageHelp stage={stage} stream={t} /></li>
                    ))}
                  </ol>
                </details>
                <Button
                  disabled={disabled || selected}
                  onClick={() => {
                    add(t.id);
                    setNotice(
                      `${t.label} added to your proposed profile above. Review it, then choose “Use this business profile” to save.`,
                    );
                  }}
                >
                  {selected ? <Check size={15} /> : <Plus size={15} />}
                  {selected ? "Added to profile" : `Add ${t.label}`}
                </Button>
              </article>
            );
          })}
        </div>
        {selectedIds.length >= 8 && (
          <p>
            You have eight flows. Remove a flow in the profile editor before
            adding another.
          </p>
        )}
      </div>
    </details>
  );
}
