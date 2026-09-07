/** Prepared fictional records for the public walkthrough. No model or connector runs here. */
export type DemoTask = {
  title: string;
  duty: string;
  inputs: string;
  instructions: string;
  output: string;
  handoff: string;
  software: string;
  decision: string;
  suitability: "candidate" | "human" | "gap";
  rationale: string;
  boundary: string;
  edited?: boolean;
};
type TaskSpec = [
  string,
  string,
  string,
  string,
  string,
  string,
  DemoTask["suitability"],
  string,
  string,
];
const specs: Record<string, { duty: string; tasks: TaskSpec[] }> = {
  maya: {
    duty: "Keep supplier records complete",
    tasks: [
      [
        "Check the supplier packet",
        "Buyer sends a supplier folder in Google Drive and the required-document checklist.",
        "Open the folder and checklist.\nCompare the included files with each checklist item.\nList missing or unreadable files; do not mark them complete.",
        "A completeness checklist with source links.",
        "Record preparation uses the checklist; the buyer resolves missing documents.",
        "Google Drive, Google Sheets",
        "candidate",
        "Bounded document comparison can produce a draft checklist for review.",
        "Read assigned files only. Human checks ambiguous documents.",
      ],
      [
        "Prepare the supplier record draft",
        "Complete packet, checked company details, and the supplier record template.",
        "Copy the stated company fields into the template.\nAttach a source link for each field.\nLeave conflicting values flagged for review.",
        "A supplier record draft with cited fields.",
        "Maya reviews the draft before an authorized person changes SAP.",
        "Google Drive, Google Sheets, SAP",
        "candidate",
        "Structured extraction can prepare a draft without making a system change.",
        "Draft only. No SAP writes, bank changes, or supplier activation.",
      ],
      [
        "Resolve missing supplier information",
        "Missing-document list from the packet check.",
        "Ask the buyer for the missing information.\nCompare the returned documents with the request.\nRecord unresolved contradictions for a human decision.",
        "A completed packet or a documented unresolved exception.",
        "The buyer supplies corrections; record preparation depends on them.",
        "Email, Google Drive",
        "human",
        "Ambiguous supplier information needs follow-up and judgment.",
        "Do not invent missing values or decide an exception without authority.",
      ],
      [
        "Prepare the Finance verification handoff",
        "Reviewed supplier draft and the bank documents supplied by the buyer.",
        "Select the approved document links for Finance.\nList the verification request and supplier reference.\nCheck the recipient before sharing through the approved channel.",
        "A Finance handoff with document references.",
        "Dana in Finance verifies the bank details and returns a result.",
        "Google Drive, Email",
        "human",
        "Sharing bank documents requires a checked recipient and data-handling rules.",
        "The task does not authorize bank verification or payment.",
      ],
      [
        "Prepare the open-handoff status summary",
        "Recorded handoff dates and Finance replies in Google Sheets.",
        "Read open entries and recorded replies.\nPrepare a status summary citing each row.\nFlag items with no reply for Maya to review.",
        "A draft status summary with unresolved handoffs.",
        "Maya uses the summary to follow up with Finance.",
        "Google Sheets",
        "candidate",
        "Recorded status comparison and summary drafting have a clear input and output.",
        "Read-only summary. No automatic emails, approval, or closure.",
      ],
      [
        "Route the final supplier approval",
        "Finance verification result and the reviewed supplier draft.",
        "Check that the verification result is recorded.\nIdentify the person authorized to approve the supplier.\nIf that owner is not known, keep the record pending and ask leadership to resolve it.",
        "An approval request routed to a named authority, or an ownership gap.",
        "Activation depends on explicit approval; the approval owner is currently unresolved.",
        "SAP, Google Sheets",
        "gap",
        "Discovery has exposed an unclear approval owner. Resolve it before delegation.",
        "No assumed approver. No supplier activation or grant of authority.",
      ],
    ],
  },
  dana: {
    duty: "Verify supplier bank details",
    tasks: [
      [
        "Compare the bank documents",
        "Procurement supplies the bank details and supporting documents.",
        "Compare the stated account fields.\nList mismatches with source references.",
        "A comparison worksheet.",
        "Dana uses the worksheet for the verification procedure.",
        "Approved document workspace",
        "candidate",
        "An agent could draft a field comparison; it cannot establish bank authenticity.",
        "Read supplied documents only; no bank writes.",
      ],
      [
        "Perform the bank verification",
        "Comparison worksheet and the approved verification procedure.",
        "Follow the approved verification steps.\nStop if the information does not match.\nRecord the checks performed.",
        "A verification result or unresolved mismatch.",
        "Supplier approval depends on the result.",
        "Verification system not named",
        "human",
        "Independent verification and sensitive-data decisions remain with an authorized human.",
        "Do not treat matching text as verified bank ownership.",
      ],
      [
        "Resolve a verification mismatch",
        "Mismatch identified during verification.",
        "Ask Procurement to resolve the discrepancy.\nRecheck the returned evidence.\nKeep unresolved items blocked.",
        "A resolved discrepancy or recorded blocker.",
        "Procurement supplies corrections; Dana rechecks them.",
        "Approved communication channel",
        "human",
        "Conflicting bank information needs human investigation.",
        "Never override a failed verification.",
      ],
      [
        "Draft the verification result record",
        "Dana’s completed verification notes.",
        "Summarize the checks and result.\nLink the supporting notes.\nLeave the draft for Dana to review.",
        "A draft verification record.",
        "Dana reviews it before the supplier approval step uses it.",
        "Document workspace",
        "candidate",
        "An agent can draft a record from completed human checks.",
        "No claim of verification beyond the supplied notes.",
      ],
    ],
  },
  jordan: {
    duty: "Set a reliable delivery promise",
    tasks: [
      [
        "Check the customer order",
        "Customer order with quantities and requested date.",
        "Compare the required order fields.\nFlag missing quantities or dates.",
        "An order completeness check.",
        "Warehouse needs a complete order to check stock.",
        "Order system not named",
        "candidate",
        "Defined field checks can prepare an exception list.",
        "Do not change customer commitments.",
      ],
      [
        "Obtain stock confirmation",
        "Complete order and the warehouse stock response.",
        "Ask Warehouse to confirm availability.\nRecord its stated stock position.",
        "A stock confirmation or shortage.",
        "Delivery planning depends on Warehouse’s response.",
        "Approved communication channel",
        "human",
        "The source of current availability must be confirmed.",
        "Do not infer stock from an old order.",
      ],
      [
        "Resolve the shortage delivery date",
        "Warehouse shortage and Procurement’s replenishment information.",
        "Ask Procurement for a supported arrival date.\nCheck unresolved timing risks.",
        "A supported replenishment date or an unresolved delay.",
        "Jordan depends on Procurement before promising a date.",
        "Order system not named",
        "human",
        "Uncertain dates require cross-team coordination and judgment.",
        "Do not promise an unsupported date.",
      ],
      [
        "Draft the customer delivery update",
        "Confirmed stock or replenishment date.",
        "Draft the update using the confirmed date.\nInclude any stated conditions.\nSend the draft to Jordan for review.",
        "A draft delivery update.",
        "Jordan reviews the promise before the customer receives it.",
        "Email",
        "candidate",
        "Drafting from confirmed facts is a bounded assistance task.",
        "No automatic customer messages or revised commitments.",
      ],
    ],
  },
  riley: {
    duty: "Prepare accurate shipments",
    tasks: [
      [
        "Check picking-list readiness",
        "Released picking list, stock reservation, address, and shipping instructions.",
        "Compare the required fields.\nFlag absent reservation or address information.",
        "A readiness check with missing information listed.",
        "Picking depends on a complete released list.",
        "Warehouse system not named",
        "candidate",
        "An agent can check supplied fields before physical work starts.",
        "No stock reservation changes or order release.",
      ],
      [
        "Pick the order",
        "Complete released picking list.",
        "Locate the reserved stock.\nPick the listed items and quantities.\nReport shortages.",
        "A picked order or recorded shortage.",
        "A second teammate checks the picked order.",
        "Warehouse tools",
        "human",
        "This is physical warehouse work.",
        "Digital task discovery does not authorize physical automation.",
      ],
      [
        "Check the picked shipment",
        "Picked items, order quantities, and shipping instructions.",
        "Have another teammate compare the physical items and quantities.\nCheck address and shipping instructions.\nReport discrepancies before dispatch.",
        "A checked shipment or discrepancy.",
        "Dispatch depends on this check.",
        "Warehouse tools",
        "human",
        "Independent physical verification remains a human task.",
        "Do not bypass the second-person check.",
      ],
    ],
  },
  karl: {
    duty: "Coordinate dispatch and exceptions",
    tasks: [
      [
        "Check dispatch readiness",
        "Shipment check result and carrier booking.",
        "Check the shipment passed its checks.\nCheck the booking is ready.\nFlag missing information.",
        "A dispatch readiness decision.",
        "Dispatch depends on shipment checks and carrier booking.",
        "Carrier portal",
        "human",
        "Release of a shipment needs a responsible operator.",
        "Do not release an unchecked shipment.",
      ],
      [
        "Resolve a dispatch blocker",
        "Missing information that prevents dispatch.",
        "Identify the owner of the missing information.\nRequest a correction.\nKeep the blocked order visible until resolved.",
        "A resolved blocker or escalation.",
        "Dispatch depends on the named information owner.",
        "Approved communication channel",
        "human",
        "Cross-team exceptions need human coordination.",
        "Do not bypass missing information.",
      ],
      [
        "Draft the carrier-reference update",
        "Confirmed carrier reference and shipment identifier.",
        "Record the supplied carrier reference.\nDraft an update with the matching shipment ID.\nGive the draft to Karl for review before Sales receives it.",
        "A draft tracking update.",
        "Sales uses the reviewed carrier reference to inform the customer.",
        "Carrier portal, Email",
        "candidate",
        "A structured reference can populate a draft update.",
        "No carrier booking changes or automatic messages.",
      ],
    ],
  },
};
export function sampleTasks(personId: string): DemoTask[] {
  const s = specs[personId];
  return s
    ? s.tasks.map(
        ([
          title,
          inputs,
          instructions,
          output,
          handoff,
          software,
          suitability,
          rationale,
          boundary,
        ]) => ({
          title,
          duty: s.duty,
          inputs,
          instructions,
          output,
          handoff,
          software,
          suitability,
          rationale,
          boundary,
          decision: "",
        }),
      )
    : [];
}
export function sampleTranscript(personId: string) {
  return sampleTasks(personId)
    .map(
      (t) =>
        `For ${t.title.toLowerCase()}, I receive: ${t.inputs} I do this: ${t.instructions.replaceAll("\n", " ")} My result is ${t.output} ${t.handoff} I use ${t.software}.`,
    )
    .join("\n\n");
}
export function candidateTasks(cards: DemoTask[]) {
  return cards.filter(
    (c) =>
      c.decision === "correct" && c.suitability === "candidate" && !c.edited,
  );
}
export { granularWorkGuide } from "./work-granularity.ts";
