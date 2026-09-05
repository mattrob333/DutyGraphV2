# Security and data-handling review

This is a developer threat model for release 0.2, not an independent penetration test, compliance certification or owner-approved production data policy. Use it to plan the remaining acceptance work.

## Assets and boundaries

Protected assets include source text/audio, participant identities and decisions, work versions, client reports, database credentials, invitation tokens and backup keys. Boundaries are browser-to-API, application-to-database, tenant/company/participant scope, local-file exports and backups, and any future provider/customer-system connection.

## Threats and current controls

| Threat | Current control and evidence | Remaining boundary |
| --- | --- | --- |
| Cross-tenant read/write | Forced RLS, non-owner runtime role, company reference validation; API/database denial tests | Independent review and company/evidence ACL model |
| Participant impersonation | Hashed one-use invitation, assigned-person session, exact task snapshots, server role checks | Link possession is not verified email or corporate identity |
| CSRF/cross-origin writes | SameSite session cookie, session CSRF token, origin rejection tests | Hosted origin/TLS/proxy review |
| Concurrent or replayed changes | Transaction locks, expected versions, canonical fingerprints, scoped idempotency | Distributed worker and side-effect semantics not implemented |
| Source-based script injection | React text, escaped report HTML, closed handbook renderer, no arbitrary query/tool runner | Production document scanning and parser hardening |
| Spreadsheet formula injection | Formula-prefix neutralization in client register CSV, regression test | Review free-text exports and recipient tooling |
| Stale approval/confirmation | Exact version/hash checks, source invalidation, report rechecks, historical responses | Separate cryptographic approval/authority model |
| Secret disclosure | Ignored generated .env, hashed tokens, invitation-receipt redaction, no key logging | Managed secret store, rotation and access policy |
| Audio corruption or peer access | Scoped chunk manifest/final checksum, limits, permission checks and recovery tests | Malware scanning, private object store, physical-device coverage |
| Auth abuse | Structured process-local endpoint throttling, bounded passwords and JSON | Distributed abuse protection, MFA, recovery, signup controls |
| Audit tampering | Append-only runtime privileges and content hashes | Administrator can alter database; no trusted external checkpoints |
| Lost local data | Encrypted backup and tested separate-database restore | Off-host copies, key custody, retention and agreed RPO/RTO |
| Unauthorized external action | No operative adapter; preflight fails closed | Conformance-tested authority/runtime integration before activation |

## Collection and retention

The local demo is synthetic. Registration creates a separate tenant but does not by itself satisfy real-client processing requirements. Agree region/hosting, notice, consent or other basis, permitted sources, audience, retention, deletion and incident contacts before real collection. Engagement text documents the intended policy; technical enforcement is limited to the mechanisms listed here.

Server raw audio becomes inaccessible at expiry and the worker removes its chunks. Metadata, typed sources, immutable versions and audit records persist. Device drafts have a separate lifetime. Comprehensive erasure and legal hold are not implemented. A downloaded report or backup is a separate copy requiring its own handling policy.

## Secrets and backups

Keep .env and backup-key.hex outside version control. The generated backup key protects all backups made with it; losing it loses recovery. Store an access-controlled off-host copy of the key separately from the encrypted dump if the installation matters. The local script's file mode is best effort on Windows; use appropriate NTFS permissions and approved storage. Do not paste secrets into issues, screenshots or chat.

AES-GCM detects a wrong key or modified metadata/ciphertext before restoration. The drill verifies selected logical fingerprints, not every operational property. Full recovery must also reconcile account/session handling, configuration, code version, external copies and any future integration state.

## Release security checks

CI must block on failed role/RLS, CSRF, version/idempotency, confirmation, source-retraction, upload-corruption and report-escaping tests. It must also fail on high/critical dependency findings under the configured audit command. The September 2026 local audit reported zero vulnerabilities; this is a time-specific dependency result, not proof that the application has no security defects.

Before external hosting, independently review the deployment and threat model, verify real identity/recovery, disable shared demo access, establish company/evidence permissions, complete scanning and retention, validate backups/off-host recovery, and run penetration and abuse tests. Before business execution, additionally verify customer authority, separation of duties, managed keys, target resource/action boundaries, revocation, side-effect idempotency and unknown-effect reconciliation.

## Incident procedure

Stop use of the affected flow, preserve the relevant record IDs/request IDs and server logs, and contact the installation owner through the agreed channel. Avoid changing or deleting evidence during diagnosis. Disable external ingress or stop this app if necessary; do not stop unrelated services. Rotate exposed credentials through the operator's approved process. Rebuild a graph only after preserving the authoritative database; a projection repair does not repair compromised source truth. Document impact, recovery, verification and notification decisions outside public issues.

## Optional public research

Exa requires both a server-side key and operator enablement. Requests carry only the advisor-reviewed public business query and optional website domain. The fixed HTTPS endpoint rejects redirects; a 30-second timeout and 2 MB response ceiling bound each call. Snapshots cap at five sources and 6,000 characters each. The URL filter rejects non-HTTP(S) schemes, credentials, non-default ports, IP literals, single-label hosts and the .local, .localhost and .internal suffixes. It does not resolve DNS to detect a hostname pointing to a private address. The application server contacts only the fixed Exa endpoint; opening an original source follows that link in the advisor's browser. Source text is rendered inert. Advisor-only routes and forced tenant RLS cover research history. Durable reservations prevent replay from spending a second request; failed/ambiguous calls consume the ten-per-24-hour account cap. Provider spending controls, live conformance, account key rotation, research deletion and background cancellation remain operator/production acceptance work.
