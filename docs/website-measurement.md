# Website measurement and pilot reporting

Updated September 7, 2026.

## Release state

The consent interface, event hooks, privacy page, aggregate pilot report and tests are implemented. `content/measurement.json` deliberately contains null IDs: this release loads no Google tag. A separate DutyGraph Analytics account was prepared in the owner's Google session, but accepting the Google legal terms remains an owner approval step. Search Console's HTTPS URL-prefix property was prepared; publishing its verification tag and verifying ownership also remain pending approval. Neither active collection nor indexing is claimed.

Public measurement IDs and verification tags belong in `content/measurement.json`; they are not credentials. Never add Google OAuth tokens, database URLs or email provider keys there. Build validates configuration and injects it into the 191 public marketing pages. Application, login, participant and handbook pages do not receive the script.

## Event contract

| Event | Trigger | Allowed additional value | Interpretation |
| --- | --- | --- | --- |
| `page_view` | First consented view of the public document | None | Public content viewed by a consenting browser |
| `worksheet_download` | Click to a known published worksheet | `file_name`: allowlisted public path | Download requested; not proof the file was read |
| `demo_open` | Click to a known sample entry | `demo_type`: discovery or governance | Demo entry requested; not completion |
| `pilot_form_start` | First consented focus in the inquiry form | None | Form engaged |
| `pilot_receipt` | Successful server receipt after form submission | `inquiry_type`: pilot, advisor, enterprise or team | Receipt, including repeated requests; not necessarily a new saved lead |
| `newsletter_receipt` | Successful launch-interest receipt | None | Launch-interest receipt; not an active subscription |

Every event has a generated public canonical page address, public title and content group. Arbitrary query values, fragments, referrer URLs, link labels, names, emails, answers and private evidence are excluded. Known demo query values are translated into two fixed enum values. There are no user IDs or cross-domain identity links. Campaign query attribution is intentionally not implemented; do not claim campaign-to-qualified-lead attribution from this release.

The public API intentionally acknowledges duplicates with the same response to avoid exposing whether an address already exists. Honeypot responses do not emit the receipt event. Qualified inquiries and booked pilots must be counted from the private operator records, not inferred from GA receipt counts.

## Consent behavior

No Google script, cookie or event is created by this implementation before Allow analytics. No thanks has an equally visible action. Analytics choices in the footer reopens the choice. Global Privacy Control and Do Not Track keep collection off. Consent lasts up to 180 days; invalid, future-dated or expired state requires a new choice. If browser storage is blocked, consent applies to the page only.

Withdrawal disables collection, changes consent to denied and expires accessible `_ga` cookies. Storage changes propagate withdrawal to other open tabs. Past Google data is not deleted by withdrawing consent. Events from before consent are never replayed. Advertising storage, advertising personalization and Google signals are disabled. This is a technical implementation with a public explanation, not a claim of legal compliance in every jurisdiction.

## Complete Google activation

1. The owner approves/accepts the Google Analytics US Terms of Service and Data Processing Terms for the separate DutyGraph account. Do not use the existing TakeoffSpeed property.
2. Create the DutyGraph Website web stream for `https://dutygraph.com`, New York reporting time. Keep optional account sharing and Google signals off. **Disable all Enhanced Measurement features** in the stream: only the explicit events above should run. Automatic form, outbound click and history tracking can bypass the intended event contract or duplicate events.
3. Put the actual `G-...` stream ID in `content/measurement.json`. After owner approval, add the Search Console HTML verification token for the HTTPS URL-prefix property. Build, review, test and deploy. The root redirects to `/landing/`, where the tag is rendered in the head.
4. Verify the published tag in Search Console and submit `https://dutygraph.com/sitemap.xml`. Inspect the homepage, a buyer guide and an article. Record verification and sitemap status separately from indexing status. A URL-prefix property does not cover all protocols and subdomains.
5. In a clean browser, confirm no Google requests before consent; allow consent and verify one page view plus deliberate worksheet/demo events in Realtime. Decline and withdraw consent; verify subsequent actions stop sending. Never submit a fabricated production inquiry simply to generate a conversion.
6. Register `inquiry_type` and `demo_type` as event-scoped custom dimensions if needed for reports. If marking `pilot_receipt` as a key event, name reports as inquiry receipts, not unique leads. Avoid combining it with any automatically collected form conversion.

Preview hosts stay off because their origin does not match the public origin. Use the isolated unit harness or a local fixture to check UI behavior without collecting production traffic.

## Weekly business report

With an operator database connection, run `node scripts/pilot-inbox.mjs summary`. It emits aggregate counts only: saved inquiries by interest, created in the last rolling 30 days, current pipeline stages, overdue and missing follow-up dates, and notification state. It does not emit names, addresses, answers or email envelopes and sends no messages. Dates for overdue work use America/New_York.

An email may have one record per interest type; totals are inquiries, not distinct people or companies. Current stages are a snapshot, not historical conversion rates. A notification marked sent proves provider acceptance only. Use the existing private `list` and `update <private-json-file>` commands for follow-up. Do not expose those commands as public HTTP routes or run them with the application role.

Review weekly: new saved pilot interest, qualified conversations, scheduled pilots, overdue follow-up, notification exceptions, and consented content engagement. Review Search Console query intent and index coverage monthly. The database report and GA reports are deliberately not joined through personal identifiers.

## Verification

`tests/marketing-measurement.test.ts` executes the actual browser script in an isolated DOM harness and checks consent, revocation, expiry, preview/private exclusions and data minimization. `tests/pilot-summary.test.ts` runs real aggregate SQL against temporary tables and checks current-stage, time-window, notification and privacy behavior. The existing pilot API tests cover storage, duplicates, consent, origin checks and notification retries. `npm run verify` builds and runs the complete suite. Browser layout and Google collection are separate checks; record their results in the release evidence.

References: [Google consent implementation](https://developers.google.com/tag-platform/security/guides/consent), [GA4 configuration fields](https://developers.google.com/analytics/devguides/collection/ga4/reference/config).
