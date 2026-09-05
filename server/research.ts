import express from "express";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { advisor, type AuthRequest } from "./auth.ts";
import {
  tx,
  command,
  companyCheck,
  audit,
  fail,
  AppError,
  getRecord,
} from "./db.ts";
import { createOrEdit } from "./records.ts";
import {
  publicWebUrl,
  researchInput,
  type ResearchSource,
} from "../shared/research.ts";
export type ResearchProvider = (
  query: string,
  domain: string,
) => Promise<{ sources: ResearchSource[]; requestId: string }>;
export function normalizeResearch(
  payload: any,
  now = new Date().toISOString(),
) {
  if (!Array.isArray(payload?.results))
    throw new AppError(
      502,
      "RESEARCH_RESPONSE",
      "The research provider returned an unexpected response.",
    );
  const seen = new Set<string>(),
    sources: ResearchSource[] = [];
  for (const r of payload.results.slice(0, 5)) {
    if (
      typeof r?.url !== "string" ||
      r.url.length > 2000 ||
      !publicWebUrl(r.url) ||
      typeof r.text !== "string" ||
      !r.text.trim()
    )
      continue;
    const parsedUrl = new URL(r.url),
      url = parsedUrl.href;
    // Reject oversized addresses instead of changing the page's identity.
    // Serialization can expand Unicode, so bound the retained URL as well.
    if (url.length > 2000 || seen.has(url)) continue;
    seen.add(url);
    const text = r.text.slice(0, 6000),
      title =
        (typeof r.title === "string" ? r.title.trim() : "") ||
        parsedUrl.hostname;
    sources.push({
      title: title.slice(0, 200),
      url,
      text,
      publishedDate:
        typeof r.publishedDate === "string"
          ? r.publishedDate.slice(0, 100)
          : "",
      retrievedAt: now,
      contentHash: createHash("sha256").update(text).digest("hex"),
      excerpted: r.text.length > text.length,
    });
  }
  return {
    sources,
    requestId:
      typeof payload.requestId === "string"
        ? payload.requestId.slice(0, 200)
        : "",
  };
}
export async function exaSearch(
  query: string,
  domain: string,
  key: string,
  transport: typeof fetch = fetch,
) {
  const response = await transport("https://api.exa.ai/search", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(30000),
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({
      query,
      type: "auto",
      numResults: 5,
      ...(domain ? { includeDomains: [domain] } : {}),
      contents: { text: true },
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError(
      502,
      "RESEARCH_PROVIDER",
      `Exa returned HTTP ${response.status}. Check the provider account; this request will not retry automatically.`,
    );
  }
  if (!response.body)
    throw new AppError(
      502,
      "RESEARCH_RESPONSE",
      "No research response body was returned.",
    );
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 2_000_000)
        throw new AppError(
          502,
          "RESEARCH_RESPONSE",
          "Research response exceeded the size limit.",
        );
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
  }
  return normalizeResearch(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}
export function researchRouter(providerOverride?: ResearchProvider) {
  const router = express.Router({ mergeParams: true });
  router.use(advisor);
  const configured = () =>
    !!providerOverride ||
    (process.env.ENABLE_EXA_RESEARCH === "true" && !!process.env.EXA_API_KEY);
  const user = (req: express.Request) => (req as AuthRequest).actor;
  const company = (req: express.Request) =>
    z.uuid().parse(req.params.companyId);
  const run = (req: express.Request, fn: any) =>
    command(
      user(req),
      req.header("Idempotency-Key"),
      { path: req.originalUrl, method: req.method, body: req.body },
      fn,
    );
  router.get("/", async (req, res) =>
    res.json(
      await tx(user(req).tenant_id, async (db) => {
        await companyCheck(db, user(req), company(req));
        await db.query(
          "UPDATE research_runs SET state='unknown',message='The process ended without a confirmed provider result. No automatic retry was made.' WHERE company_id=$1 AND state IN ('running','reserved') AND created_at < now()-interval '5 minutes'",
          [company(req)],
        );
        const runs = (
          await db.query(
            "SELECT id,query,domain,state,results,message,created_at FROM research_runs WHERE company_id=$1 ORDER BY created_at DESC LIMIT 20",
            [company(req)],
          )
        ).rows;
        const used = Number(
          (
            await db.query(
              "SELECT count(*) FROM research_runs WHERE created_at>=now()-interval '24 hours'",
            )
          ).rows[0].count,
        );
        return {
          provider: "Exa",
          configured: configured(),
          limit: 10,
          used,
          runs,
        };
      }),
    ),
  );
  router.post("/", async (req, res) => {
    const input = researchInput.parse(req.body),
      actor = user(req),
      companyId = company(req);
    if (!configured())
      fail(
        503,
        "RESEARCH_UNCONFIGURED",
        "Exa is not configured. An operator must set EXA_API_KEY and ENABLE_EXA_RESEARCH=true. You can add public sources manually.",
      );
    const query = `${input.publicName} company products services customers leadership locations`,
      domain = input.website ? new URL(input.website).hostname : "";
    const reservation: any = await run(req, async (db: any) => {
      await companyCheck(db, actor, companyId);
      const used = Number(
        (
          await db.query(
            "SELECT count(*) FROM research_runs WHERE created_at>=now()-interval '24 hours'",
          )
        ).rows[0].count,
      );
      if (used >= 10)
        fail(
          429,
          "RESEARCH_BUDGET",
          "This workspace account has used its ten research requests for the rolling 24-hour window.",
        );
      const id = randomUUID();
      await db.query(
        "INSERT INTO research_runs(id,tenant_id,company_id,actor_id,query,domain,state) VALUES($1,$2,$3,$4,$5,$6,'reserved')",
        [id, actor.tenant_id, companyId, actor.id, query, domain],
      );
      await audit(db, actor, companyId, "research.reserved", null, {
        runId: id,
        provider: "Exa",
      });
      return { id };
    });
    const claimed = await tx(
      actor.tenant_id,
      async (db) =>
        (
          await db.query(
            "UPDATE research_runs SET state='running' WHERE id=$1 AND company_id=$2 AND state='reserved' RETURNING id",
            [reservation.id, companyId],
          )
        ).rowCount,
    );
    if (claimed) {
      try {
        const result = await (
          providerOverride ||
          ((q, d) => exaSearch(q, d, process.env.EXA_API_KEY!))
        )(query, domain);
        await tx(actor.tenant_id, async (db) => {
          await db.query(
            "UPDATE research_runs SET state='complete',results=$2,provider_request_id=$3,finished_at=now() WHERE id=$1",
            [reservation.id, JSON.stringify(result.sources), result.requestId],
          );
          await audit(db, actor, companyId, "research.completed", null, {
            runId: reservation.id,
            resultCount: result.sources.length,
          });
        });
      } catch (error) {
        // A failed/ambiguous provider call keeps its durable reservation. Replaying
        // the same command never spends another request, even after a restart.
        const message =
          error instanceof AppError
            ? error.message
            : "Research did not finish with a confirmed result. Check the provider account before starting another request.";
        await tx(actor.tenant_id, async (db) => {
          await db.query(
            "UPDATE research_runs SET state='failed',message=$2,finished_at=now() WHERE id=$1",
            [reservation.id, message],
          );
          await audit(db, actor, companyId, "research.failed", null, {
            runId: reservation.id,
          });
        });
      }
    }
    res.json(
      await tx(
        actor.tenant_id,
        async (db) =>
          (
            await db.query(
              "SELECT id,query,domain,state,results,message,created_at FROM research_runs WHERE id=$1 AND company_id=$2",
              [reservation.id, companyId],
            )
          ).rows[0],
      ),
    );
  });
  router.post("/:runId/sources/:index/import", async (req, res) => {
    z.object({}).strict().parse(req.body);
    const runId = z.uuid().parse(req.params.runId),
      index = z.coerce.number().int().min(0).max(4).parse(req.params.index);
    res.json(
      await run(req, async (db: any) => {
        const actor = user(req),
          companyId = company(req);
        await companyCheck(db, actor, companyId);
        const job = (
          await db.query(
            "SELECT * FROM research_runs WHERE id=$1 AND company_id=$2 FOR UPDATE",
            [runId, companyId],
          )
        ).rows[0];
        if (!job) fail(404, "NOT_FOUND", "Research run not found.");
        const source = job.results[index] as ResearchSource;
        if (job.state !== "complete" || !source)
          fail(
            409,
            "RESEARCH_NOT_READY",
            "This source is not available to import.",
          );
        if (source.importedId)
          return getRecord(db, companyId, source.importedId);
        const record = await createOrEdit(db, actor, companyId, "evidence", {
          title: source.title,
          type: "Public research",
          text: `Public-source snapshot, collected ${source.retrievedAt}. Claims need review with the team.\nURL: ${source.url}\nSHA-256: ${source.contentHash}\n${source.excerpted ? "Excerpt: first 6,000 characters.\n" : ""}\n${source.text}`,
          locator: `Research run ${runId}, result ${index + 1}`,
          originId: source.url,
          sourceDate: source.publishedDate,
          classification: "Inferred",
          bucket: "biz",
          personId: "",
          assetId: "",
        });
        source.importedId = record.id;
        await db.query("UPDATE research_runs SET results=$2 WHERE id=$1", [
          runId,
          JSON.stringify(job.results),
        ]);
        return record;
      }),
    );
  });
  return router;
}
