# DutyGraph

**Continuing on a laptop? Start with [START-HERE.md](START-HERE.md).** It contains setup, the current baseline and a paste-ready Codex prompt. [Next steps](docs/NEXT-STEPS.md) tracks open work; [artifact audit](docs/handoff/2026-09-09-artifact-audit.md) explains what is in Git versus private desktop/runtime state. This September 9 handoff preserves the approved Work Map and website gallery. A fresh checkout passed locked install and build without desktop environment files; see [handoff verification](docs/verification/2026-09-09-laptop-handoff.md).

The website product gallery opens with the current Company Work Map: a real capture of the fictional Cobalt sample, followed by workflows, task cards and human checkpoints. Each image opens full size; the map stays fully visible on mobile.

The Work Map separates lighter charcoal stage cards from a recessed dark background using subtle shadows. Fills and hover states stay neutral; only selected borders carry a slight steel tint. Light mode uses white cards on warm gray. Workflow diagrams retain their separate role and handoff colors.

Workflows & cases uses a distinct branching-path sidebar icon. It lists the company's saved workflows and manual cases; it is not a reusable workflow recommendation library. Its sidebar placement remains under product review.

Company Work Map centers the selected company's name and monogram, with a clear **Workstream → People & duties → Task flows** hierarchy. Actual duty names and purposes explain the work alongside the chart. Its three focused views remain **Work map**, **Work flows**, and **Tasks**; a workflow can cross several duties. Stage/person selections survive a trip into the flow. Tasks includes compact search/status controls and stage or team grouping; former Task cards links remain valid. Relationships, Connected, Org & duties and Agents & controls are parked without deleting their records or implementations.

The latest refinement also stabilizes chart fitting during stage selection and reads completed follow-ups with their matching work details. Release `e5cd6c0` passed CI and is deployed READY on dutygraph.com. **318 tests pass**, along with production build/typecheck, 105-route contracts and responsive browser checks. See [company identity and hierarchy verification](docs/verification/2026-09-08-work-map-identity.md) for release evidence and acceptance boundaries.

**Client brief** is the living audit output. It assembles scope, work coverage, documentation gaps, recorded hypotheses, current advisor-selected team findings, commitments and measurements. **Prepare client report** prefills an editable executive report with a frozen stage/priority/measurement overview. Audience review and exact source checks still precede download. Weekly review uses the same commitments; Strategy exposes its actual required inputs, source inventory and dependencies. An audit supplies evidence, not invented financials or market facts. See [the living client brief](docs/living-client-brief.md).

The earlier client-brief release `7e9938d` also passed CI and hosted checks. Its synthetic browser checks cover live brief through approved report download, weekly measurement/commitment updates, and Strategy input/source navigation. Publication and acceptance are recorded in [verification](docs/verification/2026-09-08-marquee-client-brief.md). Neither refinement adds a migration or provider. Real client delivery and the full hosted audit walkthrough remain separate acceptance work.

Discovery already connects demo requests to research, kickoff, roster, private interviews and evidence-linked work proposals. Stage help separates company evidence from peer examples. Optional work-gap follow-ups use selected stored recipients, weekly spacing and private voice/text replies; changes remain proposed and preserve reviewed work. See [demo requests](docs/demo-requests.md), [work follow-ups](docs/work-gap-followups.md) and [stage work map](docs/stage-work-map.md). Migration **0012** is required for those earlier follow-ups; email and AI providers must be configured per account.

**Understand the work. Improve the business. Delegate with clear human authority.**

DutyGraph is an advisor-led business discovery and strategy application from Tier 4 Intelligence. It turns research, leadership conversations, and employees’ descriptions of their work into a connected record of people, duties, granular tasks, software, and handoffs. Advisors use that record to investigate gaps, prepare findings, and identify bounded candidates for AI assistance.

The ambition is a living map of a business: evidence informs strategy, strategy informs proposed work, and outcomes inform the next decision. This is the direction of the product, not a claim that autonomous business management exists today.

[Website](https://dutygraph.com) · [Discovery demo](https://dutygraph.com/?demo=discovery) · [Project wiki](docs/wiki/Home.md) · [Developer onboarding](docs/wiki/Developer-Onboarding.md) · [Documentation index](docs/README.md) · [Development log](DEVLOG.md)

## Start here

| Goal | Read |
| --- | --- |
| Understand the product and customer | [Product vision](docs/wiki/Product-Vision.md) |
| Follow the advisor and participant experience | [User journeys](docs/wiki/User-Journeys.md) |
| Know what exists versus what is planned | [Current state](docs/wiki/Current-State.md) |
| Make your first contribution | [Onboarding](docs/wiki/Developer-Onboarding.md), [contributing](CONTRIBUTING.md) |
| Understand the technical model | [Architecture and data](docs/wiki/Architecture-and-Data.md) |
| Understand AI prompts and dependencies | [Discovery and strategy](docs/wiki/Discovery-and-Strategy.md) |
| Understand authority and integrations | [Governance](docs/wiki/Governance-and-Integrations.md) |
| Plan the next release | [Roadmap](docs/wiki/Roadmap.md), [operations](docs/wiki/Operations-and-Deployment.md) |

## Current status

Initial discovery now produces a six-section **sourced business brief**, with explicit unknowns, cited excerpts and a separate monitoring-channel drawer. Contextual searches use the description and official-site evidence; primary/supporting streams can be changed before saving. The primary flow opens its stages automatically; supporting flows stay collapsed, with stream controls grouped at the bottom right. Kickoff preparation consumes the matching brief rather than an unfiltered search list. See [initial research](docs/initial-research.md) for provenance checks, legacy behavior and acceptance limits.


Current documentation updated: **September 8, 2026**, including one-form research, AI business classification, framework readability, and business-specific kickoff and participant capture improvements. Package version: `0.3.0`. This is a hosted pilot with working application code, fictional demonstrations, and remaining enterprise acceptance work. The [development log](DEVLOG.md) records subsequent changes and their verification boundaries.

Implemented areas include authenticated company workspaces, roster imports/reporting charts, discovery requests, participant audio/text capture, AI task drafts and participant review, task/evidence versioning, workflows/cases, strategy framework runs, company work maps, optional Neo4j projections, reports, training, and public marketing/intake pages.

Recent additions include [grounded cross-team analysis](docs/team-analysis.md), [programmatic SEO publishing](docs/programmatic-seo.md), and [website measurement and pilot reporting](docs/website-measurement.md). The public site has 160 offering profiles, 12 category buyer guides and worksheets, and a 191-page sitemap. Consent-gated analytics code, a privacy page and an aggregate operator pipeline report are implemented. **Google Analytics activation and Search Console ownership verification remain pending owner approval; tracking is off.** Release `178aba0` passed all 190 tests and CI, and its public assets were verified on dutygraph.com. Those results do not establish indexing, actual Google collection or customer outcomes.

The [business-specific kickoff and capture flow](docs/kickoff-capture.md) adds an eight-part leadership worksheet for all 52 operating models and hybrid companies. Full duty descriptions and business context feed personal interviews and task extraction; branded invitations and response pages share the voice-to-card instructions. Enrollment opens a stable, request-specific `/respond` URL that survives refresh. Participant drafts validate evidence and person IDs before returning cards, and retain task purposes, triggers and reported human checkpoints through review and submission. Implementation `4a883ec` passed 196 tests and CI and was verified READY on Vercel; see the development log for the exact acceptance boundaries.

Initial Discovery now uses [one form for research and AI classification](docs/initial-research.md): company name, URL and an optional description. Four research areas default on in a collapsed drawer, run sequentially, and feed a sector/operating-model recommendation without a repeated website search. The Industry Map remains a separate deeper step. All sixteen framework views include section navigation, review/gap counts, expandable confidence explanations and responsive labeled data rows. Implementation `736e394` passed all 204 tests and CI, was verified READY on Vercel, and serves the updated code/help on dutygraph.com; [browser verification](docs/verification/2026-09-07-initial-research.md) used synthetic providers. Provider connections are required; pilot acceptance remains separate from synthetic verification.

The optional About business types disclosure shows all 52 operating patterns as cards with descriptions, familiar organization examples, stage previews and an explicit add action. Search by type (including catalog shorthand such as SaaS), family or example company. Examples are recognition aids only, kept out of AI prompts and company evidence. See [initial research](docs/initial-research.md).

Important boundaries:

- Public discovery and authority samples are fictional. They do not prove real email, model, identity-provider, or agent-runtime execution.
- Participant approval confirms the person’s understanding of a task. It does not grant access or establish company policy.
- Neo4j is a derived graph. PostgreSQL remains the source of truth.
- Framework outputs are evidence-linked drafts. They do not automatically rewrite responsibilities or execute actions.
- IAM vendor fixtures demonstrate data shapes; they are not production Okta, Saviynt, Workday, Oracle, or Entra connectors.
- Enterprise identity, hosted recovery acceptance, runtime enforcement, and independent security/compliance validation remain open.

See [release status](docs/RELEASE-STATUS.md). No statement in this repository establishes SOC 2 compliance or guarantees a customer outcome.

## Run locally

Prerequisites: Git, **Node.js 24**, npm, Docker with Compose, and available ports `4317` and `55437`.

```sh
git clone https://github.com/mattrob333/DutyGraphV2.git
cd DutyGraphV2
npm ci
npm run setup
npm run dev
```

Open [localhost:4317](http://localhost:4317). On Windows, use `npm.cmd` if PowerShell blocks the npm shim. Docker must be running before setup.

Setup creates random credentials in an ignored `.env` when none exists, starts the dedicated PostgreSQL container, and applies migrations. **Do not first copy the `CHANGE_ME` values from `.env.example` into `.env`**: setup preserves an existing file. Never point setup, tests, training, or sample scripts at customer production data.

For the compiled local application:

```sh
npm run build
npm start
```

Both local modes bind to `127.0.0.1`. Hosted deployment uses the Vercel API entry point. Local and hosted databases/accounts are separate.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Express API with Vite development middleware |
| `npm run build` | Generate public content/handbook, check TypeScript, build client |
| `npm run typecheck` | Check application TypeScript |
| `npm test` | Unit and database/API tests; local database required |
| `npm run verify` | Build and test |
| `npm run verify:clean-install` | Rehearse migrations in an isolated empty Docker database |
| `npm run contracts` | Regenerate API contracts/reference |
| `npm run db:migrate` | Apply migrations using the migration connection |
| `npm run training` | Run fictional training exercise |
| `npm run benchmark` | Repository benchmark, not accuracy certification |
| `npm run backup` | Back up dedicated local Docker database |
| `npm run restore:drill -- <backup-file>` | Rehearse local restore; see runbook |
| `npm run handbook` | Generate portable help handbook |
| `npm run verify:seo` | Audit generated public metadata, links and sitemap |
| `node scripts/pilot-inbox.mjs summary` | Operator-only aggregate inquiry, follow-up and notification report |

See [CI](.github/workflows) and [verification](docs/VERIFICATION.md) for release checks. Synthetic tests do not establish real-client extraction accuracy.

## Repository map

| Path | Responsibility |
| --- | --- |
| `client/src/` | Advisor app, participant experience, graphs and review UI |
| `client/public/` | Public site, generated pages, styles and media |
| `server/` | Routes, auth, records, providers, projections and exports |
| `server/migrations/` | Ordered database changes |
| `shared/` | Schemas, work model, framework specifications and view logic |
| `contracts/` | API, framework registry, graph ontology and design contracts |
| `content/` | Editorial and directory source content |
| `scripts/` | Setup, generation, training and operator tooling |
| `tests/` | Unit and database/API regressions |
| `api/` | Hosted function entry point |
| `infra/` | Dedicated local database infrastructure |
| `docs/wiki/` | Project vision, developer handoff and roadmap |
| `docs/guide/` | User-facing help/training source |
| `docs/verification/` | Dated evidence, not evergreen status |

Edit generated content at its source and regenerate it. Credentials, backups, private handoffs and local working artifacts do not belong in commits.

## Configuration and security

Runtime database roles must remain non-superuser and subject to forced row-level security. Migration-owner connections are separate. Hosting uses `APP_DATABASE_URL`; setup supplies local `DATABASE_URL` and `MIGRATION_DATABASE_URL`.

Provider credentials are encrypted with server-only `PROVIDER_ENCRYPTION_KEY`. Preserve secure recovery custody. Account integrations are tenant-specific; another email/account does not inherit them. Pilot lead notifications use separate operator configuration.

Read [integrations](docs/INTEGRATIONS.md), [hosting](docs/HOSTING.md), [security](docs/SECURITY.md) and [domain setup](docs/CUSTOM-DOMAIN.md).

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). **Every change must update this README and [DEVLOG.md](DEVLOG.md) in the same change set**, including documentation-only changes. Keep the README a concise current-state guide; record dated details, reasons, validation and remaining work in the development log. This documentation convention was added September 7, 2026.

Keep changes reviewable, preserve tenant isolation/provenance, and document limitations alongside features. The version-controlled wiki is canonical and reviewed with code; a separate GitHub Wiki should be a mirror, not a second independently edited source of truth.

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
