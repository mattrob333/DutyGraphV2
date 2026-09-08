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

The visual reference contains synthetic Cobalt data only. Hosted release status is recorded in the release follow-up; local browser results do not establish production acceptance of customer data or provider output.
