# Guided discovery and framework release

Checked September 6, 2026.

## Delivered

- Discovery carries context through research, one contact request, a leadership meeting, reviewed team dossiers, personal interviews, task cards and exact-version personal checks. Advisors review generated content without choosing source checkboxes. The original AI output and edited review are both preserved.
- All sixteen strategy frameworks have specific system instructions, required inputs, structured output validation and readable canvases. Dependencies require every upstream input. Changed sources make downstream results stale. Historical analyses expose the exact source excerpt and upstream version used.
- Participant emails contain the actual questions and a private link. The personal page supports recording, typed answers, recoverable drafts, transcript correction and a submission receipt. Advisors can turn an audio-only response into reviewed evidence without changing the original.
- Weekly review prompts, client reports and task cards have clearer actions and hierarchy. New unmapped tasks remain visible. The marketing page uses the approved identity, flat colors, real sample screenshots and an accessible rotating gallery.
- The optional Aura adapter stores credentials encrypted, copies scoped graph metadata and uses PostgreSQL whenever the copy is unavailable or fails validation. Damaged copies can be rebuilt. Retention runs before bounded external maintenance.

## Evidence

- `npm run build`: passed; generated 24 handbook guides and references.
- `npm test`: 151 passed, zero failed or skipped.
- `npm audit --audit-level=high`: zero reported vulnerabilities.
- `npm run contracts`: 69 implemented method/path declarations inventoried.
- Database migrations `0005-neo4j-projection` and `0006-neo4j-maintenance` applied locally and to the hosted database.
- Framework reviewer checked all sixteen populated layouts, dependency sequence, stale state, exact historical sources and mobile views using synthetic provider responses.
- Discovery reviewer checked stage transitions, preserved advisor edits, automatic exact-version task checks, duplicate prevention and the unsaved-interview send guard. No real invitation was sent.
- Marketing reviewer checked responsive widths from 360 to 1920 pixels, gallery controls, reduced motion and destination links.

## Live Aura acceptance

The user's Aura instance `a2d3a8fb` passed direct TLS authentication. Its downloaded credentials were parsed privately and saved for the actual advisor account through authorized operator setup using the application's encryption and audit helpers. The settings page and HTTP save/test routes were not used for this setup.

The production `/api/maintenance` operation copied the account's empty Tier 4 company, then Cobalt Industrial Supply. Cobalt's projection at 13:03:08 UTC on September 6 had revision 206, 71 `DGRecord` nodes, 147 `DG_LINK` relationships and one scoped `DGCompany`. Its PostgreSQL sync state was `current`, with the expected connection ID, revision and fingerprint. Record keys and relationship ordinals were unique.

The production `readGraph()` implementation, executed locally with the hosted runtime database, returned `engine: "Neo4j Aura"` and `neo4jCurrent: true`. A repeat rebuild through `projectCompanyToNeo4j()` at 13:03:26 UTC kept the same revision, counts and fingerprint (`16e3d1a23b4177173212ebce7d028a0d4405d36b7bf4fd12ec11a64db1c777e5`). The company write-lock counter advanced from one to two without duplicates. This repeat rebuild also ran locally against the hosted database and Aura.

These checks prove deployed maintenance can write the real Aura copy and the shared application reader can validate and use it. The browser was signed out; an authenticated production browser or graph-HTTP check was not performed for this Aura acceptance. No password is included in the report.

## Other external acceptance boundaries

The provider and email tests use synthetic responses. They do not prove actual inbox delivery, speech recognition quality, physical microphone behavior in each browser or live model output quality. Those checks need the configured accounts and representative business material. Agent proposals do not deploy autonomous workers, grant customer-system permissions or activate recurring business actions.

## Browser and hosted release checks

The fresh production bundle passed all twelve primary advisor sections at 1440-pixel desktop and 390-pixel mobile widths with zero JavaScript errors or page overflow. Additional clicks checked weekly update preparation, report search, the empty confirmed-packet gate, workflow selection, the populated reporting chart and task-mode filters. The mobile marketing gallery and FAQ also passed.

A separate synthetic participant enrolled through a private invitation, saw the correct questions and role, used recording/pause/resume/finish/playback controls, recovered a typed draft after reload and submitted it. The advisor received the exact response. The submitted request stayed closed after reload. Recording used Chromium's synthetic microphone; no physical microphone or real voice was captured.

Commit `c10d806c1dd13c7f10cfd939c07e25af45fcff88` reached Vercel READY in deployment `dpl_EACFE95UGyBmMqRYqmi4xG5wE9WD`. [GitHub CI run 34033729244](https://github.com/mattrob333/DutyGraphV2/actions/runs/34033729244) passed build/tests, contract regeneration, dependency audit, the synthetic advisor journey and encrypted backup recovery. Production reads returned HTTP 200 for Discovery, all sixteen framework statuses, Neo4j settings, workspace records and company graph. The production marketing page and its assets also returned HTTP 200. These release checks used the isolated QA account, before the actual advisor's Aura connection was configured, and sent no invitation or paid model call.

The final visual pass also corrected the report audience placeholder and aligned weekly question numbers. Both fixes are included in the verified deployment above.
