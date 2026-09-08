# DutyGraph development log

## 2026-09-08 — A focused work map and living client brief

Consolidated the marquee Company Work Map into Work map / Work flows / Tasks. The selected stage/person survives navigation to flows and tasks. Task cards moved into the map with the old route preserved, compact search/status, optional filters and a useful people → duties → tasks view by team. Parked the competing relationship/connected/organization/control views without deleting their underlying implementation or data. The existing Agent governance area remains separate.

Added an advisor-only live audit brief and source-bound executive report preparation. Current scope, stage coverage, documentation gaps, constraint hypotheses, advisor-selected current analysis, active commitments and actual recorded observations assemble automatically. Report preparation keeps an editable narrative, named audience and exact-content approval, then exports a branded, printable frozen overview plus selected supporting detail. It does not send email, create a client portal or establish a commercial retainer. The continuing workflow connects the same commitments to Weekly review and carries evidence into Strategy's actual input/dependency contracts; missing financial/customer/market inputs remain visible.

Fixed report integrity issues found during independent review: inactive tasks cannot be reclassified into a deliverable, coverage excludes inactive work and unrelated response requests, documentation-only handoffs do not report placeholder execution settings as policy, and completed framework selections check exact source/upstream versions. Approved previews explicitly remain snapshots; currentness is checked again for download. Fixed duplicate Strategy component keys reproduced during focus refresh. Updated Help, handbook, API inventory and product documentation.

Validation: 317 local tests pass, production build/typecheck and 105-route contracts pass, dependency audit reports zero vulnerabilities. Fictional browser checks cover responsive map/flow/task navigation, context retention, stable stage help, report preparation/preview/approval/download, observations and completed weekly commitments, and Strategy source/input navigation. No paid provider calls or real emails were used. Encrypted backup recovery and training results are recorded with release evidence in [verification](docs/verification/2026-09-08-marquee-client-brief.md). No migration is added. Hosted and real-client acceptance are reported separately.

## 2026-09-08 — Evidence behind stages and automatic work follow-ups

Added stage-specific source passages, rationale and unknowns to saved research proposals and stage help. Company evidence and comparable-business examples are validated and displayed separately; downstream discovery and assignment prompts cannot treat peer practices as client facts. Current research proposes variable stage counts while preserving existing custom stages and legacy drafts.

The Work Map assesses missing task detail, duties without tasks, missing people and undocumented sequences. A short follow-up preview uses exact stored recipients and up to three plain-language questions. Opt-in continuing checks run through the existing maintenance schedule, with per-person spacing, pending-request checks, gap dedupe, pause/resume, sample-data blocking and no retry after uncertain email outcomes. Password-free responses retain voice/type capture and enqueue durable processing atomically. Grounded reply proposals fill missing work, connect supported tasks/duties/flows and retain exact response evidence. Manual, reviewed and changed records are preserved for advisor review. Flows captured without execution rules are documentation only, so case execution remains blocked.

Migration 0012 adds worker cursors and unique reply/outreach indexes. Local migration and focused API tests passed, including email-to-private-reply-to-map assembly, concurrent retries, sample/tenant isolation, changed addresses, pause/resume, stale-job timing and unknown-send protection. Validation: 300 tests passed; production build, type checks, 103-route contracts, synthetic training and encrypted backup recovery passed. Dependency audit found zero vulnerabilities. Browser verification covers private reply to automatic map update, saved-reply review, Cobalt no-send previews, stable hover, light/dark themes and five screen sizes. See [verification](docs/verification/2026-09-08-work-gap-followups.md). Implementation `e4aedfb` passed CI `34237031178`; Vercel deployment `dpl_29okn2JzKn8Bn4sNQPKbWnsBa2dd` is READY. Hosted migration 0012 applied; app/health return 200, the new follow-up and maintenance routes require authentication, and live CSS matches the local build. Development uses fictional data and injected providers; no real outreach or paid generation was used.

## 2026-09-08 — Work Map visual refinement

Compressed the page heading and stage ribbon, removed the duplicate introduction and selected-card top stripe, and combined stage context, reporting chart and person details into one workspace. The chart fits the remaining desktop height, has a compact laptop layout and preserves its camera during stage/person selection. Added Fit team, quieter neutral person cards, and matching light-theme surfaces. Mobile details stack below the chart. Older graph views remain available; the disabled map Register control is omitted.

Moved the old-work AI prompt into the unassigned-work panel and the existing assignment disclosure. Fixed stage help placement so popovers stay outside the stage row and cannot intercept neighboring stage clicks. Expanded mode now scrolls to lower task flows; normal wheel scrolling over the chart is available alongside pinch and zoom controls. Updated the Work Map guide and handbook source.

Validation: 263 tests passed; build, 97-route contract generation and dependency audit passed (zero vulnerabilities). Synthetic browser checks cover the full 12-person Cobalt chart at 1366×768, 1440×900, 1920×1080 and 3429×1264; mobile checks use 390×844. Stage selection, keyboard person selection, search, scoped duties/tasks, hover stability, fit controls and expanded/page scrolling pass, with no browser errors. Light-theme checks and a long-name layout check passed. See [verification](docs/verification/2026-09-08-work-map-refinement.md). No emails, paid providers or customer records were used.

Release follow-up: implementation `1f48b7b` passed CI `34231128872`, including the synthetic advisor journey and encrypted backup recovery. Vercel deployment `dpl_5BUeH4fn8P7Hcy5b1wrnbbhotkfr` is READY. The hosted app HTML, JavaScript and CSS return 200; the live CSS hash matches the verified local build, including compact stages, single-border selection and light-theme styling. Authenticated interactions were checked locally with synthetic data, not against the advisor's hosted company.

## 2026-09-08 - Demo intake to discovery and automatic work mapping

Added a URL field and optional goal to public intake, a restricted advisor demo inbox with status/follow-up edits, and idempotent conversion to a company/contact. Research starts from the inbox action; the company snapshot and proposed stages save automatically while existing custom/reviewed stages survive re-research. Contact details carry into kickoff preparation. Migration 0011 uses a provisioned account/tenant mapping plus an email allowlist; ordinary advisor registration cannot read global leads.

AI discovery output now includes validated saved-stage IDs, rationale/confidence, and exact duty references. The UI opts into automatic assembly after generation; kickoff notes lead straight to the team/duty map, and task extraction creates linked proposed cards without pretending advisor or participant review occurred. Existing tasks can be referenced and preserved on later runs. A separate AI action connects previously collected unassigned work. Concurrent profile/record changes abort the whole update, with a recoverable saved job result. No real emails or AI calls were used during development.

Local validation: 263 tests passed, including automatic map assembly, recoverable assembly errors, repeat extraction, stage/duty ID rejection, concurrent content/state preservation, abandoned-run recovery, operator isolation, spam handling and concurrent demo conversion. Full build and 97-route contract generation passed; production dependency audit found zero vulnerabilities. An integrated browser walkthrough submitted fictional public intake, opened the inbox, saved a snapshot automatically, verified contact prefills, saved kickoff notes and opened the linked person/duty in the correct Work Map stage, with no page errors. Providers were synthetic. Migration 0011 is applied locally and on the host; the existing operator account is provisioned and its production allowlist configured. Real-provider quality and email delivery were not exercised. App deployment verification follows publication.

Publication: implementation `0c9e8ce` passed CI run `34228366691` and deployed READY as `dpl_G6u327Xmgv7fjmFHbQELqqJV3WGR`. Read-only hosted checks confirmed health, signed-out inbox denial, the company URL/optional-goal form, and the new inbox/mapping controls in the served app bundle. No real applicant submission, email, or AI call was made on the host. The operator inbox is configured for the existing advisor account, but its interactive hosted session was not available in this browser.

## 2026-09-08 - Neutral selected business stage

Replaced the washed-out ivory selected-stage fill with charcoal, light text and a thin top marker. Stage selection and recorded work links are unchanged.

## 2026-09-08 - Stable stage-info hover

Removed duplicate button/stage hover listeners and cancel the prior close timer before scheduling another. The delayed close checks whether the pointer is still on the stage or popup. Measured placement chooses space above or below the button, with bounded height, instead of moving the popup over its own trigger near the viewport edge.

Local browser regression checks passed for stationary hover, moving into the popup, leaving, keyboard focus/Escape, click-to-pin, and narrow-screen non-overlap. Synthetic component fixture only; no messages or providers used.

## 2026-09-08 - Explain business stages without a fixed count

Added hover, keyboard-focus and tap explanations to snapshot, Work Map, saved-profile and template stage nodes. Specific starting guidance covers wholesale, advisory and custom software; other templates use explicitly general guidance. Saved descriptions override examples. Added optional stage descriptions, variable-count regression coverage, honest template wording and neutral stream-review borders. Existing stage IDs and assignments are preserved.

## 2026-09-08 — Shared business stages, complete Cobalt context and current training

Task cards now uses the same saved stream/stage projection as Company Work Map, with multiple stream selection, owner/performer filtering, explicit Unassigned work and role → duty → task labels. Duplicate stage placements have separate counts. Secondary duty/handoff registers collapse below the board. Added keyboard scrolling, concise empty states and readable selected-stage counts.

Cobalt has a compact fictional wholesale snapshot and 18 guided business tasks covering all six stages. An advisor-only scoped sample upgrade runs when the known sandbox opens. Exact untouched legacy fixtures can upgrade; edited, reviewed and confirmed content, custom scope/goal and existing profiles are preserved. Upgraded task dependencies follow stale-binding rules. Separate control examples remain outside the wholesale stages. No research is fabricated and no providers or emails are called.

Updated Help, the portable handbook, user guides and training exercises for current Discovery, password-free work links, stage assignment, org exploration and task cards. Removed an empty response section. Fixed late workspace responses after company switches and protected edited company-intake revisions from background refreshes; failed sample refreshes can be retried.

Validation: 253 tests passed, including scoped PostgreSQL sample-upgrade and preservation tests plus workspace-switch race tests. Build, 92-route contract generation and dependency audit passed (zero vulnerabilities). Integrated local browser checks used a fictional advisor workspace: saved Cobalt profile, invoice-stage/Dana drill-down, matching person-filtered task cards, and updated Help. Narrow-screen components were checked in a separate 390px fixture. These checks do not establish real-provider quality, email delivery or enterprise readiness.

## 2026-09-08 — Stage-based Company Work Map

Added the default stage → people → duties/tasks experience with a stable org canvas, neutral highlights, scoped counts, person detail, and relevant flow links. Preserved all older graph views and the detailed task map. Added explicit task/duty businessStageLinks with server validation, version checks, duty inheritance and task overrides. No title, department, reporting line or task-level valueStage is treated as business-stage membership. Owners and performers are separate; approval rights are not inferred. Assignment UI preserves unchanged records, supports removed-stage repair and orphan work, and uses the shared accessible dialog. Cobalt can show a guarded read-only illustration when it has no saved business profile.

Validation: build and all 245 tests passed; contracts regenerated and dependency audit found zero vulnerabilities. Browser checked the actual component using fictional Cobalt data: stage selection, scoped highlights and person tasks, flow callback, assignment modal with unchanged save disabled, and a 390px responsive fixture. API tests cover real local persistence, stale links, version checks and tenant isolation. No client data, emails or paid providers used.

## 2026-09-07 — Manual kickoff roster entry

- Added manual participant rows with name/email/role/department/reports-to, executive/pilot checkboxes, repeat add, edit and remove. CSV remains the preferred full discovery-roster path.
- Manual rows serialize to the existing package CSV, preserving external IDs and quoted fields. Existing server validation/import handles duplicate identities, missing managers, cycles, row/byte limits and final attendee scope. Manager removal deliberately leaves affected reporting links flagged rather than inventing a new manager.
- Updated invitation preparation copy and added an advisor workspace link on account-enrollment conflicts. No role conversion or authentication bypass. Executive selection nominates attendees; it does not send invitations.
- Validation: full build and 226 tests passed; no real emails sent.

## 2026-09-07 — Invitation clarity, email layout and advisor form preview

- Latest send acceptance gets a prominent status; old failures are collapsed. A follow-up refresh failure no longer discards the provider result. Replacements after acceptance require explicit selection and explain earlier-link revocation.
- Widened email to responsive 800px, labeled brief/questions/preparation/security sections, rendered bullet lists, and removed exposed bearer URL text from the HTML footer. Plain-text fallback retains its usable link.
- Invitation links use PUBLIC_APP_ORIGIN when configured; the legacy production alias dutygraph-v2.vercel.app maps to dutygraph.com. Local/custom origins remain unchanged. Prior emails cannot be rewritten.
- Invalid invitation copy explains using the newest email. Advisor-account conflicts explain preview testing; enrollment isolation remains intact. Actual cause of any individual invalid token is not exposed publicly.
- Added an advisor-only UI preview using the actual KickoffPreparation component; edits remain in component memory with no submission or enrollment. This previews structured fields, not microphone/enrollment behavior.
- Validation: all 222 tests and production build pass; 91-route contract generation and dependency audit pass (zero vulnerabilities). Browser checked the email layout and actual kickoff form preview under the synthetic advisor account. No real email sends initiated. Release `2d3009c` passed CI `34173321591`, including the synthetic advisor journey and encrypted backup recovery. Vercel deployment `dpl_BeRoVf8Jo1vLCkkwWMEYcG5zDJxy` is READY; dutygraph.com serves `/assets/index-D-2fVpwr.js` with the new preview, success and history controls. Gmail/Outlook rendering and a new real invitation remain separate acceptance checks.

## 2026-09-07 — Reusable company profile and clearer email handoff

- Added a company identity header, official-site social links, size/market highlights, and sourced HTML profile export including primary/supporting streams. Automatic logo extraction remains deferred; initials provide a placeholder.
- Retrieve the latest completed brief independently of the five-job history; changed inputs show a dated prior profile with a notice rather than silently hiding it. Legacy operating-only profiles explicitly request research.
- Advisor updates are bounded, company-scoped, revision-checked and audited; original AI findings remain immutable and corrections feed matching kickoff context. New research retains but does not automatically apply an older review.
- Strengthened research prompts for distinct offerings and comparable-size peer evidence; unavailable headcounts remain unknown. Social links must appear on the official website excerpts.
- Renamed email draft action to Save & continue to send and scroll to the preview/send panel. Saving never sends email.
- Validation: all 220 tests pass; production build and 91-route contract generation pass; dependency audit reports zero vulnerabilities. Synthetic browser checks confirmed profile rendering and advisor correction persistence across reload. No real emails or paid provider calls used. Release `289461f` passed CI `34171096494` (including synthetic advisor journey and encrypted backup recovery). Vercel deployment `dpl_wGu1Dg8AWETfaXLwrQz8ZYW2Su9r` is READY; dutygraph.com serves `/assets/index-CSET371K.js` with profile, review and send labels. This verifies deployment, not real-provider research quality or email delivery.

## 2026-09-07 — Complete the pre-kickoff preparation path

- Clarified the research/profile/email sequence, reduced the type catalog to an information disclosure, removed the evidence-library email shortcut, and grouped optional industry research.
- Added structured private kickoff capture: bounded CSV validation, explicit executive/pilot selections, goals, departments, stream boundaries, handoffs, systems and logistics. Existing voice/text and branded email delivery remain. Snapshot proposed streams in the contact request.
- Added advisor-only atomic roster import with request provenance, company/actor isolation, version checks, duplicate replay handling and conflict rollback. Returned packages feed agenda context; deterministic timeboxes total two hours. No automatic invitations to uploaded people.
- Strengthened discovery prompts around shared versus stream-specific work and prohibited silent changed-description duty merges without an explicit advisor selection. Kept the reviewed interview roster separate from the full uploaded org roster.
- Documentation: README, initial-research guide, discovery handbook and new kickoff-preparation reference. No migration. Local production build and all 217 tests passed; 90-route inventory regenerated; audit reports zero vulnerabilities. Fictional browser round trip covered email preview, private capture, advisor import, three-person/two-edge org chart and 120-minute agenda. See [verification](docs/verification/2026-09-07-kickoff-preparation.md). Implementation `b325651` passed CI [34170070728](https://github.com/mattrob333/DutyGraphV2/actions/runs/34170070728), including the synthetic advisor journey and encrypted-backup recovery. Vercel deployment `dpl_4cudK85eRWGW21BvVbFKfApVqazb` is READY. The live login page serves `/assets/index-DWXXvh23.js`, verified to contain the new capture, roster import, optional research and agenda actions. This documentation follow-up records those completed checks.

## 2026-09-07 — Polish the business-stream review cards

- Open operating stages by default for the primary stream and keep supporting streams collapsed. Promoting a stream updates the expanded primary view.
- Move Make primary / Remove this stream beneath the stages, aligned right, and separate titles, role labels, descriptions, confidence, disclosures and profile actions with consistent spacing. Stage tiles stack in two columns on narrow screens.
- Updated README and initial-research guide. Verification: production build and all 209 tests passed, 89-route contracts unchanged, dependency audit clean. Desktop and 390px mobile checks confirmed primary/supporting expansion, promotion behavior, bottom-right actions and no horizontal overflow using saved fictional preview data. No provider calls or emails are needed for this presentation change.

## 2026-09-07 — Business briefing instead of a search-results dump

- Reworked the bounded four-search pass to use public description and official-site context for competitor, market/scale and monitoring-channel discovery. Cross-company run references are rejected before searching; existing durable keys, quotas and resume behavior remain.
- Added the v2 briefing contract: six fact areas, Reported/Inferred/Not established distinctions, exact-source quote validation, date fields and separate channel recommendations. Expanded the final snapshot to up to 20 excerpts. Matching text proves provenance, not correctness; real-company research quality still needs pilot acceptance.
- Added a responsive briefing dashboard, collapsed evidence library and monitoring drawer, primary/supporting stream controls, separate classification alternatives, and a save-and-prepare-email action. Matching saved intake lets kickoff preparation use the brief instead of raw automatic search pages. Older jobs remain readable; rerun research to obtain a v2 brief.
- README and research guide updated. Validation and release results recorded in docs/verification/2026-09-07-business-brief.md. Local build and 209 tests passed; 89-route contracts unchanged; dependency audit clean. Desktop/mobile synthetic workflow checked. No migrations, paid-provider test calls, email sends or feed subscriptions.

Newest entries first. This log was established September 7, 2026. The two preceding website releases are backfilled below; older history remains in Git and dated [verification records](docs/verification/). This is not a claim that every historical change has been reconstructed.

For every future logical change, update this log and the [README](README.md) together. Record the date, change and reason, affected areas, checks actually performed, known publication status, and remaining work. Link a commit or detailed evidence when available. Do not include credentials, private transcripts or lead details.

## 2026-09-07 — Recognizable business-type catalog

- **Change and reason:** Replaced the names-only dropdown buried under two disclosures with a top-level “Browse all 52 business types” catalog in Discovery. Cards show the title, description, a familiar organization with an explanation and official link, and expandable stage previews. Search covers names, descriptions, families and example companies. A general-business fallback uses a conceptual example rather than falsely assigning a specific company to that catch-all.
- **Behavior:** Add a flow to the proposed profile, receive visible confirmation, then save through the existing profile action. Already-added templates are marked and the eight-flow limit remains. Manual stage edits and custom flows stay in a separate editor. The examples are client-side recognition aids, never company evidence or model input. No database or API changes.
- **Validation:** Build and all 204 tests passed; generated contracts unchanged (89 routes), dependency audit reports zero vulnerabilities, and diff check is clean. Catalog integrity check found 52 matching example entries (51 official-site links and one general example), no missing or extra IDs. Browser checks on fictional local data covered 52 rendered cards/examples, Wesco/Salesforce searches, stage expansion, adding/saving, empty results, and 390px mobile layout without horizontal overflow. Dark/light presentation inspected. No provider calls or emails were sent. Hosted publication follows the implementation commit.
- **Documentation:** README, discovery help and initial-research reference updated. Examples illustrate one business line and do not imply customers, endorsements or identical internal processes. Final search review added catalog IDs to the searchable text so shorthand such as SaaS and ecommerce finds the intended card; final build and browser SaaS search passed, and saved flows survived refresh.
- **Publication:** Catalog implementation [`29f78de`](https://github.com/mattrob333/DutyGraphV2/commit/29f78de07393e5d1a16aedc6f1c42043849c6a9b) passed [CI 34166305336](https://github.com/mattrob333/DutyGraphV2/actions/runs/34166305336), including synthetic advisor and encrypted recovery checks. Vercel reported that exact commit READY; production served the catalog, example/company-search code in `index-Rloerb2K.js` and updated discovery help. The follow-up commit adds shorthand search and records these checks.

## 2026-09-07 — One-form research, AI business classification and framework readability

- **Change and reason:** Replaced mandatory manual selection from 52 business templates with a company/URL/description form. Four default research areas live in a collapsed drawer. One action collects them sequentially, then AI proposes the sector and operating flow with reasons, confidence and kickoff questions. The separate Industry Map reuses collected context. Added saved/resumable research steps, bounded paid calls, reusable research snapshots, strict classification/citation validation, tenant isolation and revision checks.
- **Presentation:** Readable proposed-profile cards precede optional manual editing. All sixteen strategy canvases have numbered section navigation, finding/gap/question counts and expandable confidence reasons; wide table rows become labeled records on small screens. README, technical reference and relevant help/wiki updated.
- **Validation:** Full build and all 204 tests pass. Eight classification/sequence tests cover all 52 catalog IDs, forged citations, wrong-company research, URL-only intake, failed retrieval, retained intake, idempotent requests, quotas and resume without repeating completed work. Browser checks verified the combined four-search/profile/save flow with synthetic providers, all sixteen rendered framework layouts, and phone-width discovery/table layouts without page overflow. Generated API inventory includes the two new classification routes (89 routes total); dependency audit reports zero vulnerabilities. No real provider calls or emails used. See [verification](docs/verification/2026-09-07-initial-research.md).
- **Publication:** Implementation [`736e394`](https://github.com/mattrob333/DutyGraphV2/commit/736e394f1e554ae594983479e3e2c0052eac16f7) passed [CI 34165840592](https://github.com/mattrob333/DutyGraphV2/actions/runs/34165840592), including the synthetic advisor journey and encrypted backup recovery. Vercel reported that exact commit READY. Production `/login` serves the new research/classification/drawer code in `/assets/index-BEmkLZ0C.js`; updated discovery help returns 200 and the unauthenticated classification endpoint rejects access with 401. This does not establish live provider execution or client output quality. The follow-up documentation change records these release checks without changing application behavior.
- **Boundaries:** Account OpenAI/Exa configuration is required for the corresponding feature. Website claims remain unverified; no task assignments or authority are inferred. Browser sequence continuation depends on the local saved plan. Real-client output quality requires pilot acceptance. See [technical reference](docs/initial-research.md).

## 2026-09-07 — Business-specific kickoff and complete capture guidance

- **Change and reason:** Added a guided executive kickoff that captures operating-model fit, goals, departments/roles, duties, concrete tasks, handoffs, systems and follow-up. Leadership establishes context; employees provide the detailed procedures. Fixed loss of duty descriptions in participant AI context and the 12,000-character truncation of longer saved kickoff notes. Preserved AI-extracted task purpose, trigger and human checkpoints through participant review and submission using optional fields compatible with older drafts.
- **Affected areas:** Shared business-model guide and stage prompts, kickoff worksheet, participant extraction context/validation, HTML/plain-text email and private response instructions. Updated participant/discovery help, strategy wiki and [technical reference](docs/kickoff-capture.md). Fixed enrollment/reload routing: the private form now opens `/respond?request=…` for the assigned request instead of the public homepage; sign-in and sign-out links use `/login`. No schema migration or provider provisioning. See [verification](docs/verification/2026-09-07-kickoff-capture.md).
- **Validation:** Targeted synthetic suite: 64 tests passed, including all 52 templates, hybrid/custom handling, full meeting-note retention, context freshness, role/duty handoff and rejection of foreign source/person IDs. Full verification passed all 196 tests; final build and contract generation passed; dependency audit found zero vulnerabilities. Local browser checks covered hybrid kickoff notes/save, private-link enrollment, typed answer to simulated AI card, approval feedback, submission receipt and rendered email. Rechecked enrollment/refresh on the stable response route and the added purpose/trigger/checkpoint card fields. Audio routes/transcription used synthetic tests; no actual microphone or outbound provider call was made.
- **Publication:** Implementation [`4a883ec`](https://github.com/mattrob333/DutyGraphV2/commit/4a883ec1cb9e649960a2c72773b9a92e59123d00) passed [CI 34162455255](https://github.com/mattrob333/DutyGraphV2/actions/runs/34162455255), including the synthetic advisor journey and encrypted recovery rehearsal. Vercel reported the exact commit READY. Hosted `/respond`, its new app asset, participant handbook and unauthenticated API rejection were verified. The hosted response URL also rendered the sign-in screen in the browser.
- **Remaining boundaries:** Real email delivery, microphone hardware and extraction quality on representative client interviews need live acceptance. Templates are question scaffolding, not evidence. Old discovery drafts become stale under the new prompt fingerprint and must be regenerated. Unsaved kickoff notes are not durable across reloads.

## 2026-09-07 — Documentation updates required for every change

- **Change and reason:** Established this development log and the owner's requirement to update it and the README for every change, so a new developer can follow implementation and product decisions. Refreshed the README from its older baseline through release `178aba0`.
- **Affected areas:** README, contributing instructions, repository agent instructions, development log and documentation index. Added current measurement status, SEO inventory, aggregate pilot-report command and links to detailed references.
- **Validation:** Documentation link and diff review. No application behavior changed; runtime tests were not rerun for this documentation-only change.
- **Remaining work:** Google terms acceptance, Analytics activation and Search Console ownership verification remain pending approval. This documentation change does not complete them.

## 2026-09-07 — Consent-gated website measurement and pilot reporting

Release: [`178aba0`](https://github.com/mattrob333/DutyGraphV2/commit/178aba032c25f39fa101ec77fb5071b9b36b8189).

- **Change and reason:** Added a public-page analytics layer with explicit consent and withdrawal; inquiry/newsletter receipt hooks; a privacy page; and an operator aggregate report covering inquiry stages, follow-up dates and notification status. Distinguishes receipt events from unique saved inquiries and qualified prospects. Fixed mobile footer overflow and consent-dismissal scroll behavior.
- **Affected areas:** Public marketing assets, measurement generator/configuration, pilot operator tooling, SEO inventory, tests and operational documentation. Private employee responses and workspace pages are excluded from public-site analytics.
- **Validation:** Build and all 190 tests passed, including consent/data-minimization and real SQL aggregate tests. CI passed. Browser layout checked at 390px and 1440px; isolated measurement fixture blocked third-party requests. See [verification](docs/verification/2026-09-07-website-measurement.md) and [measurement runbook](docs/website-measurement.md).
- **Publication:** Vercel reported this exact commit READY. Production privacy page, measurement script, landing configuration and 191-page sitemap were checked successfully.
- **Remaining work:** Measurement ID and Search Console tag intentionally remain null. Google account setup is prepared at the legal-terms step; Search Console is prepared at ownership verification. Owner approval is required before completion. No live analytics collection, Google indexing or production email delivery is claimed.

## 2026-09-07 — Governance category buyer guides and public SEO validation

Release: [`6f2e3b3`](https://github.com/mattrob333/DutyGraphV2/commit/6f2e3b3e3bb5b35e79020ba549a48e74717e5a1a).

- **Change and reason:** Published 12 distinct category buyer guides and evaluation worksheets around the 160 researched offering profiles. Added deterministic public-page validation and sitemap generation, shared marketing canonicals, and direct root-to-landing routing while retaining demo and old workspace entry behavior.
- **Affected areas:** Directory content and generators, public entry routing, SEO validation, public pages and documentation.
- **Validation:** Build and all 185 tests passed for that release. The then-current sitemap contained 190 public pages. See [dated SEO verification](docs/verification/2026-09-07-programmatic-seo.md).
- **Publication:** CI succeeded and the matching Vercel release was verified READY. Production public routes were checked after publication.
- **Remaining work:** Crawlable pages and a sitemap do not establish search indexing or ranking. Product claims retain their source research dates; the new templates did not independently revalidate every vendor.

## Password-free kickoff preparation (2026-09-07)

Kickoff contacts open their private link without an account or password. CSV and manual roster entry share hierarchy validation. Drafts can be saved on the same device. Submission records invitation-possession assurance and the external contact under the sponsoring account, returns preparation for advisor review, and consumes the link atomically. GET does not consume links. Expired, revoked, closed and non-kickoff links are rejected. Advisor cookies and roles are untouched. Other participant workflows retain authentication. This limited form collects written context and roster data; voice remains in the signed-in participant workflow.

Validation: targeted PostgreSQL HTTP test passed for repeated GET, same-email advisor preservation, invalid/non-kickoff/revoked/expired links, stale version, consent, submission and replay. Full build and all 226 tests passed. Browser verified direct opening, manual roster entry and successful submission without an account. No real email sent.

Release verification: `4cc5874` deployed READY on Vercel (`dpl_9EcS7Av5DPaAkQxW6XXwQDP8mJvC`); dutygraph.com serves the password-free form bundle. Local build, 226 tests and synthetic browser submission passed. CI run 34174265747 was still running at this check. No real recipient submission or email delivery test was performed.

## 2026-09-07 — Full-page kickoff research review and voice response

The private kickoff page uses approximately 84% desktop width in dark mode, with public-research fact cards, cited sources, separately labeled primary/supporting operating stages, a CSV/manual team sheet with reporting-manager suggestions, and one original-wording response. Coordinator-friendly prompts defer detailed vision/KPIs to the executive team. Public context is frozen when issuing new invitations; older invitations use the current matching public brief. Private advisor notes and raw evidence are excluded.

OpenAI gpt-4o-transcribe reuses the advisor account configuration. Contacts explicitly record, stop and transcribe before reviewing and submitting editable text. Three-minute clips, 3 MB upload limit, ten attempts per request and sixty per tenant per day; attempts are reserved transactionally before provider calls. No raw audio is persisted by this new endpoint; clips remain in page memory for retry/download on failure. Device drafts save text/roster only. Existing signed-in participant voice capture remains available.

Validation: local build and 226 tests passed, including password-free submission, expiry/revocation and a synthetic transcription provider with quota enforcement. Browser checked research layout, primary stages, manual roster, saved text draft and successful single-response submission. Real microphone/provider transcription and mobile-device acceptance were not exercised; no real emails or paid provider calls were made.

Release verification: `9dd225c` passed CI run `34175360718` and deployed READY as `dpl_5anrg72AE5AGWC4JMKMRXud666H7`. The live dutygraph.com bundle includes the research review, single response and transcription controls. This confirms deployment, not real microphone/provider acceptance.

## 2026-09-07 — Scannable kickoff snapshot and eight focused prompts

The contact page now leads with company identity and a short expandable research description. Source-backed reported findings are grouped in compact columns with source/date details on demand; assumptions and missing information remain separately collapsed. Proposed operating stages retain primary/supporting labels. Eight coordinator-friendly prompts cover corrections, customer work, a representative work journey, departments, delays, tools, people and logistics. They guide one typed/dictated answer; the old additional-question list is no longer displayed. Team entry follows the response, with the manual editor opened only when needed. Reading width is bounded at normal zoom and switches to a stacked mobile layout.

Validation: build and all 226 tests passed; dependency audit found zero vulnerabilities. Browser reviewed fictional sourced findings, counted exactly eight prompts, and successfully submitted one freeform response with a roster follow-up. Deployment verification pending. No real emails or provider calls sent.

Compact kickoff release: `ddca3f6` passed CI `34176227360`; Vercel deployment `dpl_EDHWRuNoqEJCb3D9siWw25FDXzdu` is READY. The live dutygraph.com bundle contains the company snapshot and eight-prompt flow. Browser submission used fictional data; real microphone acceptance remains separate.


## 2026-09-07 — Refresh returned contact responses

Fixed the advisor workspace remaining on an old revision after a separate contact page submits. Visible workspaces check every 15 seconds and on tab focus; only a newer revision replaces data, with cleanup on company switch and no disruptive background error. Read-only hosted investigation confirmed the reported submission was persisted atomically with the returned request; the screenshot showed an older revision. No customer data was modified or resubmitted. Validation: build and all 226 tests passed; the expanded private-link integration test also passed and verifies the advisor workspace endpoint returns both saved records. Contracts passed; dependency audit reported zero vulnerabilities. Publication follows this commit; real submission persistence was verified read-only.


## 2026-09-08 — Discovery progression and frictionless team capture

Unified advisor/client company snapshots, moved the business value chain above sourced findings and carried it through subsequent discovery steps. Returned preparation leads the page; completed research/email forms collapse; roster import confirms success and the next action. Contact freeform text now appears in returned preparation review.

Added token-scoped work interview capture and transcription without creating accounts or changing advisor sessions. Original responses remain reported evidence for advisor extraction/review. Expiry, revocation, version checks, one-use submission and tenant/request scope remain enforced. Confirmation requests retain their existing identity/approval flow. Added a full-page no-send form preview and explicit unchecked recipient selection. Team email is concise, sectioned and 800px wide; complete questions live on the private page. No real invitations were sent during development.

The first reported hosted roster attempt lasted 105.076 seconds, matching the configured provider timeout; its retry completed in 33.385 seconds. Prior error handling discarded the exception identity, so exact cause cannot be proved retrospectively. New errors identify timeout versus lost connection, and UI polling checks saved outcomes without automatic paid retries. New interview prompts use short complete plain-language questions inspired by ASD-STE100; no formal conformity claim. Existing saved questions are preserved; regenerate and review to change them.

Validation: all 230 tests and build pass; contracts pass and dependency audit reports zero vulnerabilities. Browser verified an unchecked recipient list, full-page form preview, collapsed research/email history, shared snapshot with primary flow open, and successful synthetic password-free submission. Transcription tests use mocked providers; no live microphone or paid provider test. A contact identity notice explains email-based roster matching without merging records. No client records have been changed by this work.


## 2026-09-08 — Restore neutral discovery styling

Removed sage accents that came from the reused client snapshot stylesheet, including profile borders, monogram, labels, response controls and arrival indicator. Expanded primary stages across the row with directional arrows and larger labels; narrow screens stack the flow vertically. Supporting streams remain collapsed by default. CSS and presentation only. Validation: build and all 230 tests passed; contracts regenerated; dependency audit found zero vulnerabilities. Browser checked with a fictional company fixture.


## 2026-09-08 — Focus Discovery on the current task

Both streams use full-width stages and arrows. Removed repeated value-chain banners from later Discovery steps. Meeting preparation keeps returned contact material collapsed; existing drafts make regeneration secondary to review/save. Company facts use short bullets with reported counts, places, offer names and potential competitor links from saved sources. Original qualifications and citations remain in one expandable evidence section; no saved research is rewritten. Validation: build and 233 tests passed; contracts passed; audit found zero vulnerabilities. Browser checked the actual snapshot component with synthetic facts, a linked potential competitor and both expanded streams. Reviewed rendering and action conditions across all five Discovery steps; no real client data or provider calls were used.

Validation: build, all 255 tests and 92-route contract generation passed; production dependency audit found zero vulnerabilities. Local browser verification confirmed the stage explanation opens without changing the Work Map selection. Template counts and existing saved assignments remain unchanged.

Full build and 255 tests passed; 92-route contracts passed and production dependency audit found zero vulnerabilities.

Validation: selected-stage browser check confirmed charcoal fill, light text and marker; full build, 255 tests and contracts passed. Dependency audit found zero vulnerabilities.
