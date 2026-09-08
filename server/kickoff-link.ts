import { kickoffPublicContext } from "./kickoff-context.ts";
import express from "express";
import { providerConfig } from "./providers.ts";
import {
  transcribeAudio,
  type TranscriptionProvider,
} from "./transcription.ts";
import { Router } from "express";
import { z } from "zod";
import {
  pool,
  tx,
  tokenHash,
  fail,
  getRecord,
  putRecord,
  setState,
  audit,
} from "./db.ts";
import { publicUser } from "./auth.ts";
import {
  kickoffPreparationSchema,
  validateKickoffPreparation,
  kickoffPreparationText,
} from "../shared/kickoff-preparation.ts";

export function kickoffLinkRouter(
  transcription: TranscriptionProvider = transcribeAudio,
) {
  const router = Router();
  // Possession grants access only to this kickoff request, never an account/session.
  async function access(
    token: string,
    submit: boolean,
    body?: unknown,
    voice = false,
  ) {
    z.string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(token);
    const digest = tokenHash(token);
    const first = await pool.query(
      "SELECT tenant_id FROM invitations WHERE token_hash=$1",
      [digest],
    );
    if (!first.rows[0])
      fail(
        410,
        "INVITATION_EXPIRED",
        "This link is unavailable. Ask your advisor for a new link.",
      );
    return tx(first.rows[0].tenant_id, async (db) => {
      const invitation = (
        await db.query(
          "SELECT * FROM invitations WHERE token_hash=$1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE",
          [digest],
        )
      ).rows[0];
      if (!invitation)
        fail(
          410,
          "INVITATION_EXPIRED",
          "This link is no longer active. Use the newest email or ask your advisor for a new link.",
        );
      const r = await getRecord(
        db,
        invitation.company_id,
        invitation.request_id,
        true,
      );
      if (
        r.kind !== "request" ||
        r.data.type !== "leadership" ||
        !String(r.data.questionPlanVersion || "").startsWith(
          "discovery-contact:",
        ) ||
        r.data.personId !== invitation.person_id
      )
        fail(403, "KICKOFF_ONLY", "This link does not grant kickoff access.");
      if (
        r.state !== "sent" ||
        Date.now() > new Date(r.data.dueDate + "T23:59:59Z").getTime()
      )
        fail(
          410,
          "REQUEST_CLOSED",
          "This request is closed or past its due date. Contact your advisor.",
        );
      if (voice) {
        const config = await providerConfig(invitation.tenant_id, "openai", db);
        if (!config.configured && transcription === transcribeAudio)
          fail(
            503,
            "VOICE_UNAVAILABLE",
            "Voice transcription is not configured by your advisor. You can still type or use device dictation.",
          );
        await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          invitation.tenant_id + ":kickoff-voice",
        ]);
        const count = (
          await db.query(
            "SELECT count(*) FROM audit_events WHERE tenant_id=$1 AND type='kickoff.transcription_requested' AND created_at>now()-interval '24 hours'",
            [invitation.tenant_id],
          )
        ).rows[0].count;
        const perRequest = (
          await db.query(
            "SELECT count(*) FROM audit_events WHERE record_id=$1 AND type='kickoff.transcription_requested' AND created_at>now()-interval '24 hours'",
            [r.id],
          )
        ).rows[0].count;
        if (Number(count) >= 60 || Number(perRequest) >= 10)
          fail(
            429,
            "VOICE_LIMIT",
            "The daily transcription limit has been reached. Type your remaining notes or use device dictation.",
          );
        const sponsor = (
          await db.query(
            "SELECT u.* FROM record_versions v JOIN users u ON u.id=v.actor_id WHERE v.record_id=$1 AND v.tenant_id=$2 ORDER BY v.version LIMIT 1",
            [r.id, invitation.tenant_id],
          )
        ).rows[0];
        if (!sponsor) fail(409, "SPONSOR_UNAVAILABLE", "Contact your advisor.");
        await audit(
          db,
          publicUser(sponsor),
          invitation.company_id,
          "kickoff.transcription_requested",
          r.id,
          { personId: invitation.person_id },
        );
        return { key: config.key };
      }
      if (!submit)
        return {
          id: r.id,
          version: r.version,
          title: r.title,
          questions: r.data.questions || [],
          notice: r.data.notice,
          publicContext:
            r.data.kickoffPublicContext ||
            (await kickoffPublicContext(db, invitation.company_id)),
          voiceConfigured:
            (await providerConfig(invitation.tenant_id, "openai", db))
              .configured || transcription !== transcribeAudio,
        };
      const d = z
        .object({
          expectedVersion: z.number().int(),
          acknowledged: z.literal(true),
          kickoffPreparation: kickoffPreparationSchema,
        })
        .strict()
        .parse(body);
      if (d.expectedVersion !== r.version)
        fail(
          409,
          "VERSION_CONFLICT",
          "The request changed. Reload before submitting.",
        );
      try {
        validateKickoffPreparation(d.kickoffPreparation);
      } catch (e) {
        fail(422, "KICKOFF_INVALID", (e as Error).message);
      }
      // Record versions require an account FK. Attribute the write to the request's
      // sponsoring account, explicitly recording the external submitter separately.
      const sponsor = (
        await db.query(
          "SELECT u.* FROM record_versions v JOIN users u ON u.id=v.actor_id WHERE v.record_id=$1 AND v.tenant_id=$2 ORDER BY v.version LIMIT 1",
          [r.id, invitation.tenant_id],
        )
      ).rows[0];
      if (!sponsor)
        fail(
          409,
          "SPONSOR_UNAVAILABLE",
          "Ask your advisor to reissue this request.",
        );
      const user = publicUser(sponsor);
      const response = await putRecord(
        db,
        user,
        invitation.company_id,
        "response",
        r.title + " — response",
        {
          requestId: r.id,
          personId: invitation.person_id,
          text: kickoffPreparationText(d.kickoffPreparation),
          assetId: "",
          decisions: {},
          note: "",
          taskCards: [],
          kickoffPreparation: d.kickoffPreparation,
          submissionIdentity: {
            method: "private_link",
            personId: invitation.person_id,
            independentlyVerified: false,
          },
        },
        "returned",
        undefined,
        "External kickoff contact submitted via private link; sponsoring account records the write",
      );
      await setState(
        db,
        user,
        invitation.company_id,
        r,
        "returned",
        "request.returned",
      );
      await audit(
        db,
        user,
        invitation.company_id,
        "kickoff.private_link_submitted",
        r.id,
        {
          personId: invitation.person_id,
          responseId: response.id,
          assurance:
            "Invitation possession; no account created and email not independently verified",
        },
      );
      await db.query(
        "UPDATE invitations SET used_at=now() WHERE token_hash=$1",
        [digest],
      );
      return { ok: true, responseId: response.id };
    });
  }
  router.get("/:token/kickoff", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await access(String(req.params.token), false));
  });
  router.post("/:token/kickoff", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await access(String(req.params.token), true, req.body));
  });
  router.post(
    "/:token/transcribe",
    express.raw({
      type: ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"],
      limit: "3mb",
    }),
    async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      if (!Buffer.isBuffer(req.body) || !req.body.length)
        fail(
          422,
          "AUDIO_REQUIRED",
          "Record a supported audio clip first (maximum 3 MB).",
        );
      const config = (await access(
        String(req.params.token),
        false,
        undefined,
        true,
      )) as { key: string };
      const result = await transcription(
        { bytes: req.body, mime: req.header("Content-Type") || "" },
        config.key,
      );
      // Recheck revocation/closure after the provider finishes; no workspace session is issued.
      await access(String(req.params.token), false);
      res.json({ text: result.text });
    },
  );
  return router;
}
