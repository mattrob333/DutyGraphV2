import { randomUUID } from "node:crypto";
import type pg from "pg";
import { z } from "zod";
import { schemas, type RecordRow, type User } from "../shared/domain.ts";
import {
  gapReplyPlanSchema,
  gapReplyInstructions,
} from "../shared/gap-reply.ts";
import { defaultAiModel, modelGenerationOptions } from "../shared/ai-models.ts";
import { pool, tx, hash, audit, putRecord, setState, AppError } from "./db.ts";
import { publicUser } from "./auth.ts";
import { providerConfig } from "./providers.ts";
import { createOrEdit } from "./records.ts";

export type GapReplyInput = {
  response: {
    id: string;
    version: number;
    hash: string;
    text: string;
    personId: string;
  };
  stage: {
    streamId: string;
    stageId: string;
    stageLabel: string;
    gapKeys: string[];
  };
  records: RecordRow[];
};
export type GapReplyProvider = (
  input: GapReplyInput,
  key: string,
  model: string,
) => Promise<unknown>;
const snapshot = (r: RecordRow) => ({
  id: r.id,
  version: r.version,
  hash: r.hash,
});
const unknownText = (value: unknown) =>
  typeof value !== "string" ||
  !value.trim() ||
  /^(not (yet )?(provided|reported|specified|known)|unknown|missing|to be confirmed|not yet documented)[.!]?$/i.test(
    value.trim(),
  );

export const openAiGapReply: GapReplyProvider = async (input, key, model) => {
  const schema = z.toJSONSchema(gapReplyPlanSchema);
  delete schema.$schema;
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(60000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      ...modelGenerationOptions(model, "medium"),
      instructions: gapReplyInstructions,
      input: JSON.stringify(input),
      text: {
        format: {
          type: "json_schema",
          name: "gap_reply",
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
      "GAP_REPLY_PROVIDER",
      `AI returned HTTP ${r.status}.`,
    );
  }
  const reader = r.body?.getReader();
  if (!reader) throw new Error("No provider result");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 1500000) {
      await reader.cancel();
      throw new Error("Provider result too large");
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

export function validateGapReply(value: unknown, input: GapReplyInput) {
  const plan = gapReplyPlanSchema.parse(value);
  const refs = new Set<string>();
  for (const item of [
    ...plan.tasks,
    ...plan.duties,
    ...plan.handoffs,
    ...plan.workflows,
  ]) {
    if (refs.has(item.ref))
      throw new Error("The reply plan contains duplicate references.");
    refs.add(item.ref);
    if (item.quotes.some((q) => !input.response.text.includes(q)))
      throw new Error(
        "The reply plan contains a quote absent from the saved response.",
      );
    for (const field of [
      "ownerId",
      "performerId",
      "exceptionOwnerId",
    ] as const) {
      const id = (item as any)[field];
      if (!id) continue;
      const person = input.records.find(
        (r) => r.id === id && r.kind === "person",
      );
      const text = item.quotes.join(" ").toLowerCase();
      const name = String(person?.data.name || person?.title || "").trim();
      const named =
        !!name &&
        new RegExp(
          `(?:^|[^\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^\\p{L}\\p{N}])`,
          "iu",
        ).test(text);
      if (
        !person ||
        !(
          named ||
          (id === input.response.personId && /\b(i|my|me)\b/i.test(text))
        )
      )
        throw new Error(
          "A proposed assignment lacks a named team member in its response evidence.",
        );
    }
  }
  for (const kind of ["tasks", "duties"] as const)
    for (const item of plan[kind]) {
      if (
        item.id &&
        (item.ref !== item.id ||
          !input.records.some(
            (r) =>
              r.id === item.id &&
              r.kind === (kind === "tasks" ? "task" : "duty"),
          ))
      )
        throw new Error(
          "The reply plan edits a record outside its saved context.",
        );
      if (!item.id && input.records.some((r) => r.id === item.ref))
        throw new Error("A new reference collides with a saved record.");
    }
  const taskRefs = new Set([
    ...input.records.filter((r) => r.kind === "task").map((r) => r.id),
    ...plan.tasks.map((t) => t.ref),
  ]);
  for (const item of [...plan.duties, ...plan.workflows])
    if (item.taskRefs.some((ref) => !taskRefs.has(ref)))
      throw new Error("A task reference is outside this response context.");
  for (const item of plan.handoffs)
    if (
      ![item.sourceTaskRef, item.targetTaskRef].every((ref) =>
        taskRefs.has(ref),
      )
    )
      throw new Error("A handoff references unavailable work.");
  for (const item of plan.workflows)
    if (
      item.handoffRefs.some((ref) => !plan.handoffs.some((h) => h.ref === ref))
    )
      throw new Error("A workflow references an unavailable handoff.");
  return plan;
}

/** Called inside the submission transaction: no provider/network work here. */
export async function enqueueGapReply(
  db: pg.PoolClient,
  user: User,
  companyId: string,
  request: RecordRow,
  response: RecordRow,
) {
  if (
    request.data.type !== "work" ||
    request.data.questionPlanVersion !== "work-gap:v1"
  )
    return null;
  if (
    request.company_id !== companyId ||
    response.company_id !== companyId ||
    response.kind !== "response" ||
    response.data.requestId !== request.id ||
    response.data.personId !== request.data.personId
  )
    throw new Error("Gap response does not match its request.");
  await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    user.tenant_id + ":gap-reply:" + response.id,
  ]);
  const existing = (
    await db.query(
      "SELECT id,state FROM provider_jobs WHERE tenant_id=$1 AND company_id=$2 AND kind='gap_reply' AND input->>'responseId'=$3",
      [user.tenant_id, companyId, response.id],
    )
  ).rows[0];
  if (existing) return existing;
  const id = randomUUID();
  await db.query(
    "INSERT INTO provider_jobs(id,tenant_id,company_id,kind,state,input) VALUES($1,$2,$3,'gap_reply','queued',$4)",
    [
      id,
      user.tenant_id,
      companyId,
      {
        responseId: response.id,
        responseSnapshot: snapshot(response),
        requestId: request.id,
        requestSnapshot: snapshot(request),
        gapContext: request.data.gapContext || null,
      },
    ],
  );
  await audit(db, user, companyId, "gap_reply.queued", response.id, {
    jobId: id,
    responseSnapshot: snapshot(response),
  });
  return { id, state: "queued" };
}

async function finish(
  db: pg.PoolClient,
  job: any,
  state: string,
  result: any,
  message: string,
) {
  await db.query(
    "UPDATE provider_jobs SET state=$2,result=$3,message=$4,finished_at=now() WHERE id=$1 AND tenant_id=$5",
    [job.id, state, result, message, job.tenant_id],
  );
  await db.query(
    "UPDATE companies SET revision=revision+1 WHERE id=$1 AND tenant_id=$2",
    [job.company_id, job.tenant_id],
  );
  return { id: job.id, state, message, result };
}
async function recover(db: pg.PoolClient) {
  await db.query(
    "UPDATE provider_jobs SET state='unknown',message='Your reply is saved. AI processing stopped without a confirmed result; an advisor should check provider usage before starting another run.',finished_at=now() WHERE kind='gap_reply' AND state='running' AND COALESCE((input->>'claimedAt')::timestamptz,created_at)<now()-interval '5 minutes'",
  );
}
async function context(db: pg.PoolClient, job: any, lock = false) {
  const company = (
    await db.query(
      "SELECT * FROM companies WHERE id=$1 AND tenant_id=$2" +
        (lock ? " FOR UPDATE" : ""),
      [job.company_id, job.tenant_id],
    )
  ).rows[0];
  const records: RecordRow[] = (
    await db.query(
      "SELECT * FROM records WHERE company_id=$1 AND tenant_id=$2 ORDER BY id" +
        (lock ? " FOR UPDATE" : ""),
      [job.company_id, job.tenant_id],
    )
  ).rows;
  const request = records.find(
    (r) => r.id === job.input.requestId && r.kind === "request",
  );
  const response = records.find(
    (r) => r.id === job.input.responseId && r.kind === "response",
  );
  const sponsor = (
    await db.query(
      "SELECT u.* FROM record_versions v JOIN users u ON u.id=v.actor_id AND u.tenant_id=v.tenant_id WHERE v.record_id=$1 AND v.tenant_id=$2 ORDER BY v.version LIMIT 1",
      [job.input.requestId, job.tenant_id],
    )
  ).rows[0];
  const gap = job.input.gapContext;
  const issues: string[] = [];
  if (!company || !request || !response || !sponsor)
    issues.push(
      "The original request, reply or sponsoring account is unavailable.",
    );
  if (sponsor && sponsor.role !== "advisor")
    issues.push(
      "The original sponsoring account no longer has advisor access. The saved reply needs advisor review.",
    );
  if (!gap || gap.version !== 1 || !Array.isArray(gap.recordSnapshots))
    issues.push(
      "The request has no saved gap context. Ask an advisor to review this reply.",
    );
  if (
    request &&
    (request.hash !== job.input.requestSnapshot?.hash ||
      request.version !== job.input.requestSnapshot?.version ||
      request.data.questionPlanVersion !== "work-gap:v1")
  )
    issues.push("The request changed after this reply was saved.");
  if (
    response &&
    (response.hash !== job.input.responseSnapshot?.hash ||
      response.version !== job.input.responseSnapshot?.version ||
      !["returned", "accepted"].includes(response.state))
  )
    issues.push(
      "The source reply changed or is no longer available for processing.",
    );
  if (company && gap) {
    if (hash(company.settings?.businessProfile || null) !== gap.profileHash)
      issues.push(
        "The company's saved stages changed since the questions were sent.",
      );
    if (
      !company.settings?.businessProfile?.streams?.some(
        (s: any) =>
          s.id === gap.streamId &&
          s.stages?.some((stage: any) => stage.id === gap.stageId),
      )
    )
      issues.push("The requested business stage is no longer available.");
    for (const old of gap.recordSnapshots || [])
      if (
        !records.some(
          (r) =>
            r.id === old.id && r.hash === old.hash && r.version === old.version,
        )
      )
        issues.push(
          "Work changed since these questions were sent. Current edits were preserved.",
        );
  }
  return {
    company,
    records,
    request,
    response,
    user: sponsor ? publicUser(sponsor) : undefined,
    gap,
    issues: [...new Set(issues)],
  };
}

export async function processGapReply(
  tenantId: string,
  jobId: string,
  provider: GapReplyProvider = openAiGapReply,
) {
  const claim = await tx(tenantId, async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "tenant-command:" + tenantId,
    ]);
    await recover(db);
    const job = (
      await db.query(
        "SELECT * FROM provider_jobs WHERE tenant_id=$1 AND id=$2 AND kind='gap_reply' AND state IN ('queued','waiting_configuration') FOR UPDATE SKIP LOCKED",
        [tenantId, jobId],
      )
    ).rows[0];
    if (!job) return null;
    const c = await context(db, job);
    if (c.issues.length) {
      await finish(
        db,
        job,
        "needs_review",
        { unresolved: c.issues, appliedRecordIds: [] },
        "Your reply is saved. An advisor should review changed work before it is updated.",
      );
      return null;
    }
    const config = await providerConfig(tenantId, "openai", db);
    if (
      provider === openAiGapReply &&
      (c.company.sandbox || !config.configured)
    ) {
      await db.query(
        "UPDATE provider_jobs SET state='waiting_configuration',message=$2 WHERE id=$1",
        [
          job.id,
          c.company.sandbox
            ? "Fictional workspaces require an injected test provider. Your reply is saved."
            : "Your reply is saved. Automatic updates will resume when your advisor configures AI.",
        ],
      );
      return null;
    }
    const scopedIds = new Set(c.gap.recordSnapshots.map((r: any) => r.id));
    const records = c.records.filter(
      (r) =>
        r.kind === "person" ||
        (scopedIds.has(r.id) &&
          ["task", "duty", "handoff", "workflow"].includes(r.kind)),
    );
    const input: GapReplyInput = {
      response: {
        ...snapshot(c.response!),
        text: c.response!.data.text || "",
        personId: c.response!.data.personId,
      },
      stage: {
        streamId: c.gap.streamId,
        stageId: c.gap.stageId,
        stageLabel: c.gap.stageLabel,
        gapKeys: c.gap.gapKeys,
      },
      records,
    };
    if (records.length > 600 || JSON.stringify(input).length > 220000) {
      await finish(
        db,
        job,
        "needs_review",
        {
          unresolved: [
            "This workspace exceeds the bounded reply context. An advisor can review the saved response.",
          ],
          appliedRecordIds: [],
        },
        "Your reply is saved and needs advisor review.",
      );
      return null;
    }
    job.input = {
      ...job.input,
      claimedAt: new Date().toISOString(),
      processingSnapshots: records.map(snapshot),
    };
    await db.query(
      "UPDATE provider_jobs SET state='running',input=$2,message='Your reply is saved. Updating proposed work.' WHERE id=$1",
      [job.id, job.input],
    );
    return { job, input, config };
  });
  if (!claim) return null;
  let raw: unknown;
  try {
    raw = await provider(
      claim.input,
      claim.config.key,
      claim.config.config.model || defaultAiModel,
    );
  } catch (error) {
    return tx(tenantId, async (db) => {
      const job = (
        await db.query(
          "SELECT * FROM provider_jobs WHERE id=$1 AND state='running' FOR UPDATE",
          [jobId],
        )
      ).rows[0];
      if (!job) return null;
      return finish(
        db,
        job,
        error instanceof AppError ? "failed" : "unknown",
        {
          appliedRecordIds: [],
          unresolved: [
            "Your reply is saved. AI did not return a confirmed usable result. An advisor should check the provider before another run.",
          ],
        },
        "Your reply is saved; automatic processing did not finish. No work was changed.",
      );
    });
  }
  try {
    const plan = validateGapReply(raw, claim.input);
    return await tx(tenantId, async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        "tenant-command:" + tenantId,
      ]);
      const job = (
        await db.query(
          "SELECT * FROM provider_jobs WHERE id=$1 AND tenant_id=$2 AND state='running' FOR UPDATE",
          [jobId, tenantId],
        )
      ).rows[0];
      if (!job) return null;
      const c = await context(db, job, true);
      for (const old of job.input.processingSnapshots || [])
        if (
          !c.records.some(
            (r) =>
              r.id === old.id &&
              r.version === old.version &&
              r.hash === old.hash,
          )
        )
          c.issues.push(
            "Work changed while the reply was being processed. Current work was preserved.",
          );
      if (c.issues.length)
        return finish(
          db,
          job,
          "needs_review",
          {
            draft: plan,
            unresolved: [...new Set(c.issues)],
            appliedRecordIds: [],
          },
          "Your reply is saved. Newer work was preserved for advisor review.",
        );
      const user = c.user!,
        response = c.response!,
        request = c.request!;
      let evidence = c.records.find(
        (r) =>
          r.kind === "evidence" &&
          r.state === "accepted" &&
          r.data.originId === response.id &&
          r.data.responseHash === response.hash &&
          r.data.responseVersion === response.version,
      );
      if (!evidence)
        evidence = await putRecord(
          db,
          user,
          job.company_id,
          "evidence",
          request.title + " — gap response",
          {
            title: request.title,
            type: "Employee account",
            text: response.data.text,
            responseHash: response.hash,
            responseVersion: response.version,
            originId: response.id,
            personId: response.data.personId,
            bucket: "org",
            locator: `Gap response ${response.id}`,
            classification: "Known",
            assetId: response.data.assetId || "",
            sourceDate: response.created_at,
            automaticCapture: true,
            assurance:
              "An employee account, not independent confirmation or authority.",
          },
          "accepted",
        );
      if (response.state !== "accepted")
        await setState(
          db,
          user,
          job.company_id,
          response,
          "accepted",
          "response.accepted",
        );
      if (request.state !== "accepted")
        await setState(
          db,
          user,
          job.company_id,
          request,
          "accepted",
          "request.accepted",
        );
      const notes: string[] = [];
      const appliedRecordIds: string[] = [],
        unresolved = [...plan.unresolved];
      const refs = new Map(
        c.records.filter((r) => r.kind === "task").map((r) => [r.id, r.id]),
      );
      const stageLink = { streamId: c.gap.streamId, stageId: c.gap.stageId };
      const reason =
        "Proposed from a saved gap response; human review and authority remain separate.";
      const due = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      const save = async (
        kind: "task" | "duty" | "handoff" | "workflow",
        item: any,
        data: any,
        existing?: RecordRow,
      ) => {
        const parsed = schemas[kind].safeParse(data);
        if (!parsed.success) {
          unresolved.push(
            `${item.title || kind}: more reported detail is needed before this record can be saved.`,
          );
          return null;
        }
        await db.query("SAVEPOINT gap_item");
        try {
          const record = await createOrEdit(
            db,
            user,
            job.company_id,
            kind,
            parsed.data,
            existing,
          );
          refs.set(item.ref, record.id);
          appliedRecordIds.push(record.id);
          await audit(
            db,
            user,
            job.company_id,
            "gap_reply.proposed_work",
            record.id,
            {
              jobId,
              response: snapshot(response),
              evidenceId: evidence!.id,
              quotes: item.quotes,
              automatic: true,
            },
          );
          await db.query("RELEASE SAVEPOINT gap_item");
          return record;
        } catch (error) {
          await db.query("ROLLBACK TO SAVEPOINT gap_item");
          await db.query("RELEASE SAVEPOINT gap_item");
          if (!(error instanceof AppError)) throw error;
          unresolved.push(`${item.title || kind}: ${error.message}`);
          return null;
        }
      };
      const merge = async (kind: "task" | "duty", item: any, proposed: any) => {
        const existing = item.id
          ? c.records.find((r) => r.id === item.id)
          : undefined;
        if (
          !existing &&
          c.records.some(
            (r) =>
              r.kind === kind &&
              r.title.trim().toLowerCase() === item.title.trim().toLowerCase(),
          )
        ) {
          unresolved.push(
            `${item.title}: similar saved work needs advisor review to avoid a duplicate.`,
          );
          return null;
        }
        if (!existing) return save(kind, item, proposed);
        const confirmations = (
          await db.query(
            "SELECT 1 FROM confirmations WHERE record_id=$1 AND accepted=true LIMIT 1",
            [existing.id],
          )
        ).rowCount;
        if (
          existing.state !== "proposed" ||
          existing.data.reviewed ||
          confirmations ||
          !c.gap.recordSnapshots.some(
            (s: any) =>
              s.id === existing.id &&
              s.hash === existing.hash &&
              s.version === existing.version,
          )
        ) {
          unresolved.push(
            `${existing.title}: reviewed or protected work was preserved.`,
          );
          return null;
        }
        const keys = Object.keys(schemas[kind].shape);
        const data: any = Object.fromEntries(
          keys
            .filter((k) => k in existing.data)
            .map((k) => [k, existing.data[k]]),
        );
        let changed = false;
        for (const [key, value] of Object.entries(proposed)) {
          if (
            [
              "reason",
              "reviewDue",
              "businessStageLinks",
              "evidenceIds",
              "taskIds",
            ].includes(key)
          )
            continue;
          if (Array.isArray(value)) {
            if (!existing.data[key]?.length && value.length) {
              data[key] = value;
              changed = true;
            } else if (
              value.length &&
              hash(value) !== hash(existing.data[key] || [])
            )
              unresolved.push(
                `${existing.title}: saved ${key} was preserved; the reply offers different detail.`,
              );
          } else if (!unknownText(value) && unknownText(existing.data[key])) {
            data[key] = value;
            changed = true;
          } else if (
            !unknownText(value) &&
            hash(value) !== hash(existing.data[key] ?? null)
          )
            unresolved.push(
              `${existing.title}: saved ${key} was preserved; the reply offers different detail.`,
            );
        }
        const links = existing.data.businessStageLinks || [];
        if (!links.length) {
          data.businessStageLinks = [stageLink];
          changed = true;
        } else if (
          !links.some(
            (l: any) =>
              l.streamId === stageLink.streamId &&
              l.stageId === stageLink.stageId,
          )
        )
          unresolved.push(
            `${existing.title}: existing stage mapping was preserved.`,
          );
        if (kind === "duty" && proposed.taskIds?.length) {
          data.taskIds = [
            ...new Set([...(existing.data.taskIds || []), ...proposed.taskIds]),
          ];
          changed ||=
            data.taskIds.length !== (existing.data.taskIds || []).length;
        }
        if (!changed) {
          refs.set(item.ref, existing.id);
          return existing;
        }
        data.evidenceIds = [
          ...new Set([...(existing.data.evidenceIds || []), evidence!.id]),
        ];
        data.reason = reason;
        return save(kind, item, data, existing);
      };
      for (const item of plan.tasks) {
        const { ref: _ref, id: _id, quotes: _quotes, ...fields } = item;
        if (!item.id)
          for (const key of [
            "duty",
            "purpose",
            "trigger",
            "inputs",
            "instructions",
            "output",
            "humanGate",
          ] as const) {
            if (unknownText(fields[key])) {
              fields[key] = "Not reported.";
              unresolved.push(`${item.title}: ${key} was not reported.`);
            }
          }
        await merge("task", item, {
          ...fields,
          businessStageLinks: [stageLink],
          evidenceIds: [evidence.id],
          mode: "human_only",
          classification: "Inferred",
          reviewDue: due,
          reason,
        });
      }
      for (const item of plan.duties) {
        const taskIds = item.taskRefs.map((ref) => refs.get(ref));
        if (taskIds.some((id) => !id)) {
          unresolved.push(
            `${item.title}: some described tasks still need detail.`,
          );
          continue;
        }
        await merge("duty", item, {
          title: item.title,
          ownerId: item.ownerId,
          purpose: item.purpose,
          scope: item.scope,
          taskIds,
          businessStageLinks: [stageLink],
          evidenceIds: [evidence.id],
          reviewDue: due,
          reason,
        });
      }
      for (const item of plan.handoffs) {
        const {
          ref: _ref,
          quotes: _quotes,
          sourceTaskRef,
          targetTaskRef,
          ...fields
        } = item;
        // Required numeric slots are inactive storage placeholders, never reported policy.
        // documentationOnly is enforced by checkWorkflow even after a state-only review.
        if (item.timeoutHours === null || item.maxRetries === null)
          notes.push(
            `${item.title}: execution timing and retry settings remain unconfigured.`,
          );
        for (const key of [
          "condition",
          "outputMapping",
          "requiredInput",
          "acceptanceCheck",
          "failureAction",
        ] as const)
          if (unknownText(fields[key])) fields[key] = "Not reported.";
        await save("handoff", item, {
          ...fields,
          documentationOnly: true,
          timeoutHours: item.timeoutHours ?? 1,
          maxRetries: item.maxRetries ?? 0,
          sourceTaskId: refs.get(sourceTaskRef),
          targetTaskId: refs.get(targetTaskRef),
          evidenceIds: [evidence.id],
          reason,
        });
      }
      for (const item of plan.workflows) {
        const {
          ref: _ref,
          quotes: _quotes,
          taskRefs,
          handoffRefs,
          ...fields
        } = item;
        if (item.timeoutHours === null || item.maxAttempts === null)
          notes.push(
            `${item.title}: execution timing and attempt limits remain unconfigured.`,
          );
        await save("workflow", item, {
          ...fields,
          documentationOnly: true,
          timeoutHours: item.timeoutHours ?? 1,
          maxAttempts: item.maxAttempts ?? 1,
          taskIds: taskRefs.map((ref) => refs.get(ref)),
          handoffIds: handoffRefs.map((ref) => refs.get(ref)),
          reason,
        });
      }
      const result = {
        summary: plan.summary,
        appliedRecordIds,
        unresolved: [...new Set(unresolved)],
        notes,
        evidenceId: evidence.id,
        response: snapshot(response),
        draft: plan,
        automatic: true,
      };
      const message = appliedRecordIds.length
        ? `${appliedRecordIds.length} work records updated as proposals.${unresolved.length ? " Some details need advisor review." : ""}`
        : "Your reply is saved. Remaining details are available for advisor review.";
      await audit(
        db,
        user,
        job.company_id,
        "gap_reply.processed",
        response.id,
        {
          jobId,
          appliedRecordIds,
          evidenceId: evidence.id,
          unresolved: result.unresolved,
          automatic: true,
        },
      );
      return finish(
        db,
        job,
        unresolved.length ? "needs_review" : "complete",
        result,
        message,
      );
    });
  } catch {
    return tx(tenantId, async (db) => {
      const job = (
        await db.query(
          "SELECT * FROM provider_jobs WHERE id=$1 AND state='running' FOR UPDATE",
          [jobId],
        )
      ).rows[0];
      if (!job) return null;
      return finish(
        db,
        job,
        "needs_review",
        {
          appliedRecordIds: [],
          unresolved: [
            "The AI result could not be safely validated or saved. The original reply is preserved for advisor review.",
          ],
        },
        "Your reply is saved. No work was changed because the proposed result needs review.",
      );
    });
  }
}

async function nextTenant() {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const cursor = (
      await db.query(
        "SELECT last_tenant_id FROM maintenance_cursors WHERE name='gap_reply' FOR UPDATE",
      )
    ).rows[0];
    if (!cursor)
      throw new Error("Gap reply maintenance migration is required.");
    const next = (
      await db.query(
        "SELECT id FROM tenants ORDER BY CASE WHEN $1::uuid IS NULL OR id>$1::uuid THEN 0 ELSE 1 END,id LIMIT 1",
        [cursor.last_tenant_id],
      )
    ).rows[0];
    if (next)
      await db.query(
        "UPDATE maintenance_cursors SET last_tenant_id=$1,updated_at=now() WHERE name='gap_reply'",
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
export async function processGapReplies({
  provider,
  limit = 1,
}: { provider?: GapReplyProvider; limit?: number } = {}) {
  const bounded = Math.max(
    1,
    Math.min(3, Number.isFinite(limit) ? Math.floor(limit) : 3),
  );
  const seen = new Set<string>(),
    results: any[] = [];
  for (let scanned = 0; scanned < 20 && results.length < bounded; scanned++) {
    const tenant = await nextTenant();
    if (!tenant || seen.has(tenant)) break;
    seen.add(tenant);
    const jobs = await tx(tenant, async (db) => {
      await recover(db);
      return (
        await db.query(
          "SELECT id FROM provider_jobs WHERE kind='gap_reply' AND state IN ('queued','waiting_configuration') ORDER BY CASE WHEN state='queued' THEN 0 ELSE 1 END,created_at,id LIMIT $1",
          [bounded - results.length],
        )
      ).rows;
    });
    for (const job of jobs)
      results.push(await processGapReply(tenant, job.id, provider));
  }
  return {
    inspectedTenants: seen.size,
    processed: results.filter(Boolean).length,
    results,
  };
}
