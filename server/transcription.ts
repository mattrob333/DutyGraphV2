import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AuthRequest } from "./auth.ts";
import {
  AppError,
  audit,
  command,
  fail,
  getRecord,
  tx,
  putRecord,
  setState,
  hash,
} from "./db.ts";
import { providerConfig } from "./providers.ts";

export const transcriptionModel = "gpt-4o-transcribe";
export type TranscriptionProvider = (
  input: { bytes: Buffer; mime: string },
  key: string,
) => Promise<{ text: string; requestId: string }>;
export async function transcribeAudio(
  input: { bytes: Buffer; mime: string },
  key: string,
  transport: typeof fetch = fetch,
) {
  if (!input.bytes.length || input.bytes.length > 25 * 1024 * 1024)
    throw new AppError(422, "AUDIO_SIZE", "Choose an audio clip under 25 MB.");
  const extensions: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/mpeg": "mp3",
  };
  const mime = input.mime.split(";")[0],
    extension = extensions[mime];
  if (!extension)
    throw new AppError(
      422,
      "AUDIO_TYPE",
      "This audio format is not supported.",
    );
  const body = new FormData();
  body.set("model", transcriptionModel);
  body.set("response_format", "json");
  body.set(
    "file",
    new Blob([new Uint8Array(input.bytes)], { type: mime }),
    `response.${extension}`,
  );
  const response = await transport(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(105000),
      headers: { Authorization: `Bearer ${key}` },
      body,
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError(
      502,
      response.status >= 500
        ? "TRANSCRIPTION_UNKNOWN"
        : "TRANSCRIPTION_REJECTED",
      `The transcription service returned HTTP ${response.status}. Your recording is saved. You can type your response or retry transcription.`,
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty transcription response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > 500000) {
      await reader.cancel();
      throw new Error("Transcription response too large");
    }
    chunks.push(part.value);
  }
  const data = z
    .object({ text: z.string().trim().min(1).max(100000) })
    .parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  return {
    text: data.text,
    requestId: response.headers.get("x-request-id") || "",
  };
}

/** Reuse the asset router's tenant, person and retention checks for every access. */
export function transcriptionRouter(
  asset: (
    db: any,
    user: any,
    company: string,
    id: string,
    lock?: boolean,
  ) => Promise<any>,
  provider: TranscriptionProvider = transcribeAudio,
) {
  const router = Router({ mergeParams: true });
  const scope = (req: any) => ({
    user: (req as AuthRequest).actor,
    company: z.uuid().parse(req.params.companyId),
    id: z.uuid().parse(req.params.assetId),
  });
  const latest = async (db: any, company: string, id: string) =>
    (
      await db.query(
        "SELECT id,state,result,message,created_at FROM provider_jobs WHERE company_id=$1 AND kind='audio_transcription' AND input->>'assetId'=$2 ORDER BY created_at DESC LIMIT 1",
        [company, id],
      )
    ).rows[0] || null;
  router.post("/:assetId/transcription-review", async (req, res) => {
    const { user, company, id } = scope(req);
    if (user.role === "participant")
      fail(403, "ADVISOR_REQUIRED", "An advisor must review this transcript.");
    const data = z
      .object({
        jobId: z.uuid(),
        text: z.string().trim().min(1).max(100000),
        reviewed: z.literal(true),
      })
      .strict()
      .parse(req.body);
    res.json(
      await command(
        user,
        req.header("Idempotency-Key"),
        { path: req.originalUrl, data },
        async (db) => {
          const a = await asset(db, user, company, id, true),
            request = await getRecord(db, company, a.request_id, true);
          if (
            !["returned", "accepted"].includes(request.state) ||
            request.data.type === "confirmation"
          )
            fail(
              409,
              "RESPONSE_REQUIRED",
              "Choose a returned work or leadership response first.",
            );
          const response = (
            await db.query(
              "SELECT * FROM records WHERE company_id=$1 AND kind='response' AND data->>'requestId'=$2 AND data->>'assetId'=$3 AND state IN ('returned','accepted') ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
              [company, request.id, id],
            )
          ).rows[0];
          if (!response)
            fail(
              409,
              "RESPONSE_REQUIRED",
              "The participant has not sent this recording yet.",
            );
          const job = (
            await db.query(
              "SELECT * FROM provider_jobs WHERE id=$1 AND company_id=$2 AND kind='audio_transcription' AND input->>'assetId'=$3 AND state='complete'",
              [data.jobId, company, id],
            )
          ).rows[0];
          if (!job)
            fail(
              409,
              "TRANSCRIPT_REQUIRED",
              "Create a complete transcript before reviewing it.",
            );
          const previous = (
            await db.query(
              "SELECT * FROM records WHERE company_id=$1 AND kind='evidence' AND data->>'originId'=$2 AND data->>'transcriptionJobId' IS NOT NULL AND state='accepted' ORDER BY created_at DESC LIMIT 1",
              [company, response.id],
            )
          ).rows[0];
          if (previous) {
            if (previous.data.text === data.text) return previous;
            fail(
              409,
              "TRANSCRIPT_ALREADY_REVIEWED",
              "A reviewed transcript is already saved. Retract that evidence with a reason before replacing it.",
            );
          }
          const title = (request.title + " � reviewed transcript").slice(
            0,
            200,
          );
          const evidence = await putRecord(
            db,
            user,
            company,
            "evidence",
            title,
            {
              title,
              type:
                request.data.type === "leadership"
                  ? "Leadership account"
                  : "Employee account",
              text: data.text,
              originId: response.id,
              personId: request.data.personId,
              bucket: request.data.type === "leadership" ? "leadership" : "org",
              locator: `Reviewed transcript of participant response ${response.id}`,
              classification: "Known",
              assetId: id,
              sourceDate: new Date().toISOString().slice(0, 10),
              transcriptionJobId: job.id,
              responseVersion: response.version,
              responseHash: response.hash,
              providerTranscriptHash: hash(job.result.text),
            },
            "accepted",
          );
          if (response.state !== "accepted")
            await setState(
              db,
              user,
              company,
              response,
              "accepted",
              "response.accepted",
            );
          if (request.state !== "accepted")
            await setState(
              db,
              user,
              company,
              request,
              "accepted",
              "request.accepted",
            );
          await audit(
            db,
            user,
            company,
            "audio.transcript_reviewed",
            evidence.id,
            { responseId: response.id, jobId: job.id },
          );
          return evidence;
        },
      ),
    );
  });
  router.get("/:assetId/transcription", async (req, res) => {
    const { user, company, id } = scope(req);
    res.json(
      await tx(user.tenant_id, async (db) => {
        await asset(db, user, company, id);
        await db.query(
          "UPDATE provider_jobs SET state='unknown',message='The transcription attempt ended without a confirmed result. Your recording is safe. You can retry or type your answer.',finished_at=now() WHERE company_id=$1 AND kind='audio_transcription' AND input->>'assetId'=$2 AND state='running' AND created_at<now()-interval '3 minutes'",
          [company, id],
        );
        const config = await providerConfig(user.tenant_id, "openai", db);
        return {
          configured: config.configured || provider !== transcribeAudio,
          model: transcriptionModel,
          job: await latest(db, company, id),
        };
      }),
    );
  });
  router.post("/:assetId/transcribe", async (req, res) => {
    const { user, company, id } = scope(req);
    const data = z
      .object({ consent: z.literal(true), retry: z.boolean().default(false) })
      .strict()
      .parse(req.body);
    let outgoing: { bytes: Buffer; mime: string } | undefined,
      key = "";
    const reserved = await command(
      user,
      req.header("Idempotency-Key"),
      { path: req.originalUrl, data },
      async (db) => {
        const a = await asset(db, user, company, id, true);
        if (user.role === "participant") {
          const assigned = await getRecord(db, company, a.request_id);
          if (
            assigned.kind !== "request" ||
            assigned.data.personId !== user.person_id ||
            assigned.state !== "sent" ||
            Date.now() >
              new Date(assigned.data.dueDate + "T23:59:59Z").getTime()
          )
            fail(
              409,
              "REQUEST_CLOSED",
              "This request is no longer open. Ask your advisor for a new request.",
            );
        }
        if (a.state !== "stored_unscanned")
          fail(409, "AUDIO_INCOMPLETE", "Finish the audio upload first.");
        // An asset row lock prevents simultaneous paid attempts for this recording.
        const old = await latest(db, company, id);
        if (
          old &&
          (old.state === "complete" || old.state === "running" || !data.retry)
        )
          return { id: old.id };
        const config = await providerConfig(user.tenant_id, "openai", db);
        if (!config.configured && provider === transcribeAudio)
          fail(
            503,
            "TRANSCRIPTION_NOT_CONFIGURED",
            "Your advisor has not enabled transcription. Your recording is saved; you can type your response or send the recording.",
          );
        await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          `transcription:${user.tenant_id}`,
        ]);
        const counts = (
          await db.query(
            "SELECT count(*)::int AS total,count(*) FILTER (WHERE input->>'assetId'=$1)::int AS asset FROM provider_jobs WHERE kind='audio_transcription' AND created_at>now()-interval '24 hours'",
            [id],
          )
        ).rows[0];
        if (counts.total >= 50 || counts.asset >= 3)
          fail(
            429,
            "TRANSCRIPTION_LIMIT",
            "The transcription limit has been reached. Your audio is saved. You can type your answer or send the recording.",
          );
        const bytes = Buffer.concat(
          (
            await db.query(
              "SELECT bytes FROM asset_chunks WHERE company_id=$1 AND asset_id=$2 ORDER BY chunk_index",
              [company, id],
            )
          ).rows.map((r: any) => r.bytes),
        );
        if (bytes.length !== Number(a.size))
          fail(409, "AUDIO_INCOMPLETE", "This recording is incomplete.");
        const jobId = randomUUID();
        await db.query(
          "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'audio_transcription','running',$4)",
          [
            jobId,
            user.tenant_id,
            company,
            {
              assetId: id,
              checksum: a.checksum,
              model: transcriptionModel,
              requestId: a.request_id,
              personId: a.person_id,
            },
          ],
        );
        await audit(db, user, company, "audio.transcription_requested", id, {
          jobId,
          checksum: a.checksum,
          model: transcriptionModel,
        });
        outgoing = { bytes, mime: a.mime };
        key = config.key;
        return { id: jobId };
      },
    );
    if (outgoing) {
      let state = "complete",
        result: any = null,
        message = "Transcript ready. Check the wording before sending.";
      try {
        result = await provider(outgoing, key);
      } catch (e) {
        state =
          e instanceof AppError && e.code !== "TRANSCRIPTION_UNKNOWN"
            ? "failed"
            : "unknown";
        message =
          e instanceof AppError
            ? e.message
            : "Transcription did not return a confirmed result. Your recording is saved. You can retry or type your response.";
      }
      await tx(user.tenant_id, async (db) => {
        await db.query(
          "UPDATE provider_jobs SET state=$2,result=$3,message=$4,finished_at=now() WHERE id=$1 AND state<>'expired'",
          [reserved.id, state, result, message],
        );
        await audit(db, user, company, `audio.transcription_${state}`, id, {
          jobId: reserved.id,
        });
      });
    }
    res.json(
      await tx(user.tenant_id, async (db) => {
        await asset(db, user, company, id);
        return (
          await db.query(
            "SELECT id,state,result,message,created_at FROM provider_jobs WHERE company_id=$1 AND id=$2",
            [company, reserved.id],
          )
        ).rows[0];
      }),
    );
  });
  return router;
}
