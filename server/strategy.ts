import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { advisor, type AuthRequest } from "./auth.ts";
import {
  tx,
  command,
  companyCheck,
  audit,
  fail,
  hash,
  AppError,
} from "./db.ts";
import { providerConfig } from "./providers.ts";
import {
  openAiDraft,
  validateDraft,
  type AiInput,
  type AiProvider,
} from "./ai.ts";
import { defaultAiModel } from "../shared/ai-models.ts";
import {
  frameworkGuides,
  FRAMEWORK_GUIDE_VERSION,
} from "../shared/framework-guides.ts";
import type { RecordRow } from "../shared/domain.ts";

const buckets: Record<string, string[]> = {
  business: ["biz", "leadership", "calls"],
  market: ["biz", "calls", "leadership"],
  customer: ["biz", "calls", "leadership"],
  choices: ["biz", "leadership", "calls", "org"],
  execution: ["biz", "org", "leadership", "calls"],
  overview: ["biz", "leadership", "calls", "org"],
};
const fields = [
  "text",
  "analysis",
  "sections",
  "summary",
  "findings",
  "assumptions",
  "gaps",
  "title",
  "purpose",
  "pressure",
  "alternative",
  "discriminator",
  "value",
  "unit",
  "formula",
  "baseline",
  "target",
  "result",
  "outcome",
  "prediction",
  "instructions",
  "humanGate",
  "output",
  "mode",
];
export function strategyContext(records: RecordRow[], scope: string) {
  const eligible = records
    .filter((r) => {
      if (["retracted", "withdrawn", "stale"].includes(r.state)) return false;
      if (r.kind === "evidence")
        return (
          r.state === "accepted" && buckets[scope]?.includes(r.data.bucket)
        );
      if (r.kind === "framework")
        return (
          !!frameworkGuides[r.data.key] &&
          (scope === "overview" || frameworkGuides[r.data.key].group === scope)
        );
      return (
        ["overview", "execution", "choices"].includes(scope) &&
        [
          "candidate",
          "metric",
          "intervention",
          "outcome",
          "duty",
          "task",
        ].includes(r.kind)
      );
    })
    .sort(
      (a, b) =>
        String(b.updated_at || "").localeCompare(String(a.updated_at || "")) ||
        a.id.localeCompare(b.id),
    );
  const inventory = eligible.map((r) => ({
    id: r.id,
    version: r.version,
    hash: r.hash,
    state: r.state,
    title: r.title,
  }));
  // Keep every canonical framework available to the executive brief before
  // filling the remaining analysis slots with recent work records.
  const frameworks = eligible
    .filter((r) => r.kind === "framework")
    .slice(0, 16);
  const chosen = [
    ...eligible.filter((r) => r.kind === "evidence").slice(0, 24),
    ...frameworks,
    ...eligible
      .filter((r) => !["evidence", "framework"].includes(r.kind))
      .slice(0, 24 - frameworks.length),
  ];
  const sources = chosen.map((r) => {
    const content =
      r.kind === "evidence"
        ? String(r.data.text || "")
        : JSON.stringify(
            Object.fromEntries(
              fields
                .filter((k) => r.data[k] !== undefined)
                .map((k) => [k, r.data[k]]),
            ),
          );
    return {
      id: r.id,
      version: r.version,
      hash: r.hash,
      title: r.title,
      state: r.state,
      kind: r.kind,
      locator: String(r.data.locator || r.kind),
      text: content.slice(0, 4000),
      excerpted: content.length > 4000,
    };
  });
  return {
    fingerprint: hash({ scope, version: FRAMEWORK_GUIDE_VERSION, inventory }),
    inventory,
    sources,
    omitted: eligible.length - chosen.length,
  };
}

export function strategyRouter(provider: AiProvider = openAiDraft) {
  const router = Router({ mergeParams: true });
  router.use(advisor);
  router.get("/", async (req, res) => {
    const u = (req as AuthRequest).actor,
      c = z.uuid().parse((req.params as Record<string, string>).companyId);
    res.json(
      await tx(u.tenant_id, async (db) => {
        await companyCheck(db, u, c);
        await db.query(
          "UPDATE provider_jobs SET state='unknown',message='This request ended without a confirmed result. Check provider usage before retrying.',finished_at=now() WHERE company_id=$1 AND kind='strategy_brief' AND state='running' AND created_at<now()-interval '5 minutes'",
          [c],
        );
        const records = (
          await db.query(
            "SELECT * FROM records WHERE company_id=$1 ORDER BY updated_at DESC LIMIT 1001",
            [c],
          )
        ).rows;
        if (records.length > 1000)
          fail(
            422,
            "STRATEGY_SCOPE",
            "This company exceeds the current strategy context limit of 1,000 records.",
          );
        const jobs = (
          await db.query(
            "SELECT id,state,input,result,message,created_at FROM (SELECT *,row_number() OVER(PARTITION BY input->>'scope',coalesce(input->'strategy'->>'question','')<>'' ORDER BY created_at DESC) AS report_rank FROM provider_jobs WHERE company_id=$1 AND kind='strategy_brief') history WHERE report_rank<=10 ORDER BY created_at DESC",
            [c],
          )
        ).rows;
        const contexts = Object.fromEntries(
          Object.keys(buckets).map((scope) => [
            scope,
            strategyContext(records, scope),
          ]),
        );
        const groups = Object.entries(contexts).map(([scope, context]) => {
          const latest = jobs.find(
            (j) =>
              j.state === "complete" &&
              j.input.scope === scope &&
              !j.input.strategy?.question,
          );
          return {
            scope,
            sourceCount: context.sources.length,
            omitted: context.omitted,
            latestId: latest?.id,
            changed:
              !!latest && latest.input.fingerprint !== context.fingerprint,
          };
        });
        return {
          configured: (await providerConfig(u.tenant_id, "openai", db))
            .configured,
          groups,
          jobs: jobs.map((j) => ({
            ...j,
            stale: j.input.fingerprint !== contexts[j.input.scope]?.fingerprint,
            input: {
              scope: j.input.scope,
              model: j.input.model,
              question: j.input.strategy?.question || "",
              omitted: j.input.omitted,
              sources: j.input.sources.map(({ text, ...s }: any) => s),
            },
          })),
        };
      }),
    );
  });
  router.post("/", async (req, res) => {
    const u = (req as AuthRequest).actor,
      c = z.uuid().parse((req.params as Record<string, string>).companyId);
    const d = z
      .object({
        scope: z.enum([
          "overview",
          "business",
          "market",
          "customer",
          "choices",
          "execution",
        ]),
        question: z.string().trim().max(1500).default(""),
        consent: z.literal(true),
      })
      .strict()
      .parse(req.body);
    let input: AiInput | undefined,
      key = "",
      model = "";
    const job = await command(
      u,
      req.header("Idempotency-Key"),
      { path: req.originalUrl, body: d },
      async (db) => {
        const company = await companyCheck(db, u, c),
          config = await providerConfig(u.tenant_id, "openai", db);
        if (!config.configured)
          fail(
            503,
            "AI_NOT_CONFIGURED",
            "Add your OpenAI API key in Workspace settings.",
          );
        // Serialize reservations within this account so simultaneous tabs cannot exceed the limit.
        await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          u.tenant_id + ":strategy",
        ]);
        const count = (
          await db.query(
            "SELECT count(*)::int AS n FROM provider_jobs WHERE kind='strategy_brief' AND created_at>now()-interval '24 hours'",
          )
        ).rows[0].n;
        if (count >= 20)
          fail(
            429,
            "STRATEGY_LIMIT",
            "This account reached 20 strategy attempts in 24 hours.",
          );
        const records = (
          await db.query(
            "SELECT * FROM records WHERE company_id=$1 ORDER BY updated_at DESC LIMIT 1001",
            [c],
          )
        ).rows;
        if (records.length > 1000)
          fail(
            422,
            "STRATEGY_SCOPE",
            "This company exceeds the current strategy context limit of 1,000 records.",
          );
        const context = strategyContext(records, d.scope);
        if (!context.sources.some((s) => s.kind === "evidence"))
          fail(
            422,
            "STRATEGY_INPUT",
            "Accept a relevant evidence source in Discovery before generating this report.",
          );
        const previous = (
          await db.query(
            "SELECT input FROM provider_jobs WHERE company_id=$1 AND kind='strategy_brief' AND state='complete' AND input->>'scope'=$2 AND coalesce(input->'strategy'->>'question','')='' ORDER BY created_at DESC LIMIT 1",
            [c, d.scope],
          )
        ).rows[0];
        const old: any[] = previous?.input.inventory || [];
        const changes = context.inventory
          .filter(
            (s) =>
              !old.some(
                (p) =>
                  p.id === s.id && p.hash === s.hash && p.state === s.state,
              ),
          )
          .map((s) => `${s.title} (v${s.version}) added or changed`);
        changes.push(
          ...old
            .filter((p) => !context.inventory.some((s) => s.id === p.id))
            .map((p) => `${p.title} is no longer eligible context`),
        );
        input = {
          mode: "strategy",
          company: company.name,
          sources: context.sources,
          reasoning: config.config.reasoning,
          strategy: {
            scope: d.scope,
            question: d.question,
            changes: changes.slice(0, 50),
            guides: Object.entries(frameworkGuides)
              .filter(([, g]) => d.scope === "overview" || g.group === d.scope)
              .map(([name, g]) => ({ name, ...g })),
          },
        };
        key = config.key;
        model = config.config.model || defaultAiModel;
        const id = randomUUID();
        await db.query(
          "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'strategy_brief','running',$4)",
          [
            id,
            u.tenant_id,
            c,
            {
              ...input,
              model,
              scope: d.scope,
              fingerprint: context.fingerprint,
              inventory: context.inventory,
              omitted: context.omitted,
            },
          ],
        );
        await audit(db, u, c, "strategy.attempt_reserved", null, {
          jobId: id,
          scope: d.scope,
        });
        return { id };
      },
    );
    if (input) {
      let state = "complete",
        result: any = null,
        message = "AI report. Review its sources before making a decision.";
      try {
        const output = await provider(input, key, model);
        result = { ...output, draft: validateDraft(output.draft, input) };
      } catch (e) {
        state = e instanceof AppError ? "failed" : "unknown";
        message =
          e instanceof AppError
            ? e.message
            : "The result could not be verified. No automatic retry was made. Check provider usage before retrying.";
      }
      await tx(u.tenant_id, async (db) => {
        await db.query(
          "UPDATE provider_jobs SET state=$2,result=$3,message=$4,finished_at=now() WHERE id=$1",
          [job.id, state, result, message],
        );
        await audit(db, u, c, `strategy.${state}`, null, { jobId: job.id });
      });
    }
    res.json(job);
  });
  return router;
}
