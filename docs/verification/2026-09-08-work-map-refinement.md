# Work Map refinement — September 8, 2026

## Local verification

The actual application served at 127.0.0.1:4351 used a fictional advisor account and the local Cobalt sample. No real emails, research or AI providers were called.

| Viewport | Result |
| --- | --- |
| 1366 × 768 | All 12 people fit inside the chart; complete chart panel above the fold |
| 1440 × 900 | All 12 people fit; complete chart panel above the fold |
| 1920 × 1080 | All 12 people fit; complete chart panel above the fold |
| 3429 × 1264 | All 12 people fit; complete chart panel above the fold |
| 390 × 844 | No page-width overflow; stages scroll horizontally; details stack below chart |

All six stage selections preserved the chart transform and page scroll position. The selected stage has 1px top/bottom borders and no box shadow. Search and keyboard activation selected the correct person; Maya's scoped duty and stock-shortage task appeared. Node content fits its card; a separate long-name check kept the role, department and work counts visible. Hover remained open during repeated pointer movement. Escape dismissed help. Fit team, expanded scrolling and normal wheel scrolling over the chart passed. Light-theme panels and labels were visually checked. Browser page errors: zero.

These checks cover a 12-person sample, not every organization size or physical touch device. Larger organizations can use zoom, search and Expand. Existing graph views and record/assignment semantics are unchanged.

## Project checks

- 263 tests passed; zero failed or skipped.
- Production build and type checks passed.
- API contracts regenerated: 97 implemented method/path declarations; no contract diff.
- Dependency audit: zero vulnerabilities.
- Source diff check passed.

## Hosted release

Implementation `1f48b7b` passed [CI 34231128872](https://github.com/mattrob333/DutyGraphV2/actions/runs/34231128872), including the synthetic advisor journey and encrypted backup recovery. Vercel deployment `dpl_5BUeH4fn8P7Hcy5b1wrnbbhotkfr` is READY. The app at dutygraph.com serves `/assets/index-CMmITn7M.css` and `/assets/index-TnOx_ysl.js`, both HTTP 200. The CSS matches the verified local build byte-for-byte; new fit, scroll and help behavior is present in the JavaScript.

The visual reference contains synthetic Cobalt data only. Authenticated interactions were checked locally, not against the advisor's hosted company. These checks do not establish customer-data or provider-output acceptance.
