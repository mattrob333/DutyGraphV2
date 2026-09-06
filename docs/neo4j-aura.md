# Neo4j Aura company graph

PostgreSQL remains the source of truth. Aura holds a replaceable copy of each company's graph. The app reads Aura only when its revision and complete graph fingerprint match the current PostgreSQL record. Missing, stale, altered, oversized, or unavailable copies use the existing PostgreSQL graph.

## Connect an account

1. Apply database migrations with `npm run db:migrate`. Migration `0005-neo4j-projection` adds the provider and its tenant-protected sync status table; `0006-neo4j-maintenance` adds the persistent maintenance cursor.
2. Configure the existing server `PROVIDER_ENCRYPTION_KEY`. Use the same persistent encryption key on every server instance. Do not rotate it without re-encrypting saved provider credentials.
3. Create an Aura instance in the user's own Neo4j account. Copy its `neo4j+s://…databases.neo4j.io` URI, database username, database name, and **database password**.
4. In Workspace settings, open **Neo4j company graph**. Save the connection and select **Test connection**, then **Build company graph**.
5. Check that the company graph reports **Company graph current**. The graph API reports `engine: "Neo4j Aura"` only when it actually reads the verified projection.

Saving these settings authorizes the normal maintenance sweep to copy changed company graphs. The connection is shared by the advisor account's company workspaces. Each company gets its own strict scope. Removing the connection stops future scheduled copies and uses PostgreSQL. It does not delete the existing data in Aura or close the user's Aura instance.

## What is copied

The projection contains record IDs, types, titles, state, version, content hashes, display order, and recorded relationships. It does not copy raw source text, interview audio, prompts, contact email fields, or arbitrary record bodies. Record titles may themselves contain company or person names, so the Aura database remains a private company data store.

The credential JSON is sealed using AES-256-GCM and account-specific authenticated context in the existing `provider_settings.encrypted_key` column. API responses expose only the endpoint, username, database, and last test time. Passwords and driver errors are never returned. There is no browser-side driver, environment credential fallback, arbitrary Cypher endpoint, or paid database provisioning operation.

## Consistency and failure behavior

- Every node key and relationship scope includes the account ID and company ID. All data values are query parameters; labels and queries are fixed in code.
- A unique company scope and unique record key prevent duplicates. A company write lock serializes managed projection transactions. An older revision cannot overwrite a newer revision. A rebuild is a no-op only after both metadata and actual copied content match; missing or altered copies are repaired under the same lock.
- A rebuild replaces only that company's `DG_LINK` relationships and removed nodes. It deliberately uses `DELETE`, never `DETACH DELETE`, so an unexpected foreign relationship causes rollback instead of deleting another company's relationship.
- Reads compare the company revision, fingerprint, counts, and copied payload. The UI therefore cannot silently use a stale or incomplete graph. Existing filters and node budgets are applied consistently for both stores.
- An Aura read has a 2.2-second overall deadline and a 1.6-second transaction timeout. A connection failure opens a 30-second in-process circuit breaker. Later graph requests return the PostgreSQL view without reconnecting during that period.
- Test requests are bounded to eight seconds and rebuilds to fifteen seconds. Background maintenance visits at most twelve accounts per sweep and stops starting new visits after thirty seconds, reserving fifteen seconds for the final Aura attempt. A database cursor commits each account visit before external work and resumes round-robin across workers and server restarts. Each visit attempts at most one changed company, with a fifteen-second per-account minimum interval. Saved projections are rechecked after five minutes so missing or altered Aura copies can be repaired. Hosted audio retention and authoritative PostgreSQL projection work run before the Aura sweep. Production cadence follows the existing maintenance scheduler; saving does not create a new external cron job.
- The current projection limit is 5,000 graph records and 40,000 relationships per company. Larger companies retain the existing bounded PostgreSQL graph and show a projection-limit message.
- Runtime PostgreSQL RLS protects both settings and sync status. Aura is an account-managed destination, not an authority source or an agent execution runtime.

## Integration contract

Mount `neo4jRouter()` at `/api/v1/companies/:companyId/neo4j` inside the authenticated API and render `<Neo4jSettings company={company.id}/>` in the company settings page. All routes require an advisor and a company visible to that advisor. Mutations use the existing CSRF protection. Save and remove use command idempotency receipts.

| Method | Path       | Result                                                                                              |
| ------ | ---------- | --------------------------------------------------------------------------------------------------- |
| GET    | `/`        | Safe connection state, current source revision, sync state, encryption-storage readiness            |
| PUT    | `/`        | Save encrypted Aura credentials; body `uri`, `username`, `database`, `password`, optional `enabled` |
| POST   | `/test`    | Test the saved connection; body `{}`                                                                |
| POST   | `/rebuild` | Rebuild the selected company; body `{}`                                                             |
| DELETE | `/`        | Remove saved connection only; body `{}`                                                             |

GET returns `configured`, `connected`, `store: "PostgreSQL"`, `endpoint`, `username`, `database`, `verifiedAt`, `sourceRevision`, `storageReady`, and `projection`. The projection is `null` or `{ source_revision, status, message, updated_at }`. Status is `pending`, `current`, `error`, or `oversized`. `connected` means the last explicit connection test succeeded; it is not a live availability guarantee. A projection whose revision has fallen behind is reported as `pending`.

The generic provider endpoint also returns a safe `neo4j` summary. `server/projection.ts` calls `syncNeo4jTenant()` after processing PostgreSQL projection events. `server/graph-query.ts` calls `readNeo4jSnapshot()` before choosing the view's store. `server/graph-shape.ts` shares the same relationship derivation between both paths without a circular import.

## Verification

`tests/neo4j.test.ts` uses a fake driver and tests strict Aura URI validation, account-bound encryption, source-body exclusion, foreign-company rejection, graph limits, fingerprint changes, identical and older rebuilds, parameterized scoped writes, current-view parity, stale-data fallback, outage circuit behavior, and the actual read deadline. These tests make no network or provider calls. Run with `npx tsx --test tests/neo4j.test.ts tests/graph-query.test.ts`.

`tests/neo4j-api.test.ts` tests the mounted API against isolated synthetic PostgreSQL accounts and a fake driver. It covers advisor authorization, session and CSRF requirements, company/tenant isolation, encrypted storage, sanitized responses and audit records, strict request bodies, test status, settings removal, idempotency, and the unconfigured PostgreSQL fallback. It never connects to Aura.

A real Aura verification must still save credentials through the settings page, test, rebuild, read the company graph, then confirm a second rebuild does not create duplicate nodes or edges. Never print downloaded credentials or include them in logs, screenshots, reports, or source control.

Implementation follows the official [Neo4j JavaScript connection guide](https://neo4j.com/docs/javascript-manual/current/connect/) and [managed transaction guide](https://neo4j.com/docs/javascript-manual/current/transactions/). Driver version is pinned in `package.json`.
