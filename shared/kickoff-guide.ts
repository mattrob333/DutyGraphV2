import { businessProfileSchema, businessTemplates } from "./business-types.ts";

export const discoveryPromptVersion = "discovery-context-v3";
const groupProbes: Record<string, string> = {
  General:
    "Identify the customer or beneficiary, the unit of work, the promise made and how completion is recognized.",
  Services:
    "Trace an engagement or service request from scope and scheduling to delivery acceptance, billing and repeat work. Separate expert judgment from preparation.",
  Technology:
    "Trace a customer from purchase through provisioning, service delivery, support and renewal. Distinguish recurring service work from product development and change approval.",
  Commerce:
    "Trace an order from demand and availability through fulfillment, returns and settlement. Separate buying, inventory, selling and approval responsibilities.",
  Production:
    "Trace a job or batch from forecast and materials through production, quality checks, release and delivery. Capture rework, traceability and maintenance dependencies.",
  "Built environment":
    "Trace a project or property request through scope, estimate, commitment, scheduling, delivery and acceptance. Identify changes, subcontractor dependencies and inspection decisions.",
  Transport:
    "Trace a shipment or fulfillment order through booking, capacity, dispatch, tracking, proof of delivery and billing. Identify custody transfers and exception owners.",
  "Consumer services":
    "Trace a booking or customer visit through preparation, service, payment and follow-up. Identify shift handovers, capacity limits and recovery from service failures.",
  "Care & education":
    "Trace a beneficiary journey through intake, eligibility, scheduling, service and outcome follow-up. Identify professional decision boundaries; use anonymized examples.",
  "Financial services":
    "Trace an application or transaction through checks, decision, execution and reconciliation. Distinguish evidence preparation, authorization and independent review; avoid customer account data.",
  "Public & mission":
    "Trace a service or program from need and eligibility through funding, delivery and outcome reporting. Use beneficiary and mission outcomes, not an assumed sales funnel.",
};
const modelProbes: Record<string, string> = {
  saas: "What happens at signup, onboarding, provisioning, support escalation, release approval, usage billing and renewal? Which tasks belong to customer success versus engineering?",
  "managed-it":
    "Follow a service ticket, access request and change request separately. What are the triage rules, service commitments, escalation owners and approval checkpoints?",
  wholesale:
    "Follow a customer order and a supplier update separately. How do availability, purchasing, credit checks, picking, shipment and invoice matching depend on each other?",
  manufacturing:
    "Follow a production order through material readiness, scheduling, assembly, inspection, release and shipment. Where do bills of material, quality holds and rework change the task?",
  advisory:
    "Follow an engagement from diagnosis and proposal through evidence collection, analysis, client review, deliverable acceptance and follow-up. Which decisions remain with the client?",
};

/** Templates guide questions, never establish facts about this company. */
export function kickoffGuide(profile: unknown) {
  const parsed = businessProfileSchema.safeParse(profile);
  const streams = parsed.success ? parsed.data.streams : [];
  const models = streams.map((stream) => {
    const template = businessTemplates.find((t) => t.id === stream.templateId);
    return {
      name: stream.name,
      model: template?.label || "Custom operating model",
      stages: stream.stages.map((s) => s.name),
      probe:
        modelProbes[stream.templateId] ||
        groupProbes[template?.group || "General"],
    };
  });
  const sections = [
    {
      id: "business",
      title: "Business model and value flows",
      questions: [
        "What do you provide, to whom, and what result do they value? Confirm or correct the proposed business type and name any different business streams.",
        "Choose a recent order, engagement, service or program. Trace it from the first request to delivery, payment or funding, and ongoing support. What is the unit of completed work?",
      ],
    },
    {
      id: "goals",
      title: "Goals and evidence of success",
      questions: [
        "What should change in one month, six months and one year? For each goal, name its owner, measure, current baseline if known, target and review date.",
        "Which problem matters most, who feels it, and what evidence would distinguish its cause from a symptom? Mark estimates and unknown baselines explicitly.",
      ],
    },
    {
      id: "people",
      title: "Departments, people and reporting",
      questions: [
        "Name each department's purpose and leader, including enabling teams such as IT, finance and HR. Who is in scope and who else must contribute?",
        "Provide names, work emails, job roles, departments and reporting managers. Bring the roster CSV if available. Distinguish reporting lines from responsibility for work.",
      ],
    },
    {
      id: "duties",
      title: "Responsibilities under each role",
      questions: [
        "For each department and role, list ongoing duties and the outcomes they maintain. Who is accountable and who actually performs the work? Identify shared or disputed responsibility.",
        "Which recurring daily, weekly or event-driven tasks produce each duty's outcomes? Include support work, exceptions and less-visible administrative work.",
      ],
    },
    {
      id: "tasks",
      title: "One concrete task walkthrough",
      questions: [
        "For a representative task, name the trigger, input data or documents and sender, ordered actions, software, checkable result and recipient. What must a replacement colleague know?",
        "Where does preparation end and a decision, system update or handoff begin? What happens when information is missing, inconsistent or late? Ask employees to fill in the detailed procedures later.",
      ],
    },
    {
      id: "handoffs",
      title: "Dependencies and delays",
      questions: [
        "At each department boundary, who supplies what to whom, through which channel, by when, and with what acceptance check? Who resolves a rejected or missing handoff?",
        "Where do work queues, duplicate checks, rework or unowned decisions appear? Request examples and timing or volume evidence; do not declare a bottleneck from opinion alone.",
      ],
    },
    {
      id: "systems",
      title: "Software, information and decision boundaries",
      questions: [
        "Which systems and records support each flow? Identify the source of truth, system owner, spreadsheets, manual transfers and sensitive information categories without sharing secrets.",
        "Which steps require a named human, independent check, SOP or approval? Who can verify access and delegation rules? Existing access is not permission to delegate it to an agent.",
      ],
    },
    {
      id: "followup",
      title: "Agree the discovery follow-up",
      questions: [
        "Confirm each participant's department, role and duties for their voice-first interview. Who will supply the missing names, emails, SOPs, examples and workflow evidence, and by when?",
        "Agree scope exclusions, completion timing and the findings meeting. Employee task approval records their understanding; the advisor and team will reconcile differences afterwards.",
      ],
    },
  ];
  return {
    version: discoveryPromptVersion,
    models,
    sections,
    profileMissing: !parsed.success,
  };
}

export function composeKickoffNotes(
  profile: unknown,
  answers: Record<string, string>,
  transcript: string,
) {
  const guide = kickoffGuide(profile);
  const captured = guide.sections.filter((s) => answers[s.id]?.trim());
  const uncaptured = guide.sections.filter((s) => !answers[s.id]?.trim());
  if (!captured.length) return transcript.trim();
  return [
    "Executive kickoff — advisor-reviewed notes",
    ...captured.map((s) => `${s.title}\n${answers[s.id].trim()}`),
    transcript.trim()
      ? `Meeting transcript / additional notes\n${transcript.trim()}`
      : "",
    uncaptured.length
      ? "Coverage note: sections not separately captured may be present in the transcript. Check before treating them as missing: " +
        uncaptured.map((s) => s.title).join("; ")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
