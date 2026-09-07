import { z } from "zod";

const ids = z.array(z.string().min(1).max(150)).max(8);
export const frameworkOutputSchema = z
  .object({
    frameworkKey: z.string().max(40),
    scope: z.string().trim().min(1).max(600),
    summary: z.string().trim().min(1).max(3000),
    inputs: z
      .array(
        z
          .object({
            key: z.string().max(60),
            status: z.enum(["Found", "Partial", "Missing"]),
            value: z.string().min(1).max(1000),
            sourceIds: ids,
          })
          .strict(),
      )
      .max(8),
    sections: z
      .array(
        z
          .object({
            id: z.string().max(60),
            items: z
              .array(
                z
                  .object({
                    title: z.string().trim().min(1).max(180),
                    detail: z.string().trim().min(1).max(1200),
                    basis: z.enum([
                      "Reported",
                      "Inferred",
                      "Assumed",
                      "Missing",
                    ]),
                    confidence: z.enum(["Low", "Medium", "High"]),
                    confidenceReason: z.string().min(1).max(400),
                    sourceIds: ids,
                    values: z
                      .array(
                        z
                          .object({
                            key: z.string().max(60),
                            value: z.string().min(1).max(500),
                          })
                          .strict(),
                      )
                      .max(6),
                    nextStep: z.string().max(600),
                  })
                  .strict(),
              )
              .min(1)
              .max(6),
          })
          .strict(),
      )
      .max(13),
    questions: z.array(z.string().min(1).max(400)).max(8),
    warnings: z.array(z.string().min(1).max(600)).max(8),
  })
  .strict();
export type FrameworkOutput = z.infer<typeof frameworkOutputSchema>;
export type FrameworkSource = {
  id: string;
  version: number;
  hash: string;
  title: string;
  state: string;
  kind: string;
  locator: string;
  text: string;
  excerpted: boolean;
  frameworkKey?: string;
};
