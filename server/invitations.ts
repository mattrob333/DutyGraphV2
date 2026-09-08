import { kickoffPublicContext } from "./kickoff-context.ts";
import { Router } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type pg from "pg";
import type { RecordRow, User } from "../shared/domain.ts";
import { advisor, type AuthRequest } from "./auth.ts";
import {
  tx,
  command,
  companyCheck,
  getRecord,
  setState,
  tokenHash,
  audit,
  fail,
  AppError,
} from "./db.ts";
import { providerConfig } from "./providers.ts";
import { invitationOrigin } from "./origins.ts";
import { invitationTemplate } from "./invitation-template.ts";

export async function issueInvitation(
  db: pg.PoolClient,
  user: User,
  company: string,
  r: RecordRow,
  version: number,
  channel: "manual_link" | "email",
) {
  if (r.version !== version)
    fail(
      409,
      "VERSION_CONFLICT",
      "Refresh the request before issuing an invitation.",
    );
  if (r.kind !== "request" || !["draft", "sent"].includes(r.state))
    fail(
      409,
      "INVALID_TRANSITION",
      "Only an open request can receive a new invitation.",
    );
  for (const s of r.data.taskSnapshots || []) {
    const current = await getRecord(db, company, s.id);
    if (current.version !== s.version || current.state === "stale")
      fail(
        409,
        "STALE_REQUEST",
        "A task changed. Create a request for its current version.",
      );
  }
  const p = await getRecord(db, company, r.data.personId),
    token = randomBytes(32).toString("hex");
  const email = z.email().parse(p.data.email);
  await db.query(
    "UPDATE invitations SET revoked_at=now() WHERE request_id=$1 AND used_at IS NULL",
    [r.id],
  );
  await db.query(
    "INSERT INTO invitations(token_hash,tenant_id,company_id,person_id,email,name,expires_at,request_id) VALUES($1,$2,$3,$4,$5,$6,now()+interval '7 days',$7)",
    [tokenHash(token), user.tenant_id, company, p.id, email, p.title, r.id],
  );
  if (String(r.data.questionPlanVersion || "").startsWith("discovery-contact:"))
    r.data = {
      ...r.data,
      kickoffPublicContext: await kickoffPublicContext(db, company),
    };
  await setState(
    db,
    user,
    company,
    r,
    "sent",
    channel === "email"
      ? "request.email_link_issued"
      : "request.manual_link_issued",
  );
  return {
    url: invitationOrigin() + "/invite/" + token,
    email,
    name: p.title,
  };
}
export type InvitationMessage = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
};
export type EmailProvider = (
  message: InvitationMessage,
  key: string,
  id: string,
) => Promise<{ id: string }>;
export async function sendResend(
  message: InvitationMessage,
  key: string,
  id: string,
  transport: typeof fetch = fetch,
) {
  const response = await transport("https://api.resend.com/emails", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": id,
    },
    body: JSON.stringify(message),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError(
      502,
      response.status >= 500 ? "EMAIL_UNKNOWN" : "EMAIL_REJECTED",
      `Resend returned HTTP ${response.status}. Check your API key, sending domain and provider dashboard before sending again.`,
    );
  }
  const payload = await response.text();
  if (payload.length > 10000) throw new Error("Unexpected email response");
  return z
    .object({ id: z.string().min(1).max(200) })
    .parse(JSON.parse(payload));
}

/** Reserve once inside the caller's transaction. Bearer links remain in memory. */
export async function reserveRequestEmail(
  db: pg.PoolClient,
  u: User,
  company: any,
  r: RecordRow,
  expectedVersion: number,
) {
  const config = await providerConfig(u.tenant_id, "resend", db);
  if (!config.configured || !config.config.from)
    fail(
      503,
      "EMAIL_NOT_CONFIGURED",
      "Add a Resend key and verified sender in Workspace settings.",
    );
  const count = await db.query(
    "SELECT count(*)::int AS n FROM provider_jobs WHERE kind='invitation_email' AND created_at>now()-interval '24 hours'",
  );
  if (count.rows[0].n >= 50)
    fail(
      429,
      "EMAIL_LIMIT",
      "This account reached its limit of 50 email attempts in 24 hours.",
    );
  const invite = await issueInvitation(
    db,
    u,
    company.id,
    r,
    expectedVersion,
    "email",
  );
  const id = randomUUID();
  const message: InvitationMessage = {
    from: config.config.from,
    to: [invite.email],
    ...invitationTemplate({
      company: company.name,
      person: await getRecord(db, company.id, r.data.personId),
      request: r,
      url: invite.url,
    }),
  };
  await db.query(
    "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'invitation_email','running',$4)",
    [id, u.tenant_id, company.id, { requestId: r.id, recipient: invite.email }],
  );
  await audit(db, u, company.id, "email.attempt_reserved", r.id, { jobId: id });
  return { id, message, key: config.key };
}

/** Never retry an unknown delivery. A successful provider receipt is not inbox delivery. */
export async function deliverRequestEmail(
  u: User,
  company: string,
  requestId: string,
  reserved: Awaited<ReturnType<typeof reserveRequestEmail>>,
  provider: EmailProvider = sendResend,
) {
  let state = "accepted",
    result: any = null,
    message = "Accepted by Resend. Inbox delivery is not yet tracked.";
  try {
    result = await provider(reserved.message, reserved.key, reserved.id);
  } catch (error) {
    state =
      error instanceof AppError && error.code !== "EMAIL_UNKNOWN"
        ? "failed"
        : "unknown";
    message =
      error instanceof AppError
        ? error.message
        : "Send outcome unknown. Check your Resend dashboard before sending again; no automatic retry was made.";
  }
  await tx(u.tenant_id, async (db) => {
    await db.query(
      "UPDATE provider_jobs SET state=$2,result=$3,message=$4,finished_at=now() WHERE id=$1",
      [reserved.id, state, result, message],
    );
    await audit(db, u, company, `email.${state}`, requestId, {
      jobId: reserved.id,
    });
  });
  return { id: reserved.id, state, result, message };
}
export function invitationsRouter(provider: EmailProvider = sendResend) {
  const router = Router({ mergeParams: true });
  router.use(advisor);
  router.get("/:recordId/email-preview", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor;
    res.json(
      await tx(u.tenant_id, async (db) => {
        const c = z
          .uuid()
          .parse((req.params as Record<string, string>).companyId);
        const company = await companyCheck(db, u, c);
        const request = await getRecord(
          db,
          c,
          z.uuid().parse(req.params.recordId),
        );
        if (request.kind !== "request")
          fail(422, "REQUEST_REQUIRED", "Choose an information request.");
        const person = await getRecord(db, c, request.data.personId);
        return {
          recipient: person.data.email,
          ...invitationTemplate({
            company: company.name,
            person,
            request,
            url: "#",
          }),
        };
      }),
    );
  });
  router.get("/:recordId/emails", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      c = z.uuid().parse((req.params as Record<string, string>).companyId),
      id = z.uuid().parse(req.params.recordId);
    res.json(
      await tx(u.tenant_id, async (db) => {
        await companyCheck(db, u, c);
        await getRecord(db, c, id);
        await db.query(
          "UPDATE provider_jobs SET state='unknown',message='The send attempt ended without a confirmed result. Check Resend before sending another invitation.',finished_at=now() WHERE company_id=$1 AND kind='invitation_email' AND state='running' AND created_at<now()-interval '5 minutes'",
          [c],
        );
        return (
          await db.query(
            "SELECT id,state,result,message,created_at FROM provider_jobs WHERE company_id=$1 AND kind='invitation_email' AND input->>'requestId'=$2 ORDER BY created_at DESC LIMIT 10",
            [c, id],
          )
        ).rows;
      }),
    );
  });
  router.post("/:recordId/email", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      c = z.uuid().parse((req.params as Record<string, string>).companyId),
      recordId = z.uuid().parse(req.params.recordId);
    const d = z
      .object({
        expectedVersion: z.number().int().positive(),
        confirmSend: z.literal(true),
      })
      .strict()
      .parse(req.body);
    let outgoing: InvitationMessage | undefined,
      key = "";
    const job = await command(
      u,
      req.header("Idempotency-Key"),
      { path: req.originalUrl, body: d },
      async (db) => {
        const company = await companyCheck(db, u, c),
          r = await getRecord(db, c, recordId, true),
          config = await providerConfig(u.tenant_id, "resend", db);
        if (!config.configured || !config.config.from)
          fail(
            503,
            "EMAIL_NOT_CONFIGURED",
            "Add a Resend key and verified sender email in Workspace settings first.",
          );
        const count = await db.query(
          "SELECT count(*)::int AS n FROM provider_jobs WHERE kind='invitation_email' AND created_at>now()-interval '24 hours'",
        );
        if (count.rows[0].n >= 50)
          fail(
            429,
            "EMAIL_LIMIT",
            "This account reached its limit of 50 email attempts in 24 hours.",
          );
        const invite = await issueInvitation(
            db,
            u,
            c,
            r,
            d.expectedVersion,
            "email",
          ),
          id = randomUUID();
        outgoing = {
          from: config.config.from,
          to: [invite.email],
          ...invitationTemplate({
            company: company.name,
            person: await getRecord(db, c, r.data.personId),
            request: r,
            url: invite.url,
          }),
        };
        key = config.key;
        await db.query(
          "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'invitation_email','running',$4)",
          [
            id,
            u.tenant_id,
            c,
            { requestId: recordId, recipient: invite.email },
          ],
        );
        await audit(db, u, c, "email.attempt_reserved", recordId, {
          jobId: id,
        });
        return { id };
      },
    );
    // Only the invocation that reserved the job has the bearer URL in memory.
    // Replays never repeat a provider call, including after a network timeout.
    if (outgoing) {
      let state = "accepted",
        result: any = null,
        message = "Accepted by Resend. Inbox delivery is not yet tracked.";
      try {
        result = await provider(outgoing, key, job.id);
      } catch (error) {
        state =
          error instanceof AppError && error.code !== "EMAIL_UNKNOWN"
            ? "failed"
            : "unknown";
        message =
          error instanceof AppError
            ? error.message
            : "Send outcome unknown. Check your Resend dashboard before sending again; no automatic retry was made.";
      }
      await tx(u.tenant_id, async (db) => {
        await db.query(
          "UPDATE provider_jobs SET state=$2,result=$3,message=$4,finished_at=now() WHERE id=$1",
          [job.id, state, result, message],
        );
        await audit(db, u, c, `email.${state}`, recordId, { jobId: job.id });
      });
    }
    res.json(
      await tx(
        u.tenant_id,
        async (db) =>
          (
            await db.query(
              "SELECT id,state,result,message FROM provider_jobs WHERE id=$1",
              [job.id],
            )
          ).rows[0],
      ),
    );
  });
  return router;
}
