# Architecture decisions for local release 0.1

## Source of truth

PostgreSQL owns company records, immutable content versions, request snapshots, participant confirmations, audit events, command receipts, assets, and the transactional outbox. An application command holds the relevant row lock, checks expected content revision, and commits the record, version, audit entry, and event together. A failed command rolls back all four. Idempotency keys are scoped to actor and tenant; changed payloads conflict.

`records` is a typed record envelope with indexed company/kind/state/version columns and Zod-validated JSON payloads. `record_versions` and `confirmations` have composite tenant/company foreign keys. Cross-company person, task, source, and metric references are checked within the same transaction. This is a deliberate local foundation, not a claim that the complete 18-object production domain schema has been implemented.

SHA-256 hashes bind canonical JSON to the tenant, company, record ID, kind, title, version, and content. The canonicalizer is pinned in the lockfile. Prior versions and audit entries cannot be updated or deleted by the runtime role. A hash provides content integrity; no approval-signing claim is made.

## Authentication and tenancy

An account belongs to one tenant. Advisors can manage companies in their tenant. Participants are linked to exactly one person and company by a purpose-limited invitation. Password hashes use salted scrypt. Server-stored sessions use hashed bearer tokens, 12-hour expiry, HttpOnly/SameSite cookies, origin checks, and a session CSRF token.

Every business table forces tenant RLS using a transaction-local tenant context. The runtime database role cannot bypass RLS and does not own tables. Authentication lookup tables intentionally sit outside business RLS; the server accesses them through fixed login/session/invitation queries. The browser never selects its tenant context or changes its role.

Invitation GET does not consume access. Explicit enrollment consumes a hashed, expiring token. Re-issuance revokes prior unused links. Invitation URLs are returned once and redacted from command receipts. This is **link possession plus local password assurance**, not independent email verification or enterprise IAM. Privileged stage approvals and managed Signet keys are unavailable.

## Work confirmation

Creating or editing a task creates a new unconfirmed version. Advisor review creates a reviewed version; a request freezes exact task versions and hashes. Participant submission records its authenticated actor and response but does not mark work confirmed until the advisor reviews the original response. Current owner and performer confirmations are required. One person may satisfy both roles only when that same identity holds both recorded roles.

Late responses remain historical. Corrections reopen the current work claim for review. Source retraction invalidates dependent tasks, frameworks, and proposals. Task edits mark bound agent proposals stale. No task, source, meeting decision, or persona selection can create a runtime grant.

## Graph

An asynchronous worker materializes metadata and typed links into `projection_nodes`. Repeated events cannot duplicate nodes or overwrite newer records with older snapshots. Raw source text is absent from that projection. The current graph endpoint uses a permission-checked authoritative PostgreSQL fallback and exposes pending projection work. The UI limits the initial graph to 150 records and supplies a table alternative.

Neo4j is **not connected**. Before scaling, replace the local projection adapter with the specified Neo4j generation/checkpoint model, bounded neighborhoods, and measured performance gates. No graph data is used to authorize runtime actions.

## Audio

MediaRecorder requests microphone access only after notice acknowledgment and an explicit start. The UI offers pause/resume, finish, playback, discard, audio upload, and text alternatives. Browser IndexedDB keeps recoverable local clips. Uploads use 512 KB chunks with individual checksums, a manifest/status endpoint, and a complete checksum at finalization. Storage is scoped PostgreSQL bytea for the local pilot, not production object storage.

Assets are marked `stored_unscanned`; no malware scan or transcription is fabricated. Local audio playback is allowed within actor/company scope. Raw audio access expires after 30 days, regardless of worker lag, and the worker purges chunks. Local drafts remain on the participant's device until submission/discard; enterprise deletion/hold and derivative lifecycles need a dedicated implementation.

## Strategy and exports

The exact supplied registry controls sixteen frameworks and `biz`, `leadership`, `calls`, `org`. Framework artifacts are human-authored and source-bound. Required upstream analyses must be complete, and reviewed artifacts recheck source hashes. Changes mark downstream analyses stale. There is no model provider connection or synthetic fallback.

Constraint review uses an explicit local readiness rule and manual test evidence. It is not a validated diagnostic engine or empirical proof. Measurements preserve null baselines and targets. Interventions and weekly decisions remain proposals/commitments.

Internal exports freeze task content and report exclusions. Raw source text, audio, passwords, and tokens are omitted. Downloads recheck company access and source retraction. Generic agent packages include only currently qualifying task bindings, and clearly state that they grant no authority and deploy nothing.

## Trust boundaries and unresolved threats

Text is rendered as React text, not executable HTML. There is no URL crawler, arbitrary Cypher endpoint, model tool runner, or execution bypass path. Production static assets receive a restrictive CSP and same-origin local fonts. Runtime preflight returns blocked when services are unconfigured.

Outstanding security work includes independent review, identity recovery/MFA/SSO, explicit company membership and evidence ACLs beyond the local roles, admin lifecycle, private object storage/scanning, managed signing, authority adapters, runtime conformance, export retention, backup encryption, abuse/load controls, and production operating procedures. The app must stay a synthetic-data local pilot until these release gates are accepted.
