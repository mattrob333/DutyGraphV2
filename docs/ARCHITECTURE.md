# Architecture and implementation decisions

Release 0.3 is a single-origin React/TypeScript application backed by Express and PostgreSQL. The local preview uses localhost:4317; the dedicated PostgreSQL 17 Compose service binds to localhost:55437. The original visual reference remains separate in `reference/`. The commercial handoff and predecessor repositories are not bundled into the public source.

## Authoritative data and command consistency

PostgreSQL owns companies, typed records, immutable content versions, request snapshots, participant decisions, assets, audit events, command receipts and the transactional outbox. Runtime Zod schemas validate input; semantic references are checked against the same company within a transaction. Composite tenant/company keys and forced RLS enforce relational scope.

Content hashes cover canonical JSON plus tenant, company, record ID, kind, title and version. Prior content and audit rows cannot be updated or deleted by the runtime role. State transitions have append-only audit events but do not create new content versions; a hash therefore identifies content, not every later validation-state change.

Commands serialize tenant writes using a transaction advisory lock before row locks. This deliberately favors consistent multi-record reviews and source invalidation over concurrent writes within one local tenant. Read queries remain concurrent. Different actors cannot race report review against a source edit through the normal command interface. Expected versions/revisions and actor-scoped idempotency receipts protect retries. Direct administrative writes bypass application guarantees and are outside the supported workflow.

## Authentication and scope

Passwords use salted scrypt; server sessions store hashed bearer tokens, expire after 12 hours, and use HttpOnly/SameSite cookies, origin checks and CSRF tokens. Authentication endpoints are throttled. Advisors manage companies inside their tenant. Participants are linked to one company/person and only see assigned requests and projected task fields.

The runtime role is neither superuser nor RLS-bypass and does not own the tables. Transaction-local tenant context is selected by the server actor. Authentication lookup tables are intentionally outside business RLS and are accessed through fixed server queries. Invitation tokens are hashed, time-limited and single-use; issued URLs are redacted from saved command receipts.

This is local password and link-possession assurance. Email verification, identity recovery, enterprise SSO/MFA, company membership administration and fine-grained source ACLs remain separate work.

## Work and observation model

A task can be saved with unresolved roles but cannot be reviewed without owner, performer and accepted sources. Current accepted participant decisions must match the exact version/hash. Edits require new review/confirmation; historical responses remain historical. Duty ownership, manager relationships and task confirmation are separate claims.

Handoffs pin both tasks and define receiving conditions and failure handling. Workflow definitions pin tasks/handoffs and reject cycles, duplicate paths and disconnected steps. A case snapshots the reviewed definition, step states, attempts, deadlines, selected routes and observer notes. Branch joins distinguish all/any. Deadline evaluation uses persisted timestamps; it never auto-completes a step. Cases record human observations and do not perform external actions.

## Graph projection and display

The outbox worker materializes metadata and typed links into a local PostgreSQL projection. Replay is idempotent and does not copy source bodies. Bounded graph reads use authoritative records, with focus/depth/filter/node budgets and explicit lag/truncation metadata. Maximum output is 150 nodes, maximum depth four, maximum scanned graph records 5,000, and query statement timeout three seconds.

The UI displays connected evidence/people/tasks/hypotheses/proposals, focused neighborhoods, a work view, an accessible register, and a separate team/reporting view. Cards have wider gutters, separate connection ports and routed arrows. Recorded managers alone determine the org chart. Graph reconstruction is company-scoped and atomic; it verifies node count and records an audit event. No business action is replayed.

An optional Neo4j Aura adapter keeps a second projection of graph metadata and typed relationships. Database credentials are encrypted per advisor account. The adapter accepts verified-TLS Aura URIs, scopes every node and relationship by tenant and company, and writes each company snapshot in one transaction. Revision and payload checks prevent an older snapshot from replacing a newer one. Projection is bounded to 5,000 nodes and 40,000 relationships. Full evidence bodies, audio and credentials are excluded.

PostgreSQL remains authoritative. Graph reads use Aura only when its revision, fingerprint and counts match the current company; otherwise they use current PostgreSQL records. The worker syncs enabled connections. Settings offers connection testing, graph rebuilding and status. Removing a connection stops later access but does not delete copies already in Aura. Local adapter tests pass. Live Aura connectivity, production maintenance projection and a duplicate-free repeat rebuild were verified on September 6, 2026; the shared reader also validated the hosted snapshot. See verification/2026-09-06-guided-release.md for the verification boundary. Distributed coordination and large-scale evaluation remain future work. Full workspace reads still return all current records; pagination and larger-domain query planning remain future scaling work.

## Evidence and capture

Original evidence and requests are immutable. Retraction preserves history and propagates staleness through current dependencies. Participant text and audio preserve original provenance. Audio uploads use 512 KB chunks, checksums and final size/hash checks, with a 25 MB ceiling. Scoped local storage is PostgreSQL bytea, marked unscanned. Access expires after 30 days and the retention worker purges chunks; local browser drafts remain until submission/discard.

On-demand OpenAI transcription accepts bounded recordings and preserves their original lineage. Participants can edit and review the transcript before submitting; advisors can recover text from an audio-only reply and accept it as separate transcript evidence. Failed or uncertain attempts require an explicit retry. Synthetic tests cover the adapter and record flow; live microphone and provider acceptance remain pending. There is no malware scanner, general document parser, continuous ingestion queue or autonomous source-instruction execution. Comprehensive erasure, legal hold and production private object storage remain open.

## Strategy and reports

The preserved sixteen-framework registry determines dependencies and four source buckets. Each framework has specific system instructions, variable requirements and a validated visual output shape. On-demand OpenAI runs bind exact source excerpts, model and prompt version, and full current direct-upstream analyses. All upstream joins must be ready; source changes and upstream reruns invalidate dependent analyses recursively. A browser-led sequence runs ready analyses in order with separate account limits and no automatic retries. AI outputs remain versioned interpretations, separate from advisor-authored records and authoritative duties.

Human-authored analyses also bind exact evidence and upstream versions. Current generated analyses can inform reports and the copilot, with citations to exact saved canvas versions and source excerpts. Structural diagnosis checks require independent origins, a tested alternative, a discriminator and a measured baseline; they are not an empirically validated causal engine.

Metrics append observations. Outcomes freeze the original intervention prediction and measurement snapshot, record coverage/confounders, and support inconclusive results. Reviewing a falsified result reopens the hypothesis.

Client reports freeze selected allowlisted fields, intended audience, purpose, narrative and current source bindings. Advisor approval binds exact content and audience; download rechecks bindings. Raw source bodies, recordings and credentials are omitted. HTML escapes text and CSV neutralizes formula prefixes. Audit packets state the latest-500-application-event limit. Internal frozen exports have their own historical semantics and are not client-publication approvals.

## Operations and packaging

Versioned migrations have normalized checksums and an administrator-only ledger. An AES-256-GCM backup authenticates metadata and dump bytes; the restore drill creates a separate temporary database, restores it and compares record/version/audit fingerprints before removing that drill database. No off-host recovery or production RPO/RTO is claimed.

CI installs from the lockfile, starts the dedicated database, applies migrations, regenerates contracts, builds and runs real unit/API/database tests, and audits dependencies. The documentation build uses the same authored sources for the in-app help center and portable HTML. The PDF builder is a separate optional ReportLab step. No external provider credentials are required for the local build.

## Extension seams

- Replace local participant assurance with a reviewed identity and membership model before real client rollout.
- Add source ACLs and object-storage/scanning/retention services as an integrated lifecycle.
- Implement provider-backed ingestion and reviewed changesets only after credentials, data policy, budgets and evaluation are accepted.
- Add the production operational-model, authority/control-context and managed-signing domains before any runtime grant.
- Integrate one exact customer action through a conformance-tested adapter, including unknown-effect reconciliation and revocation.
- Add pagination, distributed worker coordination and production observability based on measured workloads.

The API route catalog is generated from implemented declarations. OpenAPI has runtime-derived record input schemas; it does not yet close every non-record body/response contract in the larger production specification.

## Public research boundary

Discovery uses an optional Exa search/content adapter. A tenant-scoped research_runs table reserves each command before the external request, preserves its outcome and permits review/import of immutable source snapshots. The provider endpoint is fixed; no arbitrary URL is fetched by this server. Queries contain the explicit public name and optional domain, never workspace evidence. A retained snapshot imports as pending-review evidence with URL, date and digest. Ten requests per rolling 24 hours are enforced across each tenant account. Replay does not repeat a call; crashes can leave an unknown provider outcome without automatic retry.

Guided discovery carries stage-appropriate context automatically: public research into the contact email; research and the contact's reply into the leadership agenda; internal meeting accounts into reviewed people and duties; reviewed dossiers into personal interviews; and returned interviews into task drafts. First-meeting preparation never requires later employee accounts. Each draft retains its input references, review precedes record changes, and email sending remains separate. Recurring source collection and background research cancellation remain open.
