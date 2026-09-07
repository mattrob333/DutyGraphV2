import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { tx, getRecord, fail, hash } from "./db.ts";
import type { AuthRequest } from "./auth.ts";
import { providerConfig } from "./providers.ts";
import {
  openAiDiscovery,
  validateDiscovery,
  type DiscoveryInput,
  type DiscoveryProvider,
} from "./discovery.ts";
import {
  kickoffGuide,
  discoveryPromptVersion,
} from "../shared/kickoff-guide.ts";
import { participantTaskExtraction } from "../shared/discovery.ts";
import { defaultAiModel } from "../shared/ai-models.ts";
export const participantCard = z
  .object({
    title: z.string().trim().min(1).max(200),
    duty: z.string().trim().min(1).max(200),
    purpose: z.string().max(3000).optional(),
    trigger: z.string().max(3000).optional(),
    humanGate: z.string().max(3000).optional(),
    inputs: z.string().max(3000),
    instructions: z.string().max(3000),
    output: z.string().max(3000),
    handoff: z.string().max(3000),
    software: z.string().max(20000),
    decision: z.enum(["correct", "not_mine", "unsure"]),
  })
  .strict();
export const participantCards = z.array(participantCard).max(30);
export function validateParticipantExtraction(
  value: unknown,
  input: DiscoveryInput,
) {
  const result = participantTaskExtraction.parse(value);
  validateDiscovery(
    { ...result, tasks: result.tasks.map(({ destination, ...task }) => task) },
    input,
  );
  return result;
}
export function participantDraft(
  provider: DiscoveryProvider = openAiDiscovery,
): RequestHandler {
  return async (req, res) => {
    const u = (req as AuthRequest).actor;
    if (u.role !== "participant")
      fail(403, "PARTICIPANT_REQUIRED", "A participant account is required.");
    const d = z
      .object({
        expectedVersion: z.number().int(),
        text: z.string().trim().min(20).max(100000),
        acknowledged: z.literal(true),
      })
      .strict()
      .parse(req.body);
    const requestId = z.uuid().parse(req.params.recordId),
      id = randomUUID();
    const context = await tx(u.tenant_id, async (db) => {
      const r = await getRecord(db, u.company_id!, requestId);
      if (r.kind !== "request" || r.data.personId !== u.person_id)
        fail(404, "NOT_FOUND", "Assigned request not found.");
      if (
        r.state !== "sent" ||
        r.version !== d.expectedVersion ||
        r.data.type !== "work"
      )
        fail(409, "REQUEST_CHANGED", "This work request is no longer open.");
      if (Date.now() > new Date(r.data.dueDate + "T23:59:59Z").getTime())
        fail(410, "REQUEST_EXPIRED", "Ask your advisor to renew this request.");
      const c = await providerConfig(u.tenant_id, "openai", db);
      if (!c.configured)
        fail(
          503,
          "AI_NOT_CONFIGURED",
          "AI drafting is not connected. Your answer is safe. You can send it for advisor review.",
        );
      await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `participant-draft:${u.tenant_id}`,
      ]);
      const count = await db.query(
        "SELECT count(*)::int n FROM provider_jobs WHERE kind='participant_cards' AND created_at>now()-interval '24 hours'",
      );
      if (count.rows[0].n >= 60)
        fail(
          429,
          "DRAFT_LIMIT",
          "The daily draft limit has been reached. Send your answer for advisor review.",
        );
      const p = await getRecord(db, u.company_id!, u.person_id!);
      const company = (
        await db.query("SELECT name,settings FROM companies WHERE id=$1", [
          u.company_id,
        ])
      ).rows[0];
      const duties = (
        await db.query(
          "SELECT title,data->>'purpose' AS purpose,version,hash FROM records WHERE company_id=$1 AND kind='duty' AND data->>'ownerId'=$2 AND state NOT IN ('stale','retracted','withdrawn') ORDER BY created_at,id LIMIT 30",
          [u.company_id, u.person_id],
        )
      ).rows;
      const businessProfile = company.settings?.businessProfile || null;
      const fingerprint = hash({
        requestId,
        version: r.version,
        text: d.text,
        personHash: p.hash,
        duties,
        businessProfile,
        promptVersion: discoveryPromptVersion,
      });
      await db.query(
        "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'participant_cards','running',$4)",
        [
          id,
          u.tenant_id,
          u.company_id,
          JSON.stringify({
            personId: u.person_id,
            requestId,
            version: r.version,
            text: d.text,
            fingerprint,
            businessProfile,
            dutyContext: duties,
            personHash: p.hash,
            promptVersion: discoveryPromptVersion,
          }),
        ],
      );
      return {
        c,
        p,
        fingerprint,
        duties: duties.map((row) => `${row.title}: ${row.purpose || ""}`),
        businessProfile,
        company: company.name,
        questions: r.data.questions,
      };
    });
    try {
      const input: DiscoveryInput = {
        stage: "tasks",
        participantReview: true,
        interviewQuestions: context.questions,
        company: context.company,
        businessProfile: context.businessProfile,
        captureGuide: kickoffGuide(context.businessProfile),
        sources: [
          {
            id: requestId,
            title: "Original participant account",
            text: d.text,
            version: d.expectedVersion,
            hash: context.fingerprint,
            kind: "response",
            state: "draft",
            origin: "team",
          },
        ],
        people: [
          {
            id: u.person_id!,
            name: context.p.title,
            email: "",
            role: context.p.data.role,
            department: context.p.data.team,
            duties: context.duties,
          },
        ],
        fingerprint: context.fingerprint,
        omitted: 0,
      };
      const result = validateParticipantExtraction(
        await provider(
          input,
          context.c.key,
          context.c.config.model || defaultAiModel,
        ),
        input,
      );
      const cards = result.tasks.map((t) => ({
        title: t.title,
        duty: t.duty,
        purpose: t.purpose,
        trigger: t.trigger,
        humanGate: t.humanGate,
        inputs: t.inputs,
        instructions: t.instructions,
        output: t.output,
        handoff: t.destination,
        software: t.systems.join(", "),
        decision: "unsure",
      }));
      await tx(u.tenant_id, async (db) => {
        const current = await getRecord(db, u.company_id!, requestId);
        if (
          current.state !== "sent" ||
          current.version !== d.expectedVersion ||
          current.data.personId !== u.person_id
        )
          fail(
            409,
            "REQUEST_CHANGED",
            "This request changed while the cards were being prepared. Your answer is retained; reopen your assigned request.",
          );
        return db.query(
          "UPDATE provider_jobs SET state='succeeded',result=$2,finished_at=now() WHERE id=$1",
          [id, JSON.stringify({ cards, gaps: result.gaps })],
        );
      });
      res.json({ id, cards, gaps: result.gaps });
    } catch (error) {
      await tx(u.tenant_id, (db) =>
        db.query(
          "UPDATE provider_jobs SET state='unknown',message='Draft did not complete. Original answer retained.',finished_at=now() WHERE id=$1",
          [id],
        ),
      );
      throw error;
    }
  };
}
