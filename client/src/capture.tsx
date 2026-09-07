import { granularWorkGuide } from "../../shared/work-granularity.ts";
import {
  requestCaptureSteps,
  voicePreference,
} from "../../shared/request-capture.ts";
import { ParticipantCards } from "./ParticipantCards.tsx";
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
import { TranscriptReview } from "./TranscriptReview.tsx";
import "./participant.css";
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
      let result: Blob | undefined;
      const r =
        mode === "read"
          ? store.get(key)
          : mode === "delete"
            ? store.delete(key)
            : store.put(value, key);
      r.onsuccess = () => {
        result = mode === "read" ? r.result : undefined;
      };
      r.onerror = () => reject(r.error);
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error || new Error("Device storage was interrupted."));
      };
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
  onBusy,
}: {
  requestId: string;
  companyId: string;
  draftKey: string;
  onAsset: (id: string) => void;
  acknowledged: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const [blob, setBlob] = useState<Blob>(),
    [url, setUrl] = useState(""),
    [recording, setRecording] = useState(false),
    [starting, setStarting] = useState(false),
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
    chunks = useRef<Blob[]>([]),
    active = useRef(true),
    draftChanged = useRef(false);
  const save = async (b: Blob) => {
    if (!active.current) return;
    draftChanged.current = true;
    setProgress(0);
    try {
      localStorage.removeItem(draftKey + ":upload");
    } catch {}
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
    active.current = true;
    draftStore("read", draftKey)
      .then((b) => {
        if (b && active.current && !draftChanged.current) {
          setBlob(b);
          setStatus("Recovered an unfinished clip from this device.");
        }
      })
      .catch(() => {});
    return () => {
      active.current = false;
      if (media.current && media.current.state !== "inactive")
        media.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [draftKey]);
  useEffect(() => {
    onBusy(starting || recording || uploading);
  }, [starting, recording, uploading]);
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
    setStarting(true);
    onBusy(true);
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
      if (!active.current) {
        stream.current.getTracks().forEach((t) => t.stop());
        return;
      }
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
        if (
          chunks.current.reduce((size, chunk) => size + chunk.size, 0) >=
            24 * 1024 * 1024 &&
          media.current?.state === "recording"
        )
          media.current.stop();
      };
      media.current.onstop = () => {
        if (!active.current) return;
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
      if (active.current) setError((e as Error).message);
    } finally {
      if (active.current) setStarting(false);
    }
  };
  const upload = async () => {
    if (!blob) return;
    setUploading(true);
    setError("");
    try {
      if (blob.size > 25 * 1024 * 1024)
        throw new Error(
          "Each clip can be up to 25 MB. Record a shorter clip or type your response.",
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
        "Recording saved. Create a transcript or add a written answer, then send your response below.",
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
          <Button
            primary
            disabled={!acknowledged || starting}
            onClick={() => void start()}
          >
            <Mic size={16} />
            {starting ? "Opening microphone…" : "Start recording"}
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
                draftChanged.current = true;
                try {
                  await draftStore("delete", draftKey);
                  localStorage.removeItem(draftKey + ":upload");
                } catch {
                  setError(
                    "The clip was removed from this page, but this browser could not clear its saved draft.",
                  );
                }
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
                  ? "Recording saved · verify again"
                  : "Save recording"}
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
              disabled={!acknowledged || uploading || starting}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 25 * 1024 * 1024)
                    setError("This clip exceeds the 25 MB limit.");
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
    [selected, setSelected] = useState(
      () => new URLSearchParams(window.location.search).get("request") || "",
    ),
    [error, setError] = useState(""),
    [taskCards, setTaskCards] = useState<any[] | null>(null),
    [text, setText] = useState(""),
    [note, setNote] = useState(""),
    [decisions, setDecisions] = useState<Record<string, string>>({}),
    [ack, setAck] = useState(false),
    [asset, setAsset] = useState(""),
    [busy, setBusy] = useState(false),
    [captureBusy, setCaptureBusy] = useState(false),
    [transcriptBusy, setTranscriptBusy] = useState(false),
    [sentId, setSentId] = useState(""),
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
    data?.requests.find((r: any) => r.state === "sent") ||
    data?.requests[0];
  const draftKey = "dg-draft:" + user.id + ":" + request?.id;
  useEffect(() => {
    let active = true;
    if (request) {
      setTaskCards(null);
      setDecisions({});
      setNote("");
      setText("");
      try {
        setText(localStorage.getItem(draftKey) || "");
        const review = JSON.parse(
          localStorage.getItem(draftKey + ":review") || "null",
        );
        if (review) {
          setDecisions(review.decisions || {});
          setNote(review.note || "");
        }
        const upload = JSON.parse(
          localStorage.getItem(draftKey + ":upload") || "null",
        );
        if (upload?.id)
          api(`/v1/companies/${data.company.id}/assets/${upload.id}/status`)
            .then((status) => {
              if (active && status.state === "stored_unscanned")
                setAsset(upload.id);
            })
            .catch(() => {});
      } catch {}
      setAck(false);
      setAsset("");
      setSaved("");
      setCaptureBusy(false);
      setTranscriptBusy(false);
    }
    return () => {
      active = false;
    };
  }, [request?.id]);
  const saveReview = (values: Record<string, string>, context: string) => {
    setDecisions(values);
    setNote(context);
    try {
      localStorage.setItem(
        draftKey + ":review",
        JSON.stringify({ decisions: values, note: context }),
      );
    } catch {
      /* Review remains on screen if device storage is unavailable. */
    }
  };
  const saveText = (value: string) => {
    setTaskCards(null);
    setText(value);
    try {
      localStorage.setItem(draftKey, value);
      setSaved("Draft saved on this device.");
    } catch {
      setSaved("Keep this page open. Your browser could not save a draft.");
    }
  };
  const expired =
    request &&
    Date.now() > new Date(request.data.dueDate + "T23:59:59Z").getTime();
  return (
    <div className="participant">
      <header className="participant-header">
        <div className="brand">
          <NetworkMark />
          <span>
            DutyGraph<small>YOUR WORK, IN YOUR WORDS</small>
          </span>
        </div>
        <Button
          disabled={captureBusy || transcriptBusy || busy}
          onClick={() => window.location.assign("/?view=agent-requests")}
        >
          Request an agent
        </Button>
        <Button
          disabled={captureBusy || transcriptBusy || busy}
          onClick={onLogout}
        >
          <LogOut size={15} />
          Sign out
        </Button>
      </header>
      <main>
        <div className="eyebrow">
          {data?.company.name} · {user.name}
        </div>
        <h1>
          {sentId === request?.id || request?.state === "returned"
            ? "Thank you. Your response is received."
            : request?.data.type === "confirmation"
              ? "Does this describe your work?"
              : request?.data.type === "leadership"
                ? "Help us prepare a useful meeting."
                : "Read the questions. Then just talk."}
        </h1>
        <p className="participant-intro">
          {sentId === request?.id || (request && request.state !== "sent")
            ? "Your response is saved. Your advisor will bring the team's accounts together and follow up on any gaps. You can close this page."
            : request?.data.type === "leadership"
              ? `Share your goals, business model, departments and team responsibilities. ${voicePreference}`
              : `Use a recent example. Explain what you receive, what you do, and who needs the result. ${voicePreference}`}
        </p>
        {data?.person && (
          <p className="participant-role">
            {[data.person.role, data.person.team].filter(Boolean).join(" · ")}
          </p>
        )}
        <ErrorBox error={error} />
        {data?.requests.length > 1 && (
          <Field label="Your assigned requests">
            <select
              disabled={captureBusy || transcriptBusy || busy}
              value={request?.id || ""}
              onChange={(e) => {
                setSelected(e.target.value);
                window.history.replaceState(
                  null,
                  "",
                  `/respond?request=${encodeURIComponent(e.target.value)}`,
                );
              }}
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
        ) : request.state !== "sent" || sentId === request.id ? (
          <Panel title="Response received">
            <State value={sentId === request.id ? "returned" : request.state} />
            <p>
              Your original response is saved. The advisor will review it before
              updating the work record.
            </p>
          </Panel>
        ) : (
          <>
            <div className="participant-steps" aria-label="Response steps">
              <span>
                <b>01</b> Read your questions
              </span>
              <span>
                <b>02</b> Record or write
              </span>
              <span>
                <b>03</b> Review and send
              </span>
            </div>
            <div className="participant-deadline">
              <span>
                Private request for <strong>{user.name}</strong>
              </span>
              <span>Due {request.data.dueDate}</span>
            </div>
            <details className="capture-notice">
              <summary>How to complete your response</summary>
              <ol>
                {requestCaptureSteps(request.data.type).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
            {expired && (
              <ErrorBox error="This request is past its due date. Ask your advisor to extend it or send a new request. Your local draft is still saved." />
            )}
            <div className="capture-notice">
              <ShieldCheck size={22} />
              <div>
                <h3>Before you begin</h3>
                <p>{request.data.notice}</p>
                <p>
                  Your answers are shared with your assigned advisor. A
                  recording is saved when you choose Save recording. If you
                  choose Create transcript, OpenAI converts the audio into
                  editable text. You can type instead.
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
              {request.data.type === "work" && (
                <details>
                  <summary>
                    For each task: inputs → actions → software → result →
                    handoff
                  </summary>
                  <p>
                    Talk through these points for each regular task. There is no
                    required number of tasks.
                  </p>
                  <ol>
                    {granularWorkGuide.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ol>
                </details>
              )}
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
                          saveReview(
                            { ...decisions, [s.id]: e.target.value },
                            note,
                          )
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
                    onChange={(e) => saveReview(decisions, e.target.value)}
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
                  onBusy={setCaptureBusy}
                />
                {asset && (
                  <TranscriptReview
                    key={asset}
                    companyId={data.company.id}
                    assetId={asset}
                    draftKey={draftKey}
                    onBusy={setTranscriptBusy}
                    onUse={(value) => {
                      if (
                        !text.includes(value) &&
                        text.trim().length + value.trim().length + 2 > 100000
                      ) {
                        setError(
                          "The combined answer is too long. Shorten your answer or transcript before adding it. Both remain on this page.",
                        );
                        return;
                      }
                      saveText(
                        text.includes(value)
                          ? text
                          : [text.trim(), value.trim()]
                              .filter(Boolean)
                              .join("\n\n"),
                      );
                      document
                        .querySelector<HTMLTextAreaElement>(".capture-text")
                        ?.focus();
                    }}
                  />
                )}
                <Panel
                  title="Your written answer"
                  subtitle="Type here, add your reviewed transcript, or add context to your recording. Draft text saves on this device."
                >
                  <textarea
                    className="capture-text"
                    rows={7}
                    placeholder="Here’s what actually happens…"
                    value={text}
                    maxLength={100000}
                    aria-label="Your written answer"
                    onChange={(e) => saveText(e.target.value)}
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
            {request.data.type === "work" && (
              <ParticipantCards
                key={request.id + text}
                request={request}
                person={[user.name, data?.person?.role]
                  .filter(Boolean)
                  .join("  ·  ")}
                text={text}
                disabled={
                  !ack || busy || captureBusy || transcriptBusy || expired
                }
                onChange={setTaskCards}
              />
            )}
            <div className="submit-bar">
              <div>
                <strong>
                  Review your answer and task descriptions before sending.
                </strong>
                <p>
                  {asset
                    ? "Your saved recording and any text above will be sent to your advisor."
                    : "Your written answer will be sent to your advisor."}
                </p>
              </div>
              <Button
                primary
                disabled={
                  !ack ||
                  (request.data.type === "work" && taskCards === null) ||
                  busy ||
                  captureBusy ||
                  transcriptBusy ||
                  expired ||
                  (request.data.type !== "confirmation" &&
                    !asset &&
                    !text.trim()) ||
                  (request.data.type === "confirmation" &&
                    request.data.taskSnapshots.some(
                      (s: any) => !decisions[s.id],
                    ))
                }
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
                        ...(request.data.type === "work"
                          ? { taskCards: taskCards || [] }
                          : {}),
                      },
                    );
                    setSentId(request.id);
                    setSelected(request.id);
                    try {
                      localStorage.removeItem(draftKey);
                      localStorage.removeItem("dg-task-review:" + request.id);
                      localStorage.removeItem(draftKey + ":upload");
                      localStorage.removeItem(draftKey + ":review");
                      if (asset)
                        localStorage.removeItem(
                          `${draftKey}:transcript:${asset}`,
                        );
                      await draftStore("delete", draftKey);
                    } catch {
                      /* A successful submission remains successful if local cleanup fails. */
                    }
                    await load();
                  } catch (e) {
                    if ((e as any).code === "ALREADY_SUBMITTED") {
                      await load();
                      setSentId(request.id);
                      setSelected(request.id);
                    } else setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Check size={17} />
                {busy ? "Sending response…" : "Send my response"}
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
  return <span className="brand-mark" aria-hidden="true" />;
}
