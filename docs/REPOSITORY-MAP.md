# Repository map

Use this guide to find the source of a behavior before editing it. Paths are relative to the repository root. The repository is one application, with a shared package/lockfile; the folders are not independently deployable services.

## Runtime and data flow

~~~mermaid
flowchart TD
  Local["server/index.ts: local Express + Vite"] --> App["server/app.ts: API composition"]
  Hosted["api/index.ts: Vercel function"] --> App
  UI["client/src: React UI"] --> App
  Schemas["shared: validation and domain logic"] --> App
  App --> Services["server: feature services and provider jobs"]
  Services --> DB["server/db.ts: tenant transactions and versions"]
  DB --> PG[("PostgreSQL: authoritative records")]
  PG --> Outbox["Transactional outbox and projections"]
  Outbox --> Graph[("Optional Neo4j: derived metadata")]
~~~

Local workers run in [server/index.ts](../server/index.ts). Hosted maintenance is invoked through the cron in [vercel.json](../vercel.json) and implemented in [server/hosted.ts](../server/hosted.ts). Read [architecture](wiki/Architecture-and-Data.md) for access, evidence, and projection invariants.

## Top-level responsibilities

| Location | What belongs here |
| --- | --- |
| [client/src](../client/src/) | Interactive advisor/participant UI, presentation helpers, feature styles |
| [client/public](../client/public/) | Authored marketing assets mixed with generated pages; see source table below |
| [server](../server/) | Route composition, authorization, domain services, providers, persistence |
| [shared](../shared/) | Zod schemas, work semantics, framework contracts, reusable presentation logic |
| [api](../api/) | Hosted entry point and function TypeScript configuration |
| [server/schema.sql](../server/schema.sql), [migrations](../server/migrations/) | Immutable 0001 baseline and ordered schema evolution |
| [contracts](../contracts/) | Generated API inventory and authored framework, ontology, and design contracts |
| [content](../content/) | Directory/editorial data and measurement configuration |
| [scripts](../scripts/) | Generators, setup, checks, training, and operator commands |
| [tests](../tests/) | Node test-runner suites executed through tsx; many require local PostgreSQL |
| [infra/compose.yaml](../infra/compose.yaml) | Dedicated local PostgreSQL service and persistent volume |
| [docs/wiki](wiki/) | Maintained product/developer handbook |
| [docs/guide](guide/) | User-facing help and training source |
| [docs/verification](verification/), [docs/handoff](handoff/) | Dated evidence and handoff assessments |
| [reference](../reference/) | Historical visual reference; no application changes here |
| [.github/workflows/verify.yml](../.github/workflows/verify.yml) | Build, contracts, tests, audit, fictional training, local recovery CI |

Ignored runtime/output locations include `node_modules/`, `dist/`, `client/public/handbook/`, `.env`, `.vercel/`, and `work/`. They are not missing source files. The [artifact audit](handoff/2026-09-09-artifact-audit.md) explains the original desktop/runtime boundary.

## Find a feature

These are starting points, not an exhaustive ownership list. Read the shared model and the server path before changing a UI that edits records.

| Area | Model and server | UI | Representative tests |
| --- | --- | --- | --- |
| Accounts and access | [auth.ts](../server/auth.ts), [db.ts](../server/db.ts), [app.ts](../server/app.ts) | [App.tsx](../client/src/App.tsx), [api.ts](../client/src/api.ts) | [api](../tests/api.test.ts), [hosted adapters](../tests/hosted-adapters.test.ts) |
| Generic records and evidence | [domain.ts](../shared/domain.ts), [records.ts](../server/records.ts) | [Detail.tsx](../client/src/Detail.tsx) | [domain](../tests/domain.test.ts), [api](../tests/api.test.ts) |
| Discovery and task capture | [discovery.ts](../server/discovery.ts), [participant-cards.ts](../server/participant-cards.ts), [task-review.ts](../server/task-review.ts) | [DiscoveryJourney.tsx](../client/src/DiscoveryJourney.tsx), [ParticipantCards.tsx](../client/src/ParticipantCards.tsx) | [discovery API](../tests/discovery-api.test.ts), [participant delivery](../tests/participant-delivery.test.ts) |
| Kickoff | [kickoff-link.ts](../server/kickoff-link.ts), [kickoff-preparation.ts](../shared/kickoff-preparation.ts) | [KickoffLink.tsx](../client/src/KickoffLink.tsx), [KickoffPreparation.tsx](../client/src/KickoffPreparation.tsx) | [kickoff link](../tests/kickoff-link.test.ts), [kickoff preparation](../tests/kickoff-preparation.test.ts) |
| Company Work Map | [company-work-map.ts](../shared/company-work-map.ts), [stage-work-map.ts](../shared/stage-work-map.ts) | [CompanyWorkMap.tsx](../client/src/CompanyWorkMap.tsx) | [company work map](../tests/company-work-map.test.ts), [stage links](../tests/stage-links.test.ts) |
| Gap follow-ups | [work-gaps.ts](../server/work-gaps.ts), [gap-replies.ts](../server/gap-replies.ts) | [WorkGapPanel.tsx](../client/src/WorkGapPanel.tsx) | [scheduler](../tests/work-gap-scheduler.test.ts), [gap replies](../tests/gap-replies.test.ts) |
| Strategy and framework jobs | [framework-specs.ts](../shared/framework-specs.ts), [frameworks.ts](../server/frameworks.ts), [strategy.ts](../server/strategy.ts) | [FrameworkWorkspace.tsx](../client/src/FrameworkWorkspace.tsx), [StrategyWorkspace.tsx](../client/src/StrategyWorkspace.tsx) | [framework API](../tests/framework-runs-api.test.ts), [strategy readiness](../tests/strategy-readiness.test.ts) |
| Client brief and reports | [audit-brief.ts](../server/audit-brief.ts), [reports.ts](../server/reports.ts) | [AuditBrief.tsx](../client/src/AuditBrief.tsx), [ClientReports.tsx](../client/src/ClientReports.tsx) | [audit brief](../tests/audit-brief.test.ts), [reports](../tests/reports.test.ts) |
| Workflows and cases | [workflow.ts](../shared/workflow.ts), [workflows.ts](../server/workflows.ts) | [WorkflowsOverview.tsx](../client/src/WorkflowsOverview.tsx), [WorkflowDetail.tsx](../client/src/WorkflowDetail.tsx) | [workflow](../tests/workflow.test.ts) |
| Providers and graphs | [providers.ts](../server/providers.ts), [projection.ts](../server/projection.ts), [neo4j.ts](../server/neo4j.ts) | [ProviderSettings.tsx](../client/src/ProviderSettings.tsx), [Neo4jSettings.tsx](../client/src/Neo4jSettings.tsx) | [providers](../tests/providers.test.ts), [Neo4j API](../tests/neo4j-api.test.ts) |
| Public intake | [pilot.ts](../server/pilot.ts), [pilot-inbox.ts](../server/pilot-inbox.ts), [newsletter.ts](../server/newsletter.ts) | [landing](../client/public/landing/), [DemoRequests.tsx](../client/src/DemoRequests.tsx) | [pilot](../tests/pilot.test.ts), [pilot inbox](../tests/pilot-inbox.test.ts) |

## Authored source versus generated output

Do not treat every HTML or JSON file as hand-authored. Inspect the generator and resulting diff.

| Edit this source | Regenerate with | Output affected |
| --- | --- | --- |
| Route declarations, `shared/domain.ts`, `scripts/contracts.ts` | `npm run contracts` | `contracts/openapi.json`, `contracts/routes.json`, `docs/API-REFERENCE.md` |
| `docs/guide/`, runtime schemas, handbook renderer/generator | `npm run handbook` or build | Ignored `client/public/handbook/`; tracked `docs/FIELD-REFERENCE.md` |
| `content/directory/`, directory scripts | `npm run build` | Directory profiles, categories, data copies |
| `scripts/learning-content.ts`, `scripts/learning-next.ts`, `scripts/learning.ts` | `npm run build` | Learning pages/assets and the generated section of landing HTML |
| `scripts/programs.ts`, `scripts/newsletter.ts` | `npm run build` | Program and newsletter pages |
| `content/perspectives.ts`, `scripts/perspectives.ts` | `npm run build` | Perspectives pages/feed |
| `content/measurement.json`, `scripts/measurement.ts` | `npm run build` | Privacy page and measurement markup across public pages |
| Public pages and `scripts/verify-seo.ts` | `npm run build` | Sitemap/robots via `verify-seo --write`; check using `npm run verify:seo` |
| Fictional training scenario, report/export services | `npm run training` | `docs/examples/`; also creates local database records |
| Client/source files and Vite config | `npm run build` | Ignored `dist/` |

`contracts/framework-registry.json`, `contracts/graph-ontology.json`, and `contracts/design-tokens.json` are authored contracts, not outputs of the API generator. The landing page also contains authored markup and styling; check which section a generator owns before editing.

## First code-reading exercise

Follow a task change from [shared/domain.ts](../shared/domain.ts) through [server/records.ts](../server/records.ts) to [server/db.ts](../server/db.ts), then its UI in [Detail.tsx](../client/src/Detail.tsx) and assertions in [api.test.ts](../tests/api.test.ts). Explain where tenant scope, expected version, content hash, and audit history are enforced before changing that path.

Large integration files are candidates for gradual extraction when an actual feature change requires it. Preserve behavior and tests; a documentation handoff is not a reason to move the application into a new folder layout.
