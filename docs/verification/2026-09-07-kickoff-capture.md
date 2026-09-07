# Kickoff and participant capture verification — September 7, 2026

Scope: business-specific leadership intake → reviewed duty context → invitation/private participant page → voice/text response → task-card review → advisor records.

## Local checks

- `npm run verify`: build and 196 tests passed after the backend, prompt and card-field changes. The final routing correction and UI refinements passed another complete build and all 196 tests.
- `npm run contracts`: generated record request schemas and inventoried 87 route declarations; no generated contract delta. The participant-specific optional fields are documented in the kickoff reference and runtime schema.
- `npm audit --audit-level=low`: zero vulnerabilities.
- New/extended tests: all 52 operating-model guides, hybrid/custom/missing context, verbatim note composition, full-length meeting context, model-change fingerprints, participant duty descriptions and profile, citation/person rejection, HTML instructions and escaping, and preservation of participant-reviewed task purpose/trigger/checkpoints.
- Existing integrated tests cover contact invitations, enrollment, scoped responses, audio/transcription contracts and proposed-task authority semantics with synthetic providers.

## Browser checks

An isolated localhost:4337 app used the dedicated local database and fake email/model/transcription transports. No real messages or model calls were made.

- Signed into a fictional advisor account with manufacturing and SaaS business streams.
- Opened the eight-section leadership worksheet, inspected model-specific prompts, entered task-walkthrough notes and saved them. The UI advanced to team review and displayed a saved-meeting receipt.
- Signed out, opened the assigned invitation link and enrolled a fictional participant.
- Confirmed the personal questions, voice preference, record/upload controls, shared how-to instructions and typed alternative.
- Entered a synthetic response, requested a simulated task draft, saw an SOP-style card, approved it and received the submission receipt.
- Repeated enrollment after fixing the URL, refreshed `/respond?request=…`, and verified the same assigned form remained visible. The revised card showed purpose, trigger and reported checkpoints before approval and submission.
- Viewed the branded HTML invitation in the browser. This establishes browser rendering, not compatibility in every email client.

## Hosted release

Implementation `4a883ec1cb9e649960a2c72773b9a92e59123d00` passed CI run [34162455255](https://github.com/mattrob333/DutyGraphV2/actions/runs/34162455255). Vercel deployment `dpl_4Ua7eMB5bY9SABkK4UmnDabeeKwo` reported READY for that exact commit. Production checks on dutygraph.com returned 200 for `/respond?request=<synthetic-id>`, app asset `/assets/index-C1jxfpPw.js` with the new response route/kickoff guide, and the updated participant handbook. The participant API returned 401 without a session. A hosted browser check displayed sign-in at the private response route. No production customer records were changed.

## Boundaries

No physical microphone recording, real email delivery or paid provider reasoning-quality evaluation was performed. Typed/browser checks and synthetic audio/API tests are different evidence. Company model templates do not prove actual tasks, bottlenecks, authority or customer outcomes. Old discovery drafts require regeneration under the updated prompt fingerprint.
