# Current state

Company research now includes a [reusable profile](../company-profiles.md): source-backed business details, official-site social links, separate advisor updates and an HTML deliverable. Latest completed profiles survive later failed jobs. Actual headcount/peer coverage depends on public evidence; logo extraction is deferred.

September 7 update: [pre-kickoff preparation](../kickoff-preparation.md) now connects the business brief and retained streams to a branded contact request, private CSV/attendee/leadership capture, advisor-reviewed org import and a two-hour agenda. Supporting research is optional. Same-title duties with changed descriptions require explicit advisor resolution; typed stream membership on every work unit remains future work.

Baseline: September 7, 2026, application source through `97335fd`. “Implemented” means code exists, not that every provider is configured or the workflow has passed enterprise/customer acceptance.

| Area | Present implementation | Boundary |
| --- | --- | --- |
| Accounts | Password/session authentication, tenant/company isolation | Enterprise SSO/MFA and richer access administration remain open |
| Discovery | Research, kickoff/request flows, roster, evidence | Initial research is not verified company testimony |
| Participants | Private invitations, text/audio, transcription adapter, task draft/review/submission | Real delivery and physical-microphone acceptance are separate from fixture tests |
| Work records | Versioned tasks/evidence, confirmation, duties/handoffs/workflows/cases | Review does not automatically settle conflicting accounts |
| Cross-team analysis | Structural checks, bounded AI hypotheses, exact citations, durable attempts and advisor decisions | Implemented September 7; synthetic tests, real-client reasoning acceptance pending; see [reference](../team-analysis.md) |
| Company work map | Stable flow/task presentation and ownership/AI overlays | No inferred measured bottleneck or live wait-time claim |
| Organization | CSV/reporting relationships and interactive reporting chart | Imported relationships require validation |
| Relationship exploration | Focused connections and control-related scenarios | No blanket compliance conclusion |
| Neo4j | Optional encrypted Aura connection and derived projection/fallback | Account-specific configuration; PostgreSQL authoritative |
| Strategy | Sixteen framework contracts, provider runs, dependency/staleness handling | Draft artifacts; not automatic operational execution |
| Business types | 52 templates with a common six-function backbone and custom profiles | Templates do not automatically compile operational task chains |
| Governance | Requests, manifest-oriented model, fictional authority/provider scenarios | Real IAM provisioning and runtime enforcement not established |
| Review/deliverables | Review records and client reporting/export surfaces | Real-client outcome quality still needs evaluation |
| Website | Marketing, pilot/advisor/enterprise paths, directory, articles, help | Marketing ambitions must not be presented as proven outcomes |
| Lead capture | Durable intake and operator notification integration | Email delivery depends on separate verified sender/configuration |
| Newsletter | Launch-list/intake foundations | Not an established recurring editorial delivery operation |

## What has been tested

September 7 cross-team analysis release: build and all 183 tests passed, plus scoped desktop/mobile browser fixtures. See [dated evidence](../verification/2026-09-07-team-analysis.md). This supersedes the earlier test count below for the new release.

The preceding implementation work recorded 171 passing unit/database/API tests and scoped browser checks. These are historical verification results, not a fresh execution of those tests during this documentation-only pass. See [verification records](../verification/) and [verification procedure](../VERIFICATION.md).

The latest article release had scoped build and desktop/mobile browser checks. Paid provider behavior, real customers, physical devices, production recovery, and external authority enforcement require their own acceptance evidence.

## What must not be claimed

- Fully built enterprise product, SOC 2 certification, or independent security acceptance.
- Live vendor integrations based only on fictional connector data shapes.
- Automatically issued or enforced agent authority based on a draft manifest.
- Proven AI extraction accuracy or guaranteed two-day discovery.
- A signed distribution partnership or an established customer cohort.
- Continuous autonomous strategy or automatic role/task reassignment.

[Roadmap](Roadmap.md) identifies the next acceptance work. [Release status](../RELEASE-STATUS.md) provides the short repository-level summary.
