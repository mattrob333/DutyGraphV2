import { z } from "zod";
import { previewRoster } from "./roster.ts";

export const kickoffFields = [
  {
    id: "goals",
    title: "Vision, goals and measures",
    hint: "What should change in 1 month, 6 months and 1 year? Include an owner, baseline, target and date where known.",
  },
  {
    id: "departments",
    title: "Departments, roles and responsibilities",
    hint: "For each department: purpose, leader, roles and ongoing duties. Distinguish the accountable owner from the person doing the work.",
  },
  {
    id: "streams",
    title: "Business streams and shared work",
    hint: "Confirm the proposed streams. Trace one example through each separately. Which departments serve both? Name shared duties once and explain which streams they serve.",
  },
  {
    id: "handoffs",
    title: "Handoffs, problems and evidence",
    hint: "Who produces what, who needs it next, and what makes it ready? Include delays, volumes or rework examples. Mark estimates and unknowns.",
  },
  {
    id: "systems",
    title: "Systems and useful preparation material",
    hint: "List key software, sources of truth and available SOPs or anonymized examples. Do not include passwords or customer records.",
  },
  {
    id: "logistics",
    title: "Meeting and discovery scope",
    hint: "Confirm the two-hour meeting date, time zone, sponsor, scope exclusions and who can resolve missing information. Attendee selections below do not send invitations.",
  },
] as const;
export const kickoffPreparationSchema = z
  .object({
    csv: z.string().max(500000),
    rosterUnavailableReason: z.string().trim().max(2000),
    executiveEmails: z.array(z.email().max(254)).max(500),
    participantEmails: z.array(z.email().max(254)).max(500),
    answers: z
      .object(
        Object.fromEntries(
          kickoffFields.map((f) => [f.id, z.string().trim().max(6000)]),
        ) as Record<(typeof kickoffFields)[number]["id"], z.ZodString>,
      )
      .strict(),
  })
  .strict();
export type KickoffPreparation = z.infer<typeof kickoffPreparationSchema>;
export function emptyKickoffPreparation(): KickoffPreparation {
  return {
    csv: "",
    rosterUnavailableReason: "",
    executiveEmails: [],
    participantEmails: [],
    answers: Object.fromEntries(
      kickoffFields.map((f) => [f.id, ""]),
    ) as KickoffPreparation["answers"],
  };
}
export function validateKickoffPreparation(value: unknown) {
  const data = kickoffPreparationSchema.parse(value);
  if (new TextEncoder().encode(data.csv).byteLength > 500000)
    throw new Error("Choose a CSV smaller than 500 KB.");
  const preview = previewRoster(data.csv);
  if (data.csv.trim()) {
    if (
      preview.errors.length ||
      !preview.rows.length ||
      preview.rows.some((r) => r.issues.length)
    )
      throw new Error(
        "Correct all CSV errors before sending the kickoff package.",
      );
    const emails = new Set(preview.rows.map((r) => r.data.email));
    for (const selected of [data.executiveEmails, data.participantEmails]) {
      if (
        new Set(selected).size !== selected.length ||
        selected.some((e) => !emails.has(e))
      )
        throw new Error(
          "Select attendees and pilot participants from the uploaded team list.",
        );
    }
    if (!data.executiveEmails.length)
      throw new Error("Select at least one executive kickoff attendee.");
    if (!data.participantEmails.length)
      throw new Error("Select at least one pilot discovery participant.");
  } else {
    if (!data.rosterUnavailableReason)
      throw new Error(
        "Upload the team CSV or explain who will provide it and when.",
      );
    if (data.executiveEmails.length || data.participantEmails.length)
      throw new Error("Attendee selections require a team CSV.");
  }
  if (!data.answers.goals || !data.answers.departments || !data.answers.streams)
    throw new Error(
      "Add goals, department responsibilities and business streams, or explicitly describe what is still unknown.",
    );
  return { data, preview };
}
export function kickoffPreparationText(data: KickoffPreparation) {
  const rows = data.csv.trim() ? previewRoster(data.csv).rows : [];
  return [
    "Executive kickoff preparation — contact supplied; advisor review pending.",
    ...kickoffFields.map(
      (f) => `${f.title}\n${data.answers[f.id] || "Not yet supplied"}`,
    ),
    `Executive kickoff attendees: ${data.executiveEmails.join(", ") || "Not yet supplied"}`,
    `Pilot discovery participants: ${data.participantEmails.join(", ") || "Not yet supplied"}`,
    data.rosterUnavailableReason
      ? `Roster follow-up: ${data.rosterUnavailableReason}`
      : "",
    `Team roster (${rows.length} people; reporting lines do not establish duty ownership):\n` +
      rows
        .map(
          (r) =>
            `${r.data.name} | ${r.data.email} | ${r.data.role} | ${r.data.team} | reports to ${r.data.managerEmail || "not stated"}`,
        )
        .join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Deterministic timeboxes keep every generated section within a two-hour meeting. */
export function kickoffTimeboxes(sections: { title: string }[]) {
  if (!sections.length) return [];
  const units = Math.floor(24 / sections.length),
    extra = 24 % sections.length;
  let start = 0;
  return sections.map((s, i) => {
    const minutes = (units + (i < extra ? 1 : 0)) * 5;
    const slot = { ...s, start, minutes };
    start += minutes;
    return slot;
  });
}
