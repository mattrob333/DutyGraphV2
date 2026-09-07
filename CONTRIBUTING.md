# Contributing

Read the [README](README.md), [onboarding](docs/wiki/Developer-Onboarding.md), and [current state](docs/wiki/Current-State.md) before changing behavior.

## Working agreement

1. Inspect branch and git status. Preserve unrelated work; use focused branches and pull requests.
2. Reproduce the issue or define acceptance behavior before implementation.
3. Keep schemas, server authorization, UI and tests aligned. The client is not an authorization boundary.
4. Preserve tenant isolation, original evidence, exact content versions, and approval semantics.
5. Use fictional test data. Automated tests must not send real invitations or run paid providers.
6. Record what was tested and whether providers were mocked.
7. Update `README.md` and `DEVLOG.md` for every change in the same change set, including documentation-only work. Also update affected wiki/reference/help pages.

For application changes, run contracts, verification, and dependency audit against the dedicated local environment. Review generated API changes. Follow CI and the operations runbook for release checks. Documentation-only changes need link/diff review; public content or guide changes also need generator/build checks.

Main is connected to hosting. Merging or pushing can publish immediately. Passing local tests is not hosted acceptance.

## Repository hygiene

Keep secrets, backups, private handoffs, customer transcripts, and local work artifacts out of commits. Do not move or reformat unrelated code. Add migrations rather than rewriting applied history; preserve runtime grants and RLS. Edit generated content at its source.

## Documentation ownership

The README is the concise current-state entry point. The development log is a newest-first dated record of each logical change: what changed, why, affected areas, validation actually performed, publication status when known, and remaining limitations or setup. Link detailed evidence instead of copying logs. Distinguish local checks, CI, deployment and real workflow acceptance. Do not claim a check was run merely because a prior release passed it. Related edits can share one log entry; unrelated changes need separate entries.

[Wiki](docs/wiki/Home.md) is project context; `docs/guide/` is user help; `docs/verification/` is dated evidence. Mark planned behavior explicitly. Do not turn a past synthetic test into a current production claim.
