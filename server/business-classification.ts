import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { companyProfileReviewSchema } from "../shared/company-profile.ts";
import { advisor, type AuthRequest } from "./auth.ts";
import {
  tx,
  command,
  companyCheck,
  audit,
  fail,
  AppError,
  hash,
} from "./db.ts";
import { providerConfig } from "./providers.ts";
import { exaSearch, type ResearchProvider } from "./research.ts";
import { defaultAiModel, modelGenerationOptions } from "../shared/ai-models.ts";
import {
  classificationIntake,
  classificationGenerationDraft,
  classificationInstructions,
  validateClassification,
  type ClassificationInput,
} from "../shared/business-classification.ts";

export type ClassificationProvider = (
  input: ClassificationInput,
  key: string,
  model: string,
) => Promise<unknown>;
export const openAiClassification: ClassificationProvider = async (
  input,
  key,
  model,
) => {
  const schema = z.toJSONSchema(classificationGenerationDraft);
  delete schema.$schema;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(90000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      ...modelGenerationOptions(model, "medium"),
      instructions: classificationInstructions,
      input: JSON.stringify(input),
      text: {
        format: {
          type: "json_schema",
          name: "business_classification",
          strict: true,
          schema,
        },
      },
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError(
      502,
      "CLASSIFICATION_PROVIDER",
      `OpenAI returned HTTP ${response.status}. Check your API key and billing in Workspace settings.`,
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing AI response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 500000) throw new Error("AI response exceeded the size limit");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (payload.status !== "completed")
    throw new Error("AI response did not complete");
  return JSON.parse(
    (payload.output || [])
      .flatMap((o: any) => o.content || [])
      .filter((c: any) => c.type === "output_text")
      .map((c: any) => c.text)
      .join(""),
  );
};

export function businessClassificationRouter(
  provider: ClassificationProvider = openAiClassification,
  researchOverride?: ResearchProvider,
) {
  const router = Router({ mergeParams: true });
  router.use(advisor);
  const actor = (req: any) => (req as AuthRequest).actor;
  const companyId = (req: any) => z.uuid().parse(req.params.companyId);
  router.get("/", async (req, res) =>
    res.json(
      await tx(actor(req).tenant_id, async (db) => {
        const company = await companyCheck(db, actor(req), companyId(req));
        await db.query(
          "UPDATE provider_jobs SET state='unknown',message='The previous analysis did not finish. Review provider usage before trying again.' WHERE company_id=$1 AND kind='business_classification' AND state='running' AND created_at<now()-interval '5 minutes'",
          [company.id],
        );
        const jobs = (
          await db.query(
            "SELECT id,state,input,result,message,created_at FROM provider_jobs WHERE company_id=$1 AND kind='business_classification' ORDER BY created_at DESC LIMIT 5",
            [company.id],
          )
        ).rows;
        return {
          configured: (await providerConfig(actor(req).tenant_id, "openai", db))
            .configured,
          researchConfigured:
            !!researchOverride ||
            (await providerConfig(actor(req).tenant_id, "exa", db)).configured,
          jobs,
          latestBrief:
            (
              await db.query(
                "SELECT id,state,input,result,created_at FROM provider_jobs WHERE company_id=$1 AND kind='business_classification' AND state='complete' AND result->'draft'->'brief' IS NOT NULL ORDER BY created_at DESC LIMIT 1",
                [company.id],
              )
            ).rows[0] || null,
        };
      }),
    ),
  );
  router.put("/review", async (req, res) => {
    const body = companyProfileReviewSchema
      .extend({ expectedRevision: z.number().int().min(0) })
      .strict()
      .parse(req.body);
    res.json(
      await command(
        actor(req),
        req.header("Idempotency-Key"),
        { path: req.originalUrl, method: req.method, body },
        async (db) => {
          const company = await companyCheck(db, actor(req), companyId(req));
          const job = (
            await db.query(
              "SELECT id FROM provider_jobs WHERE id=$1 AND company_id=$2 AND kind='business_classification' AND state='complete' AND result->'draft'->'brief' IS NOT NULL",
              [body.jobId, company.id],
            )
          ).rows[0];
          if (!job) fail(404, "NOT_FOUND", "Company research not found.");
          const { expectedRevision, ...fields } = body;
          const review = { ...fields, reviewedAt: new Date().toISOString() };
          const updated = (
            await db.query(
              "UPDATE companies SET settings=settings || $1::jsonb,revision=revision+1 WHERE id=$2 AND revision=$3 RETURNING *",
              [
                JSON.stringify({ companyResearchReview: review }),
                company.id,
                expectedRevision,
              ],
            )
          ).rows[0];
          if (!updated)
            fail(
              409,
              "VERSION_CONFLICT",
              "The company changed. Refresh before saving your review.",
            );
          await audit(
            db,
            actor(req),
            company.id,
            "company.research_review_saved",
            null,
            {
              previous: company.settings.companyResearchReview || null,
              review,
            },
          );
          return updated;
        },
      ),
    );
  });
  router.post("/", async (req, res) => {
    const body = classificationIntake
      .extend({
        expectedRevision: z.number().int().min(0),
        consent: z.literal(true),
        researchRunIds: z.array(z.uuid()).max(4).optional(),
      })
      .strict()
      .parse(req.body);
    let input: ClassificationInput | undefined,
      key = "",
      model = "",
      researchKey = "",
      lookup = false,
      researchId = "";
    const job = await command(
      actor(req),
      req.header("Idempotency-Key"),
      { path: req.originalUrl, method: req.method, body: req.body },
      async (db) => {
        const company = await companyCheck(db, actor(req), companyId(req));
        if (company.revision !== body.expectedRevision)
          fail(
            409,
            "VERSION_CONFLICT",
            "The company changed. Refresh before analyzing it.",
          );
        const config = await providerConfig(actor(req).tenant_id, "openai", db);
        if (!config.configured)
          fail(
            503,
            "AI_NOT_CONFIGURED",
            "Add and enable your OpenAI key in Workspace settings to suggest the business type.",
          );
        const research = await providerConfig(actor(req).tenant_id, "exa", db);
        lookup =
          body.researchRunIds === undefined &&
          !!body.website &&
          (!!researchOverride || research.configured);
        const collected: ClassificationInput["sources"] = [];
        for (const id of body.researchRunIds || []) {
          const run = (
            await db.query(
              "SELECT results,query,domain FROM research_runs WHERE id=$1 AND company_id=$2 AND state='complete'",
              [id, company.id],
            )
          ).rows[0];
          if (!run)
            fail(
              422,
              "RESEARCH_NOT_READY",
              "A selected research result is unavailable for this company.",
            );
          for (const [index, source] of run.results.slice(0, 5).entries()) {
            if (collected.length < 20)
              collected.push({
                id: `research:${id}:${index}`,
                title: String(source.title).slice(0, 200),
                text: String(source.text).slice(0, 6000),
                url: source.url,
                retrievedAt: source.retrievedAt,
                publishedDate: source.publishedDate,
                focus: run.domain ? "official company website" : "public web",
              });
          }
        }
        if (!body.description && !lookup && !collected.length)
          fail(
            422,
            "DESCRIPTION_REQUIRED",
            "Add a short description, or enable Exa research in Workspace settings to read the website.",
          );
        await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          `classification-quota:${actor(req).tenant_id}`,
        ]);
        const counts = (
          await db.query(
            "SELECT count(*)::int AS n, count(*) FILTER (WHERE state='running' AND created_at>now()-interval '5 minutes' AND company_id=$1)::int AS active FROM provider_jobs WHERE kind='business_classification' AND created_at>now()-interval '24 hours'",
            [company.id],
          )
        ).rows[0];
        if (counts.active)
          fail(
            409,
            "CLASSIFICATION_RUNNING",
            "A business analysis is already running. Refresh its status.",
          );
        if (counts.n >= 10)
          fail(
            429,
            "CLASSIFICATION_LIMIT",
            "This account has used its ten business analyses for the rolling 24-hour window.",
          );
        if (lookup) {
          await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
            `research-quota:${actor(req).tenant_id}`,
          ]);
          const used = (
            await db.query(
              "SELECT count(*)::int AS n FROM research_runs WHERE created_at>now()-interval '24 hours'",
            )
          ).rows[0].n;
          if (used >= 10)
            fail(
              429,
              "RESEARCH_BUDGET",
              "This account has used its ten website research requests for the day. Remove the URL to classify from your description.",
            );
          researchId = randomUUID();
          await db.query(
            "INSERT INTO research_runs(id,tenant_id,company_id,actor_id,query,domain,state) VALUES($1,$2,$3,$4,$5,$6,'running')",
            [
              researchId,
              actor(req).tenant_id,
              company.id,
              actor(req).id,
              `${body.name} products services customers business model`,
              new URL(body.website).hostname,
            ],
          );
        }
        input = {
          name: body.name,
          website: body.website,
          description: body.description,
          revision: company.revision,
          promptVersion: "business-profile-v4-stage-evidence",
          sources: collected,
          websiteRead:
            !!body.website &&
            collected.some((s) => {
              try {
                return (
                  new URL(s.url).hostname.replace(/^www\./, "") ===
                  new URL(body.website).hostname.replace(/^www\./, "")
                );
              } catch {
                return false;
              }
            }),
          lookupNote: collected.length
            ? "Based on your description and the collected public research excerpts."
            : "Based on your description. Website content was not read.",
        };
        key = config.key;
        model = config.config.model || defaultAiModel;
        researchKey = research.key;
        const id = randomUUID();
        await db.query(
          "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'business_classification','running',$4)",
          [id, actor(req).tenant_id, company.id, input],
        );
        await audit(
          db,
          actor(req),
          company.id,
          "company.classification_started",
          null,
          { jobId: id },
        );
        return { id };
      },
    );
    if (input) {
      let state = "complete",
        result: any = null,
        message = "Review the proposed business profile, then save it.";
      try {
        if (lookup) {
          try {
            const domain = new URL(input.website).hostname;
            const found = await (researchOverride
              ? researchOverride(
                  `${input.name} products services customers business model`,
                  domain,
                )
              : exaSearch(
                  `${input.name} products services customers business model`,
                  domain,
                  researchKey,
                ));
            input.sources = found.sources
              .slice(0, 5)
              .filter((s) => {
                try {
                  const host = new URL(s.url).hostname;
                  return (
                    host === domain ||
                    host.endsWith(`.${domain}`) ||
                    domain === `www.${host}`
                  );
                } catch {
                  return false;
                }
              })
              .map((s, i) => ({
                id: `website-${i + 1}`,
                title: s.title.slice(0, 200),
                text: s.text.slice(0, 6000),
                url: s.url,
                retrievedAt: s.retrievedAt,
                publishedDate: s.publishedDate,
                focus: "official company website",
              }));
            input.websiteRead = input.sources.length > 0;
            input.lookupNote = input.websiteRead
              ? "Based on your description and retrieved website excerpts."
              : "No website excerpts were found. Based on your description only.";
          } catch {
            input.lookupNote =
              "Website lookup was unavailable. Based on your description only.";
          }
          await tx(actor(req).tenant_id, async (db) => {
            await db.query(
              "UPDATE research_runs SET state=$2,results=$3,message=$4 WHERE id=$1",
              [
                researchId,
                input!.websiteRead ? "complete" : "failed",
                JSON.stringify(
                  input!.sources.map((s) => ({
                    title: s.title,
                    url: s.url,
                    text: s.text,
                    contentHash: hash(s.text),
                    retrievedAt: s.retrievedAt || new Date().toISOString(),
                    publishedDate: s.publishedDate || "",
                    excerpted: true,
                  })),
                ),
                input!.lookupNote,
              ],
            );
          });
        }
        if (!input.description && !input.sources.length)
          fail(
            422,
            "DESCRIPTION_REQUIRED",
            "The website could not be read. Add a short description and try again.",
          );
        result = {
          draft: validateClassification(
            await provider(input, key, model),
            input,
          ),
        };
      } catch (e) {
        state =
          e instanceof AppError || e instanceof z.ZodError
            ? "failed"
            : "unknown";
        message =
          e instanceof AppError
            ? e.message
            : "The AI did not return a valid business recommendation. Your existing profile is unchanged. Review provider usage before trying again.";
      }
      await tx(actor(req).tenant_id, async (db) => {
        await companyCheck(db, actor(req), companyId(req));
        await db.query(
          "UPDATE provider_jobs SET state=$2,input=$3,result=$4,message=$5,finished_at=now() WHERE id=$1",
          [job.id, state, input, result, message],
        );
      });
    }
    res.json(job);
  });
  return router;
}
