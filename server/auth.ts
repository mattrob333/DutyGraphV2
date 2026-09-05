import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { pool, tokenHash, fail, tx } from "./db.ts";
import type { User } from "../shared/domain.ts";
export type AuthRequest = Request & { actor: User; csrf: string };
export const passwordHash = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
};
export function passwordMatches(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const target = Buffer.from(digest, "hex"),
    actual = scryptSync(password, salt, 64);
  return target.length === actual.length && timingSafeEqual(target, actual);
}
export async function createSession(res: Response, user: User) {
  const token = randomBytes(32).toString("hex"),
    csrf = randomBytes(24).toString("hex");
  await pool.query(
    "INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '12 hours')",
    [tokenHash(token), user.id, csrf],
  );
  res.cookie("dg_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.APP_ORIGIN?.startsWith("https://"),
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  });
  return { user: publicUser(user), csrf };
}
export function publicUser(row: any): User {
  const { id, name, email, role, tenant_id, person_id, company_id } = row;
  return { id, name, email, role, tenant_id, person_id, company_id };
}
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies.dg_session;
    if (!token) fail(401, "AUTH_REQUIRED", "Sign in to continue.");
    const { rows } = await pool.query(
      "SELECT u.*,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
      [tokenHash(token)],
    );
    const row =
      rows[0] ||
      fail(401, "AUTH_REQUIRED", "Your session has expired. Sign in again.");
    (req as AuthRequest).actor = publicUser(row);
    (req as AuthRequest).csrf = row.csrf;
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.header("X-CSRF-Token") !== row.csrf
    )
      fail(403, "CSRF_REQUIRED", "Refresh your session before saving.");
    next();
  } catch (e) {
    next(e);
  }
}
export function advisor(req: Request, _res: Response, next: NextFunction) {
  try {
    if ((req as AuthRequest).actor.role !== "advisor")
      fail(403, "FORBIDDEN", "An advisor account is required for this action.");
    next();
  } catch (e) {
    next(e);
  }
}
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email().toLowerCase(),
    password: z.string().min(10).max(128),
    companyName: z.string().trim().min(2).max(200),
    scope: z.string().trim().min(3).max(1000),
    goal: z.string().trim().min(3).max(2000),
  })
  .strict();
export async function registerAccount(input: z.infer<typeof registerSchema>) {
  const tenant = randomUUID(),
    id = randomUUID();
  return tx(tenant, async (db) => {
    await db.query("INSERT INTO tenants(id,name) VALUES($1,$2)", [
      tenant,
      input.companyName,
    ]);
    const { rows } = await db.query(
      "INSERT INTO users(id,tenant_id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5,'advisor') RETURNING *",
      [id, tenant, input.email, input.name, passwordHash(input.password)],
    );
    await db.query(
      "INSERT INTO companies(id,tenant_id,name,scope,goal,settings) VALUES($1,$2,$3,$4,$5,$6)",
      [
        randomUUID(),
        tenant,
        input.companyName,
        input.scope,
        input.goal,
        defaultSettings(),
      ],
    );
    return publicUser(rows[0]);
  });
}
export function defaultSettings() {
  return {
    notice:
      "Responses are visible to the assigned advisor and the participant. Share only information approved for this engagement. Sources support work review and do not grant authority. Server audio retention: 30 days. Device drafts remain until you submit or discard them.",
    retentionDays: 30,
    reviewCadence: "Weekly",
    modules: ["discover", "diagnose", "govern"],
  };
}
