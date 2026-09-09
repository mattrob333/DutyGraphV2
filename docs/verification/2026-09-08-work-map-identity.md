# Company identity and work hierarchy — September 8, 2026

## Scope

Company name/monogram, Workstream context, People & duties, actual duty summaries/purposes, task-flow ordering and expanded identity. The three existing views remain; workflows are not reclassified as children of a single duty. No server contract, data migration, provider call or logo scraping is added.

## Verification

Independent designer review used the actual dark/light desktop and mobile app, not only source inspection. Repeated selection exposed an existing controlled-node measurement race in React Flow. Fixed-size neutral cards now carry their width/height through controlled updates, preventing dimension resets from hiding the chart. One fit helper computes the viewport from the actual fixed card bounds and current canvas size, also powering Fit team. Hidden canvases are not fitted. Competing library fitting is disabled for this stable view; other org views retain their existing behavior.

Local browser checks pass:

- 16 map/flow/task checks, including retained stage/person context, stage help, light/dark themes, and 1440×900 / 1920×1080 / 390×844 layouts with all 12 chart nodes visible and inside the canvas.
- 21 identity/hierarchy checks covering company switching, actual duty names/purposes, keyboard selection, expanded identity, flow ordering, supporting custom streams and long company names at 1366×768 / 1920×1080 / 390×844. Long-name/multi-stream data is a browser response fixture, not a saved client change.
- 24 stage/person transitions across four loads: node and sidebar counts agree; all 12 nodes remain visible.
- Independent five-load stress check: all 12 nodes visible and in bounds, correct selected counts and stable finite viewport. This failed before the chart geometry fix.

Task-local scripts, logs, screenshots and results are under ignored `work/`, including `check-workmap-identity.json`, `check-workmap-consolidation.json`, `workmap-stage-counts.json` and the designer's stress captures. Build/test/release results follow below. All browser data is fictional; provider adapters are injected and no real outreach is performed. These checks do not constitute a real hosted client audit.

## Regression and build results

`npm run verify` passes: production build/typecheck and 318 tests. Contracts cover 105 routes, and dependency audit reports zero vulnerabilities. The full suite revealed an existing read-consistency race: a worker could finish between separate work-record and reply-job reads. Both now come from one SQL snapshot. The added deterministic test completes a worker on another connection immediately after the work read, verifying both the earlier coherent snapshot and the subsequent completed state. All four work-gap API tests pass.

Logs: `work/workmap-identity-verify.log`, `work/workmap-identity-gap-tests.log`, `work/workmap-identity-contracts.log`, `work/workmap-identity-audit.json`. No migration or new provider configuration is required.
