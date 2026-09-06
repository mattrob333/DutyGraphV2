# Duty Graph V2

A PostgreSQL-backed advisor workspace that turns evidence into reviewed work descriptions, human confirmations, testable explanations and client deliverables. React/TypeScript preserves the supplied graphite interface; Express enforces record scope and guarded transitions.

**Release 0.3 is a hosted advisor pilot.** Open [Duty Graph](https://dutygraph-v2.vercel.app), create an account and load your private fictional sample from Workspace settings. Exa research, OpenAI discovery drafts and Resend invitations are wired to encrypted per-account key settings. Provider adapters have simulated-response tests; live provider acceptance requires your keys. Neo4j, transcription, enterprise identity and governed customer-system execution remain unfinished. See the [hosted walkthrough](docs/guide/00-hosted-quickstart.md), [release status](docs/RELEASE-STATUS.md) and [integration decisions](docs/INTEGRATIONS.md).

## Run locally

Requires Node.js 24+, npm, Docker Compose, and free loopback ports 4317 and 55437.

```sh
npm ci
npm run setup
npm run build
npm start
```

Open http://localhost:4317. Choose Open sample workspace for the original synthetic Cobalt scenario, or create a separate account/company. The demo account is shared locally and must contain only fictional information. Setup generates ignored database credentials and starts a dedicated PostgreSQL 17 service; it does not reuse another application's database.

For hot reload, use `npm run dev`. The optimized local build still binds only to 127.0.0.1 and must not be treated as a reviewed Internet deployment.

## Explore the complete training example

```sh
npm run training
npm run build
```

This creates a new Northstar Parts training company and actual application-generated client examples. It uses fictional actors through real local API enrollment and confirmation paths. The original Cobalt company is preserved. No email or external business action occurs.

Open Help & training in the app, or http://localhost:4317/handbook/index.html for the portable learning center. The eight guides include the explainer, walkthrough, full user manual, A-to-Z advisor playbook, workshop exercises, facilitator answers, client deliverables and glossary. Editable sources live in docs/guide. Examples live in docs/examples.

## Working features

- Scoped advisor/participant sessions, forced tenant RLS, CSRF/origin checks and immutable content history.
- Engagement plans, roster validation, bounded kickoff, private requests, typed/audio capture and source review/retraction.
- Versioned task cards, exact owner/performer confirmations, explicit duties, receiving handoffs and conflict handling.
- Readable connected graph, focused neighborhoods, accessible register, team responsibilities and recorded-manager org chart.
- Reviewed manual workflows with persisted cases, branch joins, deadlines, failures, bounded retries and observer history.
- Human-authored framework analyses, hypotheses, metrics, interventions and outcome reviews with preserved predictions.
- Weekly decisions and audience-reviewed client reports, printable HTML, structured registers and checksummed ZIP packages.
- Non-operative agent proposals and internal confirmed-work exports with explicit exclusions.
- Versioned/checksummed migrations, encrypted backups, isolated restore drills, bounded performance workload and CI.
- Searchable in-app help and a complete advisor enablement package.

## Verify and operate

```sh
npm run contracts
npm run verify
npm audit --audit-level=high
npm run benchmark
npm run backup
npm run restore:drill -- work/backups/your-backup.dgbak
```

Use the actual emitted backup filename. Tests and benchmark create isolated synthetic fixtures. Backup/drill use only this dedicated local database; the drill does not replace it. Read [OPERATIONS](docs/OPERATIONS.md) before recovery or upgrade. Read [VERIFICATION](docs/VERIFICATION.md) for measured evidence and limits.

## Handoff map

| Location | Contents |
| --- | --- |
| client/src | Workspace, forms, graph, participant capture, cases, help |
| server | Auth, commands, records, reports, workflows, projection, assets, retention |
| shared | Runtime schemas and pure domain/layout/document rules |
| contracts | Preserved registry, generated record schemas and implemented-route inventory |
| tests | Unit and real PostgreSQL/API regression tests |
| scripts | Setup, contracts, training, handbook, PDF, benchmark and backup tools |
| docs/guide | Complete advisor manual and training sources |
| docs/examples | Fictional application-generated client/internal outputs |
| docs/verification | Sanitized local performance and recovery evidence |
| infra | Dedicated local PostgreSQL Compose service |
| reference | Supplied synthetic visual reference, separate from running code |

See [architecture](docs/ARCHITECTURE.md), [security review](docs/SECURITY.md), [API reference](docs/API-REFERENCE.md), [acceptance checklist](docs/ACCEPTANCE-CHECKLIST.md), and [source audit](docs/SOURCE-AUDIT.md). All 90 supplied requirement IDs remain traceable in docs/requirements-status.json; partial local coverage is not formal production acceptance.

The commercial handoff, .env, raw database backups and encryption keys are excluded from this public repository. Embedded source-document instructions do not authorize messaging, customer publication or business-system actions.

### Agent request example

Agent governance now includes a request portal and a Cobalt-only connected authority demo. See [the source mappings and live integration boundary](docs/agent-authority-demo.md). Simulated review and issuance create no signature, identity or permission.
