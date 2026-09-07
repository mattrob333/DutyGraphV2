import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { advisor, type AuthRequest } from "./auth.ts";
import {
  tx,
  command,
  companyCheck,
  hash,
  audit,
  fail,
  AppError,
} from "./db.ts";
import { providerConfig } from "./providers.ts";
import {
  defaultAiModel,
  modelGenerationOptions,
  type ReasoningEffort,
} from "../shared/ai-models.ts";
import {
  teamContext,
  validateTeamOutput,
  teamOutputSchema,
  teamSystemPrompt,
  type AnalysisContext,
} from "../shared/team-analysis.ts";
export type TeamProvider = (
  input: AnalysisContext,
  key: string,
  model: string,
  reasoning?: ReasoningEffort,
) => Promise<{ output: unknown; responseId: string; usage: unknown }>;
export async function openAiTeam(
  input: AnalysisContext,
  key: string,
  model: string,
  reasoning?: ReasoningEffort,
  transport: typeof fetch = fetch,
) {
  const schema = z.toJSONSchema(teamOutputSchema);
  delete schema.$schema;
  const response = await transport("https://api.openai.com/v1/responses", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(100000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      ...modelGenerationOptions(model, reasoning),
      instructions: teamSystemPrompt,
      input: JSON.stringify(input),
      text: {
        format: {
          type: "json_schema",
          name: "team_analysis",
          strict: true,
          schema,
        },
      },
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    fail(
      502,
      "ANALYSIS_PROVIDER",
      `AI provider returned HTTP ${response.status}. No automatic retry was made.`,
    );
  }
  if (!response.body) throw new Error("Missing body");
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.length;
      if (bytes > 350000) throw new Error("Oversize response");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (payload.status !== "completed")
    fail(
      502,
      "ANALYSIS_INCOMPLETE",
      "The provider did not complete the review. Check usage before starting another attempt.",
    );
  const blocks = (payload.output || []).flatMap((o: any) => o.content || []);
  if (blocks.some((b: any) => b.type === "refusal"))
    fail(422, "ANALYSIS_REFUSED", "The provider declined this analysis.");
  const output = JSON.parse(
    blocks
      .filter((b: any) => b.type === "output_text")
      .map((b: any) => b.text)
      .join(""),
  );
  return {
    output,
    responseId: String(payload.id || "").slice(0, 200),
    usage: payload.usage || null,
  };
}
async function loadContext(db: any, c: string, name: string) {
  const records = (
    await db.query(
      "SELECT * FROM records WHERE company_id=$1 ORDER BY id LIMIT 1001",
      [c],
    )
  ).rows;
  if (records.length > 1000)
    fail(
      422,
      "ANALYSIS_SCOPE",
      "This review supports at most 1,000 company records. No partial analysis was sent.",
    );
  try {
    return teamContext(records, name);
  } catch (e) {
    if (e instanceof Error && e.message === "ANALYSIS_SCOPE")
      fail(
        422,
        "ANALYSIS_SCOPE",
        "This review exceeds the bounded context size. No partial analysis was sent.",
      );
    throw e;
  }
}
const expire = async (db: any, c: string) =>
  db.query(
    "UPDATE provider_jobs SET state='unknown',message='This attempt ended without a verified result. Check provider usage before retrying.',finished_at=now() WHERE company_id=$1 AND kind='team_analysis' AND state='running' AND created_at<now()-interval '5 minutes'",
    [c],
  );
export function teamAnalysisRouter(provider: TeamProvider = openAiTeam) {
  const router = Router({ mergeParams: true });
  router.use(advisor);
  router.get("/", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      c = z.uuid().parse((req.params as any).companyId);
    res.json(
      await tx(u.tenant_id, async (db) => {
        const company = await companyCheck(db, u, c);
        await expire(db, c);
        const context = await loadContext(db, c, company.name),
          fingerprint = hash(context);
        const jobs = (
          await db.query(
            "SELECT id,state,input,result,message,created_at FROM provider_jobs WHERE company_id=$1 AND kind='team_analysis' ORDER BY created_at DESC,id DESC LIMIT 20",
            [c],
          )
        ).rows;
        return {
          fingerprint,
          configured: (await providerConfig(u.tenant_id, "openai", db))
            .configured,
          coverage: context.coverage,
          checks: context.checks,
          sourceCount: context.sources.length,
          jobs: jobs.map((j) => ({
            id: j.id,
            state: j.state,
            result: j.result,
            message: j.message,
            created_at: j.created_at,
            stale: j.input.fingerprint !== fingerprint,
            model: j.input.model,
            promptVersion: j.input.promptVersion,
            coverage: j.input.coverage,
            sourceRefs: (j.input.sources || [])
              .filter((s: any) =>
                j.result?.output?.findings.some((f: any) =>
                  f.citations.some(
                    (citation: any) => citation.sourceId === s.id,
                  ),
                ),
              )
              .map(({ text, ...source }: any) => source),
          })),
        };
      }),
    );
  });
  router.get("/:runId/sources", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      c = z.uuid().parse((req.params as any).companyId),
      id = z.uuid().parse(req.params.runId);
    res.json(
      await tx(u.tenant_id, async (db) => {
        await companyCheck(db, u, c);
        const job = (
          await db.query(
            "SELECT input FROM provider_jobs WHERE company_id=$1 AND id=$2 AND kind='team_analysis'",
            [c, id],
          )
        ).rows[0];
        if (!job) fail(404, "NOT_FOUND", "Analysis not found in this company.");
        return { sources: job.input.sources };
      }),
    );
  });
  router.post("/:runId/review", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      c = z.uuid().parse((req.params as any).companyId),
      id = z.uuid().parse(req.params.runId);
    const body = z
      .object({
        findingId: z.string().min(1).max(80),
        decision: z.enum(["discuss", "dismissed"]),
        note: z.string().trim().min(10).max(1500),
        expectedReviewVersion: z.number().int().min(0),
      })
      .strict()
      .parse(req.body);
    res.json(
      await command(
        u,
        req.header("Idempotency-Key"),
        { path: req.originalUrl, body },
        async (db) => {
          const company = await companyCheck(db, u, c);
          const job = (
            await db.query(
              "SELECT * FROM provider_jobs WHERE company_id=$1 AND id=$2 AND kind='team_analysis' FOR UPDATE",
              [c, id],
            )
          ).rows[0];
          if (!job)
            fail(404, "NOT_FOUND", "Analysis not found in this company.");
          if (
            job.state !== "complete" ||
            !job.result?.output?.findings.some(
              (f: any) => f.id === body.findingId,
            )
          )
            fail(
              409,
              "ANALYSIS_REVIEW",
              "Only a completed finding can be reviewed.",
            );
          if (
            job.input.fingerprint !==
            hash(await loadContext(db, c, company.name))
          )
            fail(
              409,
              "ANALYSIS_STALE",
              "Work changed after this analysis. Generate current findings before recording a decision.",
            );
          if ((job.result.reviewVersion || 0) !== body.expectedReviewVersion)
            fail(
              409,
              "REVIEW_CHANGED",
              "Another advisor changed this review. Refresh before saving.",
            );
          const reviewVersion = body.expectedReviewVersion + 1;
          const reviews = {
            ...job.result.reviews,
            [body.findingId]: {
              decision: body.decision,
              note: body.note,
              actorId: u.id,
              at: new Date().toISOString(),
            },
          };
          await db.query("UPDATE provider_jobs SET result=$2 WHERE id=$1", [
            id,
            { ...job.result, reviews, reviewVersion },
          ]);
          await audit(db, u, c, "team_analysis.finding_reviewed", null, {
            jobId: id,
            ...body,
            reviewVersion,
          });
          return { id, reviewVersion };
        },
      ),
    );
  });

  router.post("/", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      c = z.uuid().parse((req.params as any).companyId);
    const body = z
      .object({
        consent: z.literal(true),
        fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .parse(req.body);
    let input: AnalysisContext | undefined,
      secret = "",
      model = "",
      reasoning: ReasoningEffort | undefined;
    const job = await command(
      u,
      req.header("Idempotency-Key"),
      { path: req.originalUrl, body },
      async (db) => {
        const company = await companyCheck(db, u, c);
        await expire(db, c);
        const context = await loadContext(db, c, company.name);
        if (hash(context) !== body.fingerprint)
          fail(
            409,
            "ANALYSIS_CHANGED",
            "Work records changed. Refresh the review before starting.",
          );
        if (!context.coverage.tasks)
          fail(
            422,
            "ANALYSIS_EMPTY",
            "Capture task cards before reviewing the team.",
          );
        const running = (
          await db.query(
            "SELECT id FROM provider_jobs WHERE company_id=$1 AND kind='team_analysis' AND state='running'",
            [c],
          )
        ).rows[0];
        if (running)
          fail(
            409,
            "ANALYSIS_RUNNING",
            "A review is already running. Refresh its history.",
          );
        const cached = (
          await db.query(
            "SELECT id FROM provider_jobs WHERE company_id=$1 AND kind='team_analysis' AND state='complete' AND input->>'fingerprint'=$2 ORDER BY created_at DESC LIMIT 1",
            [c, body.fingerprint],
          )
        ).rows[0];
        if (cached) return { id: cached.id, reused: true };
        const config = await providerConfig(u.tenant_id, "openai", db);
        if (!config.configured)
          fail(
            503,
            "AI_NOT_CONFIGURED",
            "Connect OpenAI in Workspace settings. Record checks remain available.",
          );
        const count = (
          await db.query(
            "SELECT count(*)::int n FROM provider_jobs WHERE kind='team_analysis' AND created_at>now()-interval '24 hours'",
          )
        ).rows[0].n;
        if (count >= 12)
          fail(
            429,
            "ANALYSIS_LIMIT",
            "This account reached 12 team-analysis attempts in 24 hours. Failed and uncertain attempts also count.",
          );
        input = context;
        secret = config.key;
        model = config.config.model || defaultAiModel;
        reasoning = config.config.reasoning;
        const id = randomUUID();
        await db.query(
          "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'team_analysis','running',$4)",
          [
            id,
            u.tenant_id,
            c,
            { ...input, fingerprint: body.fingerprint, model, reasoning },
          ],
        );
        await audit(db, u, c, "team_analysis.reserved", null, {
          jobId: id,
          fingerprint: body.fingerprint,
        });
        return { id, reused: false };
      },
    );
    if (input) {
      let state = "complete",
        result: any = null,
        message =
          "Draft findings saved. Review the cited records before acting.";
      try {
        const value = await provider(input, secret, model, reasoning);
        let output;
        try {
          output = validateTeamOutput(value.output, input);
        } catch {
          fail(
            502,
            "ANALYSIS_VALIDATION",
            "The AI returned invalid or unsupported citations. No findings were accepted.",
          );
        }
        result = { output, responseId: value.responseId, usage: value.usage };
      } catch (e) {
        state =
          e instanceof AppError || e instanceof z.ZodError
            ? "failed"
            : "unknown";
        message =
          e instanceof AppError
            ? e.message
            : "No findings were accepted. The response failed validation or its outcome is uncertain. Check provider usage before starting another attempt.";
      }
      await tx(u.tenant_id, async (db) => {
        // Do not revive an expired attempt or overwrite a terminal state.
        const saved = await db.query(
          "UPDATE provider_jobs SET state=$2,result=$3,message=$4,finished_at=now() WHERE id=$1 AND company_id=$5 AND kind='team_analysis' AND state='running' RETURNING id",
          [job.id, state, result, message, c],
        );
        if (saved.rowCount)
          await audit(db, u, c, "team_analysis." + state, null, {
            jobId: job.id,
          });
      });
    }
    res.json(job);
  });
  return router;
}
