import {
  aiModels,
  defaultAiModel,
  type ReasoningEffort,
} from "../../shared/ai-models.ts";
import { useEffect, useState, useRef } from "react";
import { api } from "./api.ts";
import { Badge, Button, ErrorBox, Field, Panel } from "./ui.tsx";
const descriptions = {
  openai: [
    "OpenAI",
    "Prepare discovery, framework analyses and task drafts from the relevant evidence. Transcribe participant recordings for review.",
  ],
  exa: ["Exa", "Search public business sources and retrieve their page text."],
  resend: [
    "Resend",
    "Email private participant invitations using your verified sending domain.",
  ],
};
export function ProviderSettings({ company }: { company: string }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  const load = () => api(`/v1/companies/${company}/providers`).then(setData);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [company]);
  return (
    <Panel
      title="API keys & connections"
      subtitle="These settings belong to your advisor account and apply to its companies. Keys are encrypted on the server and are never returned to the browser."
    >
      <ErrorBox error={error} />
      {data && !data.storageReady && (
        <p className="notice">
          Encrypted key storage is not configured by the operator yet.
        </p>
      )}
      {data?.providers.map((provider: any) => (
        <ProviderForm
          key={provider.provider}
          company={company}
          value={provider}
          ready={data.storageReady}
          reload={load}
        />
      ))}
      <p className="subtle">
        Saving these keys does not make a live provider request. Run research in
        Discovery and review AI drafts before using them. Each provider uses
        your own account and billing.
      </p>
    </Panel>
  );
}
function ProviderForm({
  company,
  value,
  ready,
  reload,
}: {
  company: string;
  value: any;
  ready: boolean;
  reload: () => Promise<any>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [model, setModel] = useState(value.config.model || defaultAiModel);
  const [enabled, setEnabled] = useState(
    value.source === "account" ? !!value.configured : true,
  );
  const [reasoning, setReasoning] = useState<ReasoningEffort>(
    value.config.reasoning || "medium",
  );
  const [title, description] =
    descriptions[value.provider as keyof typeof descriptions];
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      values = new FormData(form);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/v1/companies/${company}/providers/${value.provider}`, "PUT", {
        key: values.get("key"),
        enabled,
        model,
        reasoning,
        from: values.get("from") || "",
      });
      form.reset();
      await reload();
      setMessage("Saved securely. The provider has not been tested yet.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="provider-setting">
      <summary>
        {title}{" "}
        <Badge tone={value.configured ? "sage" : "neutral"}>
          {value.configured
            ? "Configured · not verified"
            : value.source === "account"
              ? "Saved · disabled"
              : "Not configured"}
        </Badge>
      </summary>
      <p>{description}</p>
      <ErrorBox error={error} />
      {message && <p role="status">{message}</p>}
      <form onSubmit={save} ref={formRef}>
        <Field label={`${title} API key`}>
          <input
            name="key"
            type="password"
            autoComplete="off"
            minLength={12}
            maxLength={512}
            required
            placeholder={
              value.source === "account"
                ? "Enter replacement key"
                : "Paste your project API key"
            }
          />
        </Field>
        {value.provider === "openai" && (
          <>
            <Field label="AI model">
              <select
                name="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {aiModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <p className="subtle">
              {aiModels.find((m) => m.id === model)?.description} This choice
              applies to all AI discovery drafts. Exa collects public sources;
              this model analyzes the selected evidence. Model access depends on
              your OpenAI project.
            </p>
            {model !== "gpt-4.1-mini" && (
              <Field label="Reasoning effort">
                <select
                  name="reasoning"
                  value={reasoning}
                  onChange={(e) =>
                    setReasoning(e.target.value as ReasoningEffort)
                  }
                >
                  <option value="low">Low — faster</option>
                  <option value="medium">Medium — balanced reasoning</option>
                  <option value="high">High — more reasoning time</option>
                </select>
              </Field>
            )}
            <p className="subtle">
              Higher capability and reasoning effort can increase response time
              and provider charges.
            </p>
          </>
        )}
        {value.provider === "resend" && (
          <Field label="Verified sender email">
            <input
              name="from"
              type="email"
              required
              defaultValue={value.config.from || ""}
              placeholder="invitations@yourdomain.com"
            />
          </Field>
        )}
        <label className="check-line">
          <input
            type="checkbox"
            name="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />{" "}
          Enable this provider for my account
        </label>
        <Button type="submit" primary disabled={busy || !ready}>
          {busy ? "Saving…" : `Save ${title} key`}
        </Button>
        {value.source === "account" && (
          <Button
            disabled={busy}
            onClick={async () => {
              const form = formRef.current!;
              setBusy(true);
              setError("");
              try {
                await api(
                  `/v1/companies/${company}/providers/${value.provider}`,
                  "DELETE",
                  {},
                );
                form.reset();
                await reload();
                setMessage("Stored key removed.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove stored key
          </Button>
        )}
      </form>
    </details>
  );
}
