# Evidence and work follow-ups - September 8, 2026

## Local verification

- 300 automated tests passed, with zero failures or skips.
- Production build and TypeScript checks passed. The existing large-bundle advisory remains.
- API contract generation inventories 103 method/path declarations. New gap and private-response routes are included.
- Full dependency audit: zero vulnerabilities.
- Synthetic advisor training and all five export packages passed; Help and the portable handbook were regenerated.
- Encrypted local backup restored into an isolated drill database with matching record, version, audit and research fingerprints. Original database unchanged. This does not measure hosted recovery.

The actual app at 127.0.0.1:4352 used fictional people and injected email/AI providers. Browser checks verified a three-question preview, one simulated email, a private link in a fresh browser without login/email/password fields, typed submission, automatic proposed task/flow updates, a cleared gap warning, retained history after reload and direct access to the original reply. Voice controls remain available through the existing transcription route; no physical microphone or paid transcription was used.

Cobalt sample checks verified three visible questions in the no-send response preview. All 12 org-chart nodes fit at 1366x768, 1440x900, 1920x1080 and 3429x1264, with the desktop chart panel above the fold. The 390x844 mobile view has no horizontal page overflow. All six stage selections preserve the camera; selection uses a single 1px border. Hover movement, keyboard selection, search, scoped task detail, fit, expanded scrolling and light/dark themes passed. Browser page errors: zero.

## Backend boundaries exercised

Tests cover sample/tenant isolation, exact recipient changes, version/profile changes, delayed configuration, cooldown from actual send attempts, expired requests, pending interviews, pause/resume, concurrent requests, fair background sweeps, poison-company isolation and uncertain sends without retries. Reply tests exercise saved source quotes, respondent/record bounds, newer/manual/reviewed work, documentation-only flow execution blocks and automatic source-backed stage links. Tests do not prove semantic accuracy for every model response.

Stage provenance tests separate company evidence from peer examples, reject unknown sources or unmatched passages, validate domains, preserve custom stages and support legacy drafts. No claim of peer-company success or client-specific practice is derived merely from a template or comparison.

## Hosted release

Implementation `e4aedfb` passed [CI 34237031178](https://github.com/mattrob333/DutyGraphV2/actions/runs/34237031178), including synthetic training and encrypted restore. Hosted migration 0012 applied successfully; runtime tenant RLS remains forced. Vercel deployment `dpl_29okn2JzKn8Bn4sNQPKbWnsBa2dd` is READY and aliased to dutygraph.com.

Hosted `/login` and `/api/health` return 200. The app serves `/assets/index-VSepu8m9.css` and `/assets/index-CZDc1E74.js`; CSS matches the local build. JavaScript contains the gap actions, saved-reply history, short voice form and stage evidence help. Anonymous access to the gap and maintenance routes returns 401. These are read-only hosted checks; authenticated customer interactions were exercised locally with fictional records.

Migration 0012 adds durable worker cursors and unique reply/outreach indexes. Real inbox delivery, research quality and customer acceptance remain separate from local injected-provider verification. No real emails or paid provider calls were used in these checks.
