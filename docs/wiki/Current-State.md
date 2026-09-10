# Current state

The current implementation connects Company Work Map to a living **Client brief**, a frozen report draft, Weekly review and Strategy input review. The brief assembles saved scope, work coverage, gaps, current advisor-reviewed findings selected for discussion, commitments and measurements. Preparing a client report carries its source snapshot into the existing audience/content review and manual-download flow. The live workspace view is not a client portal or automatic delivery service; recurring engagement terms, client sharing and billing remain separate.

Company Work Map now has three primary views: **Work map**, **Work flows** and **Tasks**. Work map contains the stage/people/duty path, Work flows shows recorded handoffs, and Tasks provides cards, registers and supporting detail. The former relationship/org/control tabs are consolidated into this path and the existing record/governance tools. Strategy shows actual framework inputs and version-aware upstream dependencies beside audit coverage. Available source counts do not establish financial or market sufficiency, and framework runs remain user-started. These are implementation descriptions; deployment and acceptance evidence are recorded separately.

September 8: public demo requests flow into a provisioned operator inbox and create a company/contact for initial research. Research saves a proposed snapshot; Discovery automatically saves generated team duties, personal requests and task cards with validated AI-inferred links. Existing unassigned work can be linked by a separate AI action. Saved proposals remain editable and do not replace advisor or participant confirmation. See [demo requests](../demo-requests.md) and [the current Discovery guide](../guide/23-discovery-to-confirmed-work.md).

The default Company Work Map now connects saved business stages to highlighted people and scoped duties/tasks. Task cards uses the same stages, with explicit Unassigned work and no title/department inference. Cobalt has an authored fictional wholesale profile and 18 guided business tasks across six stages; safe repeat upgrades preserve edits and confirmations. Help and the training handbook describe the current path. These are implemented behaviors; real-client acceptance remains separate from synthetic checks.

Company research now includes a [reusable profile](../company-profiles.md): source-backed business details, official-site social links, separate advisor updates and an HTML deliverable. Latest completed profiles survive later failed jobs. Actual headcount/peer coverage depends on public evidence; logo extraction is deferred.

September 7 update: [pre-kickoff preparation](../kickoff-preparation.md) now connects the business brief and retained streams to a branded contact request, private CSV/attendee/leadership capture, advisor-reviewed org import and a two-hour agenda. Supporting research is optional. Same-title duties with changed descriptions require explicit advisor resolution; task/duty stage membership is now explicit and advisor-editable in the default Company Work Map.

Updated September 9, 2026; application source through `acb7b79`. See [the laptop handoff](../../START-HERE.md) and [current priorities](../NEXT-STEPS.md). “Implemented” means code exists, not that every provider is configured or the workflow has passed enterprise/customer acceptance.

| Area | Present implementation | Boundary |
| --- | --- | --- |
| Accounts | Password/session authentication, tenant/company isolation | Enterprise SSO/MFA and richer access administration remain open |
| Discovery | Research, kickoff/request flows, roster, evidence | Initial research is not verified company testimony |
| Participants | Private invitations, text/audio, transcription adapter, task draft/review/submission | Real delivery and physical-microphone acceptance are separate from fixture tests |
| Work records | Versioned tasks/evidence, confirmation, duties/handoffs/workflows/cases | Review does not automatically settle conflicting accounts |
| Cross-team analysis | Structural checks, bounded AI hypotheses, exact citations, durable attempts and advisor decisions | Implemented September 7; synthetic tests, real-client reasoning acceptance pending; see [reference](../team-analysis.md) |
| Company work map | Company-branded neutral stage ribbon, highlighted people, scoped duty purposes, tasks and recorded flows; three focused tabs | No inferred measured bottleneck or live wait-time claim |
| Organization | CSV/reporting relationships and interactive reporting chart | Imported relationships require validation |
| Relationship exploration | Earlier graph implementation retained; removed from the primary Work Map tabs | No blanket compliance conclusion |
| Neo4j | Optional encrypted Aura connection and derived projection/fallback | Account-specific configuration; PostgreSQL authoritative |
| Strategy | Sixteen framework contracts, provider runs, dependency/staleness handling | Draft artifacts; not automatic operational execution |
| Business types | 52 starting templates, variable visible stage counts, custom profiles, educational stage help and editable memberships | Internal functional categories do not require six visible stages. Proposed patterns and peer examples are not proof of this company's actual work |
| Governance | Requests, manifest-oriented model, fictional authority/provider scenarios | Real IAM provisioning and runtime enforcement not established |
| Review/deliverables | Live Client brief, source-frozen report draft, Weekly review and Strategy inputs | Real-client outcome quality still needs evaluation |
| Website | Marketing/intake, directory/articles, 191 validated public pages and four product screenshots with Work Map first; consent-gated measurement code | GA4 and Search Console activation remains pending; real commercial outcomes are unproven |
| Lead capture | Durable intake and operator notification integration | Email delivery depends on separate verified sender/configuration |
| Newsletter | Launch-list/intake foundations | Not an established recurring editorial delivery operation |

## What has been tested

The September 8 implementation reached 318 passing unit/database/API tests, production build/typecheck and 105-route contract checks. The latest product commit `acb7b79` passed [CI 34299928369](https://github.com/mattrob333/DutyGraphV2/actions/runs/34299928369) and deployed to dutygraph.com. The new gallery passed 21 read-only live checks. The neutral Work Map also has scoped responsive browser evidence. See the dated [verification records](../verification/) and [DEVLOG](../../DEVLOG.md).

These are recorded release results, not a claim that every check was rerun during the handoff. Paid provider behavior, real customers, physical devices, production recovery and external authority enforcement require separate acceptance. The full hosted client journey remains open. Local data-recovery limits for this handoff are recorded in the [artifact audit](../handoff/2026-09-09-artifact-audit.md).

## What must not be claimed

- Fully built enterprise product, SOC 2 certification, or independent security acceptance.
- Live vendor integrations based only on fictional connector data shapes.
- Automatically issued or enforced agent authority based on a draft manifest.
- Proven AI extraction accuracy or guaranteed two-day discovery.
- A signed distribution partnership or an established customer cohort.
- Continuous autonomous strategy or automatic role/task reassignment.

[Roadmap](Roadmap.md) identifies the next acceptance work. [Release status](../RELEASE-STATUS.md) provides the short repository-level summary.
