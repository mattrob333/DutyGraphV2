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
      .array(
        z
          .object({
            title: short,
            description: optional,
            existingDutyId: z.union([z.uuid(), z.literal("")]).default(""),
          })
          .strict(),
      )
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
// Existing-duty resolution is an advisor control, never a model-generated choice.
export const discoveryGenerationSchemas = {
  ...discoverySchemas,
  roster: discoverySchemas.roster.extend({
    people: z
      .array(
        dossierSchema.extend({
          duties: z
            .array(
              dossierSchema.shape.duties.element.omit({ existingDutyId: true }),
            )
            .max(12),
        }),
      )
      .max(60),
  }),
};
export const discoveryInstructions: Record<DiscoveryStage, string> = {
  contact:
    "Prepare the point of contact for a FIRST executive kickoff. Use public research only to describe the industry, offer and likely customer context, clearly qualifying uncertainty. Never assume an internal workflow, department, employee or supplier process. Write a warm, concise email asking this contact to invite executives who must contribute and provide a roster of participating people, emails, departments and responsibilities. The contact may be an executive assistant or coordinator. Ask them to correct the public company summary and proposed streams, identify departments and leaders, provide the roster with reporting managers, select executive attendees, and confirm meeting logistics. Answering to the best of their ability is enough; reserve detailed vision, time-bound goals and KPIs for the executive kickoff. Explain that their private response page helps the advisor prepare. Do not invent a meeting date or private URL. Questions should be easy to answer in bullets or by voice. This is preparation for a meeting, not the full employee work interview.",
  agenda:
    "Prepare an advisor's live executive kickoff agenda using public research and the point-of-contact's actual preliminary response. State what is already known and ask the most useful missing questions. Use sections for introductions and scope; customers and value delivery; goals and vision; departments, people and responsibilities; constraints and next steps. Adapt language to this company; do not insert supplier onboarding unless sources actually support it. Include concrete questions that elicit employee names, email addresses, managers and departmental duties. The advisor will facilitate the discussion, not send this full agenda to all employees as an assessment.",
  roster:
    "Extract the audit roster from the contact's response and executive kickoff notes. Populate a dossier for each explicitly named participant with name, stated email, department, role, stated manager email and duties. Use only internal accounts; public research cannot establish membership or duty ownership. Leave missing email, role, department and manager email as empty strings. Never invent a person's email or turn a job title into an unstated duty. Cite internal source IDs for every dossier. Preserve contradictions in gaps. Duties may be concise paraphrases of stated responsibilities, not a catalogue of generic tasks. Do not include everyone mentioned in a customer story as an employee.",
  interviews:
    "Create ONE tailored work interview for EVERY person in the supplied reviewed roster. Match personId exactly. Use their department, role, reviewed duties, leadership context and evidence gaps. Ask four to six conversational prompts that cover ALL supplied duties, not just one recent task. First elicit a list of regular tasks under each duty. Then ask the person to walk through each task: trigger, input data and who supplies it, software, ordered actions, checkable output, recipient, dependencies, decisions, exceptions and waiting. Separate preparation from approval and system changes. Ask what a replacement colleague would need to know. Do not force a fixed task count. Avoid asking them to describe the entire company again. Include a short personalized email explaining how to open the private page, speak or type answers, review and submit. No fabricated links, schedules or deployed AI agents. Do not omit or duplicate any supplied person.",
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

discoveryInstructions.contact +=
  " Use captureGuide.models to ask whether the operating model fits, including hybrid streams. Keep the initial request light: leadership attendees; roster with reporting managers; department purposes and main duties; goals and evidence; a representative customer or beneficiary journey; and available SOPs. Ask for categories and anonymized examples, not passwords or customer records.";
discoveryInstructions.agenda +=
  " Cover all eight captureGuide.sections in the meeting agenda, combining related questions only if coverage is preserved. Use the selected models' stage names and probes to tailor a concrete walkthrough for EACH business stream. If no profile is selected, identify the operating model first; do not assume a supplier workflow. Elicit department purpose -> role -> ongoing duty -> recurring task -> ordered actions -> output and handoff. Capture upstream input suppliers, downstream recipients, software sources of truth, exception owners and human decision boundaries. Ask for a replacement-colleague level example, but defer exhaustive task procedures to the employees. Include baseline/target/owner/time horizon for goals; missing information becomes a named follow-up, never an invented answer. The structured notes guide is a question checklist, not evidence that any stage or task actually exists.";
discoveryInstructions.roster +=
  " Preserve distinct duties across each person's stated responsibilities, including supporting and exception work. In duty descriptions retain the stated outcome, regular task examples, input supplier, recipient and systems where given so personal interviews inherit useful context. A department leader is not automatically the performer of every departmental task. Record ambiguous performer or owner assignments in gaps for review.";
discoveryInstructions.interviews +=
  " Use up to eight concise prompts when needed to cover the person's duties. Tie prompts to named duties and software only when the supplied internal context establishes them. Include repeat frequency or volume, required input fields and source, ordered actions, completion checks, output artifact and destination, exception/approval boundaries and upstream/downstream dependencies. Leaders describe their own leadership work, not all subordinate tasks. Ask for anonymized examples rather than confidential documents or credentials. Explain that after recording they save the audio, create and check the transcript, create task cards, approve or edit each card, and send them together.";

const streamBoundaries =
  " Keep business streams, organizational departments, reporting lines, roles, duties, tasks and ordered actions distinct. The first selected stream is primary for engagement focus; every retained supporting stream remains in scope. Walk through each stream separately. A department may serve multiple streams. Describe a genuinely shared duty or task once and explicitly name the streams it serves. Same person or same task title does not establish the same work: keep different triggers, outputs, approvals and recipients distinct. Qualify duty/task names by stream where needed to avoid ambiguity. Never assign work from a job title, reporting line, template stage or public website. Do not infer a sequence from stage order: identify the exact upstream output, downstream required input, acceptance check and exception owner. Record absent or disputed links as unresolved, not as facts. Bottleneck claims need timing, throughput, queue or rework evidence; otherwise label a hypothesis.";
for (const stage of discoveryStages)
  discoveryInstructions[stage] += streamBoundaries;
discoveryInstructions.contact +=
  " The private page includes CSV upload (name, email, role, department, manager_email), separate executive-attendee and pilot-participant checkboxes, and structured leadership context. Ask for C-suite, VPs, department heads, sponsor and relevant board representatives for a two-hour kickoff; do not imply all staff attend. Explain that selections do not automatically invite anyone. Ask for vision, goals with baseline/target/owner/date, department purposes and duties, separate business streams and shared work, known handoff problems, key software/SOPs and meeting logistics. Use the supplied business brief's concrete offers and market context, qualify unknown size or facts, and request corrections. Do not ask the contact to fill a full task inventory before kickoff.";
discoveryInstructions.agenda +=
  " This is a TWO-HOUR executive kickoff. The UI assigns consecutive timeboxes totaling 120 minutes to your sections. Start from the returned preparation package including selected executive attendees, pilot participants and missing-roster follow-up. Distinguish people on the roster from selected discovery participants. Cover decisions to confirm: scope and streams; goals and KPIs; departments, roles and ongoing duties; a representative task and explicit handoffs per stream; shared services; gaps and owners for follow-up. Public research is background, never evidence of internal responsibilities. When preparation is missing, mark this as a provisional agenda and list what must still be obtained.";

discoveryInstructions.roster +=
  " Leave existingDutyId empty in generated dossiers. The advisor can explicitly select an existing duty during review when correcting that same responsibility; never resolve same-title duties by guessing.";

discoveryInstructions.roster +=
  " When a preparation package names pilot participants, use that selection as the starting interview scope. A person listed only for the org chart or executive meeting is not automatically a work-interview participant. Include additional people only when the internal meeting account explicitly brings them into discovery scope; make the change clear for advisor review.";
