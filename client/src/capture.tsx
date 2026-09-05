import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Pause,
  Play,
  Square,
  Upload,
  Trash2,
  Check,
  ArrowRight,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { api } from "./api.ts";
import { Button, Panel, Field, ErrorBox, Badge, State, Empty } from "./ui.tsx";
import type { User } from "../../shared/domain.ts";
async function draftStore(
  mode: "read" | "write" | "delete",
  key: string,
  value?: Blob,
): Promise<Blob | undefined> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("dutygraph-capture-v1", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("clips");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result,
        tx = db.transaction(
          "clips",
          mode === "read" ? "readonly" : "readwrite",
        ),
        store = tx.objectStore("clips");
      const r =
        mode === "read"
          ? store.get(key)
          : mode === "delete"
            ? store.delete(key)
            : store.put(value, key);
      r.onsuccess = () => resolve(mode === "read" ? r.result : undefined);
      r.onerror = () => reject(r.error);
      tx.oncomplete = () => db.close();
    };
  });
}
async function digest(blob: Blob) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function base64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
function Recorder({
  requestId,
  companyId,
  draftKey,
  onAsset,
  acknowledged,
}: {
  requestId: string;
  companyId: string;
  draftKey: string;
  onAsset: (id: string) => void;
  acknowledged: boolean;
}) {
  const [blob, setBlob] = useState<Blob>(),
    [url, setUrl] = useState(""),
    [recording, setRecording] = useState(false),
    [paused, setPaused] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [progress, setProgress] = useState(0),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const media = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    started = useRef(0),
    pauseAt = useRef(0),
    pauseTotal = useRef(0),
    chunks = useRef<Blob[]>([]);
  const save = async (b: Blob) => {
    setBlob(b);
    onAsset("");
    try {
      await draftStore("write", draftKey, b);
      setStatus("Clip saved on this device. Review it, then upload.");
    } catch {
      setStatus(
        "Local storage unavailable. Keep this page open until upload completes.",
      );
    }
  };
  useEffect(() => {
    draftStore("read", draftKey)
      .then((b) => {
        if (b) {
          setBlob(b);
          setStatus("Recovered an unfinished clip from this device.");
        }
      })
      .catch(() => {});
    return () => {
      media.current?.state === "recording" && media.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [draftKey]);
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  useEffect(() => {
    if (!recording || paused) return;
    const timer = setInterval(() => {
      const seconds = Math.floor(
        (Date.now() - started.current - pauseTotal.current) / 1000,
      );
      setElapsed(seconds);
      if (seconds >= 1200) media.current?.stop();
    }, 500);
    return () => clearInterval(timer);
  }, [recording, paused]);
  const start = async () => {
    setError("");
    try {
      if (!acknowledged)
        throw new Error("Read and acknowledge the capture notice first.");
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Recording is unsupported here. Use a typed response or upload an audio file.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      media.current = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      );
      chunks.current = [];
      media.current.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      media.current.onstop = () => {
        setRecording(false);
        setPaused(false);
        stream.current?.getTracks().forEach((t) => t.stop());
        void save(new Blob(chunks.current, { type: media.current!.mimeType }));
      };
      media.current.start(1000);
      started.current = Date.now();
      pauseTotal.current = 0;
      setElapsed(0);
      setRecording(true);
      setBlob(undefined);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError((e as Error).message);
    }
  };
  const upload = async () => {
    if (!blob) return;
    setUploading(true);
    setError("");
    try {
      if (blob.size > 25 * 1024 * 1024)
        throw new Error(
          "The local pilot limit is 25 MB per clip. Record a shorter clip or type your response.",
        );
      const sum = await digest(blob);
      let cached: any;
      try {
        cached = JSON.parse(
          localStorage.getItem(draftKey + ":upload") || "null",
        );
      } catch {}
      if (!cached || cached.checksum !== sum) {
        const result = await api(`/v1/companies/${companyId}/assets`, "POST", {
          mime: blob.type || "audio/webm",
          size: blob.size,
          requestId,
        });
        cached = { id: result.id, checksum: sum };
        localStorage.setItem(draftKey + ":upload", JSON.stringify(cached));
      }
      const result = await api(
        `/v1/companies/${companyId}/assets/${cached.id}/status`,
      );
      const received = new Set(result.chunks.map((c: any) => c.chunk_index));
      let done = 0;
      for (
        let offset = 0, index = 0;
        offset < blob.size;
        offset += 512 * 1024, index++
      ) {
        const part = blob.slice(offset, offset + 512 * 1024);
        if (!received.has(index))
          await api(
            `/v1/companies/${companyId}/assets/${cached.id}/chunks/${index}`,
            "PUT",
            { base64: await base64(part), checksum: await digest(part) },
          );
        done += part.size;
        setProgress(Math.round((done / blob.size) * 100));
      }
      if (result.state !== "stored_unscanned")
        await api(
          `/v1/companies/${companyId}/assets/${cached.id}/finalize`,
          "POST",
          { checksum: sum },
        );
      onAsset(cached.id);
      setStatus(
        "Upload complete. The server verified every byte. Review and submit below.",
      );
    } catch (e) {
      setError((e as Error).message + " You can resume this upload.");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="recorder">
      <div className={"record-orb " + (recording && !paused ? "active" : "")}>
        <Mic size={30} />
      </div>
      <h3>
        {recording
          ? paused
            ? "Recording paused"
            : "Recording your response"
          : blob
            ? "Your recorded clip"
            : "Tell it in your own words"}
      </h3>
      <p>
        {recording ? (
          <span className="timer">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        ) : (
          "A recent example is more useful than a polished job description."
        )}
      </p>
      {blob && url && <audio controls src={url} />}
      <div className="actions centered">
        {!recording && !blob && (
          <Button primary disabled={!acknowledged} onClick={() => void start()}>
            <Mic size={16} />
            Start recording
          </Button>
        )}
        {recording && (
          <>
            <Button
              onClick={() => {
                if (paused) {
                  media.current?.resume();
                  pauseTotal.current += Date.now() - pauseAt.current;
                } else {
                  media.current?.pause();
                  pauseAt.current = Date.now();
                }
                setPaused(!paused);
              }}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}{" "}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button primary onClick={() => media.current?.stop()}>
              <Square size={14} />
              Finish clip
            </Button>
          </>
        )}
        {blob && !recording && (
          <>
            <Button
              onClick={async () => {
                setBlob(undefined);
                setProgress(0);
                setStatus("");
                onAsset("");
                await draftStore("delete", draftKey);
                localStorage.removeItem(draftKey + ":upload");
              }}
              disabled={uploading}
            >
              <Trash2 size={15} />
              Discard clip
            </Button>
            <Button
              primary
              disabled={uploading || !acknowledged}
              onClick={() => void upload()}
            >
              <Upload size={16} />
              {uploading
                ? "Uploading " + progress + "%"
                : progress === 100
                  ? "Verify upload"
                  : "Upload / resume"}
            </Button>
          </>
        )}
        {!recording && (
          <label className="btn file-button">
            <Upload size={15} />
            Choose audio
            <input
              type="file"
              accept="audio/webm,audio/ogg,audio/wav,audio/mp4,audio/mpeg"
              disabled={!acknowledged || uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 25 * 1024 * 1024)
                    setError("This clip exceeds the 25 MB pilot limit.");
                  else void save(f);
                }
              }}
            />
          </label>
        )}
      </div>
      <p className="subtle">
        Up to 20 minutes of recording · 25 MB per clip · Typed response is
        equally welcome.
      </p>
      {status && (
        <p className="blue-text" role="status">
          {status}
        </p>
      )}
      <ErrorBox error={error} />
    </div>
  );
}
export function Participant({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [note, setNote] = useState(""),
    [decisions, setDecisions] = useState<Record<string, string>>({}),
    [ack, setAck] = useState(false),
    [asset, setAsset] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState("");
  const load = () =>
    api("/v1/participant/requests")
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  const request =
    data?.requests.find((r: any) => r.id === selected) ||
    data?.requests.find((r: any) => r.state === "sent");
  const draftKey = "dg-draft:" + user.id + ":" + request?.id;
  useEffect(() => {
    if (request) {
      try {
        setText(localStorage.getItem(draftKey) || "");
      } catch {}
      setDecisions({});
      setAck(false);
      setAsset("");
      setSaved("");
    }
  }, [request?.id]);
  return (
    <div className="participant">
      <header className="participant-header">
        <div className="brand">
          <NetworkMark />
          <span>
            Duty Graph<small>YOUR WORK, IN YOUR WORDS</small>
          </span>
        </div>
        <Button onClick={onLogout}>
          <LogOut size={15} />
          Sign out
        </Button>
      </header>
      <main>
        <div className="eyebrow">
          {data?.company.name} · {user.name}
        </div>
        <h1>
          {request?.data.type === "confirmation"
            ? "Does this describe your work?"
            : "Read the questions. Then just talk."}
        </h1>
        <p className="participant-intro">
          No script. No perfect answer. Walk through what really happens.
          Stories, frustrations, and tangents help us understand the work.
        </p>
        <ErrorBox error={error} />
        {data?.requests.length > 1 && (
          <Field label="Your assigned requests">
            <select
              value={request?.id || ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {data.requests.map((r: any) => (
                <option value={r.id} key={r.id}>
                  {r.title} — {r.state}
                </option>
              ))}
            </select>
          </Field>
        )}
        {!data ? (
          <div className="loading">Loading your assigned request…</div>
        ) : !request ? (
          <Empty
            title="You’re all caught up"
            detail="There are no open requests assigned to you."
          />
        ) : request.state !== "sent" ? (
          <Panel title="Response received">
            <State value={request.state} />
            <p>
              Your original response is saved. The advisor will review it before
              updating the work record.
            </p>
          </Panel>
        ) : (
          <>
            <div className="capture-notice">
              <ShieldCheck size={22} />
              <div>
                <h3>Before you begin</h3>
                <p>{request.data.notice}</p>
                <p>
                  Audio is stored in this local service. Transcription and
                  malware scanning are not configured. Invitation enrollment
                  uses link possession and a password; email identity is not
                  independently verified.
                </p>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                  />
                  I understand the notice and choose to provide a response.
                </label>
              </div>
            </div>
            <Panel
              title={request.title}
              subtitle={
                request.data.type === "confirmation"
                  ? "Your answer applies only to the exact task version shown."
                  : "Use these prompts as a guide. Follow the story where it goes."
              }
            >
              <ol className="prompts">
                {request.data.questions.map((q: string, i: number) => (
                  <li key={i}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {q}
                  </li>
                ))}
              </ol>
            </Panel>
            {request.data.type === "confirmation" ? (
              <div className="stack">
                {request.data.taskSnapshots.map((s: any) => (
                  <Panel
                    key={s.id}
                    title={s.title}
                    action={<Badge>Exact version {s.version}</Badge>}
                  >
                    <p>{s.data.purpose}</p>
                    <dl className="details">
                      <dt>Starts when</dt>
                      <dd>{s.data.trigger}</dd>
                      <dt>Inputs</dt>
                      <dd>{s.data.inputs}</dd>
                      <dt>Instructions</dt>
                      <dd>{s.data.instructions}</dd>
                      <dt>Produces</dt>
                      <dd>{s.data.output}</dd>
                      <dt>Human checkpoint</dt>
                      <dd>{s.data.humanGate}</dd>
                      <dt>Not authorized</dt>
                      <dd>{s.data.denied.join("; ")}</dd>
                    </dl>
                    <Field label="Your response">
                      <select
                        value={decisions[s.id] || ""}
                        required
                        onChange={(e) =>
                          setDecisions({ ...decisions, [s.id]: e.target.value })
                        }
                      >
                        <option value="">Choose your response</option>
                        <option value="correct">
                          Correct — this describes my work
                        </option>
                        <option value="needs_change">Needs a change</option>
                        <option value="not_mine">
                          This is not my responsibility
                        </option>
                        <option value="unsure">I am not sure</option>
                      </select>
                    </Field>
                  </Panel>
                ))}
                <Field label="Corrections or context">
                  <textarea
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <>
                <Recorder
                  key={request.id}
                  requestId={request.id}
                  companyId={data.company.id}
                  draftKey={draftKey}
                  onAsset={setAsset}
                  acknowledged={ack}
                />
                <Panel
                  title="Or write your response"
                  subtitle="You can type instead of recording, or add context to your clip."
                >
                  <textarea
                    className="capture-text"
                    rows={7}
                    placeholder="Here’s what actually happens…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className="actions">
                    <Button
                      onClick={() => {
                        try {
                          localStorage.setItem(draftKey, text);
                          setSaved("Draft saved on this device.");
                        } catch {
                          setSaved(
                            "This browser could not save the draft. Keep the page open.",
                          );
                        }
                      }}
                    >
                      Save draft on this device
                    </Button>
                    <small role="status">{saved}</small>
                  </div>
                </Panel>
              </>
            )}
            <div className="submit-bar">
              <div>
                <strong>Review your response before submitting.</strong>
                <p>
                  Submitting shares it with your assigned advisor. It does not
                  grant any authority.
                </p>
              </div>
              <Button
                primary
                disabled={!ack || busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await api(
                      "/v1/participant/requests/" + request.id + "/submit",
                      "POST",
                      {
                        expectedVersion: request.version,
                        text,
                        assetId: asset,
                        acknowledged: true,
                        decisions,
                        note,
                      },
                    );
                    localStorage.removeItem(draftKey);
                    localStorage.removeItem(draftKey + ":upload");
                    await draftStore("delete", draftKey);
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Check size={17} />
                {busy ? "Submitting…" : "Submit response"}
              </Button>
            </div>
          </>
        )}
      </main>
      <footer>Evidence first. People authorize.</footer>
    </div>
  );
}
export function NetworkMark() {
  return (
    <span className="brand-mark">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <rect x="2" y="3" width="6" height="5" rx="1" />
        <rect x="16" y="3" width="6" height="5" rx="1" />
        <rect x="9" y="16" width="6" height="5" rx="1" />
        <path d="M5 8v4h14V8M12 12v4" />
      </svg>
    </span>
  );
}
