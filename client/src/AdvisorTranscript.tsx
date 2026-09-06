import { useState } from "react";
import type { RecordRow } from "../../shared/domain.ts";
import { TranscriptReview } from "./TranscriptReview.tsx";
import { api } from "./api.ts";
import { Button, ErrorBox } from "./ui.tsx";
export function AdvisorTranscript({
  company,
  response,
  records,
  refresh,
  open,
}: {
  company: string;
  response: RecordRow;
  records: RecordRow[];
  refresh: () => Promise<void>;
  open: (record: RecordRow) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState<RecordRow | null>(null);
  const existing =
    saved ||
    records.find(
      (r) =>
        r.kind === "evidence" &&
        r.state === "accepted" &&
        r.data.originId === response.id &&
        r.data.transcriptionJobId,
    );
  if (existing)
    return (
      <div className="notice">
        <strong>Reviewed transcript saved.</strong>
        <p>
          This text can support discovery and strategy. The original recording
          is still linked.
        </p>
        <Button onClick={() => open(existing)}>Open reviewed transcript</Button>
      </div>
    );
  return (
    <div>
      <ErrorBox error={error} />
      {busy ? (
        <p role="status">Saving the reviewed transcript…</p>
      ) : (
        <TranscriptReview
          companyId={company}
          assetId={response.data.assetId}
          draftKey={`dg-advisor-transcript:${company}:${response.id}`}
          onBusy={() => {}}
          useLabel="Save reviewed transcript as evidence"
          onUse={(text, jobId) => {
            setBusy(true);
            setError("");
            api(
              `/v1/companies/${company}/assets/${response.data.assetId}/transcription-review`,
              "POST",
              { jobId, text, reviewed: true },
            )
              .then(async (r) => {
                setSaved(r);
                await refresh();
              })
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        />
      )}
    </div>
  );
}
