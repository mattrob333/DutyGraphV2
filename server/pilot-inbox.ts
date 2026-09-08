import { randomUUID } from "node:crypto";
import type { Router } from "express";
import type pg from "pg";
import { z } from "zod";
import { advisor, defaultSettings, type AuthRequest } from "./auth.ts";
import { command, fail, putRecord, tx } from "./db.ts";
import type { User } from "../shared/domain.ts";

export function isPilotInboxEmail(email: string) {
  const configured =
    process.env.PILOT_INBOX_EMAILS ?? process.env.PILOT_NOTIFY_TO ?? "";
  return configured
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map((v) => v.toLowerCase())
    .includes(email.toLowerCase());
}
async function authorize(db: pg.PoolClient, user: User) {
  if (user.role !== "advisor" || !isPilotInboxEmail(user.email))
    fail(
      403,
      "FORBIDDEN",
      "Demo requests are restricted to configured operators.",
    );
  await db.query("SELECT set_config('app.actor_id',$1,true)", [user.id]);
  if (
    !(
      await db.query(
        "SELECT 1 FROM pilot_inbox_operators WHERE user_id=$1 AND tenant_id=$2",
        [user.id, user.tenant_id],
      )
    ).rowCount
  )
    fail(
      403,
      "FORBIDDEN",
      "This account has not been provisioned for the demo inbox.",
    );
}
export function registerPilotInboxRoutes(api: Router) {
  api.patch("/pilot-inbox/:id", advisor, async (req, res) => {
    const user = (req as AuthRequest).actor;
    const id = z.uuid().parse(req.params.id);
    const input = z
      .object({
        stage: z.enum([
          "new",
          "contacted",
          "qualified",
          "scheduled",
          "active",
          "completed",
          "closed",
        ]),
        nextAction: z.string().trim().max(1000),
        expectedStage: z.string().max(30),
        expectedNextAction: z.string().max(1000),
      })
      .strict()
      .parse(req.body);
    await tx(user.tenant_id, (db) => authorize(db, user));
    res.json(
      await command(
        user,
        req.header("Idempotency-Key"),
        { action: "update-demo", id, ...input },
        async (db) => {
          await authorize(db, user);
          const row = (
            await db.query(
              "SELECT * FROM pilot_applications WHERE id=$1 FOR UPDATE",
              [id],
            )
          ).rows[0];
          if (!row) fail(404, "NOT_FOUND", "Demo request not found.");
          if (
            row.stage !== input.expectedStage ||
            row.next_action !== input.expectedNextAction
          )
            fail(
              409,
              "STALE_VERSION",
              "This request changed. Refresh and review before saving.",
            );
          return (
            await db.query(
              "UPDATE pilot_applications SET stage=$2,next_action=$3 WHERE id=$1 RETURNING *",
              [id, input.stage, input.nextAction],
            )
          ).rows[0];
        },
      ),
    );
  });
  api.get("/pilot-inbox", advisor, async (req, res) => {
    const user = (req as AuthRequest).actor;
    res.json(
      await tx(user.tenant_id, async (db) => {
        await authorize(db, user);
        return (
          await db.query(
            "SELECT * FROM pilot_applications ORDER BY created_at DESC LIMIT 200",
          )
        ).rows;
      }),
    );
  });
  api.post("/pilot-inbox/:id/open", advisor, async (req, res) => {
    const user = (req as AuthRequest).actor;
    const id = z.uuid().parse(req.params.id);
    // Check email even on receipt replay; database membership is checked below.
    await tx(user.tenant_id, (db) => authorize(db, user));
    res.json(
      await command(
        user,
        req.header("Idempotency-Key"),
        { action: "open-demo", id },
        async (db) => {
          await authorize(db, user);
          const lead = (
            await db.query(
              "SELECT * FROM pilot_applications WHERE id=$1 FOR UPDATE",
              [id],
            )
          ).rows[0];
          if (!lead) fail(404, "NOT_FOUND", "Demo request not found.");
          if (lead.converted_company_id)
            return { companyId: lead.converted_company_id, created: false };
          const companyId = randomUUID();
          const settings = {
            ...defaultSettings(),
            businessIntake: {
              name: lead.company,
              website: lead.company_url,
              description: lead.goal,
            },
            demoContact: {
              name: lead.name,
              email: lead.email,
              role: lead.role,
              teamSize: lead.team_size,
            },
            demoApplicationId: lead.id,
          };
          await db.query(
            "INSERT INTO companies(id,tenant_id,name,scope,goal,settings) VALUES($1,$2,$3,$4,$5,$6)",
            [
              companyId,
              user.tenant_id,
              lead.company,
              "Initial company discovery",
              lead.goal ||
                "Understand the business and prepare an executive kickoff",
              settings,
            ],
          );
          await putRecord(db, user, companyId, "person", lead.name, {
            name: lead.name,
            email: lead.email,
            role: lead.role,
            team: "Not yet provided",
            managerId: "",
            externalId: "",
            demoApplicationId: lead.id,
          });
          await db.query(
            "UPDATE pilot_applications SET converted_tenant_id=$2,converted_company_id=$3,stage='qualified',next_action='Research company and prepare kickoff' WHERE id=$1",
            [id, user.tenant_id, companyId],
          );
          return { companyId, created: true };
        },
      ),
    );
  });
}
