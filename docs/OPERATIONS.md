# Operator runbook

Release 0.2 runs locally with Node.js 24+, npm and Docker Compose. The application listens only on 127.0.0.1:4317; the dedicated PostgreSQL service listens on 127.0.0.1:55437. Use the repository root as the working directory. On Windows, use npm.cmd if PowerShell blocks npm.ps1.

## Install and start

```sh
npm ci
npm run setup
npm run contracts
npm run verify
npm start
```

Open http://localhost:4317 and confirm the Duty Graph title and health endpoint. Setup generates random administrator/runtime credentials in ignored .env only if it is absent, starts Compose project dutygraph-v2, and applies versioned migrations. It does not inspect or change other application databases. A port collision fails instead of choosing another port.

For hot-reload development use `npm run dev`. For production-mode local review use `npm run build` followed by `npm start`. Both serve UI and API on one origin. The word production here describes the optimized asset build, not acceptance for Internet hosting.

## Synthetic training and documentation

`npm run training` creates a NEW fictional Northstar company under the local demo account and generates the client/internal examples in docs/examples. It exercises real local enrollment, participant decisions, reviews, workflow cases and report downloads with fictional actors. It sends no email and preserves the original Cobalt company. Repeated runs create additional companies; use a single reference run for a class.

`npm run handbook` generates portable HTML and editable Markdown under client/public/handbook. The normal build runs this automatically and copies it into dist. The PDF is optional: use scripts/handbook_pdf.py with ReportLab, BeautifulSoup and an explicit output path. The delivered PDF was created and visually checked in the build environment. The application does not depend on Python.

The portable index also links to the requirement traceability JSON, sanitized verification JSON files, and generated API/route contracts with the framework registry. These are copied from an explicit file allowlist. Backups, credentials, private source documents and raw workspace records are not part of the handbook.

For the complete release bundle, build the handbook and place the reviewed PDF at `../DutyGraph-Advisor-Handbook.pdf`. The optional PDF script currently uses the Windows Arial fonts under `C:/Windows/Fonts`; use the delivered PDF on other systems or adapt the font paths. Commit the release and verify its CI run, then run `npm run package:release`. Set `CI_RUN_URL` to the actual verified GitHub Actions run URL to include it in the manifest. Packaging requires a clean checkout and absent sibling `DutyGraph-Delivery-Pack` and `DutyGraph-Delivery-Pack.zip` outputs. It validates an explicit file allowlist, offline links, example archives and JSON, then adds a start-here guide and SHA-256 manifest. Preserve an existing pack elsewhere before producing another; the script does not delete or overwrite one.

## Stop safely

Stop the Node process from the terminal that launched it, or verify its command line and stop that exact owned PID. Do not stop all Node processes. Stop only this database with:

```sh
docker compose --env-file .env -f infra/compose.yaml stop
```

The volume preserves data. Do not use a volume-deleting command as a restart or repair step. Do not remove .env to repair authentication: the existing database role passwords will not automatically change to match a newly generated file.

## Migrations and upgrades

The migration runner holds a database advisory lock and applies each unapplied migration in a transaction. server/schema.sql is the immutable 0001 baseline; future files use server/migrations/NNNN-description.sql. The schema_migrations ledger records normalized SHA-256 checksums. Changing an applied migration fails; add a new migration instead. The runtime role cannot modify the ledger.

Before upgrade, preserve the current code revision and take an encrypted backup. Install the new lockfile, apply migrations, build, run tests and inspect the application. If a migration fails, its transaction rolls back. Do not delete the ledger or edit its checksum to force a changed migration through. Migration 0002 adds query indexes. Migration 0003 adds durable research-run history, request reservations and retained source snapshots with forced tenant RLS. Research history persists across restarts and has no automatic deletion policy in this release; plan its retention before collecting client context.

Rollback the application only after confirming schema compatibility. For incompatible schema/data changes, restore into a separate recovery environment and verify it before switching service. There is no automatic destructive in-place restore command in this release.

## Encrypted backup

```sh
npm run backup
```

The command exports a consistent PostgreSQL custom-format snapshot and encrypts it with AES-256-GCM. It writes a timestamped .dgbak under work/backups and creates work/backups/backup-key.hex if no key exists. The output identifies file paths and counts but never prints the key. Metadata is authenticated and dump bytes have a SHA-256 checksum. The dump contains sensitive application data even though encrypted.

Keep an approved off-host copy of the encrypted backup and a separately protected copy of its key. The local script does not implement remote storage or scheduled retention. Restrict NTFS permissions on Windows; the script's Unix-style file mode is not a complete Windows access policy. Do not commit work, .env, backups or keys. Losing the key makes the backup unrecoverable. Preserve older keys when rotating to a new key.

## Restore drill

```sh
npm run restore:drill -- work/backups/your-backup.dgbak
```

Use the actual filename emitted by backup. The tool decrypts and authenticates the file before making a database. It creates a uniquely named dutygraph_restore_<timestamp> database, restores the custom dump, compares record/version/audit/company/user counts and a record-content digest with the frozen snapshot, writes work/backups/latest-restore-drill.json, and removes only that temporary drill database. The original dutygraph database stays unchanged.

The delivered verification includes a successful local restore and corrupted-backup rejection. Counts include isolated synthetic test fixtures. The drill does not prove off-host key recovery, full media decoding, all application behavior after a disaster, or an agreed production RPO/RTO. Repeat after important upgrades and changes to the backup method.

## Actual recovery procedure

1. Stop writes to the affected installation and preserve its files/volume for investigation.
2. Identify the approved encrypted backup, corresponding key, code version and environment configuration.
3. Run the authentication/restore drill in the dedicated local environment to verify the backup, without overwriting the original database.
4. Have the operator restore the validated custom dump into a separate recovery PostgreSQL instance with the expected roles, grants and RLS. The current drill script intentionally cleans up its temporary database; it is a verification tool, not the cutover tool.
5. Configure a recovery application against that instance, run migration compatibility checks and the acceptance checklist, and verify important records, scopes and participant access.
6. Reconcile accounts/sessions, local drafts, exported copies, and any future integration state. Determine which credentials need rotation.
7. Switch the approved service to the recovery instance only after operator acceptance. Record data-loss window, recovery time, validation and follow-up.

Do not claim a recovery-time objective from the fast local drill. Establish and rehearse the actual cutover procedure for the chosen hosting architecture before production.

## Graph repair

System & connections includes Rebuild derived graph. It binds to the current company revision, reconstructs projection metadata from authoritative records, verifies its node count and records an audit event. It does not reset the authoritative record or invoke email/business actions. If the database itself is corrupt or compromised, preserve it and investigate; rebuilding a projection cannot repair source truth.

The worker normally processes pending events every two seconds. Authoritative reads remain available while it catches up. Persistent lag, repeated request errors or a database outage require operator investigation. Inspect the current request ID and server log; do not log source bodies or secrets to diagnose a failure.

## Retention and limitations

The local audio worker runs every minute. Access is denied immediately after an asset's expiry even if purge is delayed. Device drafts, typed text, histories, reports and metadata have separate lifetimes. Engagement retention/visibility/timezone text is descriptive; it does not implement a new purge schedule, legal hold, source ACL or reminder scheduler.

The full workspace read is not paginated. Graph reads are bounded to 150 output nodes and a 5,000-record scan. Commands serialize writes per tenant. Backup encryption currently buffers the dump in memory. These choices suit the measured local workload; use larger-data, concurrency and memory tests before changing the supported operating envelope.

## External services

No live provider credentials are configured in the delivered local instance. Exa source collection is implemented: put EXA_API_KEY in ignored configuration, set ENABLE_EXA_RESEARCH=true and restart. Confirm source/query policy and a provider spending limit before a live request. The app caps ten requests per tenant in 24 hours, retains reservations across restarts and never automatically retries. Read INTEGRATIONS.md for ambiguous-result handling, snapshot retention and live acceptance. Firecrawl, model analysis, transcription, email, enterprise identity and customer runtime still require implementation or service decisions.

## Routine operator check

Confirm the owned listener and health response, current build revision, database role/isolation, recent errors, projection lag, audio purge, backup age/key custody, restore-drill result and dependency audit. Before a client session, verify the visible company and page identity. Keep the formal production acceptance checklist separate from routine local health.
