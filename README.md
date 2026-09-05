# Duty Graph V2

A working local build of the Tier 4 Connected Company Workspace. React and TypeScript preserve the supplied V2 graphite interface; Express and PostgreSQL provide durable records and guarded workflows.

**Release 0.1 is a discovery and export foundation, not the complete R1–R4 production system.** External providers, enterprise identity, Neo4j, customer policy systems, Signet signing, and runtime execution are not connected. The app shows those boundaries explicitly.

## Run locally

Requires Node.js 24+, npm, Docker with Compose, and free localhost ports **4317** and **55437**.

```sh
npm ci
npm run setup
npm run build
npm start
```

Open **http://localhost:4317**. Choose **Open sample workspace** to explore synthetic Cobalt Industrial Supply data, or create your own separate account and company. The sample account is shared locally and must only contain synthetic information. Creating another company from that sample account also creates a sandbox.

`npm run setup` generates random database credentials in the ignored `.env`, starts a dedicated PostgreSQL 17 container, and applies the schema. The runtime database role is neither a superuser nor an RLS bypass role. All business tables force tenant row security. No existing application databases are used.

For development with React hot reload:

```sh
npm run dev
```

Both modes use a single origin and port, with the server bound to **127.0.0.1**. A port collision fails instead of silently choosing another port. Local links will not work from another device without an explicitly designed hosting setup.

## Working features

- Password sessions, CSRF checks, independent company accounts, scoped participant enrollment, and server-side role checks.
- Bounded company scope, people and roster CSV validation with duplicate/cycle quarantine.
- Immutable original text evidence and response acceptance; source retraction marks dependent work stale.
- Versioned task cards, owner/performer checks, exact-version participant responses, historical confirmations, and conflict handling.
- Participant typed drafts, browser microphone controls, audio playback, resumable 512 KB uploads, whole-asset checksums, and 25 MB limits. Local playback is explicitly unscanned; there is no invented transcript.
- A company graph with connected/work/people views, SVG pan/zoom, Fit, minimap, inspectors, and an accessible register.
- The supplied sixteen-framework registry and four intake buckets; human-authored, source-bound framework analyses with dependency gates and stale propagation.
- Constraint hypotheses, discriminating test notes, measurement definitions and observations, intervention proposals, and review commitments.
- Draft agent proposals tied to a human and task versions. Current authority, provisioning, and observed execution stay separate and unavailable.
- Frozen internal ZIP exports with task versions, exclusions, source metadata, readable instructions, setup requirements, and file checksums.
- Atomic record/version/audit/outbox commits, an idempotent local graph projector, and raw audio expiry with a purge worker.
- Dark/light themes, responsive pages, keyboard navigation, local fonts, and explicit empty/error states.

## Verify

```sh
npm run contracts
npm run verify
npm audit --audit-level=high
```

The tests exercise real PostgreSQL transactions and HTTP requests using isolated synthetic tenants. They do not require model credentials or customer-system access. Read [the verification record](docs/VERIFICATION.md) for tested behavior and limits, and [the release status](docs/RELEASE-STATUS.md) for outstanding requirements.

## Structure

| Directory    | Purpose                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| `client/src` | React workspace, record forms, graph, participant capture                     |
| `server`     | Authentication, API commands, PostgreSQL, exports, projection, retention      |
| `shared`     | Runtime validation and pure domain rules                                      |
| `contracts`  | Supplied public-safe registries and generated record request schema           |
| `tests`      | Domain and real database/API regression tests                                 |
| `infra`      | Dedicated local PostgreSQL Compose stack                                      |
| `reference`  | Original synthetic V2 visual reference, separate from the running application |
| `docs`       | Architecture, audit, release boundaries, operating notes                      |

The original commercial handoff is kept outside this public repository. Its embedded requests to development teams are specification context; they do not grant authority to send messages, publish customer material, or execute business actions.

## Production boundary

Use synthetic data until identity assurance, deployment, encryption, retention and legal hold, source scanning, provider/data policy, and security review are complete. This build has no verified customer policy, email delivery, transcription, Signet key management, or governed runtime. Setting an environment variable alone does not establish those capabilities. An exported instruction file is not a permission grant.

See [architecture](docs/ARCHITECTURE.md), [source reuse assessment](docs/SOURCE-AUDIT.md), and [operating notes](docs/OPERATIONS.md).
