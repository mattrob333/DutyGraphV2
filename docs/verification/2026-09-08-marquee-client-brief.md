# Focused Work Map and living client brief — September 8, 2026

## Scope

Three visible Company Work Map views, Tasks consolidation and team grouping, live audit aggregation, source-bound executive report preparation, printable audit overview, weekly commitments/observations and Strategy input readiness. Legacy graph components remain in source. GA4, Search Console and the full real hosted audit walkthrough were explicitly deferred.

## Local verification

- Production build and TypeScript pass. Existing large-bundle advisory remains; the main bundle is approximately 1.09 MB before compression.
- All **317** unit/database/API tests pass, zero failures/skips. The new cases cover tenant/participant rejection, coverage truth, analysis review/currentness, immutable report bindings, inactive tasks, documentation-only execution fields, framework dependencies, observation ordering and escaped report content.
- API contracts regenerated: **105** implemented method/path declarations, including both audit-brief routes.
- Dependency audit: zero reported vulnerabilities.
- Synthetic training API journey passes and regenerates five example packages.
- Encrypted local backup and isolated restore pass; record/version/event/source digests match and the original database remains unchanged. This does not establish production recovery acceptance.

## Browser verification

The server runs locally with fictional people and injected provider adapters. No real emails or paid model calls were made.

- **16 Work Map checks**: exactly three visible views; stage/person context retained; actual stage-to-flow drilldown; Tasks search/status and team/stage grouping; unassigned work; stable hover; light/dark themes. The chart fits at 1440×900 and 1920×1080, with no page-width overflow at those sizes or 390×844.
- **14 report-journey checks**: live counts match API data; stage overview; clearly labeled baselines; responsive light/dark brief; prefilled executive report; saved draft; printable snapshot; approval and actual ZIP download; frozen data and contact exclusions; weekly and Strategy continuation; no page errors.
- **5 continuing-review checks**: a recorded observation appears separately from baseline/target, an active commitment appears in both the live brief and weekly agenda, completing it removes it from the next agenda, and the observation remains recorded.
- **12 Strategy refresh checks**: exactly one readiness panel across repeated page loads/focus refreshes. This reproduces and verifies the fix for duplicate sibling keys. Additional checks follow framework requirements, prerequisites, the existing canvas and a Cobalt source record; mobile has no horizontal overflow. No generation action was used.
- The approved-symbol printable report was visually inspected and rendered to PDF. Main live brief, Work Map, Tasks, light/dark and mobile captures were inspected.

Task-local evidence is under ignored `work/`: `check-workmap-consolidation.json`, `check-client-brief.json`, `check-living-review.json`, Strategy browser results, build/test/audit/training logs, encrypted recovery results and screenshots. These contain fictional fixtures and are not production-client evidence.

## Publication and boundaries

Publication verification is recorded here after release. No schema migration is required; previous work-gap features still require migration 0012 and configured providers. The client report is manually delivered after audience review. The live brief is currently an advisor workspace view, not a separately authenticated client portal. Ongoing engagement scope and fees are agreed outside this implementation. Source availability does not establish that every strategy input is answered; real audit quality and client outcomes need their own acceptance.
