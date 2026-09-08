import { useEffect, useState } from "react";
import { api } from "./api";
import { Badge, Button, Panel, ErrorBox } from "./ui";
type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  team_size: string;
  company_url: string;
  goal: string;
  stage: string;
  next_action: string;
  created_at: string;
  converted_company_id: string | null;
};
export function DemoRequests({
  onOpen,
  onCount,
}: {
  onOpen: (companyId: string, startResearch?: boolean) => void | Promise<void>;
  onCount?: (count: number) => void;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (document.hidden) return;
      void api<Lead[]>("/v1/pilot-inbox")
        .then((rows) => {
          if (active) {
            setAllowed(true);
            setLeads(rows);
            onCount?.(rows.filter((row) => row.stage === "new").length);
            setError("");
          }
        })
        .catch((e) => {
          if (active && e.status === 403) {
            setAllowed(false);
            setLeads([]);
            onCount?.(0);
          } else if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  if (!allowed)
    return error ? (
      <p role="alert">Demo requests could not load: {error}</p>
    ) : null;
  const open = async (lead: Lead) => {
    setBusy(lead.id);
    setError("");
    try {
      const result = await api<{ companyId: string }>(
        `/v1/pilot-inbox/${lead.id}/open`,
        "POST",
        {},
      );
      await onOpen(
        result.companyId,
        !lead.converted_company_id && !!lead.company_url,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  return (
    <Panel
      title="Demo requests"
      subtitle="Review a request, research the company, then prepare its executive kickoff."
    >
      <ErrorBox error={error} />
      {loading ? (
        <p>Loading requests…</p>
      ) : !leads.length ? (
        <p>No demo requests yet.</p>
      ) : (
        leads.map((lead) => (
          <article
            key={lead.id}
            style={{ padding: "20px 0", borderBottom: "1px solid var(--line)" }}
          >
            <div
              className="actions"
              style={{ justifyContent: "space-between" }}
            >
              <h3>{lead.company}</h3>
              <Badge>{lead.stage}</Badge>
            </div>
            <p>
              {lead.name} · {lead.role} · {lead.team_size} people
            </p>
            <p>{lead.email}</p>
            <p>
              {/^https?:\/\//i.test(lead.company_url) ? (
                <a href={lead.company_url} target="_blank" rel="noreferrer">
                  {lead.company_url}
                </a>
              ) : (
                "Website not provided — add it in Discovery."
              )}
            </p>
            {lead.goal && <p>{lead.goal}</p>}
            <p>
              <small>
                {lead.stage} · {new Date(lead.created_at).toLocaleDateString()}
                {lead.next_action ? ` · ${lead.next_action}` : ""}
              </small>
            </p>
            <Button
              primary={!lead.converted_company_id}
              disabled={!!busy}
              onClick={() => void open(lead)}
            >
              {busy === lead.id
                ? "Opening…"
                : lead.converted_company_id
                  ? "Open discovery"
                  : lead.company_url
                    ? "Research this company"
                    : "Open discovery and add website"}
            </Button>
            <FollowUp
              lead={lead}
              onSave={(saved) =>
                setLeads((rows) =>
                  rows.map((row) => (row.id === saved.id ? saved : row)),
                )
              }
            />
          </article>
        ))
      )}
    </Panel>
  );
}

function FollowUp({
  lead,
  onSave,
}: {
  lead: Lead;
  onSave: (lead: Lead) => void;
}) {
  const [stage, setStage] = useState(lead.stage),
    [next, setNext] = useState(lead.next_action),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [baseline, setBaseline] = useState({
    stage: lead.stage,
    next: lead.next_action,
  });
  return (
    <details
      style={{ marginTop: 12 }}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          setStage(lead.stage);
          setNext(lead.next_action);
          setBaseline({ stage: lead.stage, next: lead.next_action });
          setError("");
        }
      }}
    >
      <summary>Manage follow-up</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          void api<Lead>(`/v1/pilot-inbox/${lead.id}`, "PATCH", {
            stage,
            nextAction: next,
            expectedStage: baseline.stage,
            expectedNextAction: baseline.next,
          })
            .then((saved) => {
              onSave(saved);
              setBaseline({ stage: saved.stage, next: saved.next_action });
            })
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        <label>
          Stage
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            {[
              "new",
              "contacted",
              "qualified",
              "scheduled",
              "active",
              "completed",
              "closed",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Next action
          <input
            value={next}
            maxLength={1000}
            onChange={(e) => setNext(e.target.value)}
            placeholder="e.g. Agree a kickoff time"
          />
        </label>
        <ErrorBox error={error} />
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save follow-up"}
        </Button>
      </form>
    </details>
  );
}
