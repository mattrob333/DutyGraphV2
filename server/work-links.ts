import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { schemas } from "../shared/domain.ts";
import {
  workLinkPlanSchema,
  workLinkInstructions,
} from "../shared/work-link-plan.ts";
import { defaultAiModel, modelGenerationOptions } from "../shared/ai-models.ts";
import { advisor, type AuthRequest } from "./auth.ts";
import {
  command,
  tx,
  companyCheck,
  hash,
  fail,
  audit,
  AppError,
} from "./db.ts";
import { createOrEdit } from "./records.ts";
import { providerConfig } from "./providers.ts";
export type WorkLinkProvider = (
  input: any,
  key: string,
  model: string,
) => Promise<unknown>;
const openAiWorkLinks: WorkLinkProvider = async (input, key, model) => {
  const schema = z.toJSONSchema(workLinkPlanSchema);
  delete schema.$schema;
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(105000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      ...modelGenerationOptions(model, "medium"),
      instructions: workLinkInstructions,
      input: JSON.stringify(input),
      text: {
        format: {
          type: "json_schema",
          name: "work_links",
          strict: true,
          schema,
        },
      },
    }),
  });
  if (!r.ok) {
    await r.body?.cancel();
    throw new AppError(
      502,
      "WORK_LINK_PROVIDER",
      `AI returned HTTP ${r.status}. Check Workspace settings.`,
    );
  }
  const reader = r.body?.getReader();
  if (!reader) throw new Error("No provider response");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 1500000) {
      await reader.cancel();
      throw new Error("Provider response too large");
    }
    chunks.push(part.value);
  }
  const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (payload.status !== "completed") throw new Error("AI did not finish");
  return JSON.parse(
    (payload.output || [])
      .flatMap((o: any) => o.content || [])
      .filter((c: any) => c.type === "output_text")
      .map((c: any) => c.text)
      .join(""),
  );
};
export function validateWorkLinks(value: unknown, input: any) {
  const plan = workLinkPlanSchema.parse(value),
    ids = new Set(plan.assignments.map((a) => a.recordId));
  if (
    ids.size !== plan.assignments.length ||
    ids.size !== input.targets.length ||
    input.targets.some((r: any) => !ids.has(r.id))
  )
    fail(
      502,
      "WORK_LINK_TARGETS",
      "AI must cover each supplied work record exactly once.",
    );
  for (const a of plan.assignments) {
    if (
      a.businessStageLinks.some(
        (l) =>
          !input.profile.streams.some(
            (s: any) =>
              s.id === l.streamId &&
              s.stages.some((stage: any) => stage.id === l.stageId),
          ),
      )
    )
      fail(502, "WORK_LINK_STAGE", "AI returned an unknown stage.");
    if (
      [a.ownerId, a.performerId].some(
        (id) => id && !input.people.some((p: any) => p.id === id),
      )
    )
      fail(502, "WORK_LINK_PERSON", "AI returned an unknown person.");
    if (a.dutyId && !input.duties.some((d: any) => d.id === a.dutyId))
      fail(502, "WORK_LINK_DUTY", "AI returned an unknown duty.");
  }
  return plan;
}
export function workLinksRouter(provider: WorkLinkProvider = openAiWorkLinks) {
  const router = Router({ mergeParams: true });
  router.use(advisor);
  router.get("/", async (req, res) => {
    const u = (req as AuthRequest).actor;
    res.json(
      await tx(u.tenant_id, async (db) => {
        const c = await companyCheck(
          db,
          u,
          z.uuid().parse((req.params as any).companyId),
        );
        await db.query(
          "UPDATE provider_jobs SET state='unknown',message='The run ended without a confirmed result. Check provider usage before retrying.',finished_at=now() WHERE company_id=$1 AND kind='work_links' AND state='running' AND created_at<now()-interval '5 minutes'",
          [c.id],
        );
        return (
          (
            await db.query(
              "SELECT id,state,message,result FROM provider_jobs WHERE company_id=$1 AND kind='work_links' ORDER BY created_at DESC LIMIT 1",
              [c.id],
            )
          ).rows[0] || null
        );
      }),
    );
  });
  router.post("/", async (req, res) => {
    const u = (req as AuthRequest).actor,
      cid = z.uuid().parse((req.params as any).companyId);
    z.object({ consent: z.literal(true) })
      .strict()
      .parse(req.body);
    let input: any,
      key = "",
      model = "";
    const job = await command(
      u,
      req.header("Idempotency-Key"),
      { path: req.originalUrl, body: req.body },
      async (db) => {
        const c = await companyCheck(db, u, cid);
        if (!c.settings.businessProfile?.streams?.length)
          fail(
            422,
            "PROFILE_REQUIRED",
            "Save the company stages in Discovery first.",
          );
        await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          `work-links:${u.tenant_id}`,
        ]);
        const runs = (
          await db.query(
            "SELECT state,created_at FROM provider_jobs WHERE kind='work_links' AND created_at>now()-interval '24 hours'",
          )
        ).rows;
        if (
          runs.some(
            (r) =>
              r.state === "running" &&
              Date.now() - new Date(r.created_at).getTime() < 180000,
          )
        )
          fail(
            409,
            "WORK_LINK_RUNNING",
            "A work-map run is already in progress. Check its result shortly.",
          );
        if (runs.length >= 30)
          fail(
            429,
            "WORK_LINK_LIMIT",
            "The daily work-map limit has been reached.",
          );
        const records = (
          await db.query(
            "SELECT * FROM records WHERE company_id=$1 AND state NOT IN ('retracted','withdrawn','superseded','stale')",
            [cid],
          )
        ).rows;
        const targets = records.filter(
          (r) =>
            ["duty", "task"].includes(r.kind) &&
            !(r.data.businessStageLinks || []).length,
        );
        if (!targets.length)
          fail(
            422,
            "NO_UNLINKED_WORK",
            "The existing work already has stage links.",
          );
        if (targets.length > 150)
          fail(
            422,
            "WORK_LINK_SIZE",
            "Link a smaller group of work before running again (150 record limit).",
          );
        const config = await providerConfig(u.tenant_id, "openai", db);
        if (!config.configured)
          fail(
            503,
            "AI_NOT_CONFIGURED",
            "Add your OpenAI key in Workspace settings.",
          );
        key = config.key;
        model = config.config.model || defaultAiModel;
        input = {
          profile: c.settings.businessProfile,
          versions: records.map((r) => ({
            id: r.id,
            version: r.version,
            state: r.state,
            hash: r.hash,
          })),
          targets,
          people: records
            .filter((r) => r.kind === "person")
            .map((r) => ({
              id: r.id,
              name: r.title,
              role: r.data.role,
              team: r.data.team,
            })),
          duties: records
            .filter((r) => r.kind === "duty")
            .map((r) => ({ id: r.id, title: r.title, ...r.data })),
        };
        const id = randomUUID();
        await db.query(
          "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'work_links','running',$4)",
          [id, u.tenant_id, cid, input],
        );
        return { id };
      },
    );
    if (input) {
      try {
        const plan = validateWorkLinks(
          await provider(input, key, model),
          input,
        );
        await tx(u.tenant_id, async (db) => {
          await db.query("SELECT id FROM companies WHERE id=$1 FOR UPDATE", [
            cid,
          ]);
          const c = await companyCheck(db, u, cid);
          if (hash(c.settings.businessProfile) !== hash(input.profile))
            fail(
              409,
              "WORK_LINK_STALE",
              "Business stages changed. Run again using the updated stages.",
            );
          const records = (
            await db.query(
              "SELECT * FROM records WHERE company_id=$1 FOR UPDATE",
              [cid],
            )
          ).rows;
          for (const old of input.versions) {
            const current = records.find((r) => r.id === old.id);
            if (
              current?.version !== old.version ||
              current?.state !== old.state ||
              current?.hash !== old.hash
            )
              fail(
                409,
                "WORK_LINK_STALE",
                "Work changed while the AI was linking it. Your changes are preserved; run again.",
              );
          }
          let linked = 0;
          const unresolved: string[] = [];
          for (const a of plan.assignments) {
            let r = records.find((r) => r.id === a.recordId);
            const shape = schemas[r.kind as "duty" | "task"].shape;
            const data = Object.fromEntries(
              Object.keys(shape)
                .filter((k) => k in r.data)
                .map((k) => [k, r.data[k]]),
            );
            if (!a.businessStageLinks.length) {
              unresolved.push(r.title);
              continue;
            }
            data.businessStageLinks = a.businessStageLinks;
            data.stageInference = {
              reason: a.reason,
              confidence: a.confidence,
            };
            if (r.state === "proposed") {
              if (!data.ownerId && a.ownerId) data.ownerId = a.ownerId;
              if (r.kind === "task" && !data.performerId && a.performerId)
                data.performerId = a.performerId;
            }
            r = await createOrEdit(db, u, cid, r.kind, data, r);
            records[records.findIndex((x) => x.id === r.id)] = r;
            linked++;
            if (r.kind === "task" && a.dutyId) {
              const d = records.find((d) => d.id === a.dutyId);
              const vals = Object.fromEntries(
                Object.keys(schemas.duty.shape)
                  .filter((k) => k in d.data)
                  .map((k) => [k, d.data[k]]),
              );
              if (!(d.data.taskIds || []).includes(r.id)) {
                const next = await createOrEdit(
                  db,
                  u,
                  cid,
                  "duty",
                  { ...vals, taskIds: [...(d.data.taskIds || []), r.id] },
                  d,
                );
                records[records.findIndex((x) => x.id === d.id)] = next;
              }
            }
          }
          const result = { linked, unresolved, plan };
          await db.query(
            "UPDATE provider_jobs SET state='complete',result=$2,finished_at=now(),message='Work map connected. AI inferences can be edited.' WHERE id=$1",
            [job.id, result],
          );
          await audit(db, u, cid, "work_map.inferred", null, {
            jobId: job.id,
            linked,
          });
        });
      } catch (e) {
        await tx(u.tenant_id, (db) =>
          db.query(
            "UPDATE provider_jobs SET state='failed',message=$2,finished_at=now() WHERE id=$1",
            [
              job.id,
              e instanceof AppError
                ? e.message
                : "AI linking did not finish. Existing work is unchanged. Check provider usage before trying again.",
            ],
          ),
        );
      }
    }
    res.json(
      await tx(
        u.tenant_id,
        async (db) =>
          (
            await db.query(
              "SELECT id,state,message,result FROM provider_jobs WHERE id=$1",
              [job.id],
            )
          ).rows[0],
      ),
    );
  });
  return router;
}
