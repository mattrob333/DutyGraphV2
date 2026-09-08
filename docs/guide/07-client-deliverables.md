# Client deliverables and example outputs

The deliverable is a reviewed explanation of the business record and the next decision. A client should be able to understand it without learning the application’s database structure. Keep the structured files available for reviewers who need traceability.

## Start with the living client brief

Open **Client brief** in the sidebar, or use the link from Company Work Map. The page assembles current scope, work coverage, documentation gaps, current advisor-reviewed findings selected for discussion, commitments and measures. It uses the saved company record; opening it does not call AI or send anything to a client. The displayed revision identifies the snapshot you are reading.

Use **Prepare client report** to carry that snapshot into a draft narrative and suggested record selection. Refine the summary, decisions, next steps and limitations, then name the audience. **Save report draft** creates a frozen report for preview and exact-content review. A source change can require a new draft or review. **Write a custom report** remains available for a different audience or purpose.

The living brief is an advisor workspace view, not a client portal. A saved report is a separate snapshot; it does not keep rewriting itself as the work changes. Download and share the approved packet through the channel agreed with the client, and record the recipient, version and delivery date. Preparing a report does not email it, schedule a meeting, activate billing or start a subscription.

## Continue the engagement deliberately

Use the brief's **Open weekly review** action to revisit decisions, owners, dates, missing baselines and observations. Prepare participant updates, review returned accounts, and record the next intervention and how its result will be judged. Use **Review strategy inputs** to see what each framework needs before opening its existing canvas. Work records can inform strategy without supplying all financial, customer or market variables.

A recurring advisory engagement should have an agreed scope, participants, review cadence, responsibilities and deliverables. These are the advisor's working agreement with the client. The application supports that work record and manual sharing; it does not create a commercial retainer, client access or automatic charges. Measured benefit still needs actual observations and appropriate comparison.

## Package choices

| Package | Intended audience | Typical contents | Review behavior |
| --- | --- | --- | --- |
| Executive client report | Sponsor and named decision owners | Scope, coverage, finding, decision, next action, limitations, selected work | Exact audience/content review before download |
| Weekly client report | Work owner and review participants | Changed observations, cases, commitments and next test | Exact audience/content review before download |
| Audit client report | Named governance/review audience | Selected records and latest 500 application event metadata | Exact audience/content review; explicit coverage limit |
| Internal workspace snapshot | Advisor and implementation reviewers | Described tasks, states, source metadata and exclusions | Frozen historical internal artifact |
| Confirmed-work packet | Work and implementation reviewers | Current qualifying confirmed tasks and excluded-task reasons | Frozen subset; no business authority conferred |
| Agent proposal packet | Authorized design/review team | Version-bound work instructions, constraints and setup requirements | Non-operative proposal; no grants or runtime deployment |

## What is in an approved client ZIP

`client-report.html` is the readable report. It uses a self-contained print layout and can be opened without the application. Use the browser’s Print / Save as PDF function for a paper copy.

`report.json` is the structured frozen packet. It contains the company scope, report audience and purpose, selected record fields, source revision, coverage and limitations.

`record-register.csv` is a concise index of type, title, version, state and record ID. `READ-ME.md` explains the audience and manual-delivery boundary. `checksums.json` lists SHA-256 hashes for the other UTF-8 files and the report record hash. A checksum detects changed bytes; it is not an independent approval signature or proof of who sent a file.

Raw source text, recordings, passwords, invitation tokens and person email fields are excluded by the client-report serializer. An advisor can still accidentally include sensitive details in a free-text summary or selected analysis. Inspect those fields before approving.

## The supplied Northstar examples

The portable handbook’s example index contains three actual API-generated client ZIPs and their readable HTML reports: executive, weekly and audit. It also contains the confirmed-work internal package and an agent-proposal internal package. The training manifest identifies the fictional company and the record states used to produce them.

These files were generated by creating a separate sandbox company, enrolling fictional participants through the local API, submitting and accepting exact confirmation responses, reviewing work and handoffs, recording manual cases, and approving the report audience/content. They were not hand-drawn mockups. No real participant decision or customer result is asserted.

The example shows four roster people, three Human confirmed tasks, one complete manual case, one case needing attention, and an Inconclusive outcome. The fictional median changed from ten to eight hours but missed a seven-hour target, with unmatched cohorts and missing staffing information. This is the kind of limitation the client should see clearly.

## Example executive message

“We have documented the standard-order flow and clarified the receiving checks between intake, credit review and release. The reviewed record identifies one incomplete case that needs Jamie’s attention. Incomplete intake remains a candidate explanation for delay; the current practice observations do not establish causation. We recommend collecting a matched cohort before expanding the change. All release decisions remain with people.”

For the supplied training packet, retain the explicit notice that all people and observations are fictional. In a real engagement, replace the language only with claims supported by that client’s reviewed sources and actual measurements.

## A useful delivery checklist

1. Confirm the named audience and purpose match the agreed engagement scope.
2. Confirm the company, date, source revision and selected records are correct.
3. Check that claimed confirmations and observations match their current states.
4. Explain missing coverage, conflicting sources, confounders and open decisions.
5. Remove unnecessary personal or sensitive details from authored narrative.
6. Preview the exact packet and record the approval rationale.
7. Download, open and inspect the readable report and register.
8. Deliver through the approved channel and record recipient, version and date.
9. Keep the original ZIP and checksums with the distribution record.
10. Regenerate and review a fresh report after material source changes.

The application performs the binding and state checks. The advisor remains responsible for the business meaning of the narrative, appropriate audience, and actual delivery decision.

## Suggested delivery meeting

Allow 30–45 minutes. Begin with the client’s desired outcome and the bounded scope. Show the work description and evidence only to the depth needed for the decision. Explain the strongest remaining uncertainty. Compare the prediction with observations, then agree the next action, owner and review date.

Use the graph to answer a relationship question, not as a decorative proof that the company is understood. Use the report’s selected records when the audience needs a stable reference. Finish with a written list of commitments and the limits of any proposed automation.

## Handoff to an implementation team

Provide the relevant confirmed-work or agent proposal package along with the approved scope, source policy and unresolved authority questions. The implementation team needs a separate accepted identity/permission model, exact target resources/actions, approval chain, runtime adapter and operational controls before any live execution.

Do not distribute the complete development repository as the ordinary client report. Source code and technical runbooks are a developer/operator handoff. Do not include `.env`, database backups, encryption keys, raw recordings or commercial reference documents in a public repository or generic client packet.
