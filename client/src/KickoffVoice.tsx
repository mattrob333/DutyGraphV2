import { useEffect, useRef, useState } from "react";
import { Button, ErrorBox } from "./ui.tsx";
export function KickoffVoice({
  token,
  endpoint,
  enabled,
  append,
  busy: submitting,
  onPending,
}: {
  token: string;
  endpoint?: string;
  enabled: boolean;
  append: (text: string) => void;
  busy: boolean;
  onPending: (pending: boolean) => void;
}) {
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    mounted = useRef(true);
  const [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false),
    [clip, setClip] = useState<Blob | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    onPending(recording || busy || !!clip);
  }, [recording, busy, clip, onPending]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (!clip) return;
    const u = URL.createObjectURL(clip);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [clip]);
  async function start() {
    setBusy(true);
    setError("");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Recording is unavailable in this browser. Type here or use your device's dictation.",
        );
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      if (!mime)
        throw new Error(
          "This browser does not support a recording format we can transcribe.",
        );
      const r = new MediaRecorder(s, {
        mimeType: mime,
        audioBitsPerSecond: 64000,
      });
      recorder.current = r;
      const parts: Blob[] = [];
      let bytes = 0;
      r.ondataavailable = (e) => {
        if (e.data.size) {
          parts.push(e.data);
          bytes += e.data.size;
          if (bytes > 2800000 && r.state === "recording") r.stop();
        }
      };
      r.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        s.getTracks().forEach((t) => t.stop());
        if (mounted.current) {
          setRecording(false);
          setClip(new Blob(parts, { type: mime }));
        }
      };
      r.onerror = () => {
        setError(
          "Recording stopped unexpectedly. Review the captured clip before transcribing.",
        );
        if (r.state === "recording") r.stop();
      };
      r.start(1000);
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 180000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function transcribe() {
    if (!clip) return;
    setBusy(true);
    setError("");
    try {
      if (clip.size > 3 * 1024 * 1024)
        throw new Error(
          "This clip is too large. Download it and record a shorter clip.",
        );
      const r = await fetch(
        endpoint || `/api/invitations/${token}/transcribe`,
        {
          method: "POST",
          headers: { "Content-Type": clip.type },
          body: clip,
        },
      );
      const d = await r.json();
      if (!r.ok)
        throw new Error(
          d.message ||
            "Transcription failed. Your recording is still available below.",
        );
      append(d.text);
      setClip(null);
      setUrl("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="kickoff-voice">
      <div className="actions">
        <Button
          type="button"
          disabled={!enabled || busy || submitting || !!clip}
          onClick={() => (recording ? recorder.current?.stop() : void start())}
        >
          {recording ? "Stop recording" : "Record a voice response"}
        </Button>
        {clip && (
          <Button
            type="button"
            disabled={busy || submitting}
            onClick={() => void transcribe()}
          >
            {busy ? "Transcribing…" : "Transcribe into my response"}
          </Button>
        )}
      </div>
      <p role="status">
        {recording
          ? "Recording — stops automatically after 3 minutes. You can add more clips."
          : enabled
            ? "Record, stop, then transcribe with OpenAI. Review the editable text before sending. Audio is sent only when you choose Transcribe."
            : "Your advisor has not enabled transcription. You can type or use Wispr Flow / device dictation in the response box."}
      </p>
      {clip && (
        <div>
          <audio controls src={url} />
          <div className="actions">
            <a
              href={url}
              download={`kickoff-response.${clip.type.includes("mp4") ? "mp4" : "webm"}`}
            >
              Download recording
            </a>
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setClip(null);
                setUrl("");
              }}
            >
              Discard recording
            </Button>
          </div>
        </div>
      )}
      <small>
        Audio is held in this page until transcribed or discarded; saving text
        progress does not save recordings. Up to 10 clips per request per day.
        Transcription uses your advisor's configured service.
      </small>
      <ErrorBox error={error} />
    </div>
  );
}
