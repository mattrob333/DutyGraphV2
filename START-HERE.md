# DutyGraph project context

**Start here when resuming on another computer or handing the project to a developer or AI agent.** This is the portable context entry point. It requires no previous conversation or particular development tool. Last reviewed September 11, 2026.

## Purpose and north star

DutyGraph, from Tier 4 Intelligence, helps an advisor understand how a company actually works. Research, leadership context, and participant accounts become evidence-linked people, duties, granular tasks, systems, and handoffs. The advisor turns that record into reviewed findings, a client readout, and ongoing improvement work.

The north star is a living, trustworthy operating record that connects **evidence → decisions → approved changes → measured outcomes**. Prove useful advisor-led discovery first. Recurring advisor support, internal handoff, subscriptions/channel licensing, and eventually bounded human/agent delegation are the commercial and product direction. They are not all delivered capabilities or proven business results.

[Product vision](docs/wiki/Product-Vision.md) explains the rationale. [Investment readiness](docs/wiki/Investment-Readiness.md) describes evidence still needed. Customer focus, pricing, pilot economics, and distribution need validation; do not infer traction from feature coverage or fictional samples.

## What exists

Package version: `0.3.0`; maturity: hosted advisor pilot. The principal path is:

**Public request → advisor inbox → research → kickoff/roster → participant interviews and reviewed cards → Company Work Map → Client brief/report → Weekly review and Strategy.**

The code implements this path in parts with automated and synthetic verification. A complete hosted audit with real providers and client acceptance remains open. OpenAI/Exa/Resend adapters and optional Neo4j are present; configuration belongs to the relevant account. Authority demonstrations do not establish external enterprise integrations.

The Company Work Map is the primary product view. Keep the hierarchy **workstream → people and duties → tasks and recorded flows**, with **Work map / Work flows / Tasks** tabs. Preserve the neutral layered surfaces and stable company identity in [Work Map decisions](docs/work-map-design-decisions.md). Workflows & cases is still visible; its placement is an open product decision. Reusable workflow recommendations and logo extraction remain ideas/deferred work.

Client brief is a live workspace view. Report preparation freezes selected content for audience/source review and manual download. A client portal, billing, automatic delivery, and commercial retainer terms are separate work.

## Verified baseline and actual working state

The September 11 inspection began at `5d815bd5eea66a3ae5d6793a0f91aba67ad5b49c` on main. Its [CI run](https://github.com/mattrob333/DutyGraphV2/actions/runs/34427151197) was successful and Vercel reported that exact commit READY in production. This is a dated observation, not a promise about the currently deployed version. See [release status](docs/RELEASE-STATUS.md).

On every handoff, inspect the actual checkout:

~~~sh
git status --short --branch
git log -5 --oneline
git remote -v
~~~

Preserve existing edits and branches. Fetch remote state when connected; do not reset to an old handoff SHA. Record the working branch, commit, unfinished changes, and verification in the PR or handoff note.

## Technical bearings

- Node **24.x**; React/TypeScript UI, Express API, Vite build, PostgreSQL source of truth.
- Local: `server/index.ts` serves UI and API at `127.0.0.1:4317`; PostgreSQL uses `127.0.0.1:55437`.
- Hosted: `api/index.ts` is the Vercel function, configured by `vercel.json`; Neon holds a separate database. [Production](https://dutygraph.com) · [Vercel project](https://vercel.com/matts-projects-fb383d6a/dutygraph-v2).
- `shared/domain.ts` defines record inputs. `server/db.ts` implements tenant transactions, content versions, audit events, and idempotent commands. `server/records.ts` handles generic record mutations.
- `client/src/App.tsx` and `server/app.ts` are large integration entry points. Follow a feature through model, server, UI, and tests instead of reading the whole application first.
- `server/schema.sql` is migration 0001; numbered files continue through 0012 at this baseline. Append migrations instead of editing applied history.
- [Repository map](docs/REPOSITORY-MAP.md) identifies feature paths and generated-file sources. [Architecture](docs/wiki/Architecture-and-Data.md) explains data flow and invariants.

## Start working

Follow the [README quick start](README.md#run-locally) and [onboarding](docs/wiki/Developer-Onboarding.md). Run `npm ci`, `npm run setup`, and `npm run dev` with Docker running. On Windows, `npm.cmd` avoids PowerShell shim restrictions. Setup creates local credentials; do not copy placeholder environment values first.

Open `/login`, create a local account, and use a fictional sample. The public website is `/landing/`. A normal UI/code session needs no live providers. Local data, hosted data, browser sessions, unsent drafts, provider settings, and encryption keys are separate from Git. A new developer does not need the founder's desktop environment file or production credentials.

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md). Use a focused branch, define expected behavior, run relevant checks, inspect generated changes, and explain results. No named agent, model, or external review service is a prerequisite. Production access and release responsibility are granted separately from repository access.

## Next work and unresolved decisions

[NEXT-STEPS.md](docs/NEXT-STEPS.md) is the maintained priority list. Its current sequence is:

1. Complete one authorized hosted audit and measure evidence quality, corrections, and client usefulness.
2. Activate and verify Google measurement/search; IDs are null in source at this baseline.
3. Validate the client readout, recurring review, and proposed commercial engagement.
4. Settle advisor membership, company assignments, removal, and identity controls. Clerk is not the current identity system.
5. Validate incremental department scope and larger workspaces.

The [takeover assessment](docs/handoff/2026-09-11-readiness-review.md) also identifies operational ownership, hosted recovery, API-contract completeness, and maintainability work. These recommendations do not silently reorder the product backlog or certify readiness.

## Boundaries to preserve

Server-selected tenant/company context and restricted database roles govern access. Original evidence, exact content versions, and review decisions must remain traceable. Proposed AI work, participant understanding, advisor review, and external authority are different states. PostgreSQL remains authoritative; graph projections are replaceable.

Use fictional development data. Keep secrets, client evidence, invitation tokens, private lead details, backups, and internal commercial material out of this public repository. Do not run setup, tests, training, or sample scripts against production. Main is connected to Vercel; a merge can deploy. Report local checks, CI, deployment, live-provider acceptance, and client outcomes separately.

## Passing work to the next person

A usable handoff identifies the branch/commit and uncommitted work; explains what changed and why; records exact checks and limitations; points to the next scoped task and blockers; and identifies the responsible maintainer and needed service access. Reference private access/recovery procedures without including secrets.

Keep this file a current context summary. Use [DEVLOG.md](DEVLOG.md) for dated history, [Decisions](docs/wiki/Decisions.md) for rationale, and [docs/README.md](docs/README.md) for navigation. Historical verification remains evidence for its own date and scope.

## Portable continuation brief

> Continue DutyGraph from this checkout. Read START-HERE.md, AGENTS.md, CONTRIBUTING.md, docs/NEXT-STEPS.md, and the affected feature documentation. Inspect the actual branch, status, and recent commits. Preserve the current product decisions, tenant isolation, evidence provenance, and review semantics. Choose the next authorized task, explain its acceptance criteria, make a focused change, and run appropriate verification with fictional data. Update the maintained documentation and development log. Report completed work, exact verification, remaining uncertainty, and the next step so another person or agent can continue without this conversation.
