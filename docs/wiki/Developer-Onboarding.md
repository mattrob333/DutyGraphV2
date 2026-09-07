# Developer onboarding

## First day

1. Read [vision](Product-Vision.md), [current state](Current-State.md), and [decisions](Decisions.md).
2. Follow the [README setup](../../README.md#run-locally) with Node 24 and Docker.
3. Confirm you are using local PostgreSQL, not a hosted/customer connection. Do not print credentials.
4. Start the application and create/use fictional data. Follow research → kickoff → participant review → advisor work map.
5. Compare the public discovery demo with the real participant workflow. Note which actions are simulated.
6. Inspect a task schema, its server mutation, and the UI that reviews it.
7. Run relevant tests and make a small scoped first PR.

## Suggested code-reading path

Read `server/index.ts` and `server/app.ts` for local routing, then `api/index.ts` for hosting. Read `server/auth.ts` and `db.ts` for security context. Follow `shared/domain.ts` through `server/records.ts` before adding fields.

Then choose a vertical slice: participant extraction/review, company work map, framework generation, or public-content publishing. Keep shared model, server validation, UI, and tests aligned.

## Working environment

`npm run setup` generates missing local secrets and applies migrations. Existing `.env` files are preserved. Do not copy placeholders and expect setup to replace them. Changing database passwords in a file does not necessarily update an existing Docker database volume.

If startup fails, check Docker, database readiness, port ownership, Node version, and configured origin. Do not delete a volume as the first troubleshooting step. Ask for a reviewed recovery plan if valuable local data exists.

`npm run dev` includes both API and Vite. A standalone static preview cannot exercise authenticated API behavior on its own.

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
