import { useEffect, useRef, useState } from "react";
import { api } from "./api.ts";
import { Badge, Button, ErrorBox, Field, Panel } from "./ui.tsx";
import "./neo4j-settings.css";
type Status = {
  configured: boolean;
  connected: boolean;
  endpoint: string;
  username: string;
  database: string;
  verifiedAt: string | null;
  sourceRevision: number;
  storageReady: boolean;
  projection: null | {
    status: string;
    source_revision: number;
    message: string;
    updated_at: string;
  };
};
export function Neo4jSettings({ company }: { company: string }) {
  const [status, setStatus] = useState<Status | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const generation = useRef(0),
    form = useRef<HTMLFormElement>(null);
  const endpoint = `/v1/companies/${company}/neo4j`;
  async function load() {
    const current = generation.current;
    const next = await api<Status>(endpoint);
    if (current === generation.current) setStatus(next);
  }
  useEffect(() => {
    let live = true;
    generation.current++;
    setStatus(null);
    setBusy("");
    setError("");
    setMessage("");
    void api<Status>(endpoint)
      .then((d) => {
        if (live) setStatus(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
      generation.current++;
    };
  }, [company]);
  async function action(
    name: string,
    path: string,
    method = "POST",
    body: any = {},
  ) {
    const current = generation.current;
    setBusy(name);
    setError("");
    setMessage("");
    try {
      const result = await api<any>(
        endpoint + path,
        method,
        method === "GET" ? undefined : body,
      );
      if (current !== generation.current) return;
      await load();
      if (current !== generation.current) return;
      setMessage(
        result.message ||
          (name === "Building"
            ? "The company graph is current in Neo4j."
            : name === "Refreshing"
              ? "Connection status refreshed."
              : "Saved."),
      );
      if (name === "Saving") form.current?.reset();
    } catch (e) {
      if (current === generation.current) {
        setError((e as Error).message);
        await load().catch(() => {});
      }
    } finally {
      if (current === generation.current) setBusy("");
    }
  }
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void action("Saving", "", "PUT", {
      uri: values.get("uri"),
      username: values.get("username"),
      database: values.get("database"),
      password: values.get("password"),
      enabled: true,
    });
  }
  const current = status?.projection?.status === "current";
  return (
    <Panel
      title="Neo4j company graph"
      subtitle="Connect your Aura database to keep a graph of people, work, and relationships. This connection is shared by the companies in your advisor account. The original records remain in PostgreSQL."
      className="neo4j-settings"
    >
      <ErrorBox error={error} />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {status && (
        <>
          <div className="neo4j-status">
            <Badge
              tone={current ? "sage" : status.connected ? "blue" : "neutral"}
            >
              {current
                ? "Company graph current"
                : status.connected
                  ? "Connection verified"
                  : status.configured
                    ? "Saved · test connection"
                    : "Not connected"}
            </Badge>
            {status.verifiedAt && (
              <span>
                Last verified {new Date(status.verifiedAt).toLocaleString()}
              </span>
            )}
          </div>
          {status.configured && (
            <>
              <dl className="neo4j-facts">
                <div>
                  <dt>Aura connection</dt>
                  <dd>{status.endpoint}</dd>
                </div>
                <div>
                  <dt>Company graph</dt>
                  <dd>
                    {status.projection
                      ? `Revision ${status.projection.source_revision} of ${status.sourceRevision} · ${status.projection.status.replaceAll("_", " ")}`
                      : "Ready to build"}
                  </dd>
                </div>
              </dl>
              {status.projection?.message && (
                <p className="notice">{status.projection.message}</p>
              )}
              <div className="actions neo4j-actions">
                <Button
                  disabled={!!busy}
                  onClick={() => void action("Testing", "/test")}
                >
                  {busy === "Testing" ? "Testing…" : "Test connection"}
                </Button>
                <Button
                  primary
                  disabled={!!busy}
                  onClick={() => void action("Building", "/rebuild")}
                >
                  {busy === "Building"
                    ? "Building graph…"
                    : current
                      ? "Refresh company graph"
                      : "Build company graph"}
                </Button>
                <Button
                  disabled={!!busy}
                  onClick={() =>
                    void action("Refreshing", "", "GET", undefined)
                  }
                >
                  Refresh status
                </Button>
              </div>
              <p className="subtle">
                Changes sync after the connection is enabled. If Aura is
                unavailable or behind, the graph uses current PostgreSQL
                records.
              </p>
            </>
          )}
          <details className="neo4j-connection-form" open={!status.configured}>
            <summary>
              {status.configured
                ? "Replace connection details"
                : "Add your Aura connection"}
            </summary>
            <p>
              Copy these details from your Aura instance. This is the database
              password, not your DutyGraph or Neo4j account sign-in password.
            </p>
            <form ref={form} onSubmit={save}>
              <Field label="Aura connection URI">
                <input
                  name="uri"
                  defaultValue={status.endpoint}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="neo4j+s://xxxxxxxx.databases.neo4j.io"
                  required
                  maxLength={220}
                />
              </Field>
              <div className="neo4j-form-row">
                <Field label="Database username">
                  <input
                    name="username"
                    defaultValue={status.username || "neo4j"}
                    autoComplete="off"
                    required
                    maxLength={100}
                  />
                </Field>
                <Field label="Database name">
                  <input
                    name="database"
                    defaultValue={status.database || "neo4j"}
                    autoComplete="off"
                    required
                    maxLength={63}
                  />
                </Field>
              </div>
              <Field label="Aura database password">
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  maxLength={512}
                  placeholder={
                    status.configured
                      ? "Enter the password for this connection"
                      : "Paste the database password from Aura"
                  }
                />
              </Field>
              <p className="subtle">
                Connection credentials are encrypted on the server. The saved
                password is never returned to your browser. Graph titles and
                relationships are copied; raw interview text and audio stay in
                the original record.
              </p>
              <Button
                primary
                type="submit"
                disabled={!!busy || !status.storageReady}
              >
                {busy === "Saving" ? "Saving…" : "Save Aura connection"}
              </Button>
              {!status.storageReady && (
                <p className="notice">
                  Encrypted connection storage must be configured by the
                  operator.
                </p>
              )}
            </form>
          </details>
          {status.configured && (
            <details className="neo4j-remove">
              <summary>Remove this connection</summary>
              <p>
                This stops future copies and uses PostgreSQL for graph views. It
                does not delete records already copied into your Aura database.
              </p>
              <Button
                disabled={!!busy}
                onClick={() => void action("Removing", "", "DELETE")}
              >
                Remove saved connection
              </Button>
            </details>
          )}
        </>
      )}
    </Panel>
  );
}
