import { sampleTasks, type DemoTask } from "./discovery-demo-tasks.ts";
export type TaskRef = { person: string; index: number };
export type TeamFinding = {
  id: string;
  label: string;
  title: string;
  observation: string;
  action: string;
  question: string;
  refs: TaskRef[];
};
const sameFields = [
  "title",
  "duty",
  "inputs",
  "instructions",
  "output",
  "handoff",
  "software",
] as const;
export function originalReviewedTask(
  cards: Record<string, DemoTask[]>,
  ref: TaskRef,
) {
  const current = cards[ref.person]?.[ref.index],
    original = sampleTasks(ref.person)[ref.index];
  return (
    !!current &&
    !!original &&
    current.decision === "correct" &&
    !current.edited &&
    sameFields.every((k) => current[k] === original[k])
  );
}
export function demoTeamFindings(
  cards: Record<string, DemoTask[]>,
): TeamFinding[] {
  const findings: TeamFinding[] = [
    {
      id: "approval",
      label: "Ownership gap",
      title: "Supplier approval still needs a named owner",
      observation:
        "Maya routes final approval but says the authorized owner is unresolved. Dana describes bank verification, which does not establish who approves the supplier.",
      action:
        "Ask leadership to name the approval authority and record the handoff before considering automation of that decision.",
      question:
        "Who can approve a supplier, and what evidence must they receive?",
      refs: [
        { person: "maya", index: 5 },
        { person: "dana", index: 1 },
      ],
    },
    {
      id: "replenishment",
      label: "Handoff to investigate",
      title: "Sales depends on a replenishment date from Procurement",
      observation:
        "Jordan describes waiting for Procurement’s supported date. Maya’s supplier-record account does not explain that replenishment work. This may be a coverage gap, not a broken process.",
      action:
        "Identify the replenishment owner, capture that task, and measure request-to-response time before calling it a bottleneck.",
      question:
        "Who supplies a replenishment date to Sales, and how is that request tracked?",
      refs: [
        { person: "jordan", index: 2 },
        ...sampleTasks("maya").map((_, index) => ({ person: "maya", index })),
      ],
    },
    {
      id: "software",
      label: "Service review question",
      title: "Review the supplier document and tracking setup",
      observation:
        "The packet check and status summary both use Google Sheets, with supplier documents in Google Drive. Shared software use alone does not prove duplicate tools or wasted spend.",
      action:
        "Inventory owners, licenses, integrations, manual entry, and data handling. Compare options only after confirming a need.",
      question:
        "Could an approved integration reduce repeated entry, or does the current setup already meet the team’s needs?",
      refs: [
        { person: "maya", index: 0 },
        { person: "maya", index: 4 },
      ],
    },
  ];
  return findings.filter((f) =>
    f.refs.every((r) => originalReviewedTask(cards, r)),
  );
}
export const demoHandoffs = [
  {
    label: "Supplier verification",
    refs: [
      { person: "maya", index: 3 },
      { person: "dana", index: 0 },
      { person: "dana", index: 1 },
    ],
  },
  {
    label: "Shipment to dispatch",
    refs: [
      { person: "riley", index: 2 },
      { person: "karl", index: 0 },
      { person: "karl", index: 2 },
    ],
  },
];
export function readoutMarkdown(
  findings: TeamFinding[],
  taskCount: number,
  candidateCount: number,
  notes: string,
) {
  return `# Cobalt discovery readout — fictional sample\n\nPrepared from ${taskCount} returned task descriptions. ${candidateCount} unchanged sample tasks are AI-assistance candidates, not authorized agents.\n\n## Purpose\nAgree on the work, resolve gaps, and choose the next measured improvement. These are prepared sample findings, not live AI analysis.\n\n## Suggested 30-minute agenda\n1. Confirm duties and task coverage (5 minutes).\n2. Walk through handoffs and evidence (10 minutes).\n3. Resolve ownership and coverage questions (10 minutes).\n4. Assign next actions and a review date (5 minutes).\n\n## Findings to discuss\n${findings.map((f) => `### ${f.title}\n${f.label}: ${f.observation}\n\nDecision question: ${f.question}\n\nProposed action: ${f.action}\n\nSource cards: ${f.refs.map((r) => `${r.person}: ${sampleTasks(r.person)[r.index].title}`).join("; ")}\n`).join("\n")}\n## Advisor discussion notes\n${notes || "No additional notes entered."}\n\n## Next steps\nName an owner and due date for each agreed action. Validate task descriptions changed in the meeting. Establish baseline wait time, error rate, and effort before claiming an improvement. Review candidate AI tasks against identity, access policies, and human approval. Do not select vendors or claim savings based only on shared software names.\n\nNo invitations sent, permissions granted, or agents issued by this demonstration.\n`;
}
