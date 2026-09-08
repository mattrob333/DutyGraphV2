# From the work map to a continuing engagement

The Company Work Map now has three visible views: **Work map**, **Work flows**, and **Tasks**. Select a stage, a person, and the work behind that person. The map retains its selection while a flow or task view is open. Tasks can be grouped by stage or by team. Relationships, Connected, Org & duties and Agents & controls are parked; their implementations and records remain intact. Agent governance retains its own section.

## The client payoff

**Client brief** replaces Deliverables in the sidebar. It assembles the current record into an advisor-facing working document:

- Agreed scope and recorded coverage, including unanswered people and work without stage assignments.
- Documentation gaps, conflicting accounts, and clearly labeled constraint hypotheses.
- Current cross-team findings the advisor selected for discussion. Dismissed, unreviewed or outdated findings are excluded.
- Existing decisions, accountable owners, review dates, recorded measurements and missing baselines.
- The next step into weekly review or Strategy.

This is a live view of stored information. Its counts do not prove a company has been fully audited, establish a constraint, or demonstrate savings. It does not run an additional AI call simply to load the page.

**Prepare client report** assembles an editable executive draft and selects supporting records. The advisor names its audience, refines the narrative, saves a draft and reviews the actual printable document. Approval binds the exact content and audience. The exported HTML/JSON/CSV package contains a fixed audit overview and selected detail; it excludes raw source passages, recordings, participant responses and contact addresses from generated material. Advisor-authored narrative still requires audience review.

The report includes the stage overview, findings/questions, commitments, measures and a continuing review agenda. It is self-contained and can be printed to PDF. Delivery remains through the agreed manual client channel; no client portal, automatic email delivery or client login is introduced here.

## Keep the value current

The initial report is a baseline for the engagement, not an automatically changing attachment. Subsequent accepted evidence and decisions update the live brief. Previously approved snapshots retain their contents. Preparing, approving and downloading a new report checks current source bindings; changed sources require a fresh report. A historical preview is labeled as an approved snapshot, not a fresh delivery clearance.

Weekly review starts with the recorded commitments, overdue review dates and missing baselines. The advisor can request existing weekly check-ins, record decisions and owners, update measurements, and review interventions/outcomes through the existing record forms. Nothing schedules new outreach or authorizes an operational action merely because a report is prepared.

A useful continuing engagement has a concrete scope: close agreed evidence gaps, review a small set of measures, test an agreed change and document its result. Agree the sponsor, participating teams, cadence, expected outputs and commercial terms with the client. The product supports this work; it does not create a paid retainer, subscription or promise of improvement.

## Continue into Strategy

Strategy shows the actual framework input contracts, available source inventory and upstream dependency state. A source count means material is available to assess; it does not mean the variable has been answered. The advisor can open the existing framework canvas, inspect exact sources, add missing material and choose whether to generate an analysis.

Work evidence is particularly useful for responsibilities, handoffs, constraints and operating capacity. Market structure, financial economics, customer demand and strategic choices still need their own evidence. Unknown values remain unknown. Frameworks keep their existing version and staleness rules; a changed source can make a downstream analysis need refresh.

## Technical boundaries

`GET /api/v1/companies/:companyId/audit-brief` is advisor-only and uses the existing tenant/company checks. `POST /audit-brief/prepare` checks both the company revision and a source fingerprint before reusing the existing report lifecycle. Analysis review changes are included in that fingerprint even when they do not increment the company revision. There is no new migration or provider dependency.

The summary is bounded and reports omissions. It is not an enterprise-scale retrieval or permissions design. Report packages remain immutable; weekly review and Strategy operate on the authoritative current workspace records.
