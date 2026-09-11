# DutyGraph

**Understand the work. Improve the business. Delegate with clear human authority.**

DutyGraph is an advisor-led business discovery and strategy application from Tier 4 Intelligence. It turns research, leadership conversations, and employees' descriptions of their work into an evidence-linked map of people, duties, tasks, systems, and handoffs. Advisors use that map to identify gaps, agree improvements, and assess bounded opportunities for AI assistance.

The north star is a living, trustworthy record of how a business operates: evidence informs decisions, people approve changes, and observed outcomes inform the next decision. Today this is a **hosted advisor pilot**, version `0.3.0`. Autonomous business operation and enforced authority in external systems are future work.

[Website](https://dutygraph.com) · [Fictional discovery demo](https://dutygraph.com/?demo=discovery) · [Project context](START-HERE.md) · [Documentation](docs/README.md) · [Development log](DEVLOG.md)

## Start here

| You need to… | Read |
| --- | --- |
| Resume work or hand off to a developer or AI agent | [START-HERE.md](START-HERE.md), the portable context file |
| Understand the customer, vision, and commercial direction | [Product vision](docs/wiki/Product-Vision.md), [investment readiness](docs/wiki/Investment-Readiness.md) |
| Set up and make a first contribution | [Developer onboarding](docs/wiki/Developer-Onboarding.md), [contributing](CONTRIBUTING.md) |
| Find the right code and source files | [Repository map](docs/REPOSITORY-MAP.md), [architecture](docs/wiki/Architecture-and-Data.md) |
| Understand what works and what needs acceptance | [Current state](docs/wiki/Current-State.md), [release evidence](docs/RELEASE-STATUS.md), [takeover assessment](docs/handoff/2026-09-11-readiness-review.md) |
| Choose the next work | [Priorities and acceptance checks](docs/NEXT-STEPS.md) |

No particular editor, AI provider, review service, previous chat, or private desktop file is required to contribute. [AGENTS.md](AGENTS.md) describes the engineering boundaries for any coding agent.

## The product in one journey

1. An advisor receives a discovery request and gathers source-backed business context.
2. Leadership reviews the context and provides kickoff information and a roster.
3. Participants describe their work by voice or text, then review proposed task cards.
4. The advisor examines the **Company Work Map**: workstream stages → people and duties → tasks and recorded flows.
5. The advisor prepares a living **Client brief**, reviews a frozen report for its intended audience, and records commitments and measurements for Weekly review and Strategy.

The primary Work Map views are **Work map**, **Work flows**, and **Tasks**. See [user journeys](docs/wiki/User-Journeys.md) and the agreed [Work Map design](docs/work-map-design-decisions.md).

Implemented areas include accounts and participant flows, source/task versioning, discovery and review, work maps, workflows/cases, framework runs, client reports, optional Neo4j projections, and public intake/content. Important boundaries:

- AI output and public-research proposals require review. Participant confirmation records understanding; it does not grant authority or settle company policy.
- PostgreSQL is authoritative. Neo4j is an optional derived projection.
- Sample companies and authority/vendor demonstrations are fictional. They do not prove live connectors or customer outcomes.
- Real-client audit acceptance, hosted recovery, team identity/access, larger-workspace performance, and external runtime enforcement remain open.

## Run locally

Prerequisites: **Node.js 24.x**, npm, Git, Docker with Compose and Linux containers, and free ports `4317` and `55437`.

```sh
git clone https://github.com/mattrob333/DutyGraphV2.git
cd DutyGraphV2
npm ci
npm run setup
npm run dev
```

Open [the app](http://localhost:4317/login) or [the local website](http://localhost:4317/landing/). Create a local account and open a fictional sample. On Windows, use `npm.cmd` if PowerShell blocks the npm shim.

Setup generates random credentials in ignored `.env`, starts the dedicated PostgreSQL container, and applies migrations. **Do not copy `.env.example` placeholders into `.env` first:** setup preserves existing database settings. Tests, training, and sample scripts must use the dedicated local database. Hosted accounts and data are separate.

For a compiled local preview, run `npm run build` then `npm start`. Both modes serve API and UI together on `127.0.0.1`. [Onboarding](docs/wiki/Developer-Onboarding.md) covers expected results, provider-free work, troubleshooting, and service access.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Express API and Vite development middleware |
| `npm run build` | Generate public/help content, type-check, build client assets |
| `npm run typecheck` | Check application TypeScript |
| `npm test` | Unit and database/API suite; dedicated local database required |
| `npm run verify` | Build and test |
| `npm run contracts` | Regenerate API contracts/reference from declarations and schemas |
| `npm run verify:clean-install` | Rehearse migrations in an isolated temporary Docker database |
| `npm run verify:seo` | Check generated public metadata, links, and sitemap |
| `npm run training` | Fictional advisor journey; creates local sample data and examples |
| `npm run db:migrate` | Apply migrations using the migration-owner connection |
| `npm run backup` | Encrypt a backup of the dedicated local Docker database |

Use [CONTRIBUTING.md](CONTRIBUTING.md) to select checks and [operations](docs/OPERATIONS.md) for restore drills, handbook generation, and packaging. Build can update generated tracked files; inspect the diff.

## Repository structure

```text
client/       React application, authored public assets, generated website pages
server/       Express routes, services, persistence, providers, migrations
shared/       Runtime schemas, work model, framework contracts, view logic
api/          Vercel function entry point
contracts/    Generated API inventory and authored domain/design contracts
content/      Website editorial and directory source data
scripts/      Setup, generation, verification, training, operator tools
tests/        Unit and database/API behavior checks
infra/        Dedicated local PostgreSQL Compose configuration
docs/         Project handbook, references, user guides, dated evidence
reference/    Historical visual reference, not application source
.github/      CI and pull request guidance
```

The [detailed repository map](docs/REPOSITORY-MAP.md) identifies feature entry points, tests, and generated-file sources.

## Hosting and configuration

React, TypeScript, Vite, Express, and PostgreSQL form the core stack. Production runs on [Vercel](https://vercel.com/matts-projects-fb383d6a/dutygraph-v2) with a separate Neon database. Runtime connections use a restricted role subject to row-level security; migrations use separate owner access.

OpenAI, Exa, and Resend settings are account-specific and encrypted using server-only `PROVIDER_ENCRYPTION_KEY`. Neo4j is optional. Local code/build work needs no paid providers. See [integrations](docs/INTEGRATIONS.md), [hosting](docs/HOSTING.md), and [security context](docs/SECURITY.md). Configuration is not proof of successful provider operation.

## Working together

Use focused branches and pull requests, preserve evidence/access boundaries, and tie verification to a commit and environment. **Main is connected to Vercel; merging can publish immediately.**

The existing repository convention requires README and DEVLOG updates in each change set. Keep README changes brief and relevant to current context; put dated change details in [DEVLOG.md](DEVLOG.md), rationale in [Decisions](docs/wiki/Decisions.md), and test evidence in dated verification records. The version-controlled handbook is canonical; a separate wiki should only mirror it.

Documentation reviewed **September 11, 2026**. This cleanup changes developer context and instructions; application behavior is unchanged. See the [takeover assessment](docs/handoff/2026-09-11-readiness-review.md) for observations, remaining risks, and recommended acceptance work.
