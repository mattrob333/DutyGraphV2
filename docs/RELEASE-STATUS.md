# Release 0.1 — working local foundation

The supplied handoff defines a 90-requirement production target across M0 and R1–R4. This repository implements a useful local discovery, review, and export slice. **The complete production target remains open.** No external credentials, customer systems, managed signing, or production deployment were supplied or configured.

## What can be used now

| Area           | Current behavior                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace      | Separate accounts/tenants, multiple bounded companies, server persistence, graphite/light UI                                                        |
| Discovery      | People, CSV preview/quarantine, immutable requests, private enrollment links, original text/audio responses                                         |
| Evidence       | Reviewed source acceptance, exact locators/origins, immutable originals, retraction and dependent staleness                                         |
| Work           | Typed task cards, immutable versions, accountable owner/performer, authentic local participant responses, historical confirmations                  |
| Data integrity | Forced tenant RLS, composite version keys, semantic company references, row locks, idempotency, transactional outbox                                |
| Graph          | Data-driven connected/work/people views, camera controls, accessible register, local derived metadata projection with authoritative read fallback   |
| Strategy       | Exact 16-framework registry, four buckets, human-authored analyses, source/upstream version binding, manual diagnosis tests, measures/interventions |
| Governance     | Version-bound draft proposals, separate authority/deployment states, fail-closed unconfigured runtime                                               |
| Weekly review  | Current exceptions and baseline gaps, human-owned decisions and commitments                                                                         |
| Exports        | Frozen internal ZIP packets, current confirmed subset, exclusions, source metadata, instructions, setup requirements, checksums                     |
| Operations     | Dedicated local database, generated secret configuration, atomic writes, raw-audio expiry/purge, verification workflow                              |

## Open work by release

| Release | Remaining acceptance work                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0      | Full clean-checkout execution audit of both predecessor repos; owner-reviewed architecture/threat model/data policy; complete closed 92-route API contract; customer dependencies and cost/SLO agreement                                                                                                                                                                                                                           |
| R1      | Verified email/identity assurance and recovery; company/engagement memberships and fine-grained source ACLs; production private object storage and scanning; robust document parsing; real transcription/extraction jobs; email delivery/reminders; authenticated legacy import; complete task/duty schema and authority baseline compiler; durable job budgets; full retention/deletion/hold and accessibility/browser regression |
| R2      | Neo4j adapter with generation rebuild/repair and bounded neighborhoods; actual provider-backed framework orchestration; operational-model compiler; independently evaluated constraint/falsification engine; reviewed outcome assessment; meeting integration; timezone scheduler; approved briefs and purpose-scoped feeds; performance evaluation                                                                                |
| R3      | Exact customer identity/policy/request integrations; legitimate authority and owner ceiling reconciliation; authenticated approval stages and separation of duties; managed Signet keys; grant issuance; one tested runtime adapter; action-bound approvals; side-effect idempotency/reconciliation; owner lifecycle and kill switch; tamper evidence and recovery drills                                                          |
| R4      | Enterprise SSO/SCIM, isolation/deployment options, permission-safe portfolio reporting, additional validated adapters and operational assurances                                                                                                                                                                                                                                                                                   |

## Decisions applied for this local build

- Use the new DutyGraphV2 repository, as requested. Preserve predecessor checkouts.
- Keep the supplied graphite visual reference and canonical registry; document current LiveFrameworks drift.
- Use PostgreSQL immediately. A local projection table is an interim adapter; Neo4j remains unconfigured.
- Prefer manually reviewed evidence and human-authored strategy artifacts until approved providers are connected. No analysis fallback is represented as a real model result.
- Use synthetic data and local password/invitation assurance. No live customer privilege approval is enabled.
- Ship only generic, explicitly non-operative draft packages. No runtime deployment or external business action is enabled.

## Requirement traceability

The accompanying `requirements-status.json` maps all 90 supplied IDs and titles to this local build. “Local subset” means code exists for part of the requirement and its scope is described above. It does **not** mean the full linked production acceptance scenario has passed. “Open” means the requirement has no completed implementation in this release. No production requirement is marked formally accepted without the specified independent/owner acceptance.

See `VERIFICATION.md` for the precise automated and browser evidence. The supplied commercial documents and customer-specific context remain outside this public repository.
