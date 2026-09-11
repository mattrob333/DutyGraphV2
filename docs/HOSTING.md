# Hosted pilot operations

The production project is dutygraph-v2 in the owner's Vercel team. The public domain is https://dutygraph.com; https://dutygraph-v2.vercel.app remains the project alias. The project is linked to mattrob333/DutyGraphV2. Node 24 builds the Vite client and one Express-based API function. Authoritative data is in a dedicated Neon PostgreSQL database in IAD1, provisioned through Vercel Marketplace. This is separate from the local Docker database; local accounts are not copied to production.

## Server configuration

- APP_DATABASE_URL: TLS-verified pooled Neon connection using dutygraph_app, a non-superuser role without BYPASSRLS. Do not substitute the marketplace owner's DATABASE_URL.
- PROVIDER_ENCRYPTION_KEY: random 32-byte hex key for AES-256-GCM account credentials. Keep an independent secure recovery copy. Changing it without re-encrypting existing rows makes saved keys unreadable. Never expose it through a VITE variable or browser endpoint.
- CRON_SECRET: protects GET /api/maintenance. Vercel calls it every five minutes for projections, retention, and the bounded work-gap follow-up/reply jobs. Unauthenticated calls fail closed. See [work-gap follow-ups](work-gap-followups.md).
- ENABLE_DEMO=false: disables the shared local demo account. Authenticated users can create a private fictional sample.
- APP_ORIGIN: defaults to https://VERCEL_PROJECT_PRODUCTION_URL in the function entry. Set explicitly when moving to a custom domain and redeploy.

@vercel/functions attaches the small PG pool to the function lifecycle. Provider calls occur outside database transactions. API responses use no-store; sessions are HttpOnly, SameSite=Strict and Secure on the HTTPS origin. CSRF is required on authenticated writes. Hosted authentication and key-setting limits use a durable IP counter. Preview deployments require their own restricted database/key configuration and allowed origin before use.

The root build performs strict TypeScript checking across client, server and API. api/tsconfig.json disables a redundant check in Vercel's isolated function transpilation step; it does not disable the build's type checking.

## Migrations and release

Apply server/migrations in order using a migration-owner connection. The runtime role must receive only application grants and remains subject to forced row security. Migration 0004 adds encrypted provider settings, durable provider jobs and authentication counters. The local setup and CI apply the same migrations.

Run npm run contracts, npm run verify and npm audit before release. Confirm generated contracts are committed. Push the reviewed source and deploy production with the linked Vercel project. Verify the health route, signup/login, canonical-origin writes, account isolation, private sample loading, Settings, Discovery and participant links on the hosted URL. Provider acceptance requires separately authorized live calls; a configuration badge is not a provider-health check.

## Recovery and operational limits

The existing backup/restore scripts are deliberately restricted to the local dedicated Docker database. They do not back up or restore Neon. Configure and rehearse hosted database recovery and separate encryption-key custody before relying on this pilot for irreplaceable client records. Provider job snapshots persist under tenant RLS; comprehensive deletion and legal-hold handling are not complete.

Audio uploads use small verified chunks; playback supports bounded byte ranges. Physical-microphone and large-file browser acceptance still need evaluation. Production monitoring, alert routing, load/SLO acceptance, password recovery, SSO/MFA, and email delivery webhooks remain open. Work-gap follow-up scheduling is implemented; it is not a general reminder system. Neo4j Aura is an optional account-configured projection with PostgreSQL/current-record fallback. Connectivity was verified for a configured account in prior work; check the current account status rather than assuming a global connection.

Never call a sample-data script against an arbitrary database or import the private source handoff into the public repository. Build and live verification use fictional fixtures. API keys belong in the account settings or the server secret store, never logs, issue comments, source files or test output.
