# Start here: what Duty Graph does

Duty Graph helps an advisor turn conversations and source material into a reviewable description of how a company works. The advisor connects evidence to people, tasks, handoffs, problems, measurements, and decisions. A client receives a report that states what was learned, what remains uncertain, and who owns the next action.

Release 0.3 is a hosted advisor pilot with PostgreSQL persistence. It supports a human-led engagement, password-free kickoff and work-response links, and manual workflow observation. External provider quality, enterprise identity, customer-system authority and execution acceptance remain separate concerns. The application will not perform business actions in customer systems.

## The problem it helps solve

People often describe the same process differently. A manager may say that Finance approves a supplier while Finance says it only checks bank details. Drawing an arrow between the two teams does not resolve that difference. The advisor needs to preserve both accounts, find the governing evidence, and ask the right people to confirm a precise description of their work.

Duty Graph keeps those distinctions visible. A source can be accepted into the record without proving every assertion in it. A task can be reviewed by an advisor without being confirmed by its owner and performer. A confirmed task can be proposed for assistance without granting an agent permission to execute it.

## The engagement in eight moves

1. **Prepare and bound the work.** Research public context, prepare a draft for the team to correct, and name the outcome, scope, sponsor, source policy and review cadence. Exa source collection is optional and requires operator configuration; the advisor writes the initial synthesis.
2. **Gather accounts.** Review the roster, nominate kickoff attendees and pilot participants, issue private links to selected recipients, and collect typed or recorded responses.
3. **Review evidence.** Check the original, its locator, its origin, and the limits of what it supports.
4. **Describe the work.** Write task cards, identify accountability and performance, define duties and receiving checks.
5. **Confirm and connect.** Ask the named people to review exact task versions; assign duties and tasks to saved business stages; use the Work Map to follow stage → person → duty → task → flow.
6. **Test the explanation.** Record a constraint hypothesis, competing explanation, metric, intervention, and outcome.
7. **Review progress.** Observe manual cases, resolve exceptions, and assign the next useful action.
8. **Deliver a reviewed record.** Freeze a client report, review its audience and contents, download it, and arrange delivery through your approved channel.

These moves may repeat. Discovery often reveals a missing owner or contradictory source. That is useful information to resolve, not a reason to fill in a convenient answer.

## The main records

| Record | The question it answers | Example |
| --- | --- | --- |
| Engagement | What are we here to understand and improve? | Standard order intake through release |
| Person | Who is in the engagement roster? | Jamie Park, fulfillment lead |
| Evidence | Where did this account or observation come from? | Order checklist, exhibit A, steps 1–3 |
| Task | What happens when a trigger occurs? | Check the incoming order |
| Duty | What continuing responsibility groups this work? | Prepare standard orders for fulfillment |
| Handoff | What must be true before the next task accepts work? | Complete intake checklist received by credit reviewer |
| Workflow | Which reviewed tasks and handoffs form the sequence? | Standard order review and release |
| Case | What happened to one instance of that workflow? | TRAIN-002 is missing a customer reference |
| Constraint hypothesis | What might limit the overall result? | Incomplete intake may create the longest wait |
| Metric | How will we observe the result? | Median hours from intake to release |
| Intervention | What change and prediction will we test? | Try a complete-intake checklist |
| Outcome review | How did observations compare with the prediction? | Inconclusive after one small practice cohort |
| Agent proposal | What assistance could be considered for specific work? | Draft a completeness checklist for human review |
| Client report | What should this named audience receive? | Executive findings and next actions |

## Three ways to inspect the same work

**Work map** starts with saved business streams and stages. Select a stage to highlight people whose recorded work belongs there, then inspect their duties and tasks. Reporting lines come from the roster. Stage links, responsibility and manager relationships describe different things; none grants approval.

**Work flows** shows recorded task order and handoff conditions. Choose a workflow and inspect an arrow to read what the next person needs. A nearby card or arrow layout is not evidence of an unrecorded process.

**Tasks** provides the detailed task cards, filters and supporting registers. Open a task or duty to inspect its evidence, human checkpoints, versions and related records. Agent proposals and controls have their own governance tools.

These three views replace the separate Connected, Org & duties and graph/control tabs. Use **Client brief** to move from detailed work into coverage, findings, commitments and a report for a named audience. The graph is an inspection tool; it does not create truth, authority or causation.

## Four distinctions to teach every participant

| Distinction | Practical meaning |
| --- | --- |
| Account and fact | A person’s statement is evidence that they reported something. Corroboration may still be needed. |
| Review and confirmation | The advisor reviews completeness. Named participants confirm their exact described work. |
| Work and permission | Describing an action does not authorize a person or an agent to take it. |
| Observation and cause | A better metric after a change does not, on its own, prove that the change caused it. |

The labels Known, Inferred, Assumed, and Missing help explain the advisor’s basis. Use Known for what the cited source directly establishes. Use Inferred when connecting observations. Use Assumed when an untested premise is necessary. Use Missing when the needed information has not been collected. These are review labels, not automated truth scores.

## What the client sees

A normal delivery is a readable executive or weekly report with scope, coverage, findings, decisions, next steps, limitations, and selected work records. It includes version and source identifiers so the advisor can trace it back to the workspace. The report ZIP also includes structured JSON, a CSV register, a read-me, and file checksums.

Raw interview text, recordings, participant credentials, invitation links, and person email addresses are excluded from client-report fields. Free-text findings are still written by the advisor, who must check them for unnecessary sensitive material before approval.

Internal workspace snapshots, confirmed-work packets, and agent proposals serve different audiences. They are implementation and review artifacts. The advisor should not send an internal package to a client simply because it downloaded successfully.

## How to learn the product

Start with Discovery from the Help & training page. Use the clearly labeled Cobalt guided example or the generated Northstar Parts training company to inspect synthetic examples. Use a separate blank training company for practice. Then complete the Training workbook and compare your reasoning with the Facilitator guide. The Full user manual is the reference for screens, fields, states, recovery steps, and limits.

For technical installation, backup, recovery, and release acceptance, use the repository’s OPERATIONS, ARCHITECTURE, SECURITY, and VERIFICATION documents. These operational checks remain distinct from an advisor’s review of the business record.
