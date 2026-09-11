# Technical takeover and handoff assessment

Reviewed September 11, 2026 against main at `5d815bd5eea66a3ae5d6793a0f91aba67ad5b49c`. This is a source/documentation review and handoff assessment, not a complete security audit, live-client acceptance, or investment endorsement.

## Senior developer's assessment

DutyGraph has a substantial pilot foundation: a coherent evidence model, explicit review semantics, real persistence, a hosted application, and meaningful automated verification. A new lead can build on it. The main takeover risk is the gap between broad implemented scope and proven customer/operational readiness, compounded by duplicated documentation and several large integration files.

The appropriate next move is to make the core advisor journey repeatable and measurable while strengthening ownership and operational acceptance. A rewrite, another independent wiki, or a larger feature list would not resolve those questions by itself.

## What is strong

| Observation | Why it matters | Evidence |
| --- | --- | --- |
| Tenant transactions, restricted runtime access, versioned records, audit events, and idempotency | These are deliberate integrity boundaries worth preserving | [db.ts](../../server/db.ts), [migrations](../../server/migrations/), [architecture](../ARCHITECTURE.md) |
| Review and evidence are explicit concepts | The work map can remain explainable when descriptions change | [domain.ts](../../shared/domain.ts), [records.ts](../../server/records.ts), [reports.ts](../../server/reports.ts) |
| CI includes more than compilation | Contracts, unit/API/database behavior, fictional training, and local recovery have a defined workflow | [verify.yml](../../.github/workflows/verify.yml) |
| Current source and hosting aligned at inspection | The inspected baseline was not merely an unshipped local branch | [CI 34427151197](https://github.com/mattrob333/DutyGraphV2/actions/runs/34427151197), [release observations](../RELEASE-STATUS.md) |
| Extensive project and user documentation exists | The team already has material to maintain rather than recreate | [handbook](../wiki/Home.md), [user guides](../guide/), [DEVLOG](../../DEVLOG.md) |
| Product limits are acknowledged | Simulations, proposals, and live acceptance can be discussed honestly | [current state](../wiki/Current-State.md), [next steps](../NEXT-STEPS.md) |

## Handoff problems addressed in this change

- README explained several rounds of release/UI changes before introducing the product. It now leads with purpose, maturity, the journey, setup, and navigation; historical details remain in DEVLOG and dated evidence.
- START-HERE and onboarding assumed a particular assistant/laptop continuation. They now provide context for any person or agent, without a named review service.
- The directory list did not identify feature paths and generated sources in sufficient detail. The new repository map connects models, services, UI, tests, and generators.
- The operator runbook described release 0.2 and said model/transcription/email needed implementation despite current adapters. It now distinguishes implemented adapters, account configuration, and live acceptance.
- Historical security/verification pages could be read as current coverage. They now identify their historical scope and point to current references.
- Vision existed, but the technical handoff did not collect the commercial evidence questions in one place. Investment readiness now separates direction, proposed measures, proof needed, and unresolved decisions.

Application files, database schema, public product behavior, and production configuration are unchanged.

## Work still required

Priorities below are review recommendations. [NEXT-STEPS](../NEXT-STEPS.md) remains the owner-maintained execution sequence.

| Priority / trigger | Gap and consequence | Completion evidence | Proposed accountable role |
| --- | --- | --- | --- |
| Before relying on a repeatable paid engagement | Complete hosted audit and extraction quality remain unaccepted end to end | Authorized real-provider journey; client-understood findings; measured omissions, inventions, corrections, advisor effort, and follow-up | Product owner + delivery lead |
| Before irreplaceable client data depends on the service | Local backup tooling does not recover hosted Neon or prove encryption-key custody | Hosted restore into a separate environment, recovered provider keys, verified access/data, measured loss/recovery window, private runbook | Technical/operations lead |
| Before adding advisors | Membership, assignments, removal, recovery, and MFA/SSO need a settled model | Tested onboarding/offboarding and tenant/company denial cases; named administrative owner | Technical lead |
| Before broader customer use | Current threat model predates providers, private kickoff, and later background jobs | Updated threat assessment covering current entry points, abuse, retention/deletion, provider boundaries, and an independent review plan | Security/technical owner |
| Before promising service reliability | Monitoring, incident routing, service targets, and support ownership are not established by this repo | Named responders, useful alerts, incident rehearsal, measured targets and escalation procedure | Operations owner |
| Before larger organizations | Full workspace reads are unpaginated; tenant writes serialize; existing performance evidence is local | Representative company/department/concurrency tests with budgets, profiling, and any required pagination/worker changes | Technical lead |
| Before external client/API integration | Generated OpenAPI does not close every non-record request/response contract | Defined integration surface with tested schemas, errors, auth, limits, and compatibility policy | API maintainer |
| As affected features change | Large App.tsx, app.ts, DiscoveryJourney.tsx, and styles.css raise change-review cost | Gradual feature-boundary extraction supported by regression checks; no behavior-changing wholesale reorganization | Feature maintainers |
| Before outside contribution/fundraising diligence | Repository license/IP/contributor ownership decisions are not documented | Owner-approved licensing and contributor process, with private agreements kept outside Git | Founder/project owner |

These are role assignments to agree, not a claim that a staffed team already exists. No unverified vulnerabilities are asserted by this review.

## The first handoff session

1. Have the incoming developer read START-HERE and explain the product, target workflow, and current limits in their own words.
2. Complete local setup, create a fictional account/sample, and trace one task write from schema to persistence and review UI.
3. Agree service/release owners and the access they need. Grant production access separately.
4. Choose a small first PR and run the relevant checks. The contributor should be able to work without private chat context.
5. Define the next authorized real-audit acceptance session using NEXT-STEPS, including recipients, spending, evidence handling, and success criteria.

## Verification of this documentation change

The following checks were performed on this documentation change. Baseline CI/deployment observations above are separate; use the PR checks for subsequent CI results.

- Locked dependency installation completed with Node 24.19.0; npm reported zero vulnerabilities during installation.
- Documentation review checked repository paths, relative links/anchors, inbound entry-point anchors, named-tool requirements, and npm script references. All 319 repository links and 43 script mentions in the changed Markdown resolved at the check.
- Contract generation found 105 implemented method/path declarations. Generated API contracts, API reference, and field reference had no diff.
- Production build, strict TypeScript checking, handbook generation, and the 191-page SEO audit passed. Vite reported an existing-size main bundle above its 500 kB warning threshold; performance acceptance remains separate.
- Existing handbook and SEO tests passed: 3 tests, no failures. Regenerated handbook references were inspected for headings and working link targets; repository-reference links remain usable from the generated handbook.
- Git whitespace/diff checks passed; application/configuration paths and generated tracked files had no changes.
- Docker is not available in this session, so local database setup, the full database/API suite, training, and restore rehearsal have not been rerun here.
- No production settings changed, customer records accessed, real invitations sent, or paid provider calls made.

## What would make me confident taking over?

One current context file, reproducible setup, clear feature boundaries, reviewable change history, actual service owners, and evidence for the full customer journey. This change improves the first four. The remaining acceptance work is explicit so a new lead can plan it rather than discover it during a client engagement.

[Project context](../../START-HERE.md) · [Repository map](../REPOSITORY-MAP.md) · [Investment readiness](../wiki/Investment-Readiness.md)
