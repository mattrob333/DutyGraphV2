import { useEffect, useState, useRef } from "react";
import { api } from "./api.ts";
import { Badge, Button, ErrorBox, Field, Panel } from "./ui.tsx";
const descriptions = {
  openai: [
    "OpenAI",
    "Draft a meeting brief, task descriptions and hypotheses from selected evidence.",
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
        Neo4j: not connected. Company records and the derived graph currently
        use PostgreSQL. Saving keys does not make a live provider request; test
        research in Discovery and review AI drafts before using them.
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
        password: values.get("password"),
        enabled: values.get("enabled") === "on",
        model: values.get("model") || "gpt-5-mini",
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
          <Field label="AI model">
            <select
              name="model"
              defaultValue={value.config.model || "gpt-5-mini"}
            >
              <option value="gpt-5-mini">GPT-5 mini</option>
              <option value="gpt-4.1-mini">GPT-4.1 mini</option>
            </select>
          </Field>
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
        <Field label="Your current account password">
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </Field>
        <label className="check-line">
          <input type="checkbox" name="enabled" defaultChecked /> Enable this
          provider for my account
        </label>
        <Button type="submit" primary disabled={busy || !ready}>
          {busy ? "Saving…" : `Save ${title} key`}
        </Button>
        {value.source === "account" && (
          <Button
            disabled={busy}
            onClick={async () => {
              const form = formRef.current!,
                password = new FormData(form).get("password");
              setBusy(true);
              setError("");
              try {
                await api(
                  `/v1/companies/${company}/providers/${value.provider}`,
                  "DELETE",
                  { password },
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
