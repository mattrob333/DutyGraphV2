import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { pool } from "./db.ts";
import { projectAll } from "./projection.ts";
import { runRetention } from "./retention.ts";
export const hostedAuthLimit: RequestHandler = async (req, res, next) => {
  try {
    const secret = process.env.PROVIDER_ENCRYPTION_KEY;
    if (!secret)
      return res.status(503).json({
        code: "HOST_NOT_READY",
        message: "Hosted configuration is not ready.",
      });
    const bucket = createHmac("sha256", secret)
      .update(`${req.ip}:${Math.floor(Date.now() / 900000)}`)
      .digest("hex");
    const result = await pool.query(
      "INSERT INTO auth_attempts(bucket,attempts,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(bucket) DO UPDATE SET attempts=auth_attempts.attempts+1 RETURNING attempts",
      [bucket],
    );
    if (result.rows[0].attempts > 40) {
      res.setHeader("Retry-After", "900");
      return res.status(429).json({
        code: "RATE_LIMITED",
        message: "Too many attempts. Wait 15 minutes before trying again.",
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};
export async function runMaintenance({
  retention = runRetention,
  projection = projectAll,
  cleanup = async () => {
    await pool.query("DELETE FROM auth_attempts WHERE expires_at<now()");
  },
} = {}) {
  // Retention must finish before any optional remote database work can time out.
  await retention();
  await cleanup();
  await projection();
}

export const maintenance: RequestHandler = async (req, res, next) => {
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`,
    actual = req.header("Authorization") || "";
  if (
    !process.env.CRON_SECRET ||
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return res.status(401).json({ code: "AUTH_REQUIRED" });
  try {
    await runMaintenance();
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};
