import { z } from "zod";
import type { BusinessProfile } from "./business-types.ts";
import type { RecordRow } from "./domain.ts";
import { stageWorkMap } from "./stage-work-map.ts";

export const gapContextSchema = z
  .object({
    version: z.literal(1),
    streamId: z.string().min(1).max(100),
    stageId: z.string().min(1).max(100),
    stageLabel: z.string().min(1).max(200),
    gapKeys: z.array(z.string().min(1).max(400)).min(1).max(30),
    recordSnapshots: z
      .array(
        z
          .object({
            id: z.uuid(),
            version: z.number().int().positive(),
            hash: z.string().min(1).max(100),
          })
          .strict(),
      )
      .max(300),
    profileHash: z.string().min(1).max(100),
  })
  .strict();
export type GapContext = z.infer<typeof gapContextSchema>;
export type GapRecipient = { personId: string; email: string };
export type GapPolicy = {
  enabled: boolean;
  recipients: GapRecipient[];
  actorId?: string;
  updatedAt?: string;
};
export type WorkGap = {
  key: string;
  streamId: string;
  stageId: string;
  stageLabel: string;
  code:
    | "stage_unexplained"
    | "task_detail"
    | "duty_tasks"
    | "work_sequence"
    | "owner_missing";
  title: string;
  detail: string;
  recordIds: string[];
  personIds: string[];
  questions: string[];
};

// An empty description is a knowledge gap. A short, useful description is not.
export const detailMissing = (value: unknown) =>
  !String(value ?? "").trim() ||
  /^(?:unknown|not (?:yet )?(?:known|provided|reported|specified|recorded|documented|established|captured)|to be (?:confirmed|defined)|tbd|missing)(?:\b[\s:—-].*)?\.?$/i.test(
    String(value).trim(),
  );

const unique = (ids: string[]) => [...new Set(ids.filter(Boolean))];
const label = (text: string, length = 82) =>
  text.length <= length ? text : text.slice(0, length - 1).trimEnd() + "…";

/** Assess saved work, never substitute an industry example for client evidence. */
export function assessWorkGaps(
  records: RecordRow[],
  profile?: BusinessProfile | null,
): WorkGap[] {
  const model = stageWorkMap(records, profile);
  const gaps: WorkGap[] = [];
  for (const stream of model.streams)
    for (const stage of stream.stages) {
      const add = (
        code: WorkGap["code"],
        recordIds: string[],
        title: string,
        detail: string,
        personIds: string[],
        questions: string[],
      ) => {
        gaps.push({
          key: [
            stream.id,
            stage.id,
            code,
            ...(code === "work_sequence" ? [] : recordIds.slice().sort()),
          ].join(":"),
          streamId: stream.id,
          stageId: stage.id,
          stageLabel: stage.name,
          code,
          title,
          detail,
          recordIds,
          personIds: unique(personIds).filter((id) =>
            stage.personIds.includes(id),
          ),
          questions,
        });
      };
      if (!stage.tasks.length && !stage.duties.length) {
        add(
          "stage_unexplained",
          [],
          "This stage has no work recorded",
          "Check whether this stage applies, or whether its work belongs elsewhere. A proposed stage does not prove work is missing.",
          [],
          [
            `Does “${label(stage.name)}” happen at your company? Tell us if it is handled elsewhere or does not apply.`,
            "If it applies, describe one recent example. What started it, what did you do, and what was the result?",
            "Who does this work, and who needs the result next?",
          ],
        );
        continue;
      }
      for (const duty of stage.duties) {
        const tasks = stage.tasks.filter((t) =>
          (duty.data.taskIds || []).includes(t.id),
        );
        if (!tasks.length)
          add(
            "duty_tasks",
            [duty.id],
            "The duty needs its tasks",
            `“${duty.title}” is recorded, but the work beneath it has not been described.`,
            [duty.data.ownerId],
            [
              `For “${label(duty.title)}”, walk us through one recent example. What did you do, in order?`,
              "What information or tools did you need, and how did you check the result?",
              "Who received the result, and what happened next? Say if you did all the work yourself.",
            ],
          );
      }
      for (const task of stage.tasks) {
        const fields = [
          ["trigger", "what starts it"],
          ["inputs", "what you need"],
          ["instructions", "the steps"],
          ["output", "the result"],
          ["destination", "who needs the result"],
        ].filter(([key]) => detailMissing(task.data[key]));
        const people = [
          task.data.performerId,
          task.data.ownerId,
          ...stage.duties
            .filter((d) => (d.data.taskIds || []).includes(task.id))
            .map((d) => d.data.ownerId),
        ];
        if (fields.length)
          add(
            "task_detail",
            [task.id],
            "A task needs more detail",
            `“${task.title}” is missing ${fields.map((f) => f[1]).join(", ")}.`,
            people,
            [
              `For “${label(task.title)}”, describe one recent example. What started it and what did you need?`,
              "What did you do, step by step? Include the tools you used and how you checked your work.",
              "What was the result, and who needed it next? Say if the work ended with you.",
            ],
          );
        if (
          stage.unownedTaskIds.includes(task.id) ||
          stage.unperformedTaskIds.includes(task.id)
        )
          add(
            "owner_missing",
            [task.id],
            "Who does or owns this work?",
            `“${task.title}” has an incomplete person assignment.`,
            people,
            [
              `Who does “${label(task.title)}”, and who is responsible for its result? They can be the same person.`,
            ],
          );
      }
      const unsequenced = stage.tasks.filter(
        (t) => !stage.flows.some((f) => f.taskIds.includes(t.id)),
      );
      if (unsequenced.length)
        add(
          "work_sequence",
          unsequenced.map((t) => t.id),
          "How the work connects is not recorded",
          `${unsequenced.length} ${unsequenced.length === 1 ? "task is" : "tasks are"} recorded here without a connected flow. The work may be standalone; we have not established that yet.`,
          [
            ...unsequenced.map((t) => t.data.performerId),
            ...unsequenced.map((t) => t.data.ownerId),
            ...stage.duties.map((d) => d.data.ownerId),
          ],
          [
            `For “${label(stage.name)}”, walk us through one recent example from start to finish. What did you do, in order?`,
            "What did each person receive, do, and pass on? Include the tools and checks you used.",
            "What marked the end of the work? Tell us if it was one task, done by one person, or handled in another stage.",
          ],
        );
    }
  return gaps;
}

/** One short request per person and stage. Only gaps actually asked about are claimed. */
export function buildGapFollowups(
  gaps: WorkGap[],
  selectedPersonIds: string[],
) {
  const chosen = new Set(selectedPersonIds);
  const groups: { personId: string; gapKeys: string[]; questions: string[] }[] =
    [];
  for (const gap of gaps
    .slice()
    .sort(
      (a, b) =>
        (a.code === "work_sequence" ? -1 : 0) -
        (b.code === "work_sequence" ? -1 : 0),
    )) {
    const personId = gap.personIds.find((id) => chosen.has(id));
    if (!personId) continue; // Titles and reporting lines do not assign respondents.
    let group = groups.find((g) => g.personId === personId);
    if (!group) {
      group = { personId, gapKeys: [], questions: [] };
      groups.push(group);
    }
    const questions = unique([...group.questions, ...gap.questions]);
    if (questions.length > 3 || group.gapKeys.length >= 30) continue;
    group.questions = questions;
    group.gapKeys.push(gap.key);
  }
  return groups.filter((g) => g.questions.length);
}

export function realRecipientEmail(email: string) {
  if (!z.email().safeParse(email).success) return false;
  const domain = email.split("@")[1].toLowerCase();
  return (
    !/(?:^|\.)example\.(?:com|net|org)$/.test(domain) &&
    domain !== "localhost" &&
    !/\.(?:invalid|test|example|localhost)$/.test(domain)
  );
}
