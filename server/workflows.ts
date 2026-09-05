import express from "express";
import { z } from "zod";
import { advisor, type AuthRequest } from "./auth.ts";
import { command, companyCheck, getRecord, putRecord, fail } from "./db.ts";
import {
  advanceCase,
  startCase,
  caseStatus,
  expireSteps,
  type CaseStep,
} from "../shared/workflow.ts";
export async function checkWorkflow(db: any, company: string, flow: any) {
  if (flow.kind !== "workflow" || flow.state !== "reviewed")
    fail(
      409,
      "WORKFLOW_NOT_REVIEWED",
      "Review the current workflow before starting or advancing a case.",
    );
  for (const binding of [
    ...flow.data.taskBindings,
    ...flow.data.handoffBindings,
  ]) {
    const r = await getRecord(db, company, binding.id);
    if (
      r.version !== binding.version ||
      r.hash !== binding.hash ||
      ["stale", "retracted", "conflicting"].includes(r.state)
    )
      fail(
        409,
        "STALE_WORKFLOW",
        "A pinned task or handoff changed. Review a new workflow version.",
      );
    if (
      r.kind === "task" &&
      (!r.data.reviewed ||
        !r.data.ownerId ||
        !r.data.performerId ||
        new Date(r.data.reviewDue + "T23:59:59Z").getTime() < Date.now())
    )
      fail(
        422,
        "TASK_NOT_REVIEWED",
        "Every step needs current reviewed work, an owner and a performer.",
      );
    if (r.kind === "handoff" && r.state !== "reviewed")
      fail(
        422,
        "HANDOFF_NOT_REVIEWED",
        "Review every handoff contract before using this workflow.",
      );
  }
}
export function workflowsRouter() {
  const router = express.Router({ mergeParams: true });
  router.use(advisor);
  const user = (req: express.Request) => (req as AuthRequest).actor;
  const run = (req: express.Request, fn: any) =>
    command(
      user(req),
      req.header("Idempotency-Key"),
      { path: req.originalUrl, body: req.body },
      fn,
    );
  router.post("/:workflowId/cases", async (req, res) =>
    res.status(201).json(
      await run(req, async (db: any) => {
        const c = await companyCheck(
          db,
          user(req),
          z.uuid().parse((req.params as Record<string, string>).companyId),
        );
        const flow = await getRecord(
          db,
          c.id,
          z.uuid().parse(req.params.workflowId),
          true,
        );
        const d = z
          .object({
            expectedVersion: z.number().int(),
            title: z.string().trim().min(3).max(200),
            inputReference: z.string().trim().min(5).max(4000),
          })
          .strict()
          .parse(req.body);
        if (flow.version !== d.expectedVersion)
          fail(
            409,
            "VERSION_CONFLICT",
            "Refresh the workflow before starting a case.",
          );
        await checkWorkflow(db, c.id, flow);
        return putRecord(
          db,
          user(req),
          c.id,
          "case",
          d.title,
          {
            workflowId: flow.id,
            workflowVersion: flow.version,
            workflowHash: flow.hash,
            definition: flow.data,
            inputReference: d.inputReference,
            steps: startCase(
              flow.data.taskIds,
              flow.data.links,
              flow.data.timeoutHours,
              Date.now(),
            ),
            events: [],
            executionMode: "human_observation_only",
          },
          "in_progress",
          undefined,
          "Started a durable manual work case; no external action executed",
        );
      }),
    ),
  );
  router.post("/cases/:caseId/actions", async (req, res) =>
    res.json(
      await run(req, async (db: any) => {
        const c = await companyCheck(
          db,
          user(req),
          z.uuid().parse((req.params as Record<string, string>).companyId),
        );
        const r = await getRecord(
          db,
          c.id,
          z.uuid().parse(req.params.caseId),
          true,
        );
        const d = z
          .object({
            expectedVersion: z.number().int(),
            stepId: z.uuid().optional(),
            action: z.enum(["complete", "fail", "retry", "cancel"]),
            note: z.string().trim().min(5).max(4000),
            routeIds: z.array(z.uuid()).max(40).default([]),
          })
          .strict()
          .parse(req.body);
        if (r.kind !== "case") fail(404, "NOT_FOUND", "Case not found.");
        if (r.version !== d.expectedVersion)
          fail(
            409,
            "VERSION_CONFLICT",
            "This case changed. Refresh before recording an action.",
          );
        if (["complete", "cancelled"].includes(r.state))
          fail(409, "CASE_CLOSED", "This case is already closed.");
        const now = Date.now(),
          steps = expireSteps(r.data.steps, now),
          flow = await getRecord(db, c.id, r.data.workflowId);
        if (d.action !== "cancel") {
          if (
            flow.version !== r.data.workflowVersion ||
            flow.hash !== r.data.workflowHash
          )
            fail(
              409,
              "STALE_WORKFLOW",
              "The workflow changed. Close this case and start one from the reviewed definition.",
            );
          await checkWorkflow(db, c.id, flow);
        }
        if (d.action !== "cancel") {
          const step =
            steps.find((s: CaseStep) => s.id === d.stepId) ||
            fail(422, "STEP_REQUIRED", "Choose a step in this case.");
          if (d.action === "retry") {
            if (!["failed", "escalated"].includes(step.state))
              fail(
                409,
                "STEP_NOT_RETRYABLE",
                "Only a failed or escalated step can be retried.",
              );
            if (step.attempts >= r.data.definition.maxAttempts)
              fail(
                409,
                "RETRY_LIMIT",
                "The workflow retry limit is reached. Escalate or close the case.",
              );
            step.attempts++;
            step.state = "ready";
            step.dueAt = new Date(
              now + r.data.definition.timeoutHours * 3600000,
            ).toISOString();
          } else {
            if (step.state !== "ready")
              fail(
                409,
                step.state === "escalated" ? "STEP_TIMEOUT" : "STEP_NOT_READY",
                step.state === "escalated"
                  ? "The deadline passed. Review the escalation and explicitly retry if allowed."
                  : "Only a ready step can be completed or failed.",
              );
            if (d.action === "complete") {
              const outgoing = r.data.definition.links.filter(
                (l: any) => l.from === step.id,
              );
              if (
                d.routeIds.some((id) => !outgoing.some((l: any) => l.id === id))
              )
                fail(
                  422,
                  "INVALID_ROUTE",
                  "A chosen route does not leave this step.",
                );
              if (outgoing.length && !d.routeIds.length)
                fail(
                  422,
                  "ROUTE_REQUIRED",
                  "Choose the handoffs whose conditions are met, or record failure and escalate.",
                );
              step.state = "completed";
              step.routes = [...new Set(d.routeIds)];
              step.completedAt = new Date(now).toISOString();
            } else step.state = "failed";
          }
          step.note = d.note;
        }
        const next = advanceCase(
          steps,
          r.data.definition.links,
          r.data.definition.joinPolicy,
          r.data.definition.timeoutHours,
          now,
        );
        return putRecord(
          db,
          user(req),
          c.id,
          "case",
          r.title,
          {
            ...r.data,
            steps: next,
            events: [
              ...r.data.events,
              {
                at: new Date(now).toISOString(),
                actorId: user(req).id,
                stepId: d.stepId || null,
                action: d.action,
                note: d.note,
                routeIds: d.routeIds,
              },
            ],
          },
          d.action === "cancel" ? "cancelled" : caseStatus(next),
          r,
          "Recorded human work observation: " + d.action,
        );
      }),
    ),
  );
  return router;
}
