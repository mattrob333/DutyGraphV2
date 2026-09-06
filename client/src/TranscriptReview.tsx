import { useEffect, useState } from "react";
import { api } from "./api.ts";
import { Button, ErrorBox, Panel } from "./ui.tsx";

export function TranscriptReview({
  companyId,
  assetId,
  draftKey,
  onUse,
  onBusy,
  useLabel = "Use this text in my response",
}: {
  companyId: string;
  assetId: string;
  draftKey: string;
  onUse: (text: string, jobId: string) => void;
  useLabel?: string;
  onBusy: (busy: boolean) => void;
}) {
  const [status, setStatus] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [text, setText] = useState("");
  const path = `/v1/companies/${companyId}/assets/${assetId}`;
  const cache = `${draftKey}:transcript:${assetId}`;
  const receive = (data: any) => {
    setStatus(data);
    if (data.job?.state === "complete")
      setText((current) => {
        if (current) return current;
        try {
          return localStorage.getItem(cache) || data.job.result.text;
        } catch {
          return data.job.result.text;
        }
      });
  };
  useEffect(() => {
    let active = true;
    api(path + "/transcription")
      .then((data) => {
        if (active) receive(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      onBusy(false);
    };
  }, [path]);
  useEffect(() => {
    if (status?.job?.state !== "running") return;
    const timer = setInterval(() => {
      api(path + "/transcription")
        .then(receive)
        .catch((e) => setError(e.message));
    }, 5000);
    return () => clearInterval(timer);
  }, [status?.job?.state, path]);
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const job = await api(path + "/transcribe", "POST", {
        consent: true,
        retry: ["failed", "unknown"].includes(status?.job?.state),
      });
      receive({ ...status, job });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const running = busy || status?.job?.state === "running";
  useEffect(() => {
    onBusy(running);
  }, [running, onBusy]);
  return (
    <Panel
      title="Turn your recording into text"
      subtitle="Check names, numbers and wording. Your original recording stays attached."
    >
      <ErrorBox error={error} />
      {status?.job?.state === "complete" ? (
        <>
          <label className="field">
            <span>Review the transcript</span>
            <textarea
              rows={8}
              value={text}
              maxLength={100000}
              onChange={(e) => {
                setText(e.target.value);
                try {
                  localStorage.setItem(cache, e.target.value);
                } catch {
                  /* Text remains in the field. */
                }
              }}
            />
          </label>
          <Button
            primary
            disabled={!text.trim()}
            onClick={() => onUse(text, status.job.id)}
          >
            {useLabel}
          </Button>
          <p className="subtle">
            {useLabel === "Use this text in my response"
              ? "This adds the transcript to your answer below. Read your complete answer, then send it."
              : "Save only after you compare the transcript with the recording. The original participant response stays unchanged."}
          </p>
        </>
      ) : (
        <>
          <p>
            {status?.job?.message ||
              "Create an editable transcript so you can check your answer before sending it."}
          </p>
          {status && !status.configured ? (
            <p className="subtle">
              Your advisor has not enabled transcription. You can send the saved
              recording, type your answer, or do both.
            </p>
          ) : (
            <>
              <p className="subtle">
                This sends your recording to OpenAI using your advisor’s
                connection.
              </p>
              <Button disabled={running || !status} onClick={() => void run()}>
                {running
                  ? "Creating transcript…"
                  : status?.job
                    ? "Retry transcription"
                    : "Create transcript"}
              </Button>
            </>
          )}
        </>
      )}
    </Panel>
  );
}
