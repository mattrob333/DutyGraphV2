import Papa from "papaparse";
import { z } from "zod";
import { previewRoster } from "./roster.ts";
export const manualPersonSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    role: z.string().trim().min(1).max(200),
    team: z.string().trim().min(1).max(200),
    managerEmail: z
      .union([z.email().max(254), z.literal("")])
      .transform((v) => v.toLowerCase()),
    externalId: z.string().max(200).default(""),
  })
  .strict();
export type ManualPerson = z.infer<typeof manualPersonSchema>;
export const emptyManualPerson = (): ManualPerson => ({
  name: "",
  email: "",
  role: "",
  team: "",
  managerEmail: "",
  externalId: "",
});
export function writeManualRoster(
  csv: string,
  person: ManualPerson | null,
  index?: number,
) {
  const parsed = csv.trim() ? previewRoster(csv) : null;
  if (parsed?.errors.length)
    throw new Error(
      "Fix the CSV format errors before changing individual people.",
    );
  const rows = parsed?.rows.map((r) => r.data) || [];
  if (
    index !== undefined &&
    (!Number.isInteger(index) || index < 0 || index >= rows.length)
  )
    throw new Error("This person is no longer in the roster.");
  if (person) {
    const checked = manualPersonSchema.safeParse(person);
    if (!checked.success)
      throw new Error(
        "Enter a name, valid email, role/title and department. Reports to must be a valid email or blank; names and titles must be at most 200 characters.",
      );
    const next = checked.data;
    if (next.managerEmail === next.email)
      throw new Error("A person cannot report to themselves.");
    if (rows.some((r, i) => i !== index && r.email === next.email))
      throw new Error(
        "This email is already in the roster. Edit that person instead.",
      );
    if (index === undefined) rows.push(next);
    else rows[index] = next;
  } else if (index !== undefined) rows.splice(index, 1);
  if (rows.length > 500) throw new Error("The roster limit is 500 people.");
  if (!rows.length) return "";
  const output = Papa.unparse({
    fields: [
      "name",
      "email",
      "role",
      "department",
      "manager_email",
      "external_id",
    ],
    data: rows.map((r) => [
      r.name,
      r.email,
      r.role,
      r.team,
      r.managerEmail,
      r.externalId,
    ]),
  });
  if (new TextEncoder().encode(output).length > 500000)
    throw new Error("The roster exceeds 500 KB.");
  return output;
}
