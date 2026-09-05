# Verification record

Local verification date: 5 September 2026. Tested against a dedicated PostgreSQL 17 database using the non-superuser runtime role. The current commit/CI run is the authoritative build reference after publication.

## Automated verification

`npm run verify` runs strict TypeScript checking, a Vite production build, and 30 domain/API/database tests. Tests cover:

- Canonical hashing, owner/performer confirmation rules, historical versions, conflicts, source staleness, and review expiry.
- Unauthenticated denial, CSRF and cross-origin rejection, tenant RLS, company-scoped references, and participant field projection.
- Concurrent edits, idempotency conflicts, transactional rollback of records/versions/audit/outbox, and idempotent graph replay.
- One-use enrollment, request withdrawal, late/current confirmations, advisor impersonation rejection, and the confirmation-to-export path.
- Audio chunk corruption, retries, interrupted finalization, byte-for-byte recovery, access denial, immediate retention expiry, and chunk purge.
- Source retraction, dependent staleness, invalidation of previously frozen exports, archive file checksums, and omission of raw source text.
- Roster duplicate/cycle quarantine, source independence, framework dependency gates, and unconfigured-runtime denial.

Dependency audit and generated request-contract drift are checked separately in CI. No existing MiniPedigree or LiveFrameworks test results are included in these counts.

## Live browser checks

The app was opened at `http://localhost:4317` in the Codex in-app Chromium browser. Verified the real application title, sample login, server-backed overview (8 people, 8 task descriptions, 7 synthetic sources), and page navigation for Discovery, Company graph, Task cards, Strategy, Agent governance, Weekly review, Deliverables, System & connections, and Workspace settings.

The graph rendered data-driven nodes and links, zoom/Fit controls, the people view, and an accessible register. The overview was visually compared with the supplied V2 reference. At viewport widths 360, 390, 768, 1024, 1280, and 1440, the overview had no horizontal page overflow. The 390-pixel view was visually inspected after its responsive transition completed.

These are bounded browser checks, not a full accessibility or cross-device certification. Physical microphone capture, Safari/Firefox, 200% text zoom, production loads, device interruption, enterprise authentication, and live third-party integration behavior remain unverified. Audio server integrity and recovery were tested with synthetic bytes; those tests do not establish microphone quality or media-decoder compatibility.

## Release interpretation

Passing these tests establishes the listed local paths. It does not complete all 90 handoff requirements, certify security/compliance, validate a constraint-diagnosis model, or prove governed execution. Read `RELEASE-STATUS.md` before treating this as a production release.
