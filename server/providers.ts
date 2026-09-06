import {
  aiModelIds,
  defaultAiModel,
  reasoningLevels,
} from "../shared/ai-models.ts";
import { Router } from "express";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import type pg from "pg";
import { advisor, type AuthRequest } from "./auth.ts";
import { tx, command, companyCheck, audit, fail } from "./db.ts";
export const providerNames = ["openai", "exa", "resend"] as const;
export type ProviderName = (typeof providerNames)[number];
function encryptionKey() {
  const raw = process.env.PROVIDER_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/.test(raw))
    fail(
      503,
      "KEY_STORAGE_UNAVAILABLE",
      "The operator must configure encrypted provider-key storage.",
    );
  return Buffer.from(raw, "hex");
}
export function sealSecret(value: string, context: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const bytes = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), bytes]
    .map((b) => b.toString("base64"))
    .join(".");
}
export function openSecret(value: string, context: string) {
  const [iv, tag, bytes] = value
    .split(".")
    .map((v) => Buffer.from(v, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(bytes), decipher.final()]).toString(
    "utf8",
  );
}
export async function providerConfig(
  tenant: string,
  provider: ProviderName,
  client?: pg.PoolClient,
) {
  const read = async (db: pg.PoolClient) =>
    (
      await db.query("SELECT * FROM provider_settings WHERE provider=$1", [
        provider,
      ])
    ).rows[0];
  const row = client ? await read(client) : await tx(tenant, read);
  if (row)
    return {
      configured: row.enabled,
      source: "account",
      key: row.enabled
        ? openSecret(row.encrypted_key, `${tenant}:${provider}`)
        : "",
      config: row.config,
    };
  // Environment fallbacks are local-only. Hosted accounts never share an operator's paid API key.
  const localKey = !process.env.VERCEL
    ? process.env[
        {
          openai: "OPENAI_API_KEY",
          exa: "EXA_API_KEY",
          resend: "RESEND_API_KEY",
        }[provider]
      ] || ""
    : "";
  const enabled =
    provider !== "exa" || process.env.ENABLE_EXA_RESEARCH === "true";
  return {
    configured: !!localKey && enabled,
    source: "none",
    key: enabled ? localKey : "",
    config: { model: defaultAiModel, from: process.env.RESEND_FROM || "" },
  };
}
export function providersRouter() {
  const router = Router({ mergeParams: true });
  router.use(advisor);
  const actor = (req: any) => (req as AuthRequest).actor;
  router.get("/", async (req, res) => {
    const u = actor(req),
      company = z
        .uuid()
        .parse((req.params as Record<string, string>).companyId);
    const result = await tx(u.tenant_id, async (db) => {
      await companyCheck(db, u, company);
      const rows = (
        await db.query(
          "SELECT provider,enabled,config,updated_at FROM provider_settings",
        )
      ).rows;
      const neo = rows.find((r) => r.provider === "neo4j");
      return {
        data: providerNames.map((provider) => ({
          provider,
          config: {},
          configured: !!rows.find((r) => r.provider === provider)?.enabled,
          source: rows.some((r) => r.provider === provider)
            ? "account"
            : "none",
          ...rows.find((r) => r.provider === provider),
        })),
        neo4j: {
          configured: !!neo?.enabled,
          connected: !!neo?.enabled && !!neo?.config?.verifiedAt,
          verifiedAt: neo?.config?.verifiedAt || null,
          endpoint: neo?.config?.endpoint || "",
          store: "PostgreSQL",
        },
      };
    });
    res.json({
      storageReady: /^[a-f0-9]{64}$/.test(
        process.env.PROVIDER_ENCRYPTION_KEY || "",
      ),
      providers: result.data,
      neo4j: result.neo4j,
    });
  });
  router.put("/:provider", async (req, res) => {
    const provider = z.enum(providerNames).parse(req.params.provider),
      u = actor(req),
      company = z
        .uuid()
        .parse((req.params as Record<string, string>).companyId);
    const d = z
      .object({
        key: z
          .string()
          .trim()
          .min(12)
          .max(512)
          .regex(/^[\x21-\x7e]+$/),
        enabled: z.boolean(),
        model: z.enum(aiModelIds).default(defaultAiModel),
        reasoning: z.enum(reasoningLevels).default("medium"),
        from: z.union([z.email(), z.literal("")]).default(""),
      })
      .strict()
      .parse(req.body);
    if (provider === "resend" && !d.from)
      fail(
        422,
        "SENDER_REQUIRED",
        "Enter an email address on a domain verified in Resend.",
      );
    const encrypted = sealSecret(d.key, `${u.tenant_id}:${provider}`);
    res.json(
      await command(
        u,
        req.header("Idempotency-Key"),
        { path: req.originalUrl, body: req.body },
        async (db) => {
          await companyCheck(db, u, company);
          const config =
            provider === "openai"
              ? { model: d.model, reasoning: d.reasoning }
              : provider === "resend"
                ? { from: d.from }
                : {};
          await db.query(
            "INSERT INTO provider_settings(tenant_id,provider,encrypted_key,enabled,config) VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant_id,provider) DO UPDATE SET encrypted_key=$3,enabled=$4,config=$5,updated_at=now()",
            [u.tenant_id, provider, encrypted, d.enabled, config],
          );
          await audit(db, u, company, "provider.settings_saved", null, {
            provider,
            enabled: d.enabled,
          });
          return { ok: true };
        },
      ),
    );
  });
  router.delete("/:provider", async (req, res) => {
    const provider = z.enum(providerNames).parse(req.params.provider),
      u = actor(req),
      company = z
        .uuid()
        .parse((req.params as Record<string, string>).companyId);
    z.object({})
      .strict()
      .parse(req.body || {});
    res.json(
      await command(
        u,
        req.header("Idempotency-Key"),
        { path: req.originalUrl, body: req.body },
        async (db) => {
          await companyCheck(db, u, company);
          await db.query("DELETE FROM provider_settings WHERE provider=$1", [
            provider,
          ]);
          await audit(db, u, company, "provider.settings_removed", null, {
            provider,
          });
          return { ok: true };
        },
      ),
    );
  });
  return router;
}
