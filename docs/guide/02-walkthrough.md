# Guided walkthrough: your first engagement

Allow 60–90 minutes for this walkthrough. A facilitator can extend it into the half-day workshop in the Training workbook. All Northstar Parts names and measurements are fictional. The example is a learning exercise, not evidence of business results.

## Before you begin

Open the local application at http://localhost:4317. Choose Open sample workspace if you are inspecting the supplied demonstration. Use the company selector to open Northstar Parts — Advisor Training. If it is absent, ask the operator to run `npm run training` from the repository; that creates a new synthetic company and regenerates the example files. It does not replace Cobalt.

To practice writing records, create a separate workspace using the company selector. Name it “Northstar practice — your initials.” Do not edit the completed example while a class is using it. In a hosted client engagement, setup, identity assurance, data policy, and deployment acceptance would need to be completed first; this walkthrough uses the local training installation.

## 1. Understand the assignment

The fictional client sells parts through one depot. Standard orders go from intake to credit review to release. The sponsor wants fewer delays without weaker credit controls. The advisor must determine whether incomplete intake is responsible for waiting, or whether credit-review capacity is the better explanation.

Payment execution, changes to customer credit limits, production credentials, and automatic release are outside this exercise.

**Expected result:** a bounded engagement with an unresolved hypothesis, a measurement plan, explicit work ownership, and a client-ready explanation of what is known and what remains uncertain.

## 2. Create the engagement and roster

1. Open **Discovery**, then **Engagement & kickoff**.
2. Create the engagement plan. Enter the outcome, dates, systems, locations, in-scope work, exclusions, source policy, visibility, retention expectation, review cadence, and timezone.
3. Save, inspect the record, and record your review rationale.
4. In Discovery’s people view, add the four people below. Add managers before their direct reports, or use the CSV preview and import flow.
5. Return to the engagement record and select Alex as sponsor if the roster did not exist when you created it.

| Person | Role | Team | Reports to |
| --- | --- | --- | --- |
| Alex Morgan | Executive sponsor | Leadership | Not recorded |
| Jamie Park | Fulfillment lead | Fulfillment | Alex Morgan |
| Sam Rivera | Order specialist | Fulfillment | Jamie Park |
| Robin Ellis | Credit reviewer | Finance | Alex Morgan |

Use unique fictional email addresses when practicing enrollment. Local participant accounts are linked to one company and person; do not reuse a participant email from another training run. Use an address at `training.invalid` for a manual exercise and avoid sending messages to real people.

**Checkpoint:** the roster has four unique people. A total fictional headcount of 24 does not change the engagement coverage denominator of four.

## 3. Capture the sponsor’s account

Before collecting the account, open Business research and review its six preparation topics. For this fictional exercise, do not search for Northstar or spend provider credits: use the workbook exhibits as manual sources. For a real authorized engagement, collect and inspect public context first, draft your questions, and ask the sponsor to correct the initial picture during kickoff.

1. On Engagement & kickoff, choose Alex, a due date, and four or five kickoff questions. The default five cover customer value, output, demand, flow, and authority.
2. Create the request and open it. Review the notice and questions before issuing the private link.
3. Choose the link-issuance action. No email is sent. Copy the URL only into the approved training participant browser session.
4. In a separate browser profile, open the link, acknowledge the notice, and set a participant password. Keep the advisor session open in the original profile.
5. Enter this fictional account: customers value complete orders arriving on time; output is a released standard order; demand is sufficient for the exercise; work sometimes waits for missing fields and a credit-check handoff; exceptions require Jamie’s review.
6. Submit. Back in the advisor session, refresh Discovery, open the returned response, inspect it, and accept it.

**Checkpoint:** the original response remains visible. Acceptance creates an evidence record tied to that submission. It does not confirm any task or authorize automation.

## 4. Review two more sources

Add an evidence record named “Training order checklist,” classified as a policy document. Its text says that intake must contain the item, quantity, and customer reference; credit review records a result; release requires a complete checked packet. Use locator “Training workbook, exhibit A, steps 1–3.” Accept it after inspection.

Add “Training queue observations” as an execution record. Its fictional baseline is a median of 10 hours for 20 standard orders; a practice cohort of 20 has a median of 8 hours. Credit review remains under one hour. Use locator “Training workbook, exhibit B, rows 1–40.” State that these are invented training aggregates with different product mix and small samples. Accept the source.

Keep the two source origins independent. Copying the checklist into a second evidence record would not create a second independent source.

## 5. Describe three task cards

Open **Task cards** and add the following work. Use Jamie as accountable owner for all three; use Sam as performer for intake and release, and Robin for credit review.

| Task | Trigger | Required input | Output |
| --- | --- | --- | --- |
| Check the incoming order | A standard order arrives | Item, quantity, customer reference | Complete intake checklist |
| Record the credit-check result | Intake is complete | Checklist and customer reference | Recorded pass or exception |
| Release the checked order | Passing result is recorded | Complete checked packet | Human-recorded release |

For every card, enter a concrete purpose, instructions, systems, described actions, denied actions, human checkpoint, supporting evidence, review date, and reason. Use duty “Prepare standard orders for fulfillment.” Use human-only mode in this exercise. Deny automatic release, credit-limit changes, and use of production credentials.

Review each task after resolving required information. The state becomes Awaiting confirmation. Editing a reviewed task creates another version and requires renewed review; do that before sending confirmation requests.

## 6. Confirm the exact work

1. In Discovery, create a confirmation request for Jamie covering all three reviewed tasks.
2. Create a request for Sam covering intake and release, and another for Robin covering credit review.
3. Issue each private link. In the participant sessions, inspect every task and choose Correct only if the card describes that fictional role accurately.
4. Submit each request. In the advisor session, inspect and accept each returned response.
5. Refresh Task cards and check the confirmation history.

**Checkpoint:** all three tasks show Human confirmed. This requires current accepted “correct” responses from the owner and performer; where the same person holds both roles, one matching response suffices. A facilitator playing fictional roles is acceptable for training, but those scripted decisions are never evidence of real customer confirmation.

Try choosing Needs change in a separate practice request. Accepting that response opens a conflict on the current task. Resolve the wording with the participant, revise the task, review it, and request confirmation of the new version. Do not relabel disagreement as agreement.

## 7. Inspect the company views

Open **Company graph**. In Connected, choose Jamie in Explore and inspect accountability arrows. Select a task and follow its source links. Use Focus connections to center the picture on that record; open Register for the broader record index. Use Readable when Fit makes a large graph too small. Pan to follow cards outside the viewport.

Open Org & duties. By team shows the four people and their responsibilities. Reporting chart places Alex above Jamie and Robin, with Sam under Jamie. These are the roster relationships you entered. They are not inferred from titles. The original Cobalt example has no recorded managers and therefore explains why it cannot draw a reporting hierarchy.

## 8. Define the duty and handoffs

On Task cards, create the explicit duty record “Prepare standard orders for fulfillment.” Name Jamie, connect the three tasks and the accepted checklist, and review the claim. This duty review is separate from task confirmation.

Create two handoffs: Intake to credit review, and Credit result to release. Select the source and receiving tasks. Specify the condition, output mapping, required input, receiving acceptance check, exception owner, timeout, retry ceiling, and failure action. Use Jamie as exception owner, 24 hours as the escalation period, and one retry in the handoff description. Attach the checklist and review each handoff.

**Checkpoint:** a receiving person can explain exactly what arrives and when to reject it. A title such as “handoff to Finance” alone is insufficient.

## 9. Observe two manual cases

Open **Workflows & cases**. Create “Standard order review and release,” select the three tasks and two handoffs, use All for joining selected routes, a 24-hour step timeout, and two maximum attempts. Review the definition.

Start case TRAIN-001 with the fictional order reference. Only intake is initially ready. Record the human observation, select the outgoing route whose condition was met, and complete the step. Repeat for credit review and release. The case becomes Complete.

Start TRAIN-002. Record a failure at intake because the customer reference is missing. It should need attention while downstream work stays blocked. An advisor can record a bounded retry after the missing information is resolved, or close the case with a reason. No order is changed in an external system by these controls.

## 10. Record a testable explanation

In **Strategy**, create a constraint hypothesis: “Incomplete intake may delay order release.” Record the competing explanation that credit capacity is the constraint. The discriminator is a comparison of intake waiting and credit-review duration in matched cohorts. The global counterfactual concerns end-to-end release time and total released orders, not merely faster data entry.

Define a metric: median release timestamp minus intake timestamp, measured in hours for the specified cohort. Enter baseline 10, target 7, source, owner, window, and a guardrail against incorrect release. Record a dated observation of 8 with its synthetic source locator.

Create an intervention for a complete-intake checklist. Preserve the prediction “10 hours to at most 7 hours without more credit exceptions.” Create an Outcome review with Inconclusive: the invented result misses the target, the groups differ, and causation is unproven. Review it and assign the next measurement action.

**Checkpoint:** the report does not claim a proven 20% improvement for a real client. It explains the arithmetic as an invented training observation and keeps the original prediction intact.

## 11. Run the review and prepare delivery

Open **Weekly review**. Discuss returned evidence, stale or conflicting work, missing baselines, workflow exceptions, and outstanding commitments. Record Jamie’s next action and due date.

Open **Deliverables**, create an executive client report, and name Alex and Jamie as the fictional audience. Write the purpose, summary, decisions, next steps, and limitations. Select relevant records. Create the frozen draft, open the preview, and inspect every section.

Approve the exact current content and audience with a rationale, then download the ZIP. Open `client-report.html`; print it to PDF if desired. Inspect `record-register.csv` and `checksums.json`. The package omits original response text and recordings. Delivery remains manual.

## 12. Finish the handoff

Record who owns the next review, the outstanding evidence questions, and the limits of the current result. Store the approved package using the engagement’s agreed policy. Ask the operator to take an encrypted backup and perform the documented restore drill before any important installation change.

You have now practiced the entire supported advisor journey. Repeat it with the adverse scenarios in the Training workbook before moving to an accepted customer environment.
