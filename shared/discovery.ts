import { z } from "zod";

const short = z.string().trim().min(1).max(200);
const optional = z.string().max(3000);
const sources = z.array(z.string().max(160)).min(1).max(30);
export const discoveryStages = [
  "contact",
  "agenda",
  "roster",
  "interviews",
  "tasks",
] as const;
export type DiscoveryStage = (typeof discoveryStages)[number];
export const dossierSchema = z
  .object({
    name: short,
    email: z.string().max(254),
    role: z.string().max(200),
    department: z.string().max(200),
    managerEmail: z.string().max(254),
    duties: z
      .array(z.object({ title: short, description: optional }).strict())
      .max(12),
    sourceIds: sources,
  })
  .strict();
export const discoverySchemas = {
  contact: z
    .object({
      summary: optional,
      emailSubject: short,
      emailBody: z.string().min(1).max(12000),
      questions: z.array(short).min(3).max(8),
    })
    .strict(),
  agenda: z
    .object({
      summary: optional,
      sections: z
        .array(
          z
            .object({
              title: short,
              purpose: optional,
              questions: z.array(short).min(1).max(5),
            })
            .strict(),
        )
        .min(1)
        .max(8),
      gaps: z.array(short).max(10),
    })
    .strict(),
  roster: z
    .object({
      summary: optional,
      people: z.array(dossierSchema).max(60),
      gaps: z.array(short).max(12),
    })
    .strict(),
  interviews: z
    .object({
      summary: optional,
      interviews: z
        .array(
          z
            .object({
              personId: z.uuid(),
              title: short,
              emailSubject: short,
              emailBody: z.string().min(1).max(12000),
              questions: z.array(short).min(3).max(8),
            })
            .strict(),
        )
        .min(1)
        .max(60),
    })
    .strict(),
  tasks: z
    .object({
      summary: optional,
      tasks: z
        .array(
          z
            .object({
              title: short,
              duty: short,
              ownerId: z.union([z.uuid(), z.literal("")]),
              performerId: z.union([z.uuid(), z.literal("")]),
              purpose: optional,
              trigger: optional,
              inputs: optional,
              instructions: optional,
              output: optional,
              systems: z.array(short).max(20),
              humanGate: optional,
              sourceIds: sources,
            })
            .strict(),
        )
        .max(30),
      gaps: z.array(short).max(12),
    })
    .strict(),
};
export const discoveryInstructions: Record<DiscoveryStage, string> = {
  contact:
    "Prepare the point of contact for a FIRST executive kickoff. Use public research only to describe the industry, offer and likely customer context, clearly qualifying uncertainty. Never assume an internal workflow, department, employee or supplier process. Write a warm, concise email asking this contact to invite executives who must contribute and provide a roster of participating people, emails, departments and responsibilities. Ask goals for one month, six months and one year, vision, current problems and meeting logistics. Explain that their private response page helps the advisor prepare. Do not invent a meeting date or private URL. Questions should be easy to answer in bullets or by voice. This is preparation for a meeting, not the full employee work interview.",
  agenda:
    "Prepare an advisor's live executive kickoff agenda using public research and the point-of-contact's actual preliminary response. State what is already known and ask the most useful missing questions. Use sections for introductions and scope; customers and value delivery; goals and vision; departments, people and responsibilities; constraints and next steps. Adapt language to this company; do not insert supplier onboarding unless sources actually support it. Include concrete questions that elicit employee names, email addresses, managers and departmental duties. The advisor will facilitate the discussion, not send this full agenda to all employees as an assessment.",
  roster:
    "Extract the audit roster from the contact's response and executive kickoff notes. Populate a dossier for each explicitly named participant with name, stated email, department, role, stated manager email and duties. Use only internal accounts; public research cannot establish membership or duty ownership. Leave missing email, role, department and manager email as empty strings. Never invent a person's email or turn a job title into an unstated duty. Cite internal source IDs for every dossier. Preserve contradictions in gaps. Duties may be concise paraphrases of stated responsibilities, not a catalogue of generic tasks. Do not include everyone mentioned in a customer story as an employee.",
  interviews:
    "Create ONE tailored work interview for EVERY person in the supplied reviewed roster. Match personId exactly. Use their department, role, reviewed duties, leadership context and evidence gaps. Ask four to six conversational questions about a recent example of their actual work: trigger, inputs, tools, actions, output, recipient, decisions, exceptions and waiting. Avoid asking them to describe the entire company again. Include a short personalized email explaining how to open the private page, speak or type answers, review and submit. No fabricated links, schedules or deployed AI agents. Do not omit or duplicate any supplied person.",
  tasks:
    "Turn returned team interviews into proposed task cards. Each card describes one useful unit of work, its duty, trigger, inputs, instructions, output, tools and human decision boundary. Cite the original response or accepted evidence IDs. Match ownerId and performerId to supplied people only; leave blank when ownership is not established. Preserve disagreements and missing handoffs in gaps. Do not claim participant confirmation or delegate work to AI. Do not infer an executable workflow from a vague statement. Use concrete simple language, and keep the card specific to this business.",
};

export const participantTaskExtraction = discoverySchemas.tasks.extend({
  tasks: z
    .array(
      discoverySchemas.tasks.shape.tasks.element.extend({
        destination: z.string().max(3000),
      }),
    )
    .max(30),
});
