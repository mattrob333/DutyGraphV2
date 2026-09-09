import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type pg from "pg";
import type { RecordRow, User } from "../shared/domain.ts";
import {
  assessWorkGaps,
  buildGapFollowups,
  realRecipientEmail,
  type GapPolicy,
  type GapRecipient,
  type WorkGap,
} from "../shared/work-gaps.ts";
import { advisor, publicUser, type AuthRequest } from "./auth.ts";
import {
  tx,
  command,
  companyCheck,
  getRecord,
  hash,
  audit,
  pool,
  fail,
  AppError,
} from "./db.ts";
import { createOrEdit } from "./records.ts";
import { providerConfig } from "./providers.ts";
import {
  reserveRequestEmail,
  deliverRequestEmail,
  sendResend,
  type EmailProvider,
} from "./invitations.ts";

const active = (r: RecordRow) =>
  !["withdrawn", "retracted", "superseded"].includes(r.state);
const recipientSchema = z
  .object({ personId: z.uuid(), email: z.email().toLowerCase() })
  .strict();
const policySchema = z
  .object({
    enabled: z.boolean(),
    recipients: z.array(recipientSchema).max(150),
    profileHash: z.string().min(1).max(100),
  })
  .strict();
const runSchema = z
  .object({
    streamId: z.string().min(1).max(100),
    stageId: z.string().min(1).max(100),
    recipients: z.array(recipientSchema).min(1).max(150),
    automatic: z.boolean(),
    profileHash: z.string().min(1).max(100),
  })
  .strict();
const policyFor = (company: any): GapPolicy => ({
  enabled: false,
  recipients: [],
  ...company.settings?.gapFollowups,
});
const companyRecords = async (
  db: pg.PoolClient,
  company: string,
): Promise<RecordRow[]> =>
  (
    await db.query(
      "SELECT * FROM records WHERE company_id=$1 ORDER BY created_at,id",
      [company],
    )
  ).rows;
const eligiblePerson = (p: RecordRow, company: any) =>
  !company.sandbox &&
  active(p) &&
  !p.data.sampleKey &&
  realRecipientEmail(String(p.data.email || ""));

export async function workGapSnapshot(
  db: pg.PoolClient,
  user: User,
  companyId: string,
) {
  const company = await companyCheck(db, user, companyId);
  // Reply workers commit work and job status together. Read both in one SQL
  // snapshot so completion cannot be paired with gaps from older records.
  const snapshot = (
    await db.query(
      `SELECT
        COALESCE((SELECT jsonb_agg(r ORDER BY r.created_at,r.id)
          FROM records r WHERE r.company_id=$1),'[]'::jsonb) AS records,
        COALESCE((SELECT jsonb_agg(j ORDER BY j.created_at DESC,j.id DESC)
          FROM (SELECT id,kind,state,input,result,message,created_at
            FROM provider_jobs WHERE company_id=$1
            AND kind IN ('gap_outreach','gap_reply')) j),'[]'::jsonb) AS jobs`,
      [companyId],
    )
  ).rows[0];
  const records: RecordRow[] = snapshot.records;
  const jobs: any[] = snapshot.jobs;
  const policy = policyFor(company);
  const email = await providerConfig(user.tenant_id, "resend", db);
  const ai = await providerConfig(user.tenant_id, "openai", db);
  return {
    gaps: assessWorkGaps(records, company.settings.businessProfile),
    policy: {
      enabled: policy.enabled,
      recipients: policy.recipients,
      message: company.settings.gapFollowups?.lastError || "",
    },
    people: records
      .filter((p) => p.kind === "person" && active(p))
      .map((p) => ({
        id: p.id,
        name: p.title,
        email: String(p.data.email || ""),
        eligible: eligiblePerson(p, company),
      })),
    capabilities: {
      emailConfigured: !!email.configured && !!email.config.from,
      aiConfigured: !!ai.configured,
      sandbox: !!company.sandbox,
    },
    profileHash: hash(company.settings.businessProfile || null),
    requests: records
      .filter(
        (r) =>
          r.kind === "request" && r.data.questionPlanVersion === "work-gap:v1",
      )
      .map((r) => {
        const sent = jobs.find(
          (j) => j.kind === "gap_outreach" && j.input.requestId === r.id,
        );
        const reply = jobs.find(
          (j) => j.kind === "gap_reply" && j.input.requestId === r.id,
        );
        return {
          id: r.id,
          title: r.title,
          personId: r.data.personId,
          state: r.state,
          questions: r.data.questions,
          gapKeys: r.data.gapContext?.gapKeys || [],
          streamId: r.data.gapContext?.streamId,
          stageId: r.data.gapContext?.stageId,
          stageLabel: r.data.gapContext?.stageLabel,
          emailState: sent?.state,
          replyState: reply?.state,
          message: reply?.message || sent?.message || "",
          result: reply?.result || null,
        };
      }),
  };
}

function validateRecipients(
  recipients: GapRecipient[],
  records: RecordRow[],
  company: any,
) {
  if (company.sandbox)
    fail(
      409,
      "SAMPLE_PREVIEW_ONLY",
      "Sample people can preview questions. No emails are sent.",
    );
  if (new Set(recipients.map((p) => p.personId)).size !== recipients.length)
    fail(422, "DUPLICATE_RECIPIENT", "Choose each person once.");
  for (const recipient of recipients) {
    const person = records.find(
      (p) => p.id === recipient.personId && p.kind === "person",
    );
    if (
      !person ||
      !eligiblePerson(person, company) ||
      String(person.data.email).toLowerCase() !== recipient.email
    )
      fail(
        409,
        "RECIPIENT_CHANGED",
        "A selected person's email is unavailable or changed. Refresh and review the recipients.",
      );
  }
}

async function savePolicy(
  db: pg.PoolClient,
  user: User,
  company: any,
  recipients: GapRecipient[],
  enabled: boolean,
) {
  const policy: GapPolicy = {
    enabled,
    recipients,
    actorId: user.id,
    updatedAt: new Date().toISOString(),
  };
  await db.query(
    "UPDATE companies SET settings=jsonb_set(settings,'{gapFollowups}',$2::jsonb),revision=revision+1 WHERE id=$1",
    [company.id, policy],
  );
  await audit(
    db,
    user,
    company.id,
    enabled ? "gap_followups.enabled" : "gap_followups.paused",
    null,
    { recipients, automatic: enabled },
  );
  if (enabled)
    for (const recipient of recipients)
      await db.query(
        "UPDATE provider_jobs SET state='queued',message='Questions are queued to send.',finished_at=NULL WHERE company_id=$1 AND kind='gap_outreach' AND state='paused' AND input->>'automatic'='true' AND input->>'personId'=$2 AND input->>'recipient'=$3",
        [company.id, recipient.personId, recipient.email],
      );
  return policy;
}

/** Caller holds the tenant command lock. Never email from a GET or an assessment. */
async function queueQuestions(
  db: pg.PoolClient,
  user: User,
  company: any,
  gaps: WorkGap[],
  recipients: GapRecipient[],
  automatic: boolean,
) {
  const records = await companyRecords(db, company.id);
  const prior = records.filter((r) => r.kind === "request");
  // Configuration delays do not shorten the quiet period after actual outreach.
  // Include every started attempt, even when its provider outcome is unknown.
  const latestContact = new Map<string, number>();
  for (const job of (
    await db.query(
      "SELECT input->>'requestId' AS request_id,input->>'sendStartedAt' AS send_started_at FROM provider_jobs WHERE company_id=$1 AND kind='gap_outreach' AND input->>'sendStartedAt' IS NOT NULL",
      [company.id],
    )
  ).rows) {
    const at = new Date(job.send_started_at).getTime();
    if (Number.isFinite(at))
      latestContact.set(
        job.request_id,
        Math.max(latestContact.get(job.request_id) || 0, at),
      );
  }
  const asked = new Set(
    prior.flatMap((r) =>
      r.data.questionPlanVersion === "work-gap:v1"
        ? r.data.gapContext?.gapKeys || []
        : [],
    ),
  );
  const available = gaps.filter((g) => !asked.has(g.key));
  const ids: string[] = [];
  // Group separately per stage so a private request never silently changes scope.
  const stageKeys = [
    ...new Set(available.map((g) => `${g.streamId}:${g.stageId}`)),
  ];
  for (const stageKey of stageKeys) {
    const scope = available.filter(
      (g) => `${g.streamId}:${g.stageId}` === stageKey,
    );
    for (const followup of buildGapFollowups(
      scope,
      recipients.map((p) => p.personId),
    )) {
      // Let the person finish their current work questions first. Space new gap
      // requests by a week; an answered but still unclear gap is not sent again.
      const busy = prior.some(
        (r) =>
          r.data.personId === followup.personId &&
          r.data.type === "work" &&
          ["draft", "sent"].includes(r.state),
      );
      const recent = prior.some(
        (r) =>
          r.data.personId === followup.personId &&
          r.data.questionPlanVersion === "work-gap:v1" &&
          Math.max(
            new Date(r.created_at).getTime(),
            latestContact.get(r.id) || 0,
          ) >
            Date.now() - 7 * 86400000,
      );
      if (busy || recent || ids.length >= 10) continue;
      const selectedGaps = scope.filter((g) =>
        followup.gapKeys.includes(g.key),
      );
      const stage = selectedGaps[0];
      const inStage = new Set(selectedGaps.flatMap((g) => g.recordIds));
      // Include linked context and all names for grounded references, without
      // granting the model access to unrelated company evidence or interviews.
      for (const r of records.filter(active)) {
        if (
          r.kind === "person" ||
          ((r.kind === "task" || r.kind === "duty") &&
            (r.data.businessStageLinks || []).some(
              (l: any) =>
                l.streamId === stage.streamId && l.stageId === stage.stageId,
            ))
        )
          inStage.add(r.id);
      }
      for (const r of records.filter(
        (r) => inStage.has(r.id) && r.kind === "duty",
      ))
        for (const id of r.data.taskIds || []) inStage.add(id);
      for (const r of records.filter(
        (r) =>
          r.kind === "workflow" &&
          (r.data.taskIds || []).some((id: string) => inStage.has(id)),
      ))
        inStage.add(r.id);
      const snapshots = records
        .filter((r) => inStage.has(r.id) && active(r))
        .map((r) => ({ id: r.id, version: r.version, hash: r.hash }));
      if (
        snapshots.length > 300 ||
        records.filter((r) => r.kind === "task" && inStage.has(r.id)).length >
          150
      )
        fail(
          422,
          "FOLLOWUP_SCOPE_LARGE",
          "This stage has too much work for one short follow-up. Split the stage or ask about fewer duties first.",
        );
      const person = records.find((r) => r.id === followup.personId)!;
      const request = await createOrEdit(db, user, company.id, "request", {
        title: `A quick question about ${stage.stageLabel}`.slice(0, 200),
        personId: person.id,
        type: "work",
        questionPlanVersion: "work-gap:v1",
        questions: followup.questions,
        questionIds: followup.questions.map((_, i) => `gap-${i + 1}`),
        emailSubject: `A quick question: ${stage.stageLabel}`.slice(0, 200),
        emailBody: `We have a few details to fill in about ${stage.stageLabel}. Please describe one recent example in your own words. A short voice or typed answer is enough. Tell us if this work belongs elsewhere.`,
        // This asks for missing details, not confirmation of reviewed task cards.
        // Exact source versions are retained separately in gapContext.
        taskIds: [],
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        notice:
          "Your advisor can read your answer. DutyGraph uses it to add proposed details to the work map. Your answer does not approve actions or change company policy.",
        gapContext: {
          version: 1,
          streamId: stage.streamId,
          stageId: stage.stageId,
          stageLabel: stage.stageLabel,
          gapKeys: followup.gapKeys,
          recordSnapshots: snapshots,
          profileHash: hash(company.settings.businessProfile || null),
        },
      });
      const jobId = randomUUID();
      await db.query(
        "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input,message) VALUES($1,$2,$3,'gap_outreach','queued',$4,$5)",
        [
          jobId,
          user.tenant_id,
          company.id,
          {
            requestId: request.id,
            personId: person.id,
            recipient: person.data.email.toLowerCase(),
            actorId: user.id,
            automatic,
          },
          "Questions are queued to send.",
        ],
      );
      await audit(db, user, company.id, "gap_followup.queued", request.id, {
        jobId,
        gapKeys: followup.gapKeys,
      });
      prior.push(request);
      ids.push(jobId);
    }
  }
  return ids;
}

export async function sendGapQuestions(
  tenant: string,
  companyId: string,
  provider: EmailProvider = sendResend,
  limit = 2,
) {
  let attempts = 0;
  for (let i = 0; i < Math.min(limit, 10); i++) {
    const reserved = await tx(tenant, async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        "tenant-command:" + tenant,
      ]);
      await db.query(
        "UPDATE provider_jobs SET state='unknown',message='The send outcome is unknown. Check the email provider before sending again.',finished_at=now() WHERE company_id=$1 AND kind='gap_outreach' AND state='running' AND coalesce(input->>'sendStartedAt',created_at::text)::timestamptz<now()-interval '5 minutes'",
        [companyId],
      );
      const job = (
        await db.query(
          "SELECT * FROM provider_jobs WHERE company_id=$1 AND kind='gap_outreach' AND state IN ('queued','waiting_configuration') ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1",
          [companyId],
        )
      ).rows[0];
      if (!job) return null;
      const actor = (
        await db.query(
          "SELECT * FROM users WHERE tenant_id=$1 AND id=$2 AND role='advisor'",
          [tenant, job.input.actorId],
        )
      ).rows[0];
      const stop = async (state: string, message: string) => {
        await db.query(
          "UPDATE provider_jobs SET state=$2,message=$3,finished_at=now() WHERE id=$1",
          [job.id, state, message],
        );
        return null;
      };
      if (!actor)
        return stop("needs_review", "The advisor account is unavailable.");
      const user = publicUser(actor),
        company = await companyCheck(db, user, companyId),
        policy = policyFor(company);
      const r = await getRecord(db, companyId, job.input.requestId, true);
      const p = await getRecord(db, companyId, job.input.personId);
      if (
        !eligiblePerson(p, company) ||
        p.data.email.toLowerCase() !== job.input.recipient
      )
        return stop(
          "needs_review",
          "The recipient changed. Review this question before sending.",
        );
      if (
        job.input.automatic &&
        (!policy.enabled ||
          !policy.recipients.some(
            (p) =>
              p.personId === job.input.personId &&
              p.email === job.input.recipient,
          ))
      )
        return stop(
          "paused",
          "Automatic follow-ups are paused for this person.",
        );
      if (r.state !== "draft")
        return stop(
          "needs_review",
          "This request was already sent, closed or changed.",
        );
      const dueAt = new Date(`${r.data.dueDate}T23:59:59.999Z`).getTime();
      if (!Number.isFinite(dueAt) || dueAt < Date.now())
        return stop(
          "needs_review",
          "These questions are past their response deadline. Ask an advisor to update the due date before sending.",
        );
      if (
        hash(company.settings.businessProfile || null) !==
        r.data.gapContext?.profileHash
      )
        return stop(
          "needs_review",
          "The business stages changed. Review this question before sending.",
        );
      for (const snapshot of r.data.gapContext.recordSnapshots) {
        const current = await getRecord(db, companyId, snapshot.id);
        if (
          current.version !== snapshot.version ||
          current.hash !== snapshot.hash ||
          !active(current) ||
          current.state === "stale"
        )
          return stop(
            "needs_review",
            "The work or people changed. Review this question before sending.",
          );
      }
      const email = await providerConfig(tenant, "resend", db);
      const ai = await providerConfig(tenant, "openai", db);
      if (!email.configured || !email.config.from || !ai.configured)
        return stop(
          "waiting_configuration",
          "Connect email and AI in Workspace settings to finish this follow-up.",
        );
      const count = (
        await db.query(
          "SELECT count(*)::int n FROM provider_jobs WHERE kind='invitation_email' AND created_at>now()-interval '24 hours'",
        )
      ).rows[0].n;
      if (count >= 50)
        return stop(
          "waiting_configuration",
          "The daily email limit was reached. The next check will try again after capacity is available.",
        );
      const emailJob = await reserveRequestEmail(
        db,
        user,
        company,
        r,
        r.version,
      );
      await db.query(
        "UPDATE provider_jobs SET state='running',input=input||$2::jsonb,message='Sending questions.' WHERE id=$1",
        [
          job.id,
          { emailJobId: emailJob.id, sendStartedAt: new Date().toISOString() },
        ],
      );
      return { job, user, emailJob };
    });
    if (!reserved) break;
    attempts++;
    const delivered = await deliverRequestEmail(
      reserved.user,
      companyId,
      reserved.job.input.requestId,
      reserved.emailJob,
      provider,
    );
    await tx(tenant, async (db) => {
      await db.query(
        "UPDATE provider_jobs SET state=$2,result=$3,message=$4,finished_at=now() WHERE id=$1",
        [
          reserved.job.id,
          delivered.state,
          { emailJobId: delivered.id },
          delivered.message,
        ],
      );
    });
  }
  return attempts;
}

async function claimGapTenant() {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const cursor = (
      await db.query(
        "SELECT last_tenant_id FROM maintenance_cursors WHERE name='gap_scan' FOR UPDATE",
      )
    ).rows[0];
    if (!cursor) throw new Error("Work gap migration is required.");
    const next = (
      await db.query(
        "SELECT id FROM tenants ORDER BY CASE WHEN $1::uuid IS NULL OR id>$1::uuid THEN 0 ELSE 1 END,id LIMIT 1",
        [cursor.last_tenant_id],
      )
    ).rows[0];
    if (next)
      await db.query(
        "UPDATE maintenance_cursors SET last_tenant_id=$1,updated_at=now() WHERE name='gap_scan'",
        [next.id],
      );
    await db.query("COMMIT");
    return next?.id as string | undefined;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

/** Durable scheduled checks work even after the advisor closes the app. */
export async function runGapFollowups({
  provider = sendResend,
  maxTenants = 20,
}: { provider?: EmailProvider; maxTenants?: number } = {}) {
  const visited = new Set<string>();
  let sends = 0;
  for (let i = 0; i < Math.min(maxTenants, 20); i++) {
    const tenant = await claimGapTenant();
    if (!tenant || visited.has(tenant)) break;
    visited.add(tenant);
    const companies = await tx(
      tenant,
      async (db) =>
        (
          await db.query(
            "SELECT * FROM companies c WHERE sandbox=false AND (settings->'gapFollowups'->>'enabled'='true' OR EXISTS(SELECT 1 FROM provider_jobs j WHERE j.company_id=c.id AND j.kind='gap_outreach' AND j.state IN ('queued','waiting_configuration','running'))) ORDER BY coalesce(settings->'gapFollowups'->>'checkedAt',''),id LIMIT 5",
          )
        ).rows,
    );
    for (const company of companies) {
      await tx(tenant, async (db) => {
        await db.query(
          "UPDATE companies SET settings=jsonb_set(settings,'{gapFollowups}',coalesce(settings->'gapFollowups','{\"enabled\":false,\"recipients\":[]}'::jsonb)||jsonb_build_object('checkedAt',$2::text)) WHERE id=$1",
          [company.id, new Date().toISOString()],
        );
      });
      try {
        await tx(tenant, async (db) => {
          await db.query(
            "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
            ["tenant-command:" + tenant],
          );
          const current = (
            await db.query("SELECT * FROM companies WHERE id=$1 FOR UPDATE", [
              company.id,
            ])
          ).rows[0];
          const policy = policyFor(current);
          if (!policy.enabled) return;
          const row = (
            await db.query(
              "SELECT * FROM users WHERE tenant_id=$1 AND id=$2 AND role='advisor'",
              [tenant, policy.actorId],
            )
          ).rows[0];
          if (!row) return;
          const user = publicUser(row),
            records = await companyRecords(db, company.id);
          const recipients = policy.recipients.filter((p) =>
            records.some(
              (r) =>
                r.id === p.personId &&
                r.kind === "person" &&
                eligiblePerson(r, current) &&
                r.data.email.toLowerCase() === p.email,
            ),
          );
          await queueQuestions(
            db,
            user,
            current,
            assessWorkGaps(records, current.settings.businessProfile),
            recipients,
            true,
          );
          await db.query(
            "UPDATE companies SET settings=jsonb_set(settings,'{gapFollowups,lastError}','\"\"'::jsonb) WHERE id=$1",
            [company.id],
          );
        });
        sends += await sendGapQuestions(tenant, company.id, provider, 1);
      } catch (error) {
        await tx(tenant, async (db) => {
          await db.query(
            "UPDATE companies SET settings=jsonb_set(settings,'{gapFollowups,lastError}',to_jsonb($2::text)) WHERE id=$1",
            [
              company.id,
              error instanceof AppError
                ? error.message
                : "The follow-up check was delayed. Saved questions and replies remain available.",
            ],
          );
        });
      }
      // Bound provider latency below the host invocation limit.
      if (sends >= 2) return;
    }
  }
}

export function workGapsRouter(provider: EmailProvider = sendResend) {
  const router = Router({ mergeParams: true });
  router.use(advisor);
  const context = (req: any) => ({
    user: (req as AuthRequest).actor,
    company: z.uuid().parse(req.params.companyId),
  });
  router.get("/", async (req, res) => {
    const { user, company } = context(req);
    res.json(
      await tx(user.tenant_id, (db) => workGapSnapshot(db, user, company)),
    );
  });
  router.post("/policy", async (req, res) => {
    const { user, company } = context(req),
      body = policySchema.parse(req.body);
    await command(
      user,
      req.header("Idempotency-Key"),
      { path: req.originalUrl, body },
      async (db) => {
        const c = await companyCheck(db, user, company);
        if (hash(c.settings.businessProfile || null) !== body.profileHash)
          fail(
            409,
            "STAGES_CHANGED",
            "The business stages changed. Refresh the work map.",
          );
        if (body.enabled)
          validateRecipients(
            body.recipients,
            await companyRecords(db, company),
            c,
          );
        if (body.enabled && !body.recipients.length)
          fail(422, "RECIPIENT_REQUIRED", "Choose at least one known person.");
        await savePolicy(db, user, c, body.recipients, body.enabled);
        if (!body.enabled)
          await db.query(
            "UPDATE provider_jobs SET state='paused',message='Automatic follow-ups are paused.' WHERE company_id=$1 AND kind='gap_outreach' AND input->>'automatic'='true' AND state IN ('queued','waiting_configuration')",
            [company],
          );
        return { ok: true };
      },
    );
    res.json(
      await tx(user.tenant_id, (db) => workGapSnapshot(db, user, company)),
    );
  });
  router.post("/run", async (req, res) => {
    const { user, company } = context(req),
      body = runSchema.parse(req.body);
    await command(
      user,
      req.header("Idempotency-Key"),
      { path: req.originalUrl, body },
      async (db) => {
        const c = await companyCheck(db, user, company),
          records = await companyRecords(db, company);
        if (hash(c.settings.businessProfile || null) !== body.profileHash)
          fail(
            409,
            "STAGES_CHANGED",
            "The business stages changed. Refresh the work map.",
          );
        validateRecipients(body.recipients, records, c);
        const email = await providerConfig(user.tenant_id, "resend", db),
          ai = await providerConfig(user.tenant_id, "openai", db);
        if (!email.configured || !email.config.from || !ai.configured)
          fail(
            503,
            "FOLLOWUP_NOT_CONFIGURED",
            "Connect email and AI in Workspace settings first.",
          );
        const gaps = assessWorkGaps(records, c.settings.businessProfile).filter(
          (g) => g.streamId === body.streamId && g.stageId === body.stageId,
        );
        if (!gaps.length)
          fail(
            409,
            "NO_GAPS",
            "There are no missing details recorded for this stage. Refresh the map.",
          );
        if (
          !buildGapFollowups(
            gaps,
            body.recipients.map((p) => p.personId),
          ).length
        )
          fail(422, "NO_RESPONDENT", "Choose a person linked to this work.");
        if (body.automatic)
          await savePolicy(db, user, c, body.recipients, true);
        return {
          ids: await queueQuestions(
            db,
            user,
            c,
            gaps,
            body.recipients,
            body.automatic,
          ),
        };
      },
    );
    await sendGapQuestions(user.tenant_id, company, provider, 2);
    res.json(
      await tx(user.tenant_id, (db) => workGapSnapshot(db, user, company)),
    );
  });
  return router;
}
