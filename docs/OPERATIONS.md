# Local operating notes

## Start and stop

Start the dedicated database with `npm run setup`; it generates the ignored environment file only if absent. Run `npm run build` and `npm start`, or `npm run dev` for development. The application binds to loopback port 4317. PostgreSQL binds to loopback port 55437. Do not change these to public interfaces without completing the deployment/authentication review.

Stop the Node process using the terminal that launched it. Stop this database only with:

```sh
docker compose --env-file .env -f infra/compose.yaml stop
```

The named volume preserves data across container and application restarts. Do not use `down -v` unless you intentionally want to erase this development database.

## Configuration and data

`.env` contains generated database credentials and is excluded from git. `ENABLE_DEMO=true` enables a shared synthetic demo account. Disable that option before designing any hosted deployment. Never put real customer data in the demo account. Independent registration creates a separate tenant with its own password account.

The schema migration uses a separate administrator connection. The server uses `dutygraph_app`, which is not a superuser, cannot bypass forced tenant RLS, and cannot rewrite content history or the audit log. Existing rows are preserved by idempotent schema creation. Production migrations require a versioned migration ledger and a reviewed forward/rollback plan.

## Failure behavior

- Database unavailable: commands fail. The browser displays an error instead of a saved-success state.
- Stale edit: HTTP 409; refresh and review the current version before retrying.
- Duplicate command: the same payload/key returns its prior result. Changed content with the same key conflicts. Sensitive invitation URLs are returned only on first issuance.
- Interrupted upload: retain the clip; use Upload / resume. The server reports acknowledged chunks and checks the final size/hash.
- Expired audio: content reads return 410; the retention worker removes stored chunks. Metadata remains marked expired.
- Graph worker delayed: pending outbox count is visible; current authoritative records remain available.
- Source retracted: dependent work is stale and old export downloads are blocked until a new packet is generated.
- External provider or runtime absent: the UI reports not configured and runtime preflight is blocked. No fallback analysis or approval is invented.

## Backup and recovery limits

Use PostgreSQL logical backups of this dedicated database for development portability. A production backup design must add encryption, restricted storage, retention, off-host copies, and restore drills. No RPO/RTO or production availability promise is established by this local build. A named Docker volume is persistence, not a backup.

The graph projection is rebuildable from `records` and `outbox`; reprocessing graph events never invokes email or business actions. No business side-effect adapter exists in release 0.1.

## Next implementation gates

Before production collection: confirm hosting/region, signup and enrollment assurance, company/evidence ACLs, provider processing policy, object storage and scanning, retention/deletion/hold, operational monitoring, and independent security review. Before governed execution: verify the exact customer policy and identity sources, approval chain, application resource/actions, managed signing, runtime enforcement/revocation, action receipts, and unknown-effect reconciliation.
