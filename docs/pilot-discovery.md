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
this inbox regularly; this release does not send applicant or operator email
notifications. Remove applications on request using the operator database.

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
