import { businessTemplates } from "./business-types.ts";

// Authored educational examples, not research findings or employee assignments.
const guides: Record<string, [string, string[]]> = {
  "wholesale-1": [
    "Find business customers and learn what supplies they need.",
    [
      "Talk with buyers about their products and quantities.",
      "Record account details and agree on a follow-up.",
    ],
  ],
  "wholesale-2": [
    "Check what can be supplied, when it can arrive and what it will cost.",
    [
      "Check stock and supplier lead times.",
      "Prepare a price and delivery estimate.",
    ],
  ],
  "wholesale-3": [
    "Agree on the order before work starts.",
    [
      "Check quantities, prices and delivery details.",
      "Record the accepted order and reserve stock.",
    ],
  ],
  "wholesale-4": [
    "Get the goods ready and deliver the order.",
    [
      "Buy missing stock and check incoming goods.",
      "Pick, pack and dispatch the shipment.",
    ],
  ],
  "wholesale-5": [
    "Bill the customer and follow the payment through.",
    [
      "Match the invoice to the order and delivery.",
      "Record payment and follow up on unpaid invoices.",
    ],
  ],
  "wholesale-6": [
    "Help existing customers plan their next order.",
    [
      "Review past orders and ask about upcoming needs.",
      "Agree on the next contact or replenishment plan.",
    ],
  ],
  "advisory-1": [
    "Find organizations that may need advice.",
    [
      "Talk with potential clients.",
      "Check whether their problem fits the service.",
    ],
  ],
  "advisory-2": [
    "Understand the client's problem before recommending a response.",
    [
      "Interview people and review examples of their work.",
      "Check the facts and identify what is still unknown.",
    ],
  ],
  "advisory-3": [
    "Agree on the advice to provide and the terms of the engagement.",
    [
      "Define the scope, fee and expected result.",
      "Record the client's agreement.",
    ],
  ],
  "advisory-4": [
    "Develop advice that helps the client make a decision.",
    [
      "Compare options and explain the evidence.",
      "Review recommendations with the client.",
    ],
  ],
  "advisory-5": [
    "Bill for the agreed advisory work.",
    [
      "Check the fee and agreed billing milestone.",
      "Prepare the invoice and follow payment.",
    ],
  ],
  "advisory-6": [
    "Review results and discuss further needs.",
    [
      "Ask what changed after the advice.",
      "Agree on any follow-up work separately.",
    ],
  ],
  "custom-software-1": [
    "Find projects that fit the team's skills.",
    ["Talk to potential clients.", "Check the problem, budget and timing."],
  ],
  "custom-software-2": [
    "Understand what the software needs to do.",
    [
      "Review user needs and existing systems.",
      "Record requirements and acceptance checks.",
    ],
  ],
  "custom-software-3": [
    "Agree on what will be built and how it will be delivered.",
    [
      "Set scope, price and milestones.",
      "Record approval before starting the build.",
    ],
  ],
  "custom-software-4": [
    "Build, test and release the agreed software.",
    [
      "Write and review changes.",
      "Test against agreed requirements before release.",
    ],
  ],
  "custom-software-5": [
    "Bill against the agreed delivery terms.",
    ["Check completed milestones.", "Prepare the invoice and follow payment."],
  ],
  "custom-software-6": [
    "Keep the software useful after release.",
    ["Investigate reported problems.", "Plan and agree on updates."],
  ],
};

const functions: Record<string, string> = {
  get: "Identify the people or organizations to serve and understand their needs.",
  shape: "Clarify the need, compare options and plan the work.",
  commit:
    "Agree on what will happen, who is responsible and the conditions for starting.",
  do: "Carry out the agreed work, check the result and pass it to the next person.",
  collect:
    "Record the delivered result and complete any related billing, payment or funding steps.",
  grow: "Review the result, support the people served and plan future needs.",
};

export type GuidedStage = {
  id?: string;
  name?: string;
  description?: string;
  functionIds?: readonly string[];
};
export function stageGuidance(
  stage: GuidedStage,
  stream: { templateId?: string; id?: string; name?: string; label?: string },
) {
  if (stage.description?.trim())
    return {
      summary: stage.description.trim(),
      examples: [],
      label: "Company stage description",
    };
  const template = businessTemplates.find(
    (t) =>
      t.id === (stream.templateId || stream.id) ||
      (!stream.templateId && t.label === stream.name),
  );
  // A renamed/custom stage must never inherit an unrelated catalog explanation.
  const original = template?.stages.find(
    (s) => s.id === stage.id && s.name === stage.name,
  );
  const guide = original && guides[original.id];
  if (guide)
    return {
      summary: guide[0],
      examples: guide[1],
      label: "Typical work · template example",
    };
  return {
    summary: original
      ? `A suggested stage in ${template!.label.toLowerCase()}.`
      : "A company-defined business stage. Add its explanation in Discovery → Edit the profile and stages.",
    examples: original
      ? [
          ...new Set(
            (stage.functionIds || original.functionIds)
              .map((id) => functions[id])
              .filter(Boolean),
          ),
        ]
      : [],
    label: original
      ? "General guide · confirm the fit"
      : "Stage description needed",
  };
}
