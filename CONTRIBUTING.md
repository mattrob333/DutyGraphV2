# Contributing

Read [START-HERE](START-HERE.md), the [README](README.md), [onboarding](docs/wiki/Developer-Onboarding.md), and [current state](docs/wiki/Current-State.md) before changing behavior. These practices apply to people and AI agents equally. No particular editor, AI vendor, or external review service is required.

## Working agreement

1. Inspect branch and git status. Preserve unrelated work; use focused branches and pull requests.
2. Reproduce the issue or define acceptance behavior before implementation.
3. Keep schemas, server authorization, UI and tests aligned. The client is not an authorization boundary.
4. Preserve tenant isolation, original evidence, exact content versions, and approval semantics.
5. Use fictional test data. Automated tests must not send real invitations or run paid providers.
6. Record what was tested and whether providers were mocked.
7. Update `README.md` and `DEVLOG.md` for every change in the same change set, including documentation-only work. Also update affected wiki/reference/help pages.

For application changes, run contracts, verification, and dependency audit against the dedicated local environment. Review generated API changes. Follow CI and the operations runbook for release checks. Documentation-only changes need link/diff review; public content or guide changes also need generator/build checks.

| Change | Appropriate checks |
| --- | --- |
| Internal Markdown or handoff context | Relative links/anchors, file paths, commands against package scripts, and diff review |
| User guide or a reference included in the portable handbook | Build/handbook generation and relevant rendered-output review |
| Public site or generated content | Build, SEO verification, relevant browser review |
| Application behavior | Contracts, full verification, dependency audit, and affected user flow |
| Schema, isolation, or recovery | Application checks plus clean-install replay and relevant recovery/denial tests |

CI is defined in [.github/workflows/verify.yml](.github/workflows/verify.yml). It also runs fictional training and an encrypted local restore drill. The optional browser script is documented in [scripts/browser/README.md](scripts/browser/README.md); it is not a blanket browser test of the application. If a check cannot run, name the missing prerequisite instead of claiming it passed.

Main is connected to hosting. Merging or pushing can publish immediately. Passing local tests is not hosted acceptance.

## Repository hygiene

Keep secrets, backups, private handoffs, customer transcripts, and local work artifacts out of commits. Do not move or reformat unrelated code. Add migrations rather than rewriting applied history; preserve runtime grants and RLS. Edit generated content at its source.

## Documentation ownership

The README is the concise current-state entry point. The development log is a newest-first dated record of each logical change: what changed, why, affected areas, validation actually performed, publication status when known, and remaining limitations or setup. Link detailed evidence instead of copying logs. Distinguish local checks, CI, deployment and real workflow acceptance. Do not claim a check was run merely because a prior release passed it. Related edits can share one log entry; unrelated changes need separate entries.

[Wiki](docs/wiki/Home.md) is project context; `docs/guide/` is user help; `docs/verification/` is dated evidence. Mark planned behavior explicitly. Do not turn a past synthetic test into a current production claim.

## Review and handoff

Use the [pull request template](.github/pull_request_template.md) to explain the problem, final behavior, validation, and remaining work. Seek review appropriate to the risk, especially for access, evidence semantics, migrations, and external effects. A named AI service is never a review prerequisite.

Record durable architectural/product decisions in [Decisions](docs/wiki/Decisions.md): date, status, context, decision, alternatives, consequences, and the PR/evidence link. Add a separate linked decision page when the explanation no longer fits there. Keep business priorities in [NEXT-STEPS](docs/NEXT-STEPS.md), not in scattered handoff prompts.

Before passing work on, identify the actual branch/commit, uncommitted edits, tests run, open questions, and the next scoped step. Update [START-HERE](START-HERE.md) only when that project context changes. The next contributor should not need your chat history.
