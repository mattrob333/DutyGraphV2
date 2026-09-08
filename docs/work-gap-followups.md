# Work-gap follow-ups

Company Work Map assesses saved stages, duties, tasks, people and workflow links. Its gaps describe missing knowledge: an unexplained stage, a duty without recorded tasks, missing task details or assignments, or a sequence that has not been recorded. An empty stage does not prove missing business work. A task may be standalone or belong elsewhere.

## Recipient choice and continued checks

**Ask about this work** scopes the preview to a selected stage. The advisor selects relevant linked people and sees their actual stored email addresses. Continuing checks default on for that selected group; choosing people once does not enroll the rest of the roster. Turning continuing checks off requests a single round. Company-wide checks can later identify other gaps involving the selected people.

The server validates company membership, current email, sample status, stage context and source versions before sending. Only one open work request is allowed per person. New gap requests are spaced at least seven days after the later of request creation or the last send attempt, and a previously asked gap is not automatically requested again. Up to three questions are grouped per person and stage. Large or unavailable context can defer a request for review; these limits are not a promise to contact every selected person immediately.

Pause stops queued automatic questions and future checks. Resume reactivates eligible paused questions for the authorized saved recipients, subject to the same freshness and configuration checks. An in-flight send may finish. Changed emails, work or stages require review. Expired unsent requests are held for review before a link is issued. Failed or unknown provider outcomes are not blindly retried. Request history distinguishes saved questions, sending, saved replies, proposed updates and review needs. Open a saved reply directly from that history. When gaps are filled, the warning clears while the history remains.

Sandboxes and reserved sample email addresses cannot receive real gap emails. Sample previews remain available. Read-only assessments and opening the map do not send messages.

## Saved replies and proposed updates

The recipient opens a private link, speaks or types, reviews the text and submits. Submission saves the original response and queues a durable processing job. Recording alone is not a transcript: use the private page's transcription control and review its text before submission when speaking an answer.

AI receives the response, the saved stage context and bounded work records. Quote and reference validation checks against the supplied content; it does not prove every interpretation is correct. Peer examples, templates and public marketing cannot establish client tasks or assignments. Proposed additions retain their response evidence. Missing fields in eligible proposed work may be filled; reviewed or protected facts, changed inputs and conflicting details are preserved for advisor review. Processing failures preserve the reply without claiming an update.

Response-supported handoffs and flows describe reported work and are saved as documentation only. They are not executable case configuration. An advisor must supply missing settings and complete normal workflow review before case use. Unknown timing and retry values must not be interpreted as employee-reported policy. A standalone-task answer or a stage that does not apply can still require an advisor to resolve the map; the loop does not guarantee every gap closes automatically.

## Setup and operation

Apply migration `0012-work-gap-followups.sql` through the normal migration command. It adds durable maintenance cursors and uniqueness constraints for outreach and response jobs. Configure OpenAI and Resend, including the sender address, in the advisor account's Workspace settings. Provider configuration is tenant-specific. Initial stage research separately uses Exa when public retrieval is selected.

The repository schedules hosted maintenance every five minutes through the authenticated Vercel maintenance endpoint; local server maintenance checks every minute. These are bounded sweeps across tenants and companies, not per-request delivery deadlines. The server and scheduler must be running. Quotas, provider latency, unavailable configuration, changed records and review holds can delay progress. Deploying the code, applying the migration and configuring the scheduler are separate operator steps; this reference makes no hosted acceptance claim.

`shared/work-gaps.ts` defines assessment and question grouping. `server/work-gaps.ts` exposes the advisor-only snapshot, recipient policy and run routes under `/api/v1/companies/:companyId/work-gaps`. `server/gap-replies.ts` processes submitted replies and preserves source snapshots. PostgreSQL is authoritative; provider calls use durable jobs and tenant boundaries.

See [the Work Map guide](guide/28-company-work-map.md), [stage research](initial-research.md), and [the stage map reference](stage-work-map.md). Automated verification uses fictional records and synthetic providers. Real-source usefulness, delivery and employee acceptance require their own checks.
