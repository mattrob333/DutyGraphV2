# Verification record — release 0.2

**Historical evidence, September 5, 2026.** Counts, behavior, and limitations below describe that release. Start with [RELEASE-STATUS](https://github.com/mattrob333/DutyGraphV2/blob/main/docs/RELEASE-STATUS.md) and [dated verification records](https://github.com/mattrob333/DutyGraphV2/tree/main/docs/verification) for later evidence; do not use this page as today's test count or production acceptance.

Local verification date: September 5, 2026. Node 24, dedicated PostgreSQL 17, forced tenant RLS and the non-superuser runtime role. The published commit and its GitHub Actions result identify the release under test. This record separates automated checks, observed browser behavior and acceptance still needed.

## Automated verification

`npm run verify` runs strict TypeScript checking, the production build and 75 unit/API/database tests. The suite covers:

- Canonical hashing, owner/performer confirmation rules, historical versions, conflicts, source staleness and review expiry.
- Unauthenticated denial, authentication throttling, CSRF/cross-origin rejection, tenant RLS, company-scoped references and participant field projection.
- Concurrent edits, idempotency conflicts, transactional rollback of records/versions/audit/outbox and idempotent graph replay.
- One-use enrollment, withdrawal, late/current confirmations, advisor impersonation rejection and confirmation-to-export flow.
- Audio chunk corruption, retries, interrupted finalization, byte recovery, access denial, retention expiry and purge.
- Source retraction, dependent staleness, export invalidation, archive checksums and source-text exclusion.
- Roster duplicate/cycle quarantine, source independence, framework dependency gates and unconfigured-runtime denial.
- Engagement coverage, stable kickoff question IDs, work/handoff validation and outcome evidence requirements.
- Workflow DAG/route/join rules, version bindings, cases, deadlines, failed attempts and cancellation.
- Client-report approval, privacy projection, frozen content/hash, withdrawn or stale download denial and tenant isolation.
- Graph spacing, obstacle-free connection segments, focused record budgets, handoff branches, query bounds, confirmation states and safe handbook rendering.
- Exa fixed-endpoint adapter, bounded content snapshots, tenant/participant denial, durable command replay, source import idempotency, sanitized failures and persistent research request limits. Research tests use a simulated provider; no live Exa call was made.

CI additionally checks generated API contract drift, high-severity dependency audit, the synthetic advisor journey and encrypted backup/restore. Tests use isolated synthetic tenants. No predecessor-project results are included in these counts. The PDF toolchain is optional and is not a CI dependency.

## Synthetic advisor journey

`npm run training` exercises the real HTTP API and database in a separate fictional Northstar company. The retained local example has 36 records and revision 78: four people, three confirmed tasks, two reviewed handoffs, a duty, a reviewed workflow, one completed case, one case needing attention, measurements and an inconclusive outcome. It produces three approved client-report examples and two internal export packages. See `examples/training-manifest.json`.

The script enrolls fictional participants and submits their responses before advisor acceptance. This establishes the implemented local workflow; it does not verify a real person's identity or represent client authorization. The original Cobalt sample is separate. No email or external business action is sent.

## Performance and recovery

The bounded read benchmark created 1,000 synthetic records and issued 360 requests at concurrency eight. All completed without failure. Graph p95 was 130.5 ms, focused graph p95 121.3 ms and workspace p95 178.7 ms. These are loopback workstation measurements, not production capacity or availability promises. Raw measurement details and budgets are in `verification/performance-local.json`.

An encrypted snapshot was restored into a separate temporary database, with counts, record digest and research digest verified before removing that drill database. The measured restore/validation took 1,208 ms for 2,068 records, 2,389 versions, 3,215 audit events and 11 research runs; the original database remained unchanged. These include isolated synthetic test and benchmark tenants. Authenticated-metadata tampering was rejected before restoration. See `verification/restore-drill.json` and `verification/backup-tamper.json`. This does not prove off-host key custody, recovery cutover or production RPO/RTO.

## Browser and document checks

The real app at `http://localhost:4317` was checked in the Codex in-app Chromium browser. Release 0.2 checks included the Northstar workflow/case states, failure history and manual retry wording, focused semantic graph columns, labeled connections opening their exact handoff contracts, team-to-duty maps, a top-down recorded-manager chart, report listings, the actual approved client-report preview and searchable Help & training. Desktop and 390-pixel mobile views were inspected in graphite and light themes. Mobile Discovery and Deliverables had no horizontal page overflow; closed mobile navigation was absent from the accessibility tree. Business research correctly showed Exa unconfigured, collection disabled and zero requests used. Manual public-source capture selected Public research / Inferred / business context as intended.

Baseline overview checks at widths 360, 390, 768, 1024, 1280 and 1440 had no horizontal page overflow. Those earlier overview measurements are not a claim that every new screen was tested at every width. The graph canvas intentionally supports pan/zoom, and wide org charts scroll within their panel.

The portable HTML/Markdown handbook contains eight advisor guides and nine technical references, with nine generated example files and seven verification/contract JSON references. All 53 relative HTML links resolve within the pack. The 39-page PDF was checked with a PDF parser and representative rendered pages, including cover, contents, dense tables, manual pages and final page. Fonts are embedded. The PDF is not tagged for PDF/UA; the searchable HTML/manual is the alternative format.

Physical microphone capture, Safari/Firefox, assistive-technology use, full keyboard/text-zoom coverage, device interruption, enterprise authentication, production loads and live provider behavior remain unverified. Synthetic-byte audio tests do not establish microphone quality or media-decoder compatibility.

## Release interpretation

These checks establish the listed local behavior. They do not complete all 90 requirements, certify security/compliance, validate a constraint-diagnosis model, or prove governed customer-system execution. Read `RELEASE-STATUS.md`, `SECURITY.md` and the requirement traceability file before production acceptance.
