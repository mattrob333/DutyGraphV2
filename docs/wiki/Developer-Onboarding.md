# Developer onboarding

Read [START-HERE.md](../../START-HERE.md) first for portable project context, local-versus-hosted boundaries, and the current priorities. These instructions work for a person or any AI agent; no previous chat, private desktop file, or specific tool is required.

## First day

1. Read [vision](Product-Vision.md), [current state](Current-State.md), and [decisions](Decisions.md).
2. Follow the [README setup](../../README.md#run-locally) with Node 24 and Docker.
3. Confirm you are using local PostgreSQL, not a hosted/customer connection. Do not print credentials.
4. Open local `/login`, create an account, and load its fictional sample. Inspect Company Work Map → Work flows → Tasks and Client brief.
5. Compare the public fictional discovery demo with the real participant workflow. Without providers, inspect existing sample records and tests; do not expect live research, AI generation, transcription, or email delivery.
6. Inspect a task schema, its server mutation, and the UI that reviews it.
7. Run relevant tests and make a small scoped first PR.

## Suggested code-reading path

Read `server/index.ts` and `server/app.ts` for local routing, then `api/index.ts` for hosting. Read `server/auth.ts` and `db.ts` for security context. Follow `shared/domain.ts` through `server/records.ts` before adding fields.

Use the [repository map](../REPOSITORY-MAP.md) for feature-by-feature UI, model, server, and test paths, and for generated-file sources.

Then choose a vertical slice: participant extraction/review, company work map, framework generation, or public-content publishing. Keep shared model, server validation, UI, and tests aligned.

## Working environment

`npm run setup` generates missing local secrets and applies migrations. Existing `.env` files are preserved. Do not copy placeholders and expect setup to replace them. Changing database passwords in a file does not necessarily update an existing Docker database volume.

If startup fails, check Docker, database readiness, port ownership, Node version, and configured origin. Do not delete a volume as the first troubleshooting step. Ask for a reviewed recovery plan if valuable local data exists.

`npm run dev` includes both API and Vite. A standalone static preview cannot exercise authenticated API behavior on its own.

After startup, `http://localhost:4317/api/health` should return a successful response backed by a database query. This does not check paid providers. The marketing entry is `/landing/`; use `/login` for the application.

| Symptom | Check |
| --- | --- |
| Install/build rejects the runtime | `node --version` must report 24.x; use the committed lockfile with `npm ci` |
| Setup cannot start PostgreSQL | Docker is installed/running with Linux containers; Compose is available; port 55437 is free |
| Database authentication fails | Existing local credentials and the persistent Docker role must match; setup preserves existing settings |
| Server cannot bind | Identify the listener on 4317; do not stop unrelated processes |
| Hosted company/provider settings are absent locally | Expected: a fresh local database has separate accounts/data/settings |
| Live research or delivery is unavailable | Configure only the needed provider for the test account; consult [integrations](../INTEGRATIONS.md) |
| A generated page loses edits after build | Edit the authored source listed in the [repository map](../REPOSITORY-MAP.md) |

For an existing checkout, inspect branch/status before fetching or pulling. Do not overwrite local work or delete database volumes to get a clean start.

Run `npm run verify:clean-install` to check a clean database installation and repeat migration. It creates its own temporary, loopback-only Docker database and removes that container afterward; it does not reset your working database. The September 7 migration-order fix creates the restricted runtime role before migrations reference it in grants and policies.

## First PR checklist

- Reproduce the issue with fictional inputs.
- Specify the user-visible outcome.
- Preserve permissions, provenance, version checks, and draft/approval distinctions.
- Add meaningful behavioral coverage where needed.
- Run relevant checks; use full verification for broader changes.
- Review generated changes and update docs/help as appropriate.
- State whether validation was local, mocked-provider, or hosted.
- Do not include unrelated local artifacts.

See [contributing](../../CONTRIBUTING.md). Collaboration should use focused branches/PRs; main can trigger production deployment.

## Access handoff

A new developer needs repository access and local setup first. Production database, Vercel, DNS, provider keys, and encryption-key custody should be granted separately with appropriate roles. Do not copy the founder's personal credentials or a local environment file into the repository.

| Responsibility | Access or agreement to establish |
| --- | --- |
| Routine development | Repository/PR access and local fictional environment |
| Release ownership | Named maintainer, review expectations, CI visibility, Vercel role and release procedure |
| Database changes/recovery | Separate migration access, database owner, hosted restore procedure, key custodian |
| Provider testing | Authorized test account, provider configuration, spending limits, safe recipients |
| Customer/commercial decisions | Product owner, approved pilot scope, acceptance criteria and private evidence location |

Maintainer roles beyond the repository owner are not assigned by this document. Agree them during onboarding.

## Ready to contribute

The first-day handoff succeeds when you can run the local app with fictional data, explain the customer journey and draft/review boundaries, trace a task write through the code, run an appropriate check, and submit a small reviewable PR without relying on private chat context. Record unmet prerequisites; a successful build alone is not this full acceptance.
