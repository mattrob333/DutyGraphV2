# Next work — September 9, 2026

Use with [START-HERE](../START-HERE.md). These are remaining work and product decisions, not claims that all integrations are ready. The owner planned to return to Google activation and a full hosted audit walkthrough after the Work Map polish.

September 11 handoff: this priority sequence is preserved. See the [takeover assessment](handoff/2026-09-11-readiness-review.md) for engineering risks and [investment readiness](wiki/Investment-Readiness.md) for proposed commercial evidence gates. Neither document treats those recommendations as completed work.

## 1. Rehearse one complete hosted audit

- [ ] Choose an authorized small company or one department and define scope, people, advisor and desired client outcome.
- [ ] Submit the public request, verify the saved lead and authorized advisor inbox, and create its company/contact exactly once.
- [ ] Run real research; inspect citations, proposed business stages, peer examples and unknowns.
- [ ] Send an authorized kickoff invitation; verify delivery, private entry, expiry/replacement and retained context.
- [ ] Complete kickoff/roster, private team interviews and actual microphone/transcription checks.
- [ ] Inspect AI-produced duties, granular tasks, people and stage links. Measure omissions, inventions and manual correction effort.
- [ ] Exercise one genuine gap follow-up, answer by voice/text, and verify durable processing, evidence, dedupe and the resulting map.
- [ ] Review disagreements, prepare Client brief/report, inspect exact audience/content/source binding, and download the client output.
- [ ] Record a commitment and measurement in Weekly review; run an appropriate Strategy framework with adequate inputs.

Done means an advisor can explain the result to the client, every important claim traces to evidence, and remaining gaps are visible. Synthetic test success alone does not meet this acceptance. Real outreach and paid provider calls require the owner's authorization for that rehearsal.

## 2. Complete lead measurement and search activation

- [ ] Finish the owner's GA4 setup and Search Console verification. `content/measurement.json` currently has null IDs; consent/event code is already implemented.
- [ ] Verify consented collection, denied-consent behavior, form receipt and private-data exclusion on the hosted site.
- [ ] Submit/inspect the existing sitemap and useful generated pages. Programmatic SEO is built; actual indexing/ranking is not proven.
- [ ] Decide campaign-to-qualified-lead attribution separately. Current receipt events do not establish unique leads or UTM-to-revenue attribution.

References: [measurement](website-measurement.md), [programmatic SEO](programmatic-seo.md), [demo inbox](demo-requests.md). Do not rebuild the existing SEO pipeline simply because an old note says it was pending.

## 3. Validate the report-to-retainer experience

- [ ] Review a realistic final client readout for clarity: scope, coverage, evidence, priority problems, owners, decisions and next actions.
- [ ] Establish how the same live brief supports weekly reviews and Strategy. Preserve a frozen approved report alongside the changing workspace.
- [ ] Check required inputs for the 16 framework contracts. An audit will not automatically supply revenue, unit economics, customer or market evidence.
- [ ] Decide the retainer offer, cadence, advisor/client responsibilities and any client-facing access. Billing, client portal and automatic report delivery are not supplied by the current brief.

Reference: [living client brief](living-client-brief.md). Product code is present; customer usefulness and commercial terms still need validation.

## 4. Settle advisor access before expanding the team

- [ ] Define invitation, membership, company assignment, removal, MFA/SSO and operator-inbox permissions.
- [ ] Evaluate whether Clerk is the right migration or whether to extend the present auth. **Clerk is not installed as the application's identity system.**
- [ ] Preserve tenant/company isolation and separate operator access from ordinary advisor signup.

Current password/session auth works in code. Do not add a second disconnected login system based only on the earlier brainstorming question.

## 5. Prove scoped and growing-company use

- [ ] Map one department, add another later, and verify identity matching, retained evidence, scope boundaries and cross-team handoffs.
- [ ] Test meaningful workspace sizes and chart/filter performance. Cobalt's 12-person example is not evidence of Amazon-scale readiness.
- [ ] Design progressive scope navigation if larger pilots require it; avoid attempting an entire huge organization in a single flat chart.

## Product decisions still open

- **Workflows & cases:** the workflow list overlaps Company Work Map; cases track manual progress through reviewed workflow versions. Recommendation was to park the sidebar entry and keep case access near a workflow. It remains visible; no removal was authorized.
- **Reusable workflow suggestions:** potentially valuable as context-specific recommendations for an identified duty/gap. No cross-company library or recommender exists. Show fit, sources, required adaptations and human review; never present a template as a client's actual practice.
- **Company logos:** current monogram is deliberate fallback. Logo extraction/validation remains deferred.
- **Governance:** parked graph/control views should not return to the marquee page by default. Real external agent authorization/enforcement requires its own design and acceptance.

## Already completed — do not restart

Company identity and neutral Work Map polish; stable chart fit; stage hover help; three-tab map/flow/task consolidation; stage/person/duty links; source-aware stage proposals; gap-follow-up implementation; live client brief/report foundation; website Work Map screenshot. See [current state](wiki/Current-State.md) and dated [DEVLOG](../DEVLOG.md).
