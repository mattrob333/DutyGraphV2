import { registerPilotInboxRoutes } from "./pilot-inbox.ts";
import { workLinksRouter, type WorkLinkProvider } from "./work-links.ts";
import { teamLinkRouter } from "./team-link.ts";
import { kickoffLinkRouter } from "./kickoff-link.ts";
import {
  kickoffPreparationSchema,
  validateKickoffPreparation,
  kickoffPreparationText,
} from "../shared/kickoff-preparation.ts";
import { importKickoffRoster } from "./kickoff-roster.ts";
import { businessProfileSchema } from "../shared/business-types.ts";
import { classificationIntake } from "../shared/business-classification.ts";
import {
  businessClassificationRouter,
  type ClassificationProvider,
} from "./business-classification.ts";
import { teamAnalysisRouter, type TeamProvider } from "./team-analysis.ts";
import { newsletterInterest } from "./newsletter.ts";
import { participantDraft, participantCards } from "./participant-cards.ts";
import { applyForPilot } from "./pilot.ts";
import { strategyRouter } from "./strategy.ts";
import { discoveryRouter, type DiscoveryProvider } from "./discovery.ts";
import { agentRequestsRouter } from "./agent-requests.ts";
import { frameworkRouter, type FrameworkProvider } from "./frameworks.ts";
import { neo4jRouter, neo4jPublicStatus } from "./neo4j.ts";
import express from "express";
import { allowedOrigins } from "./origins.ts";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z, ZodError } from "zod";
import {
  pool,
  tx,
  command,
  companyCheck,
  getRecord,
  putRecord,
  setState,
  audit,
  hash,
  tokenHash,
  fail,
  AppError,
} from "./db.ts";
import {
  authenticate,
  advisor,
  createSession,
  registerSchema,
  registerAccount,
  passwordMatches,
  passwordHash,
  publicUser,
  defaultSettings,
  type AuthRequest,
} from "./auth.ts";
import { demoUser, seedRecords, ensureCobaltExamples } from "./seed.ts";
import { createOrEdit, refreshTask } from "./records.ts";
import { reviewTask } from "./task-review.ts";
import {
  schemas,
  confirmationStatus,
  diagnosisReadiness,
} from "../shared/domain.ts";
import { previewRoster } from "./roster.ts";
import { createExport, exportZip } from "./exports.ts";
import { linksFor } from "./projection.ts";
import { readGraph } from "./graph-query.ts";
import { reportsRouter } from "./reports.ts";
import { workflowsRouter, checkWorkflow } from "./workflows.ts";
import { caseStatus, expireSteps } from "../shared/workflow.ts";
import { FRAMEWORK_GUIDE_VERSION } from "../shared/framework-guides.ts";
import { researchRouter, type ResearchProvider } from "./research.ts";
import {
  invitationsRouter,
  issueInvitation,
  type EmailProvider,
} from "./invitations.ts";
import { aiRouter, type AiProvider } from "./ai.ts";
import { providersRouter, providerConfig } from "./providers.ts";
import { hostedAuthLimit, maintenance } from "./hosted.ts";
export const registry = JSON.parse(
  await readFile(
    new URL("../contracts/framework-registry.json", import.meta.url),
    "utf8",
  ),
);
const actor = (r: express.Request) => (r as AuthRequest).actor;
const param = (r: express.Request, k: string) =>
  k.endsWith("Id") ? z.uuid().parse(String(r.params[k])) : String(r.params[k]);
const expected = (req: express.Request, r: any) => {
  if (req.body.expectedVersion !== r.version)
    fail(
      409,
      "VERSION_CONFLICT",
      `This record changed. You reviewed v${req.body.expectedVersion}; current version is v${r.version}. Refresh before saving.`,
    );
};
const run = (req: express.Request, fn: any) =>
  command(
    actor(req),
    req.header("Idempotency-Key"),
    { path: req.originalUrl, method: req.method, body: req.body },
    fn,
  );
export function createApp({
  authRequestsPerWindow = 40,
  researchProvider,
  emailProvider,
  aiProvider,
  discoveryProvider,
  workLinkProvider,
  classificationProvider,
  frameworkProvider,
  teamProvider,
  hostedRouting = !!process.env.VERCEL,
}: {
  authRequestsPerWindow?: number;
  researchProvider?: ResearchProvider;
  emailProvider?: EmailProvider;
  aiProvider?: AiProvider;
  discoveryProvider?: DiscoveryProvider;
  workLinkProvider?: WorkLinkProvider;
  classificationProvider?: ClassificationProvider;
  frameworkProvider?: FrameworkProvider;
  teamProvider?: TeamProvider;
  hostedRouting?: boolean;
} = {}) {
  const app = express();
  if (process.env.VERCEL) app.set("trust proxy", 1);
  if (hostedRouting)
    app.use((req, _res, next) => {
      // Vercel adds the catch-all rewrite parameter to the query. It is routing
      // metadata, not a user graph filter; retain every actual query parameter.
      const { path: _routePath, ...query } = req.query;
      Object.defineProperty(req, "query", { value: query, configurable: true });
      next();
    });
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy:
        process.argv.includes("--production") || !!process.env.VERCEL
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                fontSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "blob:"],
                mediaSrc: ["'self'", "blob:"],
                connectSrc: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: null,
              },
            }
          : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use((req, res, next) => {
    res.setHeader("X-Request-Id", randomUUID());
    res.setHeader("Cache-Control", "no-store");
    const origin = req.header("Origin");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      origin &&
      !allowedOrigins().has(origin)
    )
      return next(
        new AppError(403, "ORIGIN_DENIED", "Request origin is not allowed."),
      );
    next();
  });
  app.use(express.json({ limit: "3mb" }));
  app.use(cookieParser());
  const authLimit = process.env.VERCEL
    ? hostedAuthLimit
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: authRequestsPerWindow,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        handler: (_req, res) =>
          res.status(429).json({
            code: "RATE_LIMITED",
            message:
              "Too many authentication attempts. Wait before trying again.",
            retryable: true,
          }),
      });
  app.post("/api/pilot-applications", authLimit, applyForPilot);
  app.post("/api/newsletter-interest", authLimit, newsletterInterest);
  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      service: "Duty Graph",
      version: "0.3.0",
      database: "PostgreSQL",
      runtime: "unconfigured",
    });
  });
  app.get("/api/maintenance", maintenance);
  app.get("/api/auth/options", (_req, res) =>
    res.json({ demo: process.env.ENABLE_DEMO === "true" }),
  );
  app.post("/api/auth/register", authLimit, async (req, res) =>
    res
      .status(201)
      .json(
        await createSession(
          res,
          await registerAccount(registerSchema.parse(req.body)),
        ),
      ),
  );
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const d = z
      .object({
        email: z.email().toLowerCase(),
        password: z.string().min(1).max(128),
      })
      .strict()
      .parse(req.body);
    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [
      d.email,
    ]);
    if (!rows[0] || !passwordMatches(d.password, rows[0].password_hash))
      fail(401, "INVALID_LOGIN", "Email or password is incorrect.");
    res.json(await createSession(res, rows[0]));
  });
  app.post("/api/auth/demo", authLimit, async (_req, res) => {
    if (process.env.ENABLE_DEMO !== "true")
      fail(404, "DISABLED", "The sample workspace is disabled.");
    res.json(await createSession(res, await demoUser()));
  });
  app.get("/api/auth/me", authenticate, (req, res) =>
    res.json({ user: actor(req), csrf: (req as AuthRequest).csrf }),
  );
  app.post("/api/auth/logout", authenticate, async (req, res) => {
    await pool.query("DELETE FROM sessions WHERE token_hash=$1", [
      tokenHash(req.cookies.dg_session),
    ]);
    res.clearCookie("dg_session", { path: "/" });
    res.json({ ok: true });
  });
  app.use("/api/invitations", authLimit, kickoffLinkRouter());
  app.use("/api/invitations", authLimit, teamLinkRouter());
  app.get("/api/invitations/:token", authLimit, async (req, res) => {
    const { rows } = await pool.query(
      "SELECT * FROM invitations WHERE token_hash=$1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at>now()",
      [tokenHash(param(req, "token"))],
    );
    const invite =
      rows[0] ||
      fail(
        410,
        "INVITATION_EXPIRED",
        "This link is no longer active. If the invitation was resent, open the newest email. If you already enrolled, sign in. Otherwise ask your advisor for a new invitation.",
      );
    const info = await tx(invite.tenant_id, async (db) => {
      const r = await getRecord(db, invite.company_id, invite.request_id);
      if (r.state === "withdrawn")
        fail(410, "INVITATION_WITHDRAWN", "This request was withdrawn.");
      const c = (
        await db.query("SELECT name FROM companies WHERE id=$1", [
          invite.company_id,
        ])
      ).rows[0];
      return {
        company: c.name,
        title: r.title,
        notice: r.data.notice,
        name: invite.name,
        passwordlessTeam: r.data.type === "work",
        passwordless:
          r.data.type === "leadership" &&
          String(r.data.questionPlanVersion || "").startsWith(
            "discovery-contact:",
          ),
      };
    });
    res.json(info);
  });
  app.post("/api/invitations/:token/enroll", authLimit, async (req, res) => {
    const d = z
      .object({
        password: z.string().min(10).max(128),
        acknowledged: z.literal(true),
      })
      .strict()
      .parse(req.body);
    const token = tokenHash(param(req, "token"));
    const first = await pool.query(
      "SELECT tenant_id FROM invitations WHERE token_hash=$1",
      [token],
    );
    if (!first.rows[0])
      fail(410, "INVITATION_EXPIRED", "This invitation is unavailable.");
    const enrolled = await tx(first.rows[0].tenant_id, async (db) => {
      const { rows } = await db.query(
        "SELECT * FROM invitations WHERE token_hash=$1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE",
        [token],
      );
      const invite =
        rows[0] ||
        fail(
          410,
          "INVITATION_EXPIRED",
          "This link is no longer active. Use the newest invitation email or sign in if you already enrolled.",
        );
      const request = await getRecord(
        db,
        invite.company_id,
        invite.request_id,
        true,
      );
      if (request.state === "withdrawn")
        fail(410, "INVITATION_WITHDRAWN", "This request was withdrawn.");
      const existing = (
        await db.query("SELECT * FROM users WHERE email=$1", [invite.email])
      ).rows[0];
      let row = existing;
      if (existing) {
        if (
          existing.tenant_id !== invite.tenant_id ||
          existing.person_id !== invite.person_id ||
          !passwordMatches(d.password, existing.password_hash)
        )
          fail(
            409,
            "ACCOUNT_EXISTS",
            "This email already belongs to an account that could not be matched to this participant. Advisors should use Preview response form in their workspace for testing. Existing participants should use their password or ask their advisor to check the assignment.",
          );
      } else
        row = (
          await db.query(
            "INSERT INTO users(id,tenant_id,email,name,password_hash,role,person_id,company_id) VALUES($1,$2,$3,$4,$5,'participant',$6,$7) RETURNING *",
            [
              randomUUID(),
              invite.tenant_id,
              invite.email,
              invite.name,
              passwordHash(d.password),
              invite.person_id,
              invite.company_id,
            ],
          )
        ).rows[0];
      await db.query(
        "UPDATE invitations SET used_at=now() WHERE token_hash=$1",
        [token],
      );
      await audit(
        db,
        publicUser(row),
        invite.company_id,
        "participant.enrolled",
        invite.request_id,
        {
          assurance:
            "invitation possession plus password; email not independently verified",
        },
      );
      return { user: publicUser(row), requestId: invite.request_id };
    });
    res.json({
      ...(await createSession(res, enrolled.user)),
      requestId: enrolled.requestId,
    });
  });
  app.use("/api/v1", authenticate);
  const api = express.Router();
  registerPilotInboxRoutes(api);
  api.use(
    "/companies/:companyId/work-links",
    workLinksRouter(workLinkProvider),
  );
  api.post("/sample-company", advisor, async (req, res) =>
    res.json(
      await run(req, async (db: import("pg").PoolClient) => {
        const u = actor(req),
          existing = (
            await db.query(
              "SELECT c.id FROM companies c WHERE c.sandbox=true AND EXISTS(SELECT 1 FROM records r WHERE r.company_id=c.id AND r.kind='evidence' AND r.data->>'locator'='Synthetic V2 example · full excerpt') ORDER BY c.created_at LIMIT 1",
            )
          ).rows[0];
        if (existing) {
          await ensureCobaltExamples(db, u, existing.id);
          return existing;
        }
        const id = randomUUID();
        await db.query(
          "INSERT INTO companies(id,tenant_id,name,scope,goal,settings,sandbox) VALUES($1,$2,$3,$4,$5,$6,true)",
          [
            id,
            u.tenant_id,
            "Cobalt Industrial Supply",
            "Supplier onboarding",
            "Explore this fictional example before creating a real engagement.",
            defaultSettings(),
          ],
        );
        await seedRecords(db, u, id);
        return { id };
      }),
    ),
  );
  api.post("/companies/:companyId/sample-upgrade", advisor, async (req, res) =>
    res.json(
      await run(req, async (db: import("pg").PoolClient) => {
        const company = await companyCheck(
          db,
          actor(req),
          param(req, "companyId"),
        );
        await ensureCobaltExamples(db, actor(req), company.id);
        return { company: await companyCheck(db, actor(req), company.id) };
      }),
    ),
  );
  api.get("/companies", async (req, res) =>
    res.json(
      await tx(
        actor(req).tenant_id,
        async (db) =>
          (
            await db.query(
              "SELECT * FROM companies WHERE ($1::uuid IS NULL OR id=$1) ORDER BY created_at",
              [
                actor(req).role === "participant"
                  ? actor(req).company_id
                  : null,
              ],
            )
          ).rows,
      ),
    ),
  );
  api.post("/companies", advisor, async (req, res) =>
    res.status(201).json(
      await run(req, async (db: any) => {
        const d = z
          .object({
            name: z.string().trim().min(2).max(200),
            scope: z.string().trim().min(3).max(1000),
            goal: z.string().trim().min(3).max(2000),
          })
          .strict()
          .parse(req.body);
        return (
          await db.query(
            "INSERT INTO companies(id,tenant_id,name,scope,goal,settings,sandbox) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
            [
              randomUUID(),
              actor(req).tenant_id,
              d.name,
              d.scope,
              d.goal,
              defaultSettings(),
              actor(req).email === "demo@dutygraph.invalid",
            ],
          )
        ).rows[0];
      }),
    ),
  );
  api.get("/companies/:companyId/workspace", advisor, async (req, res) =>
    res.json(
      await tx(actor(req).tenant_id, async (db) => {
        const c = await companyCheck(db, actor(req), param(req, "companyId"));
        const records = (
          await db.query(
            "SELECT * FROM records WHERE company_id=$1 ORDER BY created_at",
            [c.id],
          )
        ).rows;
        const cs = (
          await db.query("SELECT * FROM confirmations WHERE company_id=$1", [
            c.id,
          ])
        ).rows;
        for (const r of records) {
          if (r.kind === "task") {
            r.state = confirmationStatus(r, cs);
            r.confirmations = cs.filter((v) => v.record_id === r.id);
          }
          if (
            r.kind === "case" &&
            r.data.executionMode !== "illustrative_snapshot" &&
            !["complete", "cancelled"].includes(r.state)
          )
            r.state = caseStatus(expireSteps(r.data.steps, Date.now()));
        }
        const events = (
          await db.query(
            "SELECT * FROM audit_events WHERE company_id=$1 ORDER BY sequence DESC LIMIT 50",
            [c.id],
          )
        ).rows;
        const pending = (
          await db.query(
            "SELECT count(*)::int AS count,min(created_at) AS oldest FROM outbox WHERE company_id=$1 AND processed_at IS NULL",
            [c.id],
          )
        ).rows[0];
        return {
          company: c,
          records,
          events,
          registry,
          projection: {
            engine: "PostgreSQL derived projection",
            pending: pending.count,
            oldest: pending.oldest,
          },
          connections: {
            postgres: "current",
            neo4j: neo4jPublicStatus(
              (
                await db.query(
                  "SELECT enabled,config FROM provider_settings WHERE provider='neo4j'",
                )
              ).rows[0],
            ),
            email: (await providerConfig(actor(req).tenant_id, "resend", db))
              .configured
              ? "configured"
              : "not_configured",
            transcription: (
              await providerConfig(actor(req).tenant_id, "openai", db)
            ).configured
              ? "configured"
              : "not_configured",
            ai: (await providerConfig(actor(req).tenant_id, "openai", db))
              .configured
              ? "configured"
              : "not_configured",
            saviynt: "not_configured",
            serviceNow: "not_configured",
            oracle: "not_configured",
            runtime: "not_configured",
          },
        };
      }),
    ),
  );
  api.use(
    "/companies/:companyId/business-classification",
    businessClassificationRouter(classificationProvider, researchProvider),
  );
  api.put("/companies/:companyId/business-profile", advisor, async (req, res) =>
    res.json(
      await run(req, async (db: any) => {
        const u = actor(req),
          c = await companyCheck(db, u, param(req, "companyId"));
        const d = z
          .object({
            expectedRevision: z.number().int(),
            profile: businessProfileSchema,
            intake: classificationIntake.optional(),
          })
          .strict()
          .parse(req.body);
        const updated = (
          await db.query(
            "UPDATE companies SET settings=settings || $1::jsonb,revision=revision+1 WHERE id=$2 AND revision=$3 RETURNING *",
            [
              JSON.stringify({
                businessProfile: d.profile,
                ...(d.intake ? { businessIntake: d.intake } : {}),
              }),
              c.id,
              d.expectedRevision,
            ],
          )
        ).rows[0];
        if (!updated)
          fail(
            409,
            "VERSION_CONFLICT",
            "The workspace changed. Refresh before saving the business profile.",
          );
        await audit(db, u, c.id, "company.business_profile_saved", null, {
          previous: c.settings.businessProfile || null,
          profile: d.profile,
        });
        return updated;
      }),
    ),
  );
  api.patch("/companies/:companyId", advisor, async (req, res) =>
    res.json(
      await run(req, async (db: any) => {
        const c = await companyCheck(db, actor(req), param(req, "companyId"));
        const d = z
          .object({
            expectedVersion: z.number().int(),
            name: z.string().min(2).max(200),
            scope: z.string().min(3).max(1000),
            goal: z.string().min(3).max(2000),
            notice: z.string().min(20).max(3000),
          })
          .strict()
          .parse(req.body);
        if (c.revision !== d.expectedVersion)
          fail(
            409,
            "VERSION_CONFLICT",
            "The workspace changed. Refresh before saving settings.",
          );
        const updated = (
          await db.query(
            "UPDATE companies SET name=$1,scope=$2,goal=$3,settings=$4,revision=revision+1 WHERE id=$5 RETURNING *",
            [
              d.name,
              d.scope,
              d.goal,
              { ...c.settings, notice: d.notice },
              c.id,
            ],
          )
        ).rows[0];
        await audit(db, actor(req), c.id, "workspace.settings_changed", null);
        return updated;
      }),
    ),
  );
  api.post("/companies/:companyId/records", advisor, async (req, res) =>
    res.status(201).json(
      await run(req, async (db: any) => {
        const c = await companyCheck(db, actor(req), param(req, "companyId"));
        const d = z
          .object({ kind: z.string(), data: z.unknown() })
          .strict()
          .parse(req.body);
        return createOrEdit(db, actor(req), c.id, d.kind, d.data);
      }),
    ),
  );
  api.patch(
    "/companies/:companyId/records/:recordId",
    advisor,
    async (req, res) =>
      res.json(
        await run(req, async (db: any) => {
          const c = await companyCheck(db, actor(req), param(req, "companyId"));
          const r = await getRecord(db, c.id, param(req, "recordId"), true);
          z.object({ expectedVersion: z.number().int(), data: z.unknown() })
            .strict()
            .parse(req.body);
          expected(req, r);
          return createOrEdit(db, actor(req), c.id, r.kind, req.body.data, r);
        }),
      ),
  );
  api.get(
    "/companies/:companyId/records/:recordId/history",
    advisor,
    async (req, res) =>
      res.json(
        await tx(actor(req).tenant_id, async (db) => {
          const c = await companyCheck(db, actor(req), param(req, "companyId"));
          await getRecord(db, c.id, param(req, "recordId"));
          return (
            await db.query(
              "SELECT version,title,data,hash,reason,created_at FROM record_versions WHERE company_id=$1 AND record_id=$2 ORDER BY version DESC",
              [c.id, param(req, "recordId")],
            )
          ).rows;
        }),
      ),
  );
  api.post(
    "/companies/:companyId/records/:recordId/actions",
    advisor,
    async (req, res) =>
      res.json(
        await run(req, async (db: any) => {
          const c = await companyCheck(db, actor(req), param(req, "companyId")),
            user = actor(req),
            r = await getRecord(db, c.id, param(req, "recordId"), true);
          const d = z
            .object({
              expectedVersion: z.number().int(),
              action: z.enum([
                "accept",
                "review",
                "retract",
                "withdraw",
                "complete",
                "observe",
                "test_diagnosis",
                "review_diagnosis",
              ]),
              note: z.string().max(20000).default(""),
              value: z.number().finite().optional(),
              observedAt: z.iso.datetime().optional(),
              alternativeTested: z.boolean().optional(),
            })
            .strict()
            .parse(req.body);
          expected(req, r);
          if (
            d.action === "review" &&
            ["engagement", "duty", "handoff", "outcome", "workflow"].includes(
              r.kind,
            )
          ) {
            if (!d.note.trim())
              fail(422, "REASON_REQUIRED", "Record your review rationale.");
            if (r.kind === "workflow")
              await checkWorkflow(db, c.id, { ...r, state: "reviewed" });
            if (
              ["duty", "handoff"].includes(r.kind) &&
              !r.data.evidenceIds.length
            )
              fail(
                422,
                "EVIDENCE_REQUIRED",
                "Attach accepted evidence before reviewing this work claim.",
              );
            if (r.kind === "duty" && !r.data.ownerId)
              fail(
                422,
                "OWNER_REQUIRED",
                "Resolve duty accountability before reviewing this claim.",
              );
            for (const binding of [
              ...(r.data.sourceBindings || []),
              ...(r.data.taskBindings || []),
            ]) {
              const source = await getRecord(db, c.id, binding.id);
              if (
                source.version !== binding.version ||
                source.hash !== binding.hash ||
                ["stale", "retracted"].includes(source.state)
              )
                fail(
                  409,
                  "STALE_BINDING",
                  "A linked record changed. Revise this record before review.",
                );
            }
            if (r.kind === "outcome" && r.data.result === "falsified") {
              const candidate = await getRecord(
                db,
                c.id,
                r.data.predictionSnapshot.candidateId,
                true,
              );
              await setState(
                db,
                user,
                c.id,
                candidate,
                "review_required",
                "outcome.prediction_falsified",
              );
            }
            await setState(db, user, c.id, r, "reviewed", r.kind + ".reviewed");
            await audit(db, user, c.id, r.kind + ".review_rationale", r.id, {
              note: d.note,
              version: r.version,
              hash: r.hash,
            });
            return { ok: true };
          }
          if (d.action === "review" && r.kind === "task")
            return reviewTask(db, user, c.id, r);
          if (
            d.action === "accept" &&
            r.kind === "evidence" &&
            r.state === "pending_review"
          ) {
            await setState(db, user, c.id, r, "accepted", "evidence.accepted");
            return { ok: true };
          }
          if (
            d.action === "retract" &&
            r.kind === "evidence" &&
            r.state !== "retracted"
          ) {
            if (!d.note.trim())
              fail(
                422,
                "REASON_REQUIRED",
                "Record why this source was retracted.",
              );
            await setState(db, user, c.id, r, "retracted", "source.retracted");
            const all = (
              await db.query("SELECT * FROM records WHERE company_id=$1", [
                c.id,
              ])
            ).rows;
            const affected = new Set([r.id]);
            let changed = true;
            while (changed) {
              changed = false;
              for (const item of all) {
                const refs = [
                  ...(item.data.evidenceIds || []),
                  ...(item.data.taskIds || []),
                  ...(item.data.sourceBindings || []).map((b: any) => b.id),
                  ...(item.data.upstreamBindings || []).map((b: any) => b.id),
                ];
                if (
                  !affected.has(item.id) &&
                  refs.some((id: string) => affected.has(id))
                ) {
                  affected.add(item.id);
                  await setState(
                    db,
                    user,
                    c.id,
                    item,
                    "stale",
                    "source.dependent_stale",
                  );
                  changed = true;
                }
              }
            }
            await audit(db, user, c.id, "source.retraction_reason", r.id, {
              note: d.note,
            });
            return { ok: true, affected: affected.size - 1 };
          }
          if (
            d.action === "withdraw" &&
            r.kind === "request" &&
            !["accepted", "withdrawn"].includes(r.state)
          ) {
            await setState(db, user, c.id, r, "withdrawn", "request.withdrawn");
            await db.query(
              "UPDATE invitations SET revoked_at=now() WHERE request_id=$1",
              [r.id],
            );
            return { ok: true };
          }
          if (
            d.action === "accept" &&
            r.kind === "response" &&
            r.state === "returned"
          ) {
            const request = await getRecord(db, c.id, r.data.requestId, true);
            if (request.state === "withdrawn")
              fail(
                409,
                "REQUEST_WITHDRAWN",
                "This response belongs to a withdrawn request.",
              );
            if (request.data.type === "confirmation") {
              await db.query(
                "UPDATE confirmations SET accepted=true WHERE company_id=$1 AND request_id=$2",
                [c.id, request.id],
              );
              const taskIds = new Set<string>(
                request.data.taskSnapshots.map((s: any) => s.id),
              );
              for (const id of taskIds) {
                const task = await getRecord(db, c.id, id, true);
                const snap = request.data.taskSnapshots.find(
                  (s: any) => s.id === id,
                );
                const decision = r.data.decisions?.[id];
                if (
                  snap.version === task.version &&
                  decision &&
                  decision !== "correct"
                )
                  await putRecord(
                    db,
                    user,
                    c.id,
                    "task",
                    task.title,
                    { ...task.data, reviewed: false, conflict: true },
                    "conflicting",
                    task,
                    "Participant requested clarification: " + decision,
                  );
                else await refreshTask(db, user, c.id, task);
              }
            } else {
              const sourceText =
                r.data.text ||
                "Audio response; no reviewed transcript was supplied.";
              const pendingSources = (
                await db.query(
                  "SELECT * FROM records WHERE company_id=$1 AND kind='evidence' AND state='proposed' AND data->>'originId'=$2",
                  [c.id, r.id],
                )
              ).rows;
              for (const source of pendingSources)
                if (source.data.responseHash === r.hash)
                  await setState(
                    db,
                    user,
                    c.id,
                    source,
                    "accepted",
                    "evidence.accepted",
                  );
              const priorSources = (
                await db.query(
                  "SELECT * FROM records WHERE company_id=$1 AND kind='evidence' AND state='accepted' AND data->>'originId'=$2",
                  [c.id, r.id],
                )
              ).rows;
              const preserved = priorSources.some(
                (source: any) =>
                  source.data.responseHash === r.hash ||
                  (source.data.text === sourceText &&
                    (source.data.assetId || "") === (r.data.assetId || "")),
              );
              if (!preserved)
                await putRecord(
                  db,
                  user,
                  c.id,
                  "evidence",
                  request.title + " — participant response",
                  {
                    title: request.title,
                    responseHash: r.hash,
                    responseVersion: r.version,
                    type:
                      request.data.type === "leadership"
                        ? "Leadership account"
                        : "Employee account",
                    text:
                      r.data.text ||
                      "Audio response; no reviewed transcript was supplied.",
                    personId: request.data.personId,
                    locator:
                      "Participant response " + r.id + " · original submission",
                    originId: r.id,
                    classification: "Known",
                    bucket:
                      request.data.type === "leadership" ? "leadership" : "org",
                    assetId: r.data.assetId || "",
                    sourceDate: r.created_at,
                  },
                  "accepted",
                );
            }
            await setState(db, user, c.id, r, "accepted", "response.accepted");
            await setState(
              db,
              user,
              c.id,
              request,
              "accepted",
              "request.accepted",
            );
            return { ok: true };
          }
          if (
            d.action === "complete" &&
            r.kind === "review" &&
            r.state === "open"
          ) {
            await setState(db, user, c.id, r, "complete", "review.completed");
            return { ok: true };
          }
          if (d.action === "observe" && r.kind === "metric") {
            if (d.value === undefined || !d.observedAt || !d.note.trim())
              fail(
                422,
                "OBSERVATION_REQUIRED",
                "Provide a value, observation time, and source locator.",
              );
            return putRecord(
              db,
              user,
              c.id,
              r.kind,
              r.title,
              {
                ...r.data,
                observations: [
                  ...(r.data.observations || []),
                  {
                    id: randomUUID(),
                    value: d.value,
                    observedAt: d.observedAt,
                    source: d.note,
                    actorId: user.id,
                  },
                ],
              },
              r.state,
              r,
              "Recorded a measured observation",
            );
          }
          if (d.action === "test_diagnosis" && r.kind === "candidate") {
            if (!d.note.trim())
              fail(
                422,
                "EVIDENCE_REQUIRED",
                "Record the discriminating test result and source.",
              );
            return putRecord(
              db,
              user,
              c.id,
              r.kind,
              r.title,
              {
                ...r.data,
                alternativeTested: d.alternativeTested === true,
                discriminatorResult: d.note,
              },
              "constraint_hypothesis",
              r,
              "Recorded diagnosis test evidence",
            );
          }
          if (d.action === "review_diagnosis" && r.kind === "candidate") {
            const all = (
              await db.query("SELECT * FROM records WHERE company_id=$1", [
                c.id,
              ])
            ).rows;
            const readiness = diagnosisReadiness(
              r,
              all.filter((i: any) => i.kind === "evidence"),
              all.filter((i: any) => i.kind === "metric"),
            );
            if (!readiness.ready)
              fail(422, "INSUFFICIENT_EVIDENCE", readiness.reasons.join(" "));
            return putRecord(
              db,
              user,
              c.id,
              r.kind,
              r.title,
              {
                ...r.data,
                reviewedBy: user.id,
                reviewedAt: new Date().toISOString(),
              },
              "signed_constraint",
              r,
              "Human reviewed a testable diagnosis; causation remains unproven",
            );
          }
          if (
            d.action === "review" &&
            r.kind === "framework" &&
            r.state === "review_required"
          ) {
            for (const b of [
              ...r.data.sourceBindings,
              ...r.data.upstreamBindings,
            ]) {
              const current = await getRecord(db, c.id, b.id);
              if (
                current.version !== b.version ||
                current.hash !== b.hash ||
                ["stale", "retracted"].includes(current.state)
              )
                fail(
                  409,
                  "STALE_INPUT",
                  "A framework input changed. Save a new analysis against current sources.",
                );
            }
            await setState(db, user, c.id, r, "complete", "framework.reviewed");
            return { ok: true };
          }
          fail(
            409,
            "INVALID_TRANSITION",
            "That action is not available for this record and state.",
          );
        }),
      ),
  );
  api.post(
    "/companies/:companyId/requests/:recordId/issue",
    advisor,
    async (req, res) =>
      res.json(
        await run(req, async (db: any) => {
          const c = await companyCheck(db, actor(req), param(req, "companyId")),
            r = await getRecord(db, c.id, param(req, "recordId"), true);
          const invite = await issueInvitation(
            db,
            actor(req),
            c.id,
            r,
            req.body.expectedVersion,
            "manual_link",
          );
          return {
            url: invite.url,
            delivery: "manual_link",
            emailSent: false,
            expiresInDays: 7,
          };
        }),
      ),
  );
  api.get("/participant/requests", async (req, res) =>
    res.json(
      await tx(actor(req).tenant_id, async (db) => {
        const u = actor(req);
        if (u.role !== "participant")
          fail(
            403,
            "PARTICIPANT_REQUIRED",
            "Sign in with a participant account.",
          );
        const company = await companyCheck(db, u, u.company_id!);
        const person = await getRecord(db, u.company_id!, u.person_id!);
        const requests = (
          await db.query(
            "SELECT * FROM records WHERE company_id=$1 AND kind='request' AND data->>'personId'=$2 AND state NOT IN ('draft','withdrawn') ORDER BY created_at DESC",
            [u.company_id, u.person_id],
          )
        ).rows;
        return {
          company: { id: company.id, name: company.name },
          person: {
            name: person.title,
            role: person.data.role,
            team: person.data.team,
          },
          requests: requests.map((r) => ({
            id: r.id,
            title: r.title,
            version: r.version,
            state: r.state,
            data: {
              questions: r.data.questions,
              kickoffPreparation: String(
                r.data.questionPlanVersion || "",
              ).startsWith("discovery-contact:"),
              kickoffBusinessStreams: r.data.kickoffBusinessStreams || [],
              notice: r.data.notice,
              type: r.data.type,
              dueDate: r.data.dueDate,
              taskSnapshots: r.data.taskSnapshots.map((s: any) => ({
                id: s.id,
                version: s.version,
                title: s.title,
                hash: s.hash,
                data: {
                  purpose: s.data.purpose,
                  trigger: s.data.trigger,
                  inputs: s.data.inputs,
                  instructions: s.data.instructions,
                  output: s.data.output,
                  allowed: s.data.allowed,
                  denied: s.data.denied,
                  humanGate: s.data.humanGate,
                  systems: s.data.systems,
                },
              })),
            },
          })),
        };
      }),
    ),
  );
  api.post(
    "/participant/requests/:recordId/task-draft",
    participantDraft(discoveryProvider),
  );
  api.post("/participant/requests/:recordId/submit", async (req, res) =>
    res.json(
      await run(req, async (db: any) => {
        const u = actor(req);
        if (u.role !== "participant")
          fail(
            403,
            "PARTICIPANT_REQUIRED",
            "A participant account is required.",
          );
        const r = await getRecord(
          db,
          u.company_id!,
          param(req, "recordId"),
          true,
        );
        if (r.kind !== "request" || r.data.personId !== u.person_id)
          fail(404, "NOT_FOUND", "Assigned request not found.");
        const d = z
          .object({
            expectedVersion: z.number().int(),
            text: z.string().max(100000).default(""),
            assetId: z.union([z.uuid(), z.literal("")]).default(""),
            acknowledged: z.literal(true),
            decisions: z
              .record(
                z.string(),
                z.enum(["correct", "needs_change", "not_mine", "unsure"]),
              )
              .default({}),
            taskCards: participantCards.optional(),
            kickoffPreparation: kickoffPreparationSchema.optional(),
            note: z.string().max(10000).default(""),
          })
          .strict()
          .parse(req.body);
        expected(req, r);
        if (r.state !== "sent")
          fail(
            409,
            "ALREADY_SUBMITTED",
            "This request is already submitted or no longer open.",
          );
        if (Date.now() > new Date(r.data.dueDate + "T23:59:59Z").getTime())
          fail(
            410,
            "REQUEST_EXPIRED",
            "This request is past its due date. Ask your advisor for a new request.",
          );
        if (d.kickoffPreparation) {
          if (
            r.data.type !== "leadership" ||
            !String(r.data.questionPlanVersion || "").startsWith(
              "discovery-contact:",
            )
          )
            fail(
              422,
              "KICKOFF_ONLY",
              "Team uploads belong to your assigned kickoff preparation request.",
            );
          try {
            validateKickoffPreparation(d.kickoffPreparation);
          } catch (e) {
            fail(422, "KICKOFF_INVALID", (e as Error).message);
          }
          d.text = [
            kickoffPreparationText(d.kickoffPreparation),
            d.text ? `Additional response\n${d.text}` : "",
          ]
            .filter(Boolean)
            .join("\n\n");
        }
        if (d.assetId) {
          const asset = (
            await db.query(
              "SELECT * FROM assets WHERE company_id=$1 AND id=$2 AND person_id=$3 AND request_id=$4 AND state=$5",
              [u.company_id, d.assetId, u.person_id, r.id, "stored_unscanned"],
            )
          ).rows[0];
          if (!asset)
            fail(
              422,
              "ASSET_NOT_READY",
              "Your complete audio upload is required before submission.",
            );
        }
        if (r.data.type === "confirmation") {
          for (const snap of r.data.taskSnapshots) {
            const decision = d.decisions[snap.id];
            if (!decision)
              fail(
                422,
                "DECISION_REQUIRED",
                "Review every assigned task before submitting.",
              );
            await db.query(
              "INSERT INTO confirmations(id,tenant_id,company_id,record_id,version,hash,person_id,user_id,request_id,decision,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
              [
                randomUUID(),
                u.tenant_id,
                u.company_id,
                snap.id,
                snap.version,
                snap.hash,
                u.person_id,
                u.id,
                r.id,
                decision,
                d.note,
              ],
            );
          }
        } else if (!d.text.trim() && !d.assetId)
          fail(
            422,
            "RESPONSE_REQUIRED",
            "Add a typed response or finish an audio upload.",
          );
        const response = await putRecord(
          db,
          u,
          u.company_id!,
          "response",
          r.title + " — response",
          {
            requestId: r.id,
            personId: u.person_id,
            text: d.text,
            assetId: d.assetId,
            decisions: d.decisions,
            note: d.note,
            taskCards: d.taskCards || [],
            ...(d.kickoffPreparation
              ? { kickoffPreparation: d.kickoffPreparation }
              : {}),
          },
          "returned",
        );
        if (d.taskCards?.length && r.data.type !== "work")
          fail(
            422,
            "WORK_ONLY",
            "Task descriptions belong to work interviews.",
          );
        const cardEvidence = d.taskCards?.length
          ? await putRecord(
              db,
              u,
              u.company_id!,
              "evidence",
              r.title + " — original account",
              {
                type: "Employee account",
                text: d.text,
                personId: u.person_id,
                bucket: "org",
                assetId: d.assetId,
                responseId: response.id,
                originId: response.id,
                responseHash: response.hash,
                requestId: r.id,
                classification: "Known",
                locator: `Participant response ${response.id}`,
              },
              "proposed",
            )
          : null;
        for (const card of d.taskCards || []) {
          if (card.decision === "not_mine") continue;
          const taskFields = schemas.task.parse({
            title: card.title,
            duty: card.duty,
            ownerId: "",
            performerId: u.person_id,
            purpose:
              card.purpose?.trim() || "Work described by the participant",
            trigger: card.trigger?.trim() || "Not yet recorded",
            inputs: card.inputs || "Not yet recorded",
            instructions: card.instructions || "Not yet recorded",
            output: card.output || "Not yet recorded",
            humanGate:
              card.humanGate?.trim() ||
              "Company authority and checkpoints require review",
            systems: card.software
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean),
            destination: card.handoff,
            reviewDue: r.data.dueDate,
            reason: "Participant reviewed their own description",
            evidenceIds: cardEvidence ? [cardEvidence.id] : [],
          });
          const task = await putRecord(
            db,
            u,
            u.company_id!,
            "task",
            taskFields.title,
            {
              ...taskFields,
              reviewed: false,
              participantResponseId: response.id,
              sourceBindings: cardEvidence
                ? [
                    {
                      id: cardEvidence.id,
                      version: cardEvidence.version,
                      hash: cardEvidence.hash,
                    },
                  ]
                : [],
            },
            "proposed",
          );
          await db.query(
            "INSERT INTO confirmations(id,tenant_id,company_id,record_id,version,hash,person_id,user_id,request_id,decision,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
            [
              randomUUID(),
              u.tenant_id,
              u.company_id,
              task.id,
              task.version,
              task.hash,
              u.person_id,
              u.id,
              r.id,
              card.decision,
              `Original response ${response.id}. Confirms description only; ownership needs advisor review.`,
            ],
          );
        }
        await setState(db, u, u.company_id!, r, "returned", "request.returned");
        return { ok: true, responseId: response.id };
      }),
    ),
  );
  api.post(
    "/companies/:companyId/responses/:recordId/kickoff-roster",
    advisor,
    async (req, res) =>
      res.json(
        await run(req, async (db: any) => {
          const c = await companyCheck(db, actor(req), param(req, "companyId"));
          return importKickoffRoster(
            db,
            actor(req),
            c.id,
            param(req, "recordId"),
            req.body,
          );
        }),
      ),
  );
  api.post("/companies/:companyId/roster/preview", advisor, async (req, res) =>
    res.json(
      await tx(actor(req).tenant_id, async (db) => {
        const c = await companyCheck(db, actor(req), param(req, "companyId"));
        const { csv } = z
          .object({ csv: z.string().max(500000) })
          .strict()
          .parse(req.body);
        return previewRoster(
          csv,
          (
            await db.query(
              "SELECT * FROM records WHERE company_id=$1 AND kind='person'",
              [c.id],
            )
          ).rows,
        );
      }),
    ),
  );
  api.post("/companies/:companyId/roster/apply", advisor, async (req, res) =>
    res.json(
      await run(req, async (db: any) => {
        const c = await companyCheck(db, actor(req), param(req, "companyId"));
        await db.query("SELECT id FROM companies WHERE id=$1 FOR UPDATE", [
          c.id,
        ]);
        const { csv } = z
          .object({ csv: z.string().max(500000) })
          .strict()
          .parse(req.body);
        const existing = (
          await db.query(
            "SELECT * FROM records WHERE company_id=$1 AND kind='person'",
            [c.id],
          )
        ).rows;
        const preview = previewRoster(csv, existing);
        if (preview.errors.length)
          fail(422, "INVALID_CSV", preview.errors.join(" "));
        const valid = preview.rows.filter((r) => !r.issues.length);
        const map = new Map<string, string>(
          existing.map((p: any) => [p.data.email, p.id]),
        );
        const added: any[] = [];
        for (const row of valid) {
          const { managerEmail, ...data } = row.data;
          const r = await createOrEdit(db, actor(req), c.id, "person", {
            ...data,
            managerId: "",
          });
          map.set(data.email, r.id);
          added.push({ r, managerEmail });
        }
        for (const { r, managerEmail } of added)
          if (managerEmail)
            await createOrEdit(
              db,
              actor(req),
              c.id,
              "person",
              { ...r.data, managerId: map.get(managerEmail) || "" },
              r,
            );
        return {
          imported: added.length,
          quarantined: preview.rows.filter((r) => r.issues.length),
        };
      }),
    ),
  );
  api.get("/companies/:companyId/graph", advisor, async (req, res) =>
    res.json(
      await tx(actor(req).tenant_id, async (db) => {
        const c = await companyCheck(db, actor(req), param(req, "companyId"));
        return readGraph(db, c, req.query);
      }),
    ),
  );
  api.post(
    "/companies/:companyId/frameworks/:key/manual",
    advisor,
    async (req, res) =>
      res.json(
        await run(req, async (db: any) => {
          const c = await companyCheck(db, actor(req), param(req, "companyId"));
          const def =
            registry.frameworks.find((f: any) => f.key === param(req, "key")) ||
            fail(404, "NOT_FOUND", "Unknown canonical framework.");
          const d = z
            .object({
              analysis: z.string().trim().min(20).max(50000),
              evidenceIds: z.array(z.uuid()).min(1).max(50),
              expectedRevision: z.number().int(),
            })
            .strict()
            .parse(req.body);
          if (d.expectedRevision !== c.revision)
            fail(
              409,
              "STALE_INPUT",
              "Workspace inputs changed. Refresh before saving analysis.",
            );
          const sourceBindings = [];
          for (const id of d.evidenceIds) {
            const e = await getRecord(db, c.id, id);
            if (e.kind !== "evidence" || e.state !== "accepted")
              fail(422, "INVALID_SOURCE", "Select accepted evidence sources.");
            sourceBindings.push({ id: e.id, version: e.version, hash: e.hash });
          }
          const all = (
            await db.query(
              "SELECT * FROM records WHERE company_id=$1 AND kind='framework'",
              [c.id],
            )
          ).rows;
          const upstreamBindings = [];
          for (const key of def.upstream) {
            const up = all.find(
              (r: any) => r.data.key === key && r.state === "complete",
            );
            if (!up)
              fail(
                422,
                "UPSTREAM_REQUIRED",
                "Review " + key + " before completing " + def.key + ".",
              );
            upstreamBindings.push({
              id: up.id,
              version: up.version,
              hash: up.hash,
            });
          }
          const old = all.find((r: any) => r.data.key === def.key);
          const saved = await putRecord(
            db,
            actor(req),
            c.id,
            "framework",
            def.name,
            {
              key: def.key,
              analysis: d.analysis,
              sourceBindings,
              upstreamBindings,
              inputRevision: c.revision,
              authorship: "Human-authored analysis",
              guideVersion: FRAMEWORK_GUIDE_VERSION,
              provider: null,
            },
            "review_required",
            old,
            "Saved evidence-bound framework analysis",
          );
          const affected = new Set([saved.id]);
          let changed = true;
          while (changed) {
            changed = false;
            for (const r of all)
              if (
                !affected.has(r.id) &&
                r.data.upstreamBindings.some((b: any) => affected.has(b.id))
              ) {
                affected.add(r.id);
                await setState(
                  db,
                  actor(req),
                  c.id,
                  r,
                  "stale",
                  "framework.upstream_stale",
                );
                changed = true;
              }
          }
          return saved;
        }),
      ),
  );
  api.post("/companies/:companyId/exports", advisor, async (req, res) =>
    res.status(201).json(
      await run(req, async (db: any) => {
        const c = await companyCheck(db, actor(req), param(req, "companyId"));
        const d = z
          .object({
            kind: z.enum(["workspace", "confirmed", "agent"]),
            agentId: z.uuid().optional(),
          })
          .strict()
          .parse(req.body);
        if (d.kind === "agent") {
          if (!d.agentId) fail(422, "AGENT_REQUIRED", "Choose a proposal.");
          const agent = await getRecord(db, c.id, d.agentId!);
          if (agent.kind !== "agent")
            fail(422, "AGENT_REQUIRED", "Choose a proposal.");
        }
        return createExport(db, actor(req), c, d.kind, d.agentId);
      }),
    ),
  );
  api.get(
    "/companies/:companyId/exports/:recordId/download",
    advisor,
    async (req, res) => {
      const record = await tx(actor(req).tenant_id, async (db) => {
        const c = await companyCheck(db, actor(req), param(req, "companyId"));
        const r = await getRecord(db, c.id, param(req, "recordId"));
        if (r.kind !== "export") fail(404, "NOT_FOUND", "Export not found.");
        const sources = r.data.packet.evidence;
        for (const s of sources) {
          const current = await getRecord(db, c.id, s.id);
          if (current.state === "retracted")
            fail(
              409,
              "EXPORT_STALE",
              "A source was retracted. Generate a fresh export with current exclusions.",
            );
        }
        await audit(db, actor(req), c.id, "export.downloaded", r.id);
        return r;
      });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="DutyGraph-${record.id.slice(0, 8)}.zip"`,
      );
      res.send(await exportZip(record));
    },
  );
  api.post("/companies/:companyId/runtime/preflight", advisor, (_req, res) =>
    res.status(503).json({
      code: "RUNTIME_UNCONFIGURED",
      decision: "blocked",
      message:
        "No verified runtime, authority source, or target-system adapter is configured.",
    }),
  );
  api.use("/companies/:companyId/reports", reportsRouter());
  api.use("/companies/:companyId/research", researchRouter(researchProvider));
  api.use("/companies/:companyId/providers", authLimit, providersRouter());
  api.use("/companies/:companyId/requests", invitationsRouter(emailProvider));
  api.use("/companies/:companyId/ai", aiRouter(aiProvider));
  api.use(
    "/companies/:companyId/discovery",
    discoveryRouter(discoveryProvider),
  );
  api.use("/companies/:companyId/neo4j", neo4jRouter());
  api.use(
    "/companies/:companyId/agent-requests",
    agentRequestsRouter(aiProvider),
  );
  api.use(
    "/companies/:companyId/framework-runs",
    frameworkRouter(frameworkProvider),
  );
  api.use(
    "/companies/:companyId/team-analysis",
    teamAnalysisRouter(teamProvider),
  );
  api.use("/companies/:companyId/strategy-briefs", strategyRouter(aiProvider));
  api.post("/companies/:companyId/graph/rebuild", advisor, async (req, res) =>
    res.json(
      await run(req, async (db: any) => {
        const c = await companyCheck(db, actor(req), param(req, "companyId"));
        const d = z
          .object({ expectedRevision: z.number().int() })
          .strict()
          .parse(req.body);
        const locked = (
          await db.query(
            "SELECT revision FROM companies WHERE id=$1 FOR UPDATE",
            [c.id],
          )
        ).rows[0];
        if (locked.revision !== d.expectedRevision)
          fail(
            409,
            "VERSION_CONFLICT",
            "Refresh the workspace before rebuilding the derived projection.",
          );
        const records = (
          await db.query("SELECT * FROM records WHERE company_id=$1", [c.id])
        ).rows;
        await db.query("DELETE FROM projection_nodes WHERE company_id=$1", [
          c.id,
        ]);
        for (const r of records)
          await db.query(
            "INSERT INTO projection_nodes(tenant_id,company_id,record_id,version,kind,title,state,links) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
            [
              actor(req).tenant_id,
              c.id,
              r.id,
              r.version,
              r.kind,
              r.title,
              r.state,
              JSON.stringify(linksFor(r)),
            ],
          );
        const count = (
          await db.query(
            "SELECT count(*)::int n FROM projection_nodes WHERE company_id=$1",
            [c.id],
          )
        ).rows[0].n;
        if (count !== records.length)
          fail(
            500,
            "PROJECTION_MISMATCH",
            "The rebuilt projection failed its count check.",
          );
        await audit(db, actor(req), c.id, "graph.projection_rebuilt", null, {
          sourceRevision: c.revision,
          nodes: count,
          source: "authoritative records",
          sideEffectsReplayed: false,
        });
        return {
          status: "rebuilt",
          nodes: count,
          sourceRevision: c.revision,
          sideEffectsReplayed: false,
        };
      }),
    ),
  );
  api.use("/companies/:companyId/workflows", workflowsRouter());
  app.use("/api/v1", api);
  return app;
}
export function errorHandler(
  error: any,
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  const status =
    error instanceof AppError
      ? error.status
      : error instanceof ZodError
        ? 422
        : error.code === "23505"
          ? 409
          : error.type === "entity.too.large"
            ? 413
            : 500;
  const message =
    error instanceof AppError
      ? error.message
      : error instanceof ZodError
        ? "Check the highlighted fields."
        : error.code === "23505"
          ? "This record or account already exists."
          : status === 413
            ? "The upload exceeds the permitted size."
            : "The service could not complete this request. Your change was not committed.";
  if (status === 500)
    console.error(
      "Request failed:",
      error.code || error.name,
      "requestId:",
      res.getHeader("X-Request-Id"),
    );
  res.status(status).json({
    code:
      error instanceof AppError
        ? error.code
        : error instanceof ZodError
          ? "VALIDATION_ERROR"
          : status === 409
            ? "CONFLICT"
            : "SERVICE_ERROR",
    message,
    requestId: res.getHeader("X-Request-Id"),
    retryable: status >= 500,
    fieldErrors:
      error instanceof ZodError
        ? error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          }))
        : undefined,
  });
}
