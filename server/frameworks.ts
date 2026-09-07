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
  defaultAiModel,
  modelGenerationOptions,
  type ReasoningEffort,
} from "../shared/ai-models.ts";
import {
  frameworkSpecs,
  frameworkSystemPrompt,
  frameworkOrder,
} from "../shared/framework-specs.ts";
import { FRAMEWORK_GUIDE_VERSION } from "../shared/framework-guides.ts";
import {
  frameworkOutputSchema,
  type FrameworkSource,
} from "../shared/framework-output.ts";
import type { RecordRow } from "../shared/domain.ts";

export type FrameworkInput = {
  frameworkKey: string;
  company: string;
  promptVersion: string;
  reasoning?: ReasoningEffort;
  sources: FrameworkSource[];
  omitted: number;
  previousSnapshot?: unknown;
  background?: { frameworkKey: string; summary: string }[];
};
export type FrameworkProvider = (
  input: FrameworkInput,
  key: string,
  model: string,
) => Promise<{ output: unknown; responseId: string; usage: unknown }>;
type Research = {
  id: string;
  state: string;
  created_at: string;
  results: any[];
};
type Prior = {
  id: string;
  state: string;
  input: any;
  result: any;
  created_at: string;
};
const workFields = [
  "name",
  "role",
  "team",
  "managerId",
  "key",
  "analysis",
  "sections",
  "findings",
  "summary",
  "assumptions",
  "gaps",
  "title",
  "purpose",
  "scope",
  "duty",
  "ownerId",
  "performerId",
  "pressure",
  "alternative",
  "discriminator",
  "value",
  "unit",
  "formula",
  "baseline",
  "target",
  "window",
  "population",
  "result",
  "outcome",
  "prediction",
  "instructions",
  "humanGate",
  "output",
  "mode",
  "fromTaskId",
  "toTaskId",
  "condition",
  "trigger",
  "inputs",
  "taskIds",
];

export function frameworkContext(
  records: RecordRow[],
  research: Research[],
  key: string,
  prior: Prior[] = [],
  cache = new Map<string, any>(),
): any {
  if (cache.has(key)) return cache.get(key);
  const spec = frameworkSpecs[key];
  if (!spec) fail(404, "FRAMEWORK_NOT_FOUND", "Framework not found.");
  const buckets = new Set(spec.inputs.flatMap((v) => v.buckets));
  const kinds = new Set(spec.inputs.flatMap((v) => v.kinds));
  const eligible = records
    .filter((r) => {
      if (["stale", "withdrawn", "retracted"].includes(r.state)) return false;
      if (r.kind === "evidence")
        return r.state === "accepted" && buckets.has(r.data.bucket);
      if (r.kind === "framework") return false;
      return kinds.has(r.kind);
    })
    .sort(
      (a, b) =>
        String(b.updated_at || "").localeCompare(String(a.updated_at || "")) ||
        a.id.localeCompare(b.id),
    );
  const recordSource = (r: RecordRow): FrameworkSource => {
    const content =
      r.kind === "evidence"
        ? String(r.data.text || "")
        : JSON.stringify(
            Object.fromEntries(
              workFields
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
      text: r.kind === "framework" ? content : content.slice(0, 5000),
      excerpted: r.kind !== "framework" && content.length > 5000,
    };
  };
  const recordSources = eligible.map(recordSource);
  const researchSources: FrameworkSource[] = research
    .filter((r) => r.state === "complete")
    .flatMap((run) =>
      (run.results || []).map((s: any, i: number) => ({
        id: `${run.id}:${i}`,
        version: 1,
        hash: String(s.contentHash || hash(s)),
        title: String(s.title || s.url),
        state: "unverified_public_source",
        kind: "research",
        locator: String(s.url || ""),
        text: String(s.text || "").slice(0, 4000),
        excerpted: !!s.excerpted || String(s.text || "").length > 4000,
      })),
    );
  const upstream: FrameworkSource[] = [],
    missingUpstream: string[] = [];
  for (const upstreamKey of spec.upstream) {
    const manual = records.find(
      (r) =>
        r.kind === "framework" &&
        r.data.key === upstreamKey &&
        r.state === "complete",
    );
    if (manual) {
      upstream.push(recordSource(manual));
      continue;
    }
    const latest = prior.find(
      (p) => p.state === "complete" && p.input.frameworkKey === upstreamKey,
    );
    if (!latest) {
      missingUpstream.push(upstreamKey);
      continue;
    }
    const current = frameworkContext(
      records,
      research,
      upstreamKey,
      prior,
      cache,
    );
    if (
      current.missingUpstream.length ||
      latest.input.fingerprint !== current.fingerprint
    ) {
      missingUpstream.push(upstreamKey);
      continue;
    }
    upstream.push({
      id: latest.id,
      version: latest.input.version || 1,
      hash: hash(latest.result),
      title: `${frameworkSpecs[upstreamKey]?.name || upstreamKey} · AI draft`,
      state: "unreviewed_analysis",
      kind: "framework_analysis",
      frameworkKey: upstreamKey,
      locator: `Framework run ${latest.id}`,
      text: JSON.stringify(latest.result?.output || {}),
      excerpted: false,
    });
  }
  const inventory = [...recordSources, ...researchSources].map(
    ({ id, version, hash, state }) => ({ id, version, hash, state }),
  );
  const baseFingerprint = hash({
    key,
    promptVersion: FRAMEWORK_GUIDE_VERSION,
    inventory,
  });
  const primary = recordSources
    .filter((s) => s.kind === "evidence")
    .slice(0, 16);
  const structured = recordSources
    .filter((s) => s.kind !== "evidence")
    .slice(0, 12);
  const selectedResearch: FrameworkSource[] = [];
  const seen = new Set(primary.map((s) => s.locator));
  for (const s of researchSources)
    if (!seen.has(s.locator) && selectedResearch.length < 12) {
      selectedResearch.push(s);
      seen.add(s.locator);
    }
  const sources = [...primary, ...structured, ...selectedResearch, ...upstream];
  const context = {
    sources,
    baseFingerprint,
    fingerprint: hash({
      baseFingerprint,
      upstream: upstream.map((s) => ({ id: s.id, hash: s.hash })),
      missingUpstream,
    }),
    missingUpstream,
    omitted:
      recordSources.length +
      researchSources.length -
      primary.length -
      structured.length -
      selectedResearch.length,
    inventory,
    variables: spec.inputs.map((v) => ({
      key: v.key,
      label: v.label,
      lookFor: v.lookFor,
      sourceCount: sources.filter((s) => {
        if (s.kind === "research") return v.buckets.includes("biz");
        if (s.kind === "framework" || s.kind === "framework_analysis")
          return true;
        const record = eligible.find((r) => r.id === s.id);
        return (
          !!record &&
          v.kinds.includes(record.kind) &&
          (record.kind !== "evidence" || v.buckets.includes(record.data.bucket))
        );
      }).length,
    })),
  };
  cache.set(key, context);
  return context;
}

export function currentFrameworkRuns(
  records: RecordRow[],
  research: Research[],
  prior: Prior[],
) {
  const cache = new Map<string, any>();
  return prior.filter((job) => {
    if (job.state !== "complete" || !frameworkSpecs[job.input.frameworkKey])
      return false;
    const context = frameworkContext(
      records,
      research,
      job.input.frameworkKey,
      prior,
      cache,
    );
    return (
      !context.missingUpstream.length &&
      job.input.fingerprint === context.fingerprint
    );
  });
}

export function validateFrameworkOutput(value: unknown, input: FrameworkInput) {
  if (JSON.stringify(value).length > 80000)
    fail(
      502,
      "FRAMEWORK_SIZE",
      "The analysis was too long to use safely. No analysis was saved.",
    );
  const output = frameworkOutputSchema.parse(value),
    spec = frameworkSpecs[input.frameworkKey];
  if (!spec || output.frameworkKey !== input.frameworkKey)
    fail(
      502,
      "FRAMEWORK_SHAPE",
      "The AI returned a different framework. No analysis was saved.",
    );
  const exact = (actual: string[], expected: string[]) =>
    actual.length === expected.length &&
    expected.every((key, i) => actual[i] === key);
  if (
    !exact(
      output.sections.map((s) => s.id),
      spec.sections.map((s) => s.id),
    ) ||
    !exact(
      output.inputs.map((s) => s.key),
      spec.inputs.map((s) => s.key),
    )
  )
    fail(
      502,
      "FRAMEWORK_SHAPE",
      "The AI omitted or changed a required framework section or input. No analysis was saved.",
    );
  const allowed = new Set(input.sources.map((s) => s.id));
  for (const assessment of output.inputs)
    if (
      assessment.sourceIds.some((id) => !allowed.has(id)) ||
      (assessment.status !== "Missing" && !assessment.sourceIds.length)
    )
      fail(
        502,
        "FRAMEWORK_CITATION",
        "An input assessment lacks a valid source. No analysis was saved.",
      );
  output.sections.forEach((section, i) =>
    section.items.forEach((item) => {
      if (
        item.sourceIds.some((id) => !allowed.has(id)) ||
        (item.basis !== "Missing" && !item.sourceIds.length)
      )
        fail(
          502,
          "FRAMEWORK_CITATION",
          "A framework finding lacks a valid source. No analysis was saved.",
        );
      if (item.basis === "Missing" && item.confidence !== "Low")
        fail(
          502,
          "FRAMEWORK_CONFIDENCE",
          "Missing information cannot have high confidence.",
        );
      const columns = spec.sections[i].columns?.map((c) => c.key) || [];
      if (
        !exact(
          item.values.map((v) => v.key),
          columns,
        )
      )
        fail(
          502,
          "FRAMEWORK_SHAPE",
          "A framework row has missing or unexpected columns. No analysis was saved.",
        );
    }),
  );
  return output;
}

export async function openAiFramework(
  input: FrameworkInput,
  key: string,
  model: string,
  transport: typeof fetch = fetch,
) {
  const schema = z.toJSONSchema(frameworkOutputSchema);
  delete schema.$schema;
  const response = await transport("https://api.openai.com/v1/responses", {
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
      ...modelGenerationOptions(model, input.reasoning),
      instructions: frameworkSystemPrompt(input.frameworkKey),
      input: JSON.stringify(input),
      text: {
        format: {
          type: "json_schema",
          name: "framework_analysis",
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
      "FRAMEWORK_PROVIDER",
      `OpenAI returned HTTP ${response.status}. Check your key, model access and billing. No automatic retry was made.`,
    );
  }
  if (!response.body) throw new Error("Missing provider response");
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 750000) throw new Error("Provider output too large");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (payload.status !== "completed")
    fail(
      502,
      "FRAMEWORK_INCOMPLETE",
      "The AI did not finish this framework. Review provider usage before trying again.",
    );
  const blocks = (payload.output || []).flatMap((o: any) => o.content || []);
  if (blocks.some((c: any) => c.type === "refusal"))
    fail(
      422,
      "FRAMEWORK_REFUSED",
      "The provider declined this analysis. Review the source material.",
    );
  const output = validateFrameworkOutput(
    JSON.parse(
      blocks
        .filter((c: any) => c.type === "output_text")
        .map((c: any) => c.text)
        .join(""),
    ),
    input,
  );
  return {
    output,
    responseId: String(payload.id || "").slice(0, 200),
    usage: payload.usage || null,
  };
}

export async function frameworkInputs(db: any, c: string) {
  const records = (
    await db.query(
      "SELECT * FROM records WHERE company_id=$1 ORDER BY updated_at DESC LIMIT 1001",
      [c],
    )
  ).rows;
  if (records.length > 1000)
    fail(
      422,
      "FRAMEWORK_SCOPE",
      "This company exceeds the current limit of 1,000 records. Narrow the engagement before running frameworks.",
    );
  const research = (
    await db.query(
      "SELECT id,state,results,created_at FROM research_runs WHERE company_id=$1 AND state='complete' ORDER BY created_at DESC LIMIT 50",
      [c],
    )
  ).rows;
  const prior = (
    await db.query(
      "SELECT id,state,input,result,created_at FROM (SELECT *,row_number() OVER(PARTITION BY input->>'frameworkKey' ORDER BY created_at DESC,id DESC) AS rank FROM provider_jobs WHERE company_id=$1 AND kind='framework_run' AND state='complete') latest WHERE rank=1 ORDER BY created_at DESC",
      [c],
    )
  ).rows;
  return { records, research, prior };
}
export function frameworkRouter(provider: FrameworkProvider = openAiFramework) {
  const router = Router({ mergeParams: true });
  router.use(advisor);
  router.get("/", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      c = z.uuid().parse((req.params as any).companyId);
    res.json(
      await tx(u.tenant_id, async (db) => {
        await companyCheck(db, u, c);
        const data = await frameworkInputs(db, c),
          cache = new Map<string, any>();
        return {
          configured: (await providerConfig(u.tenant_id, "openai", db))
            .configured,
          frameworks: frameworkOrder.map((key) => {
            const context = frameworkContext(
              data.records,
              data.research,
              key,
              data.prior,
              cache,
            );
            const latest = data.prior.find(
              (j: any) => j.input.frameworkKey === key,
            );
            const manual = data.records.find(
              (r: any) =>
                r.kind === "framework" &&
                r.data.key === key &&
                r.state === "complete",
            );
            const current =
              !!latest &&
              latest.input.fingerprint === context.fingerprint &&
              !context.missingUpstream.length;
            const hasEvidence = context.sources.some((s: FrameworkSource) =>
              ["evidence", "research"].includes(s.kind),
            );
            return {
              key,
              latestId: latest?.id,
              current: current || !!manual,
              stale: !!latest && !current,
              missingUpstream: context.missingUpstream,
              sourceCount: context.sources.length,
              ready: hasEvidence && !context.missingUpstream.length,
              version: latest?.input.version,
            };
          }),
        };
      }),
    );
  });
  router.get("/:key", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      c = z.uuid().parse((req.params as any).companyId),
      key = String(req.params.key);
    if (!frameworkSpecs[key])
      fail(404, "FRAMEWORK_NOT_FOUND", "Framework not found.");
    res.json(
      await tx(u.tenant_id, async (db) => {
        await companyCheck(db, u, c);
        await db.query(
          "UPDATE provider_jobs SET state='unknown',message='The attempt ended without a confirmed result. Check provider usage before retrying.',finished_at=now() WHERE company_id=$1 AND kind='framework_run' AND state='running' AND created_at<now()-interval '5 minutes'",
          [c],
        );
        const data = await frameworkInputs(db, c),
          context = frameworkContext(
            data.records,
            data.research,
            key,
            data.prior,
          );
        const jobs = (
          await db.query(
            "SELECT id,state,input,result,message,created_at FROM provider_jobs WHERE company_id=$1 AND kind='framework_run' AND input->>'frameworkKey'=$2 ORDER BY created_at DESC,id DESC LIMIT 20",
            [c, key],
          )
        ).rows;
        const requested = z.uuid().optional().parse(req.query.version);
        if (requested && !jobs.some((j) => j.id === requested)) {
          const older = (
            await db.query(
              "SELECT id,state,input,result,message,created_at FROM provider_jobs WHERE company_id=$1 AND id=$2 AND kind='framework_run' AND input->>'frameworkKey'=$3",
              [c, requested, key],
            )
          ).rows[0];
          if (!older)
            fail(
              404,
              "FRAMEWORK_VERSION",
              "The cited framework version is not available in this company.",
            );
          jobs.push(older);
        }
        return {
          configured: (await providerConfig(u.tenant_id, "openai", db))
            .configured,
          previousSnapshot:
            key === "industrymap"
              ? data.prior.find((j: any) => j.input.frameworkKey === key)
                  ?.result?.output
              : undefined,
          promptVersion: FRAMEWORK_GUIDE_VERSION,
          sourceCount: context.sources.length,
          missingUpstream: context.missingUpstream,
          omitted: context.omitted,
          variables: context.variables,
          sources: context.sources.map(({ text, ...s }: FrameworkSource) => s),
          jobs: jobs.map((j) => ({
            ...j,
            stale: j.input.fingerprint !== context.fingerprint,
            input: {
              frameworkKey: key,
              version: j.input.version,
              promptVersion: j.input.promptVersion,
              model: j.input.model,
              omitted: j.input.omitted,
              sources: j.input.sources.map(({ text, ...s }: any) => s),
            },
          })),
        };
      }),
    );
  });
  router.get("/:key/:runId/source", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      c = z.uuid().parse((req.params as any).companyId),
      key = String(req.params.key),
      runId = z.uuid().parse(req.params.runId),
      sourceId = z.string().min(1).max(200).parse(req.query.sourceId);
    if (!frameworkSpecs[key])
      fail(404, "FRAMEWORK_NOT_FOUND", "Framework not found.");
    res.json(
      await tx(u.tenant_id, async (db) => {
        await companyCheck(db, u, c);
        const job = (
          await db.query(
            "SELECT input FROM provider_jobs WHERE company_id=$1 AND id=$2 AND kind='framework_run' AND input->>'frameworkKey'=$3",
            [c, runId, key],
          )
        ).rows[0];
        const source = job?.input.sources?.find(
          (s: FrameworkSource) => s.id === sourceId,
        );
        if (!source)
          fail(
            404,
            "FRAMEWORK_SOURCE",
            "This source is not part of the saved framework version.",
          );
        return { source };
      }),
    );
  });
  router.post("/:key", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      c = z.uuid().parse((req.params as any).companyId),
      key = String(req.params.key);
    if (!frameworkSpecs[key])
      fail(404, "FRAMEWORK_NOT_FOUND", "Framework not found.");
    const body = z
      .object({ consent: z.literal(true) })
      .strict()
      .parse(req.body);
    let input: FrameworkInput | undefined,
      secret = "",
      model = "";
    const job = await command(
      u,
      req.header("Idempotency-Key"),
      { path: req.originalUrl, body },
      async (db) => {
        const company = await companyCheck(db, u, c),
          config = await providerConfig(u.tenant_id, "openai", db);
        if (!config.configured)
          fail(
            503,
            "AI_NOT_CONFIGURED",
            "Add your OpenAI API key in Workspace settings.",
          );
        const count = (
          await db.query(
            "SELECT count(*)::int AS n FROM provider_jobs WHERE kind='framework_run' AND created_at>now()-interval '24 hours'",
          )
        ).rows[0].n;
        if (count >= 32)
          fail(
            429,
            "FRAMEWORK_LIMIT",
            "This account reached 32 framework attempts in 24 hours.",
          );
        const data = await frameworkInputs(db, c),
          context = frameworkContext(
            data.records,
            data.research,
            key,
            data.prior,
          );
        if (context.missingUpstream.length)
          fail(
            422,
            "FRAMEWORK_UPSTREAM",
            "Complete current analyses first: " +
              context.missingUpstream
                .map((k: string) => frameworkSpecs[k].name)
                .join(", ") +
              ".",
          );
        const running = (
          await db.query(
            "SELECT id FROM provider_jobs WHERE company_id=$1 AND kind='framework_run' AND input->>'frameworkKey'=$2 AND state='running' AND created_at>now()-interval '5 minutes'",
            [c, key],
          )
        ).rows[0];
        if (running)
          fail(
            409,
            "FRAMEWORK_RUNNING",
            "This framework is already running. Refresh its history before trying again.",
          );
        if (
          !context.sources.some((s: FrameworkSource) =>
            ["evidence", "research"].includes(s.kind),
          )
        )
          fail(
            422,
            "FRAMEWORK_INPUT",
            "Collect company research or accept relevant evidence in Discovery first.",
          );
        const version = (
          await db.query(
            "SELECT coalesce(max((input->>'version')::int),0)+1 AS version FROM provider_jobs WHERE company_id=$1 AND kind='framework_run' AND input->>'frameworkKey'=$2",
            [c, key],
          )
        ).rows[0].version;
        input = {
          frameworkKey: key,
          company: company.name,
          previousSnapshot:
            key === "industrymap"
              ? data.prior.find((j: any) => j.input.frameworkKey === key)
                  ?.result?.output
              : undefined,
          promptVersion: FRAMEWORK_GUIDE_VERSION,
          reasoning: config.config.reasoning,
          sources: context.sources,
          omitted: context.omitted,
          background: currentFrameworkRuns(
            data.records,
            data.research,
            data.prior,
          )
            .filter(
              (j) =>
                !frameworkSpecs[key].upstream.includes(j.input.frameworkKey) &&
                j.input.frameworkKey !== key,
            )
            .map((j) => ({
              frameworkKey: j.input.frameworkKey,
              summary: String(j.result?.output?.summary || "").slice(0, 1000),
            })),
        };
        secret = config.key;
        model = config.config.model || defaultAiModel;
        const id = randomUUID();
        await db.query(
          "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'framework_run','running',$4)",
          [
            id,
            u.tenant_id,
            c,
            {
              ...input,
              model,
              version,
              fingerprint: context.fingerprint,
              baseFingerprint: context.baseFingerprint,
              inventory: context.inventory,
            },
          ],
        );
        await audit(db, u, c, "framework.attempt_reserved", null, {
          jobId: id,
          frameworkKey: key,
          version,
        });
        return { id, version };
      },
    );
    if (input) {
      let state = "complete",
        result: any = null,
        message =
          "AI analysis saved. Review the evidence and open questions before deciding.";
      try {
        const value = await provider(input, secret, model);
        result = {
          ...value,
          output: validateFrameworkOutput(value.output, input),
        };
      } catch (e) {
        state =
          e instanceof AppError || e instanceof z.ZodError
            ? "failed"
            : "unknown";
        message =
          e instanceof AppError
            ? e.message
            : e instanceof z.ZodError
              ? "The AI response did not match the framework format. No analysis was accepted."
              : "The result could not be verified. Check provider usage before retrying. No automatic retry was made.";
      }
      await tx(u.tenant_id, async (db) => {
        await db.query(
          "UPDATE provider_jobs SET state=$2,result=$3,message=$4,finished_at=now() WHERE id=$1",
          [job.id, state, result, message],
        );
        await audit(db, u, c, `framework.${state}`, null, {
          jobId: job.id,
          frameworkKey: key,
        });
      });
    }
    res.json(job);
  });
  return router;
}
