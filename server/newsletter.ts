import type { RequestHandler } from "express";
import { z } from "zod";
import { pool } from "./db.ts";
const schema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
});
export const newsletterInterest: RequestHandler = async (req, res) => {
  const data = schema.parse(req.body);
  if (!data.website) {
    try {
      await pool.query(
        "INSERT INTO newsletter_interest(email,consent_version) VALUES($1,'governance-brief-interest-v1')",
        [data.email],
      );
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
  res
    .status(202)
    .json({
      message:
        "Your interest is saved. Before newsletter delivery begins, we will ask you to confirm by email. No newsletter has been sent.",
    });
};
