# Explore the Cobalt guided example

Cobalt Industrial Supply is fictional. Its company snapshot, people, policies, stages and work descriptions are authored training examples. The example contains no live agents, sent emails or measured business results. Treat every finding as synthetic.

Open **Workspace settings → Open my sample company**, then **Company Work Map**. The enriched sample includes a saved wholesale distribution stream and a small synthetic reporting chart. Select a stream and stage, choose a highlighted person, and follow their duties, tasks and flows. Reopening the sample adds the complete examples to an older Cobalt workspace. It enriches untouched original task descriptions, preserves revised or confirmed work, and does not reset your notes.

The saved sample’s stage links are authored synthetic fixture data. They are persisted with the Cobalt business profile and can be edited in **Assign stages**; they illustrate how duties and tasks appear in saved business stream columns. They are not inferred from titles or the order of stages. A task with its own stage links overrides its duty’s stage links.

If an older or incomplete Cobalt workspace cannot load the saved business profile, the guarded legacy fallback may show clearly labeled illustrative assignments. That fallback is read-only and does not change records. The normal saved sample profile and its stage assignments remain editable.

## Supplier onboarding

The intended outcome is a supplier ready for purchasing. Its eight task cards are part of the sample’s 18 guided business task cards; nine handoffs cover the usual path and two exceptions.

1. Start with **Check supplier packet**, then **Create draft supplier record**.
2. Click **Standard terms** to inspect the direct Finance route. Compare it with **Nonstandard terms**, which requires Legal review before Finance.
3. At **Verify bank details**, compare **Bank details match** with **Bank-name mismatch**. A correction must include an independent Finance recheck before the verification result can be recorded.
4. Inspect **Approve the supplier**. Its owner and performer are intentionally unresolved. Procurement describes verification as approval; Finance disagrees. This is a hypothesis about a source of delay, not a proven throughput constraint.
5. Click **Authorized approval**. Read the output mapping, required input and acceptance check. A completed bank check does not authorize activation. Elena owns the escalation, not the unresolved approval decision.
6. Select a person in **Work map** to see their duties and tasks. Use **Tasks** for detailed cards and responsibility records, and **Work flows** for handoffs. Open the **Client brief** to inspect the fictional audit coverage.

## Customer order fulfilment

Select **Work flows → Customer order fulfilment**. Its seven task cards and seven handoffs connect a customer's purchase order to a checked shipment and dispatch confirmation. The sample also includes three account-cycle task cards, for 18 guided business tasks in total. The separate access-review walkthrough has two access-controls task cards, both **Unassigned**, because it is a synthetic control walkthrough rather than part of the wholesale stages. Additional synthetic control scenarios remain in the saved records and Agent governance tools, outside the wholesale stages.

1. Follow **Check customer purchase order → Check stock and delivery date**.
2. If stock is available, **Stock reserved** proceeds to pick release.
3. If stock is short, **Stock shortage** goes to Procurement. Click **Receipt + accepted date** to see the three required items: a replenishment receipt, a stock reservation, and the customer's acceptance of a revised date. An estimated arrival date alone does not qualify.
4. Both paths meet at **Release the order for picking**, followed by picking, dispatch and customer confirmation.
5. The suspected issue is waiting for a coordinated shortage release. Inventory availability and carrier capacity are competing explanations. No timings or percentage improvements are invented.

## What clicking means

- Click a stage, then a person, to narrow the map. **Owns work** comes from an owner field; **Does the work** comes from a performer field. Neither label is an approval.
- Click a task to inspect it; **Open full record** shows its input, output, performer, owner, duty, boundaries and sources.
- Click an arrow's label to open the actual handoff record, including acceptance criteria, timeout, retry limit and exception owner. Timeouts describe the proposed contract; they are not measured waiting time or an active agent timer.
- Unassigned, ownerless and removed-stage work stays visible for repair. The map does not create a relationship from a task title, duty name, department or reporting line.
- Dashed links are proposed handoffs that still need review. Fictional source acceptance does not imply participant confirmation, authority approval or deployment.
- **Workflows & cases** opens each workflow definition. A manual case requires reviewed current tasks, handoffs and workflow bindings. The supplier approval conflict deliberately prevents that readiness until it is resolved.
- **Agent governance** contains two proposals: Supplier Packet Assistant and Order Handoff Assistant. Both have named human owners and bounded drafting purposes. Neither runs tools, schedules jobs, releases business transactions or sends customer messages.

## A useful screenshot

Use the dark theme, a named workflow and **Expand → Fit**. Keep the workflow name and synthetic-data context visible. Capture the clean flow first, then a second image with a handoff or task inspector open. Avoid showing personal account details, API settings or private invitations.

The landing page should feature this genuine application screen immediately below the hero. The final screenshot composition and landing-page copy remain subject to the owner's design feedback.
