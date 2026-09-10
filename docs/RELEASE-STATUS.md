# Release status

Updated September 9, 2026. Product baseline: **acb7b79**, application version **0.3.0**. This handoff adds continuation documents and portable verification tooling; it does not change application behavior.

DutyGraph is a hosted **advisor pilot**. The full real-client audit remains an acceptance task. Start with [START-HERE](../START-HERE.md), [current state](wiki/Current-State.md) and [prioritized next steps](NEXT-STEPS.md).

## Current release

- Company Work Map: company identity, compact workstream, stage-linked people, actual duties and tasks, and recorded flows. Three primary views: Work map / Work flows / Tasks. Neutral layered surfaces replace the rejected blue fills.
- Website: current fictional Cobalt Work Map is the first of four full-size product screenshots. SEO content, sitemap and consent-gated measurement code exist; GA4/Search Console activation remains pending.
- Discovery/intake: public requests, provisioned advisor inbox, research and company snapshot, private kickoff/participant capture, AI-generated editable duties/tasks and validated person/stage links.
- Gap follow-up: documentation coverage and scoped private replies feed evidence-based updates. Actual email/provider delivery must be verified for the configured account.
- Client brief: living scope/coverage/findings/commitments/measurements, a source-frozen report draft, and connections to Weekly review and 16 Strategy framework contracts. Commercial retainers, billing and a client portal are not implemented by that connection.
- Earlier graph views are retained behind the simplified navigation. Workflows & cases remains available with a distinct sidebar icon; its placement is still an open product decision.

## Recorded release evidence

Product commit acb7b79 passed [CI 34299928369](https://github.com/mattrob333/DutyGraphV2/actions/runs/34299928369), deployed to dutygraph.com and passed 21 read-only live gallery checks. The implementation suite has 318 tests; the release workflow includes build, contract checks, synthetic training and recovery verification. Scoped Work Map browser evidence is in the [verification directory](verification/) and [development log](../DEVLOG.md).

A passing pipeline is not proof of real-client extraction accuracy, a complete hosted audit, physical-device usability, production restore acceptance or enterprise security readiness. No such claims are made here. See [the handoff artifact audit](handoff/2026-09-09-artifact-audit.md) for the separate desktop database backup limitation.

## Next acceptance work

Run one authorized hosted audit end to end; activate Google measurement/search; validate the client report and recurring review with real stakeholders; settle advisor access/identity; test incremental department scope and larger organizations. The [to-do list](NEXT-STEPS.md) defines completion evidence and separates ideas from implemented work.

The original [90-requirement matrix](requirements-status.json) preserves the supplied scope. It is historical acceptance context, not a complete current feature inventory or a declaration that every requirement has passed production acceptance.
