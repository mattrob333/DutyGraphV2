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


## Email delivery and testing

The most recent email attempt has a prominent result. Accepted by Resend means the provider accepted the send, not an inbox-delivery receipt. Previous failures are collapsed. Sending a replacement invalidates earlier unused invitation links; use the newest email. Failed configuration or provider sends still require diagnosis, not repeated blind retries.

The HTML email has an 800px responsive maximum, labeled sections, list formatting and labeled fallback links. Its plain-text alternative includes the URL. PUBLIC_APP_ORIGIN optionally sets the link origin; otherwise APP_ORIGIN is used, with the legacy https://dutygraph-v2.vercel.app origin mapped to https://dutygraph.com. This does not change auth/CORS allowlists. Existing emails retain their original URLs.

Preview response form inside the advisor's kickoff request renders the actual team CSV and leadership fields. It holds edits only in memory and cannot submit or enroll. It does not test participant authentication or voice recording. Existing advisor accounts are not converted into participants; use this preview for form review and a separate intended participant identity for enrollment acceptance testing.


## Manual roster alternative

Prefer CSV for the full discovery roster including managers. The form also accepts one person at a time: name, email, role/title, department, and manager email. Executive kickoff and pilot discovery are separate selections beside each person. Add another, edit and remove operate on the same serialized roster used by CSV upload; no new import path or automatic invitation is introduced. Include the manager as another roster row, even if that manager is not in the pilot. Missing managers and cycles must be resolved before submission. Editing or removing a manager does not silently rewrite subordinate reporting lines. Removing a row clears that person's attendee selections. Manual entry preserves recognized external IDs; unknown CSV columns are not part of the roster schema.

An existing advisor identity cannot enroll into a participant identity. On an account-conflict error the page offers a direct advisor-workspace link and directions to Preview response form. A true enrollment test requires an intended participant identity; the preview does not submit data.

## Password-free kickoff preparation (2026-09-07)

Kickoff contacts open their private link without an account or password. CSV and manual roster entry share hierarchy validation. Drafts can be saved on the same device. Submission records invitation-possession assurance and the external contact under the sponsoring account, returns preparation for advisor review, and consumes the link atomically. GET does not consume links. Expired, revoked, closed and non-kickoff links are rejected. Advisor cookies and roles are untouched. Other participant workflows retain authentication. This limited form collects written context and roster data; voice remains in the signed-in participant workflow.

Validation: targeted PostgreSQL HTTP test passed for repeated GET, same-email advisor preservation, invalid/non-kickoff/revoked/expired links, stale version, consent, submission and replay. Full build and all 226 tests passed. Browser verified direct opening, manual roster entry and successful submission without an account. No real email sent.

## 2026-09-07 — Full-page kickoff research review and voice response

The private kickoff page uses approximately 84% desktop width in dark mode, with public-research fact cards, cited sources, separately labeled primary/supporting operating stages, a CSV/manual team sheet with reporting-manager suggestions, and one original-wording response. Coordinator-friendly prompts defer detailed vision/KPIs to the executive team. Public context is frozen when issuing new invitations; older invitations use the current matching public brief. Private advisor notes and raw evidence are excluded.

OpenAI gpt-4o-transcribe reuses the advisor account configuration. Contacts explicitly record, stop and transcribe before reviewing and submitting editable text. Three-minute clips, 3 MB upload limit, ten attempts per request and sixty per tenant per day; attempts are reserved transactionally before provider calls. No raw audio is persisted by this new endpoint; clips remain in page memory for retry/download on failure. Device drafts save text/roster only. Existing signed-in participant voice capture remains available.

Validation: local build and 226 tests passed, including password-free submission, expiry/revocation and a synthetic transcription provider with quota enforcement. Browser checked research layout, primary stages, manual roster, saved text draft and successful single-response submission. Real microphone/provider transcription and mobile-device acceptance were not exercised; no real emails or paid provider calls were made.
