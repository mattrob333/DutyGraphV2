# Pilot recruitment and participant journey

DutyGraph starts with an advisor-led discovery engagement. The website recruits
5–10 companies to test the process and outputs. It does not promise a completion
time, proven outcome, free engagement, or automatic acceptance.

## Public entry points

- `/landing/#pilot`: no-account demo request. Requires contact consent, name,
  work email, company, role, team-size range and an improvement question.
- `/?demo=discovery`: five-person fictional walkthrough. Send, private email,
  protected-entry explanation, response, submission and advisor inbox. It does
  not send mail, use a microphone, or persist answers. Reload clears it.
- Discovery includes a link to the walkthrough, opened separately from real work.
- The Signet sample continues to use `/?sample=agent-governance#governance`.

## Recruitment operations

`POST /api/pilot-applications` saves a write-only recruitment record. It uses
the authentication rate limiter, request-origin checks, length validation and
a honeypot. Duplicate emails receive the same receipt without overwriting the
original application. The receipt means saved, not scheduled or accepted.

Migration `0007-pilot-applications` creates a separate global intake table.
The runtime role can insert but RLS prevents reading applicant details. No public
list endpoint exists. It is not a company evidence record or an advisor account.

The operator can run `node scripts/pilot-inbox.mjs` with the **operator**
`MIGRATION_DATABASE_URL` to review the latest 200 requests privately. Output
contains personal contact information; do not put it in public logs. Hosted
credentials must be supplied through the environment, never committed. Review
this inbox regularly; operator notifications queue and can be enabled with a verified Resend sender; no applicant confirmation email is sent. See seo-strategy.md for activation. Remove applications on request using the operator database.

## Real participant flow

`server/invitation-template.ts` produces escaped HTML and equivalent plain text.
Its charcoal masthead and paper body match the website palette. It contains the
person's questions, instructions, private CTA and access information.

The existing invitation routes issue expiring private links and send via a
configured Resend sender. First-time enrollment creates protected access.
`capture.tsx` lets the participant type or record, keep drafts, review and submit.
Responses return to the advisor for evidence review; they do not silently confirm
duties. Audio permissions, chunked upload and retention are existing tested
behavior. The walkthrough is illustrative, not a substitute for these routes.

## Verification

`tests/pilot.test.ts` covers consent, origin rejection, durable insert,
duplicate behavior, runtime read isolation and no public list. Existing API tests
cover invitation delivery through a test provider, private enrollment, audio
chunks, participant isolation, responses and confirmation. No real invitations
are sent by these tests. Browser checks cover the public walkthrough, mobile
overflow and the pilot form.


## Participant review before submission

Work interviews now offer voice-first guidance and Create my task cards after a
checked transcript or typed answer. The configured OpenAI provider extracts
input, action, output, destination and software. The participant edits and marks
each card as matching their understanding, not theirs, or uncertain. Local drafts
preserve these edits. Changing the original answer starts a new card review.
The generation attempt saves the original text in a tenant-scoped provider job;
there is a 60-attempt daily tenant limit and no automatic retry. If the provider
is unavailable, the person can explicitly send their answer without cards.

Submission atomically saves the original response, reviewed descriptions,
unreviewed supporting evidence, and proposed task cards for retained descriptions.
Removed descriptions stay in the response. Confirmation entries bind the exact
task version/hash to the submitting person. This confirms their understanding,
not company ownership or permission. The owner remains unresolved and evidence
requires advisor review. Existing conflict and handoff review remains necessary;
this change does not implement an automatic cross-team conflict detector.

The public walkthrough includes the same review step, using an explicitly
illustrative card instead of invoking a model. No demo answers leave the page.

## Commercial inquiry paths

The form now records pilot, advisor, enterprise, or team interest. Each email may submit once per interest; repeats return the same receipt. All requests remain in the private operator inbox. The new public pages at /pilot/, /advisors/, /enterprise/, and /team/ preselect the matching interest. They do not book a meeting, grant a program place, or make an employment offer.

Use `node scripts/pilot-inbox.mjs list` with the operator connection to inspect the private pipeline. To record progress, use `node scripts/pilot-inbox.mjs update <private-json-file>`. The JSON contains id, stage, nextAction, and nextActionAt (YYYY-MM-DD or null). Stages are new, contacted, qualified, scheduled, active, completed, closed. Keep contact details and update files outside the public repository. Updating a stage sends no email and changes no company work records.
