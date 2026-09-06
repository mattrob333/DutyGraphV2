import type { RequestHandler } from "express";
import { z } from "zod";
import { pool } from "./db.ts";

export const pilotSchema = z.object({
  inquiryType: z
    .enum(["pilot", "advisor", "enterprise", "team"])
    .default("pilot"),
  name: z.string().trim().min(2).max(120),
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  company: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(120),
  teamSize: z.enum(["1–10", "11–50", "51–200", "201+"]),
  goal: z.string().trim().min(10).max(2000),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
});

/** Public, write-only intake. A trigger queues an operator notification atomically. */
export const applyForPilot: RequestHandler = async (req, res) => {
  const data = pilotSchema.parse(req.body);
  if (!data.website) {
    try {
      await pool.query(
        `INSERT INTO pilot_applications(email,name,company,role,team_size,goal,consent_version,inquiry_type)
       VALUES($1,$2,$3,$4,$5,$6,'commercial-contact-v2',$7)`,
        [
          data.email,
          data.name,
          data.company,
          data.role,
          data.teamSize,
          data.goal,
          data.inquiryType,
        ],
      );
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
  // Identical receipt for duplicates; never reveal who has applied.
  res.status(202).json({
    message:
      data.inquiryType === "pilot"
        ? "Your demo request is saved. We will review it and contact you about a possible pilot. No meeting is booked yet."
        : "Your request is saved. We will review it and contact you about the next step. No meeting, program place, or role is confirmed yet.",
  });
};
