# Work Map design decisions

Owner feedback and implementation through September 9, 2026. The current reference is the [website screenshot](../client/public/landing/assets/company-work-map.png), captured from the actual fictional Cobalt app. It supersedes old screenshots and Superdesign drafts.

## Meaning and hierarchy

- Company name is the main heading; Company Work Map is the small descriptor. Use a monogram until a validated company logo is available.
- **Left to right:** stages of a business stream. Name the area **Workstream**, with “How this business delivers value” and the operating type as secondary context.
- **Top to bottom:** business stages → people and duties → tasks and recorded task flows. Actual duty names/purposes matter more than counts alone.
- A stage is broader than a duty. A duty is an ongoing responsibility; a task is specific work. A workflow may cross several duties, teams and stages. Do not force these into a false strict containment tree.
- Stages are proposed from business context and evidence, not a universal fixed six-step truth. Keep primary and supporting streams usable, including custom stage counts.
- Stage selection highlights linked people. The org lines show reporting relationships; they are not work handoffs. Task flows carry the handoffs.
- The three tabs remain **Work map / Work flows / Tasks**. Parked relationship, connected, org and control implementations are retained but not promoted back into the map.

## Appearance

The owner liked the neutral layered version and explicitly rejected the intermediate blue-filled ribbon. Do not restore blue-on-blue or green-tinted panels.

Dark workstream: recessed near-black `#1b1c1e`, lighter charcoal cards `#323335`, hover `#393a3c`, selected `#3d3e40`. A single selected border has a quiet steel tint `#9eacb8`. Small external card shadows create depth. No bright inset card edge, doubled border or selected top stripe. Light mode uses white cards on warm gray.

Retain the org canvas's subtle dots. The design-review agent advised against another dot texture on the ribbon; tonal contrast does the work. Workflow diagrams keep their existing Human / AI / human-review colors and handoff semantics. Amber gaps are meaningful status, not decoration.

Keep the header and ribbon compact so the full chart fits on a normal desktop. Actual duty detail belongs in the side panel, not in enlarged chart cards. Assignment maintenance sits after task flows. On mobile, preserve access and full-size inspection without horizontal page overflow.

## Regressions to guard against

- `OrgChartCanvas.tsx`: neutral nodes explicitly carry their 200×150 geometry. Controlled updates previously cleared React Flow measurements and hid all nodes. One bounds-based fit helper handles initial/resize/Fit team; do not reintroduce competing automatic fits.
- `StageHelp.tsx`: popovers must not change hover hit areas or clip inside the stage scroller. Check pointer stability, keyboard focus and neighboring-stage selection.
- Stage/person context survives trips to flows/tasks. Counts and duty lists must describe the same selection.
- `server/work-gaps.ts`: records and reply jobs are read in one SQL snapshot so complete processing cannot display older gaps in the same response.

## File map

`client/src/App.tsx` (company identity/navigation), `Graph.tsx` (three views/context), `StageWorkMap.tsx` (stage/person/duty path), `stage-work-map.css` (surfaces/layout), `OrgChartCanvas.tsx` and `org-chart-focus.css` (reporting chart), `StageHelp.tsx` / `stage-help.css` (explanations), `shared/stage-work-map.ts` and `stage-provenance.ts` (work membership and source context).

The optional Superdesign project is `2818b97b-15a2-447b-ba01-1ecad0826726`, map draft `6dac69e1-23db-4faf-a980-a1688fee1eca` v6. That draft predates the final neutral-depth correction. Local `.superdesign` fingerprints/briefs are stale historical tool state, not authoritative product context or a prerequisite for laptop development.
