import { z } from "zod";
const url = z
  .url()
  .refine(
    (v) => ["https:", "http:"].includes(new URL(v).protocol),
    "Only public web links are allowed",
  );
const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const source = z
  .object({
    id: text,
    url,
    title: text,
    publisher: text,
    type: text,
    accessedAt: z.iso.date(),
  })
  .passthrough();
const claim = z
  .object({
    id: text,
    statement: text,
    support: z.enum([
      "documented",
      "vendor_claim",
      "independently_supported",
      "not_found",
    ]),
    sourceIds: z.array(text),
    limitations: z.string(),
  })
  .passthrough();
export const researchEntry = z.object({
  name: text,
  category: text,
  description: text,
  url,
  question: text,
  reviewed: z.iso.date(),
});
export const researchEvidence = z
  .object({
    name: text,
    id,
    companyName: text,
    companyUrl: url,
    primaryCategoryId: id,
    secondaryCategoryIds: z.array(id),
    productType: text,
    availability: text,
    buyerRoles: z.array(text),
    problemsSolved: z.array(text),
    sources: z.array(source).min(1),
    claims: z.array(claim).min(1),
    limitations: z.array(text),
    reviewStatus: z.literal("verified"),
    reviewedAt: z.iso.date(),
  })
  .passthrough();
export const researchCategory = z
  .object({ id, label: text, definition: text })
  .passthrough();
export function validateDirectory(
  entriesInput: unknown,
  evidenceInput: unknown,
  taxonomyInput: unknown,
) {
  const entries = z.array(researchEntry).parse(entriesInput),
    evidence = z.array(researchEvidence).parse(evidenceInput),
    taxonomy = z.array(researchCategory).parse(taxonomyInput);
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length)
      throw new Error(`Duplicate ${label}`);
  };
  unique(
    entries.map((x) => x.name.toLowerCase()),
    "entry name",
  );
  unique(
    evidence.map((x) => x.id),
    "product id",
  );
  unique(
    evidence.map((x) => x.name.toLowerCase()),
    "evidence name",
  );
  unique(
    taxonomy.map((x) => x.id),
    "category",
  );
  if (entries.length !== evidence.length)
    throw new Error("Entries and evidence must match one-to-one");
  for (const e of entries) {
    const proof = evidence.find((p) => p.name === e.name);
    if (!proof) throw new Error(`Missing evidence: ${e.name}`);
    if (
      taxonomy.find((t) => t.id === proof.primaryCategoryId)?.label !==
      e.category
    )
      throw new Error(`Category mismatch: ${e.name}`);
    if (
      proof.secondaryCategoryIds.some(
        (id) => !taxonomy.some((t) => t.id === id),
      )
    )
      throw new Error(`Unknown secondary category: ${e.name}`);
    unique(
      proof.sources.map((x) => x.id),
      "source id",
    );
    unique(
      proof.claims.map((x) => x.id),
      "claim id",
    );
    if (
      proof.claims.some((c) =>
        c.sourceIds.some((id) => !proof.sources.some((s) => s.id === id)),
      )
    )
      throw new Error(`Broken claim source: ${e.name}`);
    if (
      proof.claims.some((c) => c.support !== "not_found" && !c.sourceIds.length)
    )
      throw new Error(`Unsupported claim: ${e.name}`);
  }
  return { entries, evidence, taxonomy };
}
