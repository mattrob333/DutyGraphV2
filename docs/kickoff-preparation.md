# Business brief to executive kickoff

## Advisor sequence

1. Enter company name, URL and optional description. Run the bounded research pass once and review the six-area business brief.
2. Review the primary and supporting business streams. **Confirm streams & prepare kickoff request** saves the selected profile/intake and moves to email preparation. It does not run another research pass or send anything. All retained streams remain in context.
3. Enter the point of contact and optional agreed meeting details. Draft the email from the saved brief, profile and available context, review it, save the request, then preview/send through the existing invitation delivery flow. DutyGraph supplies the branded HTML/plaintext wrapper and private link. No generated links are trusted.
4. The contact opens the assigned private page and uploads the CSV, selects executive attendees separately from pilot interview participants, supplies leadership context, and sends the package. Voice/text supplements remain available. CSV-only participants are not invited automatically.
5. Open **Returned kickoff preparation**. Review roster, reporting lines, selections and leadership answers. **Confirm roster & populate org chart** imports the complete checked file in one transaction. Existing conflicting people block the whole import. Existing exact matches are linked; the initial placeholder contact can be completed. The full company org chart and reviewed interview scope remain different concepts.
6. **Prepare two-hour kickoff agenda** opens Leadership meeting. Generate the agenda from the returned package and research; consecutive five-minute timeboxes always total 120 minutes. Without a response, the agenda is explicitly provisional. Meeting notes then drive reviewed dossiers, duties and personal interviews.

## What the contact supplies

CSV: `name,email,role,department,manager_email` (optional `external_id`). A downloadable fictional template is on the private page. Maximum 500 people / 500 KB; UTF-8 recommended. Include referenced managers. Blank manager means not stated, not proof of a top-level executive. Field-size limits match saved person records. Duplicate emails, invalid/missing fields, self-reporting, cycles and unresolved manager references must be corrected before submission.

Select at least one executive attendee and pilot participant from a supplied roster. A person may be in both groups. When the roster is unavailable, explicitly name a follow-up owner/date instead; no org chart is fabricated. Core leadership answers cover goals, department responsibilities and separate/shared business streams; unknowns are acceptable when stated. Other fields capture handoff problems/evidence, systems/SOPs and logistics. The private page displays the proposed streams snapshotted when the request was saved.

## Responsibility boundaries

Business streams describe delivery models. Departments organize people. A reporting manager is not automatically the owner or performer of a subordinate's work. Roles carry ongoing duties; tasks produce checkable outputs; actions are steps within tasks. Shared work is described once with the streams it serves. Stream-specific work with different triggers, outputs, approvals or recipients stays distinct. The primary label controls focus, not exclusion of supporting streams or an assumed revenue share.

All discovery prompts carry these rules. Public sources and templates cannot establish internal duty ownership. Existing explicit handoff contracts require source/target tasks, output mapping, required input, acceptance and exception handling; stage order alone does not create workflow edges. Timing/queue/rework evidence is needed before calling something a bottleneck.

A changed duty description cannot silently reuse a same-owner/same-title duty. During dossier review, explicitly select the existing duty when correcting that responsibility, or use a distinct name for distinct work. The server checks the selected duty's company and owner. Ambiguous merges roll back the full apply transaction. Unchanged exact matches still reuse records. This is an ambiguity guard, not a claim of complete semantic detection: business-stream membership is not yet a first-class foreign key on every task and duty.

## Storage and security

The existing returned response stores `kickoffPreparation` (CSV, selections, answers) and a server-compiled text account for discovery context. Original input is preserved; it is not automatically accepted as authoritative work evidence. Contact request records snapshot `kickoffBusinessStreams`. Participant access is restricted to the assigned request; unrelated request types reject structured kickoff payloads. Existing due-date, request-version, idempotency, session and CSRF checks apply.

Advisor import: `POST /api/v1/companies/:companyId/responses/:recordId/kickoff-roster`, body `{ "expectedVersion": 1 }`. It locks the company/response, validates the saved package again, checks existing people before changing any, imports reporting edges, and versions the response with import metadata. Replays cannot create duplicate people. No new database migration is required. Package data inherits response retention/access policies; local drafts are stored on the participant's device and cleared on successful submission.

A returned package remains available as context before import. The AI context is bounded (up to 40,000 characters for the package source); the full roster remains available for advisor review. Large packages may require explicit follow-up rather than assuming the model read every row. Import does not enroll the full roster into personal interviews: the executive-reviewed discovery roster remains the gate.

## Optional supporting research

Business-type examples are behind a subtle information disclosure. The raw evidence library and deeper Industry Map sit together under **Supporting research**. Opening the Industry Map opens its workspace; generating analysis remains an explicit separate action. It is not a prerequisite for the initial contact email. Recommended publications/communities remain research context, not live feed subscriptions.

## Verification boundary

Covered with fictional API/provider/transport fixtures and local browser review. Real inbox delivery, real-company research quality and full model-generated agenda quality require a pilot run. The changes do not send real messages or authorize AI agents.
