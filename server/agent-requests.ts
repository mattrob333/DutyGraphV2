import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AuthRequest } from "./auth.ts";
import { advisor } from "./auth.ts";
import {
  audit,
  command,
  companyCheck,
  fail,
  getRecord,
  hash,
  putRecord,
  tx,
  AppError,
} from "./db.ts";
import {
  agentRequestSchema,
  authorityRequirements,
  bindingsCurrent,
} from "../shared/agent-request.ts";
import {
  openAiDraft,
  validateDraft,
  type AiProvider,
  type AiInput,
} from "./ai.ts";
import { providerConfig } from "./providers.ts";
import { defaultAiModel } from "../shared/ai-models.ts";
import type { User } from "../shared/domain.ts";
import { DemoAuthorityAdapter } from "./authority-demo.ts";
import {
  demoScopes,
  demoScenarios,
  evaluateAuthority,
} from "../shared/authority-demo.ts";

const binding = (r: any) => ({ id: r.id, version: r.version, hash: r.hash });
async function owned(db: any, u: User, c: string, id: string) {
  await companyCheck(db, u, c);
  const r = await getRecord(db, c, id);
  if (
    r.kind !== "agent_request" ||
    (u.role !== "advisor" && r.data.requesterUserId !== u.id)
  )
    fail(404, "NOT_FOUND", "Agent request not found.");
  return r;
}
async function context(db: any, c: string, r: any) {
  const person = await getRecord(db, c, r.data.personId);
  if (person.kind !== "person" || ["retracted", "stale"].includes(person.state))
    fail(
      422,
      "PERSON_UNAVAILABLE",
      "Review the person's current record first.",
    );
  const tasks = [];
  for (const id of r.data.taskIds) {
    const t = await getRecord(db, c, id);
    if (t.kind !== "task" || ["retracted", "stale"].includes(t.state))
      fail(422, "TASK_UNAVAILABLE", "Review the current task records first.");
    if (![t.data.ownerId, t.data.performerId].includes(person.id))
      fail(
        422,
        "TASK_OWNER_CHANGED",
        "The person is no longer linked to this task. Submit a corrected request.",
      );
    tasks.push(t);
  }
  return { person, tasks };
}
function manifest(r: any, person: any, tasks: any[], ai: any = null) {
  return {
    schema: "dutygraph.agent-manifest.draft.v1",
    authority: "proposal_only",
    executable: false,
    requestId: r.id,
    requestInputHash: hash(agentRequestSchema.parse(r.data.input)),
    owner: {
      ...binding(person),
      name: person.title,
      role: person.data.role,
      department: person.data.team,
      basis: "Company record; IAM verification pending",
    },
    taskBindings: tasks.map(binding),
    purpose: r.data.purpose,
    tasks: tasks.map((t) => ({
      ...binding(t),
      title: t.title,
      instructions: t.data.aiPrompt || t.data.instructions,
      humanCheckpoint: t.data.humanGate,
    })),
    requestedScopes: r.data.requestedScopes,
    grantedScopes: [],
    humanCheckpoint: r.data.humanCheckpoint,
    missingAuthority: authorityRequirements.map((x) => x.key),
    agentIdentity: null,
    runtime: null,
    expiresAt: null,
    approval: null,
    aiSuggestion: ai,
  };
}
export function agentRequestsRouter(provider: AiProvider = openAiDraft) {
  const router = Router({ mergeParams: true });
  const user = (req: any) => (req as AuthRequest).actor;
  const company = (req: any) => z.uuid().parse(req.params.companyId);
  const id = (req: any) => z.uuid().parse(req.params.requestId);
  const mutate = (req: any, fn: any) =>
    command(
      user(req),
      req.header("Idempotency-Key"),
      { path: req.originalUrl, body: req.body },
      fn,
    );
  router.get("/", async (req, res) => {
    const u = user(req),
      c = company(req);
    res.json(
      await tx(u.tenant_id, async (db) => {
        const companyRecord = await companyCheck(db, u, c);
        const records = (
          await db.query(
            "SELECT * FROM records WHERE company_id=$1 AND kind=ANY($2::text[]) ORDER BY created_at DESC,id LIMIT 2000",
            [c, ["person", "task", "agent_request"]],
          )
        ).rows;
        const people = records.filter(
          (r) =>
            r.kind === "person" &&
            !["retracted", "stale"].includes(r.state) &&
            (u.role === "advisor" || r.id === u.person_id),
        );
        const tasks = records.filter(
          (r) =>
            r.kind === "task" &&
            !["retracted", "stale"].includes(r.state) &&
            (u.role === "advisor" ||
              [r.data.ownerId, r.data.performerId].includes(u.person_id)),
        );
        const requests = records
          .filter(
            (r) =>
              r.kind === "agent_request" &&
              (u.role === "advisor" || r.data.requesterUserId === u.id),
          )
          .map((r) => ({
            ...r,
            manifestCurrent:
              !!r.data.manifest &&
              bindingsCurrent(
                [r.data.manifest.owner, ...r.data.manifest.taskBindings],
                records,
              ),
          }));
        return {
          demoAvailable:
            companyRecord.sandbox === true &&
            companyRecord.name === "Cobalt Industrial Supply",
          people: people.map((p) => ({
            id: p.id,
            title: p.title,
            role: p.data.role,
            department: p.data.team,
          })),
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            ownerId: t.data.ownerId,
            performerId: t.data.performerId,
          })),
          requests,
          authorityChecks: authorityRequirements.map((x) => ({
            ...x,
            status: "Not connected",
          })),
          aiConfigured:
            u.role === "advisor" &&
            (await providerConfig(u.tenant_id, "openai", db)).configured,
          issuanceReady: false,
        };
      }),
    );
  });
  router.post("/demo", advisor, async (req, res) => {
    const u = user(req),
      c = company(req),
      d = z
        .object({ scenario: z.enum(demoScenarios) })
        .strict()
        .parse(req.body);
    res.status(201).json(
      await mutate(req, async (db: any) => {
        const co = await companyCheck(db, u, c);
        if (co.sandbox !== true || co.name !== "Cobalt Industrial Supply")
          fail(
            403,
            "DEMO_ONLY",
            "This example is available only in the fictional Cobalt company.",
          );
        const person = (
          await db.query(
            "SELECT * FROM records WHERE company_id=$1 AND kind='person' AND title='Tariq Ali' AND state NOT IN ('retracted','stale') ORDER BY id LIMIT 1",
            [c],
          )
        ).rows[0];
        if (!person)
          fail(
            422,
            "DEMO_PERSON_MISSING",
            "The sample needs Tariq Ali's person record.",
          );
        const tasks = (
          await db.query(
            "SELECT * FROM records WHERE company_id=$1 AND kind='task' AND title='Create draft supplier record' AND (data->>'ownerId'=$2 OR data->>'performerId'=$2) AND state NOT IN ('retracted','stale') LIMIT 1",
            [c, person.id],
          )
        ).rows;
        if (!tasks.length)
          fail(
            422,
            "DEMO_TASK_MISSING",
            "The sample needs Tariq's supplier draft task.",
          );
        const input = agentRequestSchema.parse({
          title: `Supplier assistant · ${d.scenario} demo`,
          personId: person.id,
          taskIds: tasks.map((t: any) => t.id),
          purpose:
            "Prepare supplier drafts from the submitted packet and flag missing information for human review.",
          requestedScopes: demoScopes,
          humanCheckpoint:
            "Maya Chen reviews every draft. Stop before activation, bank changes or payment.",
        });
        return putRecord(
          db,
          u,
          c,
          "agent_request",
          input.title,
          {
            ...input,
            input,
            requesterUserId: u.id,
            requesterName: u.name,
            simulation: true,
            scenario: d.scenario,
            manifest: null,
            manifestHash: null,
            review: null,
          },
          "requested",
        );
      }),
    );
  });
  router.post("/", async (req, res) => {
    const u = user(req),
      c = company(req),
      d = agentRequestSchema.parse(req.body);
    res.status(201).json(
      await mutate(req, async (db: any) => {
        await companyCheck(db, u, c);
        if (
          u.role !== "advisor" &&
          (u.company_id !== c || u.person_id !== d.personId)
        )
          fail(
            403,
            "REQUEST_OWNER",
            "You can request an agent only for yourself.",
          );
        const draft = { data: d };
        await context(db, c, draft);
        return putRecord(
          db,
          u,
          c,
          "agent_request",
          d.title,
          {
            ...d,
            input: d,
            requesterUserId: u.id,
            requesterName: u.name,
            manifest: null,
            manifestHash: null,
            review: null,
          },
          "requested",
        );
      }),
    );
  });
  router.post("/:requestId/manifest", advisor, async (req, res) => {
    const u = user(req),
      c = company(req),
      d = z
        .object({ expectedVersion: z.number().int().positive() })
        .strict()
        .parse(req.body);
    res.json(
      await mutate(req, async (db: any) => {
        const r = await owned(db, u, c, id(req));
        if (r.version !== d.expectedVersion)
          fail(
            409,
            "VERSION_CONFLICT",
            "Refresh the request before preparing a manifest.",
          );
        if (r.state === "withdrawn")
          fail(422, "WITHDRAWN", "This request was withdrawn.");
        const { person, tasks } = await context(db, c, r);
        const m = manifest(r, person, tasks);
        if (r.data.simulation === true) {
          const co = await companyCheck(db, u, c);
          if (!co.sandbox || co.name !== "Cobalt Industrial Supply")
            fail(
              403,
              "DEMO_ONLY",
              "Sample context is not valid in a real company.",
            );
          const authority = await new DemoAuthorityAdapter(
            person,
            r.data.scenario,
          ).collect(person.id);
          Object.assign(m, {
            simulation: true,
            authorityContext: authority,
            scopeEvaluation: evaluateAuthority(
              authority,
              r.data.requestedScopes,
            ),
            instructions: authority.policy.instructions,
          });
        }
        return putRecord(
          db,
          u,
          c,
          "agent_request",
          r.title,
          {
            ...r.data,
            manifest: m,
            manifestHash: hash(m),
            review: null,
            demoReview: null,
            demoIssuance: null,
          },
          "manifest_draft",
          r,
          "Prepared a manifest; prior business reviews do not apply",
        );
      }),
    );
  });
  router.post("/:requestId/ai-draft", advisor, async (req, res) => {
    const u = user(req),
      c = company(req),
      d = z
        .object({
          expectedVersion: z.number().int().positive(),
          consent: z.literal(true),
        })
        .strict()
        .parse(req.body);
    let input: AiInput | undefined,
      key = "",
      model = "",
      source: any;
    const job: any = await mutate(req, async (db: any) => {
      const r = await owned(db, u, c, id(req));
      if (r.version !== d.expectedVersion || r.state === "withdrawn")
        fail(409, "VERSION_CONFLICT", "Refresh this request first.");
      if (r.data.simulation)
        fail(
          422,
          "DEMO_AI",
          "Use Prepare manifest for this deterministic simulation. No paid AI call is needed.",
        );
      const config = await providerConfig(u.tenant_id, "openai", db);
      if (!config.configured)
        fail(
          503,
          "AI_NOT_CONFIGURED",
          "Configure OpenAI in Workspace settings to draft with AI. You can prepare a structured manifest without AI.",
        );
      const count = (
        await db.query(
          "SELECT count(*)::int AS n FROM provider_jobs WHERE kind='ai_draft' AND created_at>now()-interval '24 hours'",
        )
      ).rows[0].n;
      if (count >= 10)
        fail(
          429,
          "AI_LIMIT",
          "This account reached its limit of 10 AI attempts in 24 hours.",
        );
      const { person, tasks } = await context(db, c, r);
      source = { r, person, tasks };
      input = {
        mode: "agent_manifest",
        company: (await companyCheck(db, u, c)).name,
        sources: [r, person, ...tasks].map((x) => ({
          ...binding(x),
          title: x.title,
          state: x.state,
          locator: "DutyGraph record",
          text: JSON.stringify(x === r ? r.data.input : x.data).slice(0, 4000),
          excerpted:
            JSON.stringify(x === r ? r.data.input : x.data).length > 4000,
        })),
        reasoning: config.config.reasoning,
      };
      key = config.key;
      model = config.config.model || defaultAiModel;
      const jobId = randomUUID();
      await db.query(
        "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'ai_draft','running',$4)",
        [jobId, u.tenant_id, c, { ...input, model, requestId: r.id }],
      );
      await audit(db, u, c, "agent_request.ai_reserved", r.id, {
        jobId,
        version: r.version,
      });
      return { id: jobId };
    });
    let message =
      "This attempt was already reserved. Refresh to see a completed manifest; no duplicate AI call was made.";
    if (input) {
      let result: any = null,
        state = "complete";
      try {
        const output = await provider(input, key, model);
        const draft = validateDraft(output.draft, input);
        result = { ...output, draft };
        await command(
          u,
          `apply-agent-ai:${job.id}`,
          { jobId: job.id },
          async (db) => {
            const r = await owned(db, u, c, source.r.id),
              { person, tasks } = await context(db, c, r);
            if (
              r.version !== source.r.version ||
              !bindingsCurrent(
                [binding(source.person), ...source.tasks.map(binding)],
                [person, ...tasks],
              )
            )
              fail(
                409,
                "STALE_AI",
                "The request or its source records changed. The AI draft was not applied.",
              );
            const m = manifest(r, person, tasks, {
              ...result,
              jobId: job.id,
              model,
            });
            await putRecord(
              db,
              u,
              c,
              "agent_request",
              r.title,
              {
                ...r.data,
                manifest: m,
                manifestHash: hash(m),
                review: null,
                demoReview: null,
                demoIssuance: null,
              },
              "manifest_draft",
              r,
              "Prepared an unverified AI manifest draft",
            );
          },
        );
        message =
          "AI draft saved. Requested scopes remain proposals. Review its instructions and evidence gaps.";
      } catch (e) {
        state = e instanceof AppError ? "failed" : "unknown";
        message =
          e instanceof AppError
            ? e.message
            : "The AI result could not be verified. No automatic retry was made. Check provider usage before retrying.";
      }
      await tx(u.tenant_id, async (db) => {
        await db.query(
          "UPDATE provider_jobs SET state=$2,result=$3,message=$4,finished_at=now() WHERE id=$1",
          [job.id, state, result, message],
        );
        await audit(db, u, c, `agent_request.ai_${state}`, source.r.id, {
          jobId: job.id,
        });
      });
    }
    res.json({ ...job, message });
  });
  router.post("/:requestId/review", advisor, async (req, res) => {
    const u = user(req),
      c = company(req),
      d = z
        .object({
          expectedVersion: z.number().int().positive(),
          manifestHash: z.string().length(64),
          decision: z.enum(["reviewed", "changes_requested"]),
          note: z.string().trim().min(3).max(2000),
        })
        .strict()
        .parse(req.body);
    res.json(
      await mutate(req, async (db: any) => {
        const r = await owned(db, u, c, id(req));
        if (
          r.version !== d.expectedVersion ||
          r.data.manifestHash !== d.manifestHash
        )
          fail(409, "VERSION_CONFLICT", "Review the current manifest version.");
        if (!r.data.manifest || r.state === "withdrawn")
          fail(422, "MANIFEST_REQUIRED", "Prepare a current manifest first.");
        if (r.data.requesterUserId === u.id)
          fail(
            403,
            "INDEPENDENT_REVIEW",
            "A different advisor must review this request.",
          );
        const { person, tasks } = await context(db, c, r);
        if (
          person.data.email?.toLowerCase() === u.email.toLowerCase() ||
          u.person_id === person.id
        )
          fail(
            403,
            "INDEPENDENT_REVIEW",
            "The proposed agent owner cannot review their own request.",
          );
        if (
          !bindingsCurrent(
            [r.data.manifest.owner, ...r.data.manifest.taskBindings],
            [person, ...tasks],
          )
        )
          fail(
            409,
            "STALE_MANIFEST",
            "The person's role or task changed. Prepare a fresh manifest.",
          );
        return putRecord(
          db,
          u,
          c,
          "agent_request",
          r.title,
          {
            ...r.data,
            review: {
              actorId: u.id,
              actorName: u.name,
              manifestHash: d.manifestHash,
              decision: d.decision,
              note: d.note,
              at: new Date().toISOString(),
              type: "business_review_not_authority_grant",
            },
          },
          d.decision,
          r,
          "Recorded independent business review; no access granted",
        );
      }),
    );
  });
  router.post("/:requestId/withdraw", async (req, res) => {
    const u = user(req),
      c = company(req),
      d = z
        .object({ expectedVersion: z.number().int().positive() })
        .strict()
        .parse(req.body);
    res.json(
      await mutate(req, async (db: any) => {
        const r = await owned(db, u, c, id(req));
        if (r.version !== d.expectedVersion)
          fail(409, "VERSION_CONFLICT", "Refresh this request first.");
        return putRecord(
          db,
          u,
          c,
          "agent_request",
          r.title,
          r.data,
          "withdrawn",
          r,
          "Withdrawn request; no runtime identity was issued",
        );
      }),
    );
  });
  router.get("/:requestId/manifest", async (req, res) => {
    const u = user(req),
      c = company(req);
    res.json(
      await tx(u.tenant_id, async (db) => {
        const r = await owned(db, u, c, id(req));
        if (!r.data.manifest)
          fail(422, "MANIFEST_REQUIRED", "Prepare a manifest first.");
        const { person, tasks } = await context(db, c, r);
        return {
          manifest: r.data.manifest,
          manifestHash: r.data.manifestHash,
          review: r.data.review,
          current: bindingsCurrent(
            [r.data.manifest.owner, ...r.data.manifest.taskBindings],
            [person, ...tasks],
          ),
          warning: "Draft review package. Not an executable Signet grant.",
        };
      }),
    );
  });
  router.post("/:requestId/issue", advisor, async (req, res) => {
    const u = user(req),
      c = company(req);
    z.object({}).strict().parse(req.body);
    await tx(u.tenant_id, (db) => owned(db, u, c, id(req)));
    res
      .status(503)
      .json({
        code: "ISSUANCE_NOT_CONFIGURED",
        message:
          "Connect and verify identity, delegation policy, a designated notary and Signet/runtime before issuance. No identity, credential or access grant was created.",
      });
  });
  router.post("/:requestId/simulate", advisor, async (req, res) => {
    const u = user(req),
      c = company(req),
      d = z
        .object({
          expectedVersion: z.number().int().positive(),
          manifestHash: z.string().length(64),
          action: z.enum(["review", "issue"]),
        })
        .strict()
        .parse(req.body);
    res.json(
      await mutate(req, async (db: any) => {
        const co = await companyCheck(db, u, c),
          r = await owned(db, u, c, id(req));
        if (
          !co.sandbox ||
          co.name !== "Cobalt Industrial Supply" ||
          r.data.simulation !== true
        )
          fail(
            403,
            "DEMO_ONLY",
            "Simulation is restricted to the Cobalt example.",
          );
        if (
          r.version !== d.expectedVersion ||
          r.data.manifestHash !== d.manifestHash ||
          !r.data.manifest ||
          r.state === "withdrawn"
        )
          fail(409, "VERSION_CONFLICT", "Prepare the current manifest first.");
        const { person, tasks } = await context(db, c, r),
          m = r.data.manifest;
        if (!bindingsCurrent([m.owner, ...m.taskBindings], [person, ...tasks]))
          fail(
            409,
            "STALE_MANIFEST",
            "Source records changed. Rebuild the manifest.",
          );
        const evaluation = evaluateAuthority(
          m.authorityContext,
          r.data.requestedScopes,
        );
        if (evaluation.blockers.length || !evaluation.eligibleScopes.length)
          fail(
            422,
            "DEMO_BLOCKED",
            evaluation.blockers.join(" ") || "No scope is eligible.",
          );
        if (
          d.action === "issue" &&
          (r.state !== "demo_reviewed" ||
            r.data.demoReview?.manifestHash !== d.manifestHash)
        )
          fail(422, "REVIEW_REQUIRED", "Simulate the notary review first.");
        const event = {
          simulation: true,
          manifestHash: d.manifestHash,
          at: new Date().toISOString(),
          actorId: u.id,
          notary: m.authorityContext.policy.notary,
          eligibleScopes: evaluation.eligibleScopes,
        };
        return putRecord(
          db,
          u,
          c,
          "agent_request",
          r.title,
          {
            ...r.data,
            ...(d.action === "review"
              ? { demoReview: event, demoIssuance: null }
              : {
                  demoIssuance: {
                    ...event,
                    executable: false,
                    credential: null,
                    expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(),
                  },
                }),
          },
          d.action === "review" ? "demo_reviewed" : "demo_issued",
          r,
          "Simulation only; no signature, credential or access grant created",
        );
      }),
    );
  });
  return router;
}
