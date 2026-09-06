# Full user manual

This manual describes Duty Graph 0.2, the local advisor pilot. It covers the advisor workspace, participant capture, record lifecycle, graph, strategy, workflow observation, reporting, and recovery. The generated record-field reference and operator runbooks accompany it in the portable handbook.

## 1. Accounts and access

**Advisor accounts** can manage companies in their own tenant, inspect the company’s records, issue participant requests, review evidence and work, and generate deliverables. An advisor is an application role; it does not establish authority over a client’s business systems.

**Participant accounts** can access their assigned company and requests. The participant view omits the general workspace, other participants’ accounts, raw advisor evidence, and administration. Task snapshots sent for confirmation include only the fields needed to review the described work.

Create your own workspace from the sign-in screen using your name, email, a password of at least ten characters, company name, scope, and desired outcome. Registration creates a separate tenant. The local pilot does not verify email ownership, provide SSO/MFA, or implement self-service password recovery. A private invitation is a bearer link and must be handled accordingly.

Sessions expire after twelve hours. On expiry, sign in again and refresh before retrying a save. The application stores session tokens in HttpOnly, SameSite cookies and requires a session-bound token on authenticated changes. Do not share a browser profile across real participants.

The sample entry is available only when the operator enables the demo. It opens a shared synthetic advisor account. Use it only for fictional information. The company selector switches among companies belonging to that account. New workspace creates another bounded company; it does not erase the current one.

## 2. Navigation and common controls

| Navigation item | Use it for |
| --- | --- |
| Overview | Scope, progress indicators, recent activity and next steps |
| Discovery | Requests, responses, sources, people and engagement kickoff |
| Company graph | Connected relationships, work flow, teams and reporting structure |
| Task cards | Detailed work descriptions, confirmation state, duties and handoffs |
| Workflows & cases | Reviewed task sequences and manual case progress |
| Strategy | Framework analyses, hypotheses, metrics, interventions and outcomes |
| Agent governance | Version-bound assistance proposals and explicit integration gaps |
| Weekly review | Current exceptions, decisions, commitments and follow-up |
| Deliverables | Audience-reviewed client reports and internal export packets |
| System & connections | Actual integration coverage, projection status and audit events |
| Workspace settings | Company scope, outcome and collection notice |
| Help & training | This manual, guided tutorial, workshop and examples |

Use the top search control or Ctrl/Cmd+K to find a record by title or content. The search runs over the current loaded company record. Use page-specific filters to narrow lists. Open a row to inspect details; edit controls appear only for directly editable kinds. Close a dialog with its close button or Escape. The modal keeps keyboard focus within it and returns focus when closed.

The theme button switches between graphite and light mode. The preference is saved in this browser. At narrower widths the sidebar becomes a menu. Graphs and wide reference tables may scroll within their panels; they should not force the whole page wider than the screen.

Changes are server-backed. A successful save means the API committed the record and associated audit/outbox data. A toast or error remains visible when a command fails. Refresh after a version conflict and compare current content before retrying; do not repeatedly submit an old form.

## 3. Engagement setup

Discovery’s Engagement & kickoff view records the scope of one review effort. Enter a meaningful title, sponsor, desired outcome, start/end dates, systems, locations, in-scope and out-of-scope activities, source policy, visibility expectation, retention expectation, cadence, timezone, and success criteria.

The sponsor may initially be unresolved. Add the person to the roster and revise the engagement when identified. Headcount is optional and distinct from the engagement roster. The end date must not precede the start date. Timezone uses an IANA name such as America/New_York.

Review the engagement with a rationale. The reviewed state records the advisor’s assessment. It does not establish a signed contract, consent from every participant, or enforce all policy fields. In particular, the engagement’s retention field records the agreement you intend to use; it does not reconfigure the current 30-day audio retention worker or create a legal hold. The operator must implement any different retention requirement before collection.

Coverage shows unique roster participants, unique people who returned or completed a request, confirmed tasks, and unresolved ownership/performance. Multiple requests to one person do not increase the unique respondent count. These measures describe this engagement, not company-wide representativeness.

The kickoff builder offers eight stable question topics. Choose four or five to keep the first conversation bounded. Request records preserve the selected question IDs and plan version. The operator should not treat these questions as a diagnostic verdict; they identify evidence and follow-up needs.

## 4. People and roster import

Each person has a name, email, role, team, optional manager, and optional external ID. Names and titles are descriptive. Manager fields drive the reporting chart. A person cannot report to themselves, and edits that introduce a reporting cycle are rejected.

Use **Import roster CSV** to preview before applying. The preview identifies missing values, invalid addresses, duplicates, unresolved managers, and cycles. Invalid rows are quarantined and shown with reasons. Correct the CSV or proceed only with the valid rows the preview identifies. Existing people are not silently merged by a matching display name.

The sample CSV shape is:

```csv
name,email,role,team,manager_email,external_id
Alex Morgan,alex@practice.invalid,Executive sponsor,Leadership,,TRAIN-ALEX
Jamie Park,jamie@practice.invalid,Fulfillment lead,Fulfillment,alex@practice.invalid,TRAIN-JAMIE
```

Review names and reporting lines after import. A duplicate email within a company is rejected by record creation. An external identifier is a reference value, not a login credential or proof of identity. The pilot has no automatic directory synchronization, alias reconciliation, or employee lifecycle integration.

## 5. Discovery requests

### Before the first meeting: Business research

Start at Discovery → Business research. Review the displayed public business name and optional official website. A website restricts results to that domain; leaving it blank permits broader public context. The exact query is visible before collection. Confirm that the name and website are public and within scope. With Exa configured by the operator, Collect public sources requests up to five pages. Without a key, add a source manually using type Public research.

Inspect each original link and its captured text before choosing Import as unreviewed evidence. Imported sources retain URL, retrieval time, content digest and research-run locator. Snapshots are limited to the first 6,000 characters per result. The import starts at Needs review; it does not confirm facts, tasks or authority. Research history is saved, and Refresh research retrieves the recorded result after an interrupted browser session. This browser also retains an unfinished request in session storage. Resume saved request reuses its original key, so a recorded provider call is not repeated. After closing the browser or clearing its storage, check saved research history before starting another request.

The application allows ten requests per tenant account across all companies in a rolling 24-hour window. Failed or uncertain requests count. Replaying the same command does not repeat the provider call, and there are no automatic retries. A request left unresolved by a server interruption is marked unknown after five minutes when history is refreshed. Consult the operator before deliberately starting another request if the provider outcome is uncertain.

The guided journey automatically carries research into a contact email and a leadership meeting guide. The contact reply and kickoff notes then supply the reviewed team roster and personalized interviews. Read [the five discovery steps](23-discovery-to-confirmed-work.md) for the current flow. Earlier manual source selection is no longer part of the main discovery journey.

### Request and response workflow

Requests are immutable assignments to one person. Choose Work account, Leadership, or Confirmation. Enter a title, questions, due date, notice, and—when confirming work—the exact reviewed tasks belonging to that person as owner or performer.

Save the draft, review it, then issue a private link. Link issuance changes the displayed state to Link ready. The underlying transport state is `sent`, but **no email has been sent**. The UI returns a manual URL. Give it to the intended person through the engagement’s approved channel. This build does not send reminders.

Invitation links expire after seven days and are single-use for enrollment. Reissuing an open request rotates its unused invitation. Used or expired links do not enroll another person. Once enrolled, a participant signs in to see their assigned requests; they do not need to reuse the original URL.

Request due dates are evaluated through 23:59:59 UTC on the selected date. A request past its due date cannot be submitted. The engagement timezone is descriptive for planning in this release; it does not alter this enforcement or schedule messages. Set dates accordingly and create a fresh request when an extension is required.

If the questions or selected task version change, create a new request. Withdraw an obsolete open request with the available action. Its unused invitations are revoked. The record and historical response remain available for review; withdrawal is not erasure.

## 6. Participant capture

The participant opens an invitation, reads the notice, acknowledges it, and creates a password or uses their existing password when applicable. The assigned page shows request questions and, for confirmation, the exact task snapshots.

A participant can type an account or record audio. Recording requires the browser’s microphone permission. Use record, pause/resume, stop, and playback to inspect the clip. Upload/resume sends chunks; the server validates the completed size and checksum before submission. If upload is interrupted, keep the local clip and resume from acknowledged chunks. Do not close the browser or clear storage until the response is safely submitted.

Typed and recording drafts may remain in local browser storage until submitted or explicitly discarded. A shared device therefore needs careful sign-out and draft handling. Server audio expires after 30 days under the current local policy; the worker removes stored chunks after expiry. Retained metadata and typed evidence have a different lifecycle. There is no comprehensive erasure or legal-hold workflow in this pilot.

Audio is stored as unscanned local database content. No transcript is automatically created. The advisor can listen to a recording, but must not cite an invented transcript or treat the upload checksum as malware scanning. Use typed responses for training environments without microphone access.

For confirmation requests, every assigned task needs a decision: Correct, Needs change, Not mine, or Unsure. Add an explanatory note for disagreement. Submit only after inspecting the exact text. Submission records the participant decision; advisor acceptance follows separately.

## 7. Responses and evidence

Returned responses appear in Discovery. Inspect the original text or available audio, the participant, request, and notice. Accepting a work/leadership response creates an accepted evidence record tied to that original submission. Accepting a confirmation response applies the recorded participant decisions to their exact task versions.

To add a source directly, record its title, type, content, person where relevant, source date, locator, origin, classification, and source bucket. Supported types include employee, leadership and customer accounts; policy documents; system configuration; execution records; public research; and other documents.

The four source buckets organize information: business, leadership, calls, and organization. Use the source’s actual function. A manager’s opinion about permissions is not equivalent to a current policy or application configuration.

A locator should let a reviewer find the supporting passage or observation. Good examples include “policy section 4.2, paragraph 3” or “training register, rows 21–40.” “Interview” alone is usually insufficient. Origins identify independent sources; copies of the same original must retain a common origin when used in diagnosis.

Original evidence is immutable. If it is wrong or superseded, create a corrected source and retract the old one with a reason. Retraction preserves history, marks dependent records stale, and blocks affected client downloads. Review dependencies and generate fresh artifacts. A previously downloaded copy cannot be recalled by the application; follow the engagement’s distribution procedure.

Acceptance means the source has been reviewed for use. Known labels and accepted state do not automatically prove an allegation, establish authority, or resolve a conflicting account. Preserve competing evidence until the question is resolved.

## 8. Task cards and confirmation

A task describes one bounded piece of work. Enter the title, duty label, accountable owner, performer, purpose, trigger, inputs, instructions, output, systems, described allowed actions, denied actions, human checkpoint, stop conditions, evidence, mode, classification, review date, and change reason.

An incomplete proposed task can be saved while owner or performer is unknown. Review requires both people, supporting accepted evidence, no unresolved conflict, and a current review date. Do not invent a person to satisfy the form. Use the unresolved state as a discovery question.

| Displayed state | Meaning | Next action |
| --- | --- | --- |
| Proposed | Definition has not completed advisor review | Resolve fields and evidence; review |
| Awaiting confirmation | Advisor reviewed the current content | Ask current owner and performer |
| Human confirmed | Both required roles have accepted correct responses for this exact version/hash | Use the current description within its scope |
| Conflict open | A conflicting claim or participant objection remains | Clarify, revise, and request fresh confirmation |
| Needs fresh review | Source, version, or review date is no longer current | Refresh supporting information and review again |

Content edits create immutable versions. Confirmation includes record ID, version, content hash, person, decision, and advisor acceptance. Old confirmations remain in history and do not silently transfer to new text. An advisor cannot click a task directly into Human confirmed on behalf of a real participant.

If one person is both owner and performer, one valid current response satisfies both roles. If either role changes, the revised card needs the new required people. The roles concern accountability and performance of described work; a task’s allowed-actions list is not an enforced permission policy.

Work modes include human only, AI assist, AI draft, AI recommend, execute with approval, bounded execution, and prohibited. These modes describe a proposal for the work. Selecting an execution mode does not connect or authorize a runtime. The governance screen will continue to report unconfigured execution.

## 9. Duties and handoffs

The free-text duty label on a task helps group work. An explicit duty record adds its own owner claim, purpose, scope, task membership, sources, review date, reason, version and review state. Create and inspect explicit duties at the bottom of Task cards. A duty review does not inherit task confirmations or confirm every responsibility held by a person.

A handoff connects two different tasks. Enter the condition for transfer, exact output mapping, required receiving input, acceptance check, exception owner, timeout, maximum retries, failure action, sources and rationale. Review it against current task versions. An edit to a linked task or handoff can make the downstream workflow stale.

Handoff timeout and retry fields describe the receiving contract. The manual case engine uses the workflow’s step timeout and maximum-attempt settings. It does not independently run a handoff timer or trigger an external notification. Set both consistently and make the distinction clear in the engagement.

## 10. Graph and organization views

Connected shows responsibility from left to right: People → Duties → Tasks. Explore a duty or task to see its recorded owner and up to three related tasks. A person selection opens one of their duties. To see a task outside this view, select it in Explore. The task card shows its performer, which can differ from the accountable owner. Missing owners and unmapped duties remain visible as gaps. Human, AI, and AI + human review labels describe the recorded work mode; AI modes are proposals, not proof that an agent is running. Select a card for its human checkpoint, evidence, and other connections. The register retains records outside the picture.

Work flow shows the actual handoffs between task cards. It can span several duties and people. A task can contain a human checkpoint in its instructions; DutyGraph does not invent separate substeps from those instructions. The initial zoom keeps cards readable. Pan horizontally to continue along a long workflow, or select Fit to see the whole path.

Work flow follows actual recorded task-to-task handoffs. Choose a workflow to scope its steps; alternate paths sit below the first path at the same stage. This position is a layout choice, not a claim about which branch is usual. Select a connection label to open its full condition and handoff contract. Dashed connections need review. No execution order is invented where handoffs are absent.

Org & duties opens on a team-to-duty map. Select a team to see work it owns or performs. Task groups are labeled separately from explicit duty records. A complete expandable list sits below the map. By team shows person cards; Reporting chart uses the recorded manager hierarchy. The register is the text alternative to visual navigation.

The default camera frames the focused picture. Fit shows the whole bounded graph and may make a large graph small; Readable restores the default scale. Use plus/minus, Ctrl/Cmd+scroll, and drag-to-pan. Expand gives the canvas more space. Select a card to highlight adjacent arrows and inspect relationship labels. Explore or Focus connections changes the central record; the register remains the broader index.

The API allows a maximum of 150 returned nodes and depth four; the UI uses depth two for focus. It caps the source scan at 5,000 records and reports truncation. A partial graph is not a complete company map. The application falls back to authoritative records while the derived projection catches up, and displays pending events. There is no free-form graph query execution.

Reporting chart uses recorded manager relationships. Missing relationships remain unlinked. Team membership, task accountability, and reporting hierarchy answer different questions. In the original Cobalt scenario, no manager data was supplied, so the chart displays an explanation and the team view remains useful.

## 11. Workflows and manual cases

A workflow selects reviewed tasks and handoffs, an owner, purpose, join policy, step timeout, maximum attempts, and reason. The definition rejects cycles, duplicate paths, isolated tasks in multi-step flows, missing references, and invalid handoff conditions. This release models acyclic work; bounded retries happen on a step, not through a loop in the graph.

Review the workflow after its task and handoff dependencies are current. Review requires reviewed task descriptions and reviewed handoffs; it does not require participant-confirmed tasks to observe a manual case. Check the underlying task state when participant confirmation matters to your engagement.

Start a case with a title and input reference. The case pins the workflow version/hash and stores a copy of the definition. Root tasks become Ready; dependent tasks remain Blocked. Each step keeps attempt count, deadline, route choice and observer notes.

| Case action | What it records |
| --- | --- |
| Complete step | An advisor’s observation that the human work completed, with the routes whose conditions were met |
| Record failure | A failed or incomplete step and the reason; the case needs attention |
| Retry | Another manual attempt within the workflow ceiling; resets that step’s deadline |
| Close case | Cancellation with a reason; preserves the event history |

When completing a step with outgoing handoffs, choose at least one valid route. Unselected routes are skipped. An All join waits until incoming branches resolve and at least one active selected route exists. An Any join can proceed when one active selected route arrives. Use these deliberately: an Any join does not assert that every predecessor completed.

Past-deadline ready steps display escalation and cannot be marked completed without a permitted retry. Deadlines are derived from persisted timestamps, so application restart does not restart the clock. There is no background email escalation. A workflow or pinned work change blocks further progress until the definition is reconciled; an obsolete case can be closed with a reason and a fresh case started.

All case actions record human observations. They do not call an order system, release a supplier, execute an agent, or verify that an external side effect occurred.

## 12. Strategy and measurement

The framework registry defines the available analyses, source buckets, and upstream dependencies. In this release, the advisor writes the analysis, selects accepted evidence, saves it, and reviews it. The application pins exact source and upstream versions. Missing prerequisites block completion; changed inputs make downstream analyses stale. No provider-generated answer is represented as a completed analysis.

A constraint hypothesis records the pressure in one flow, a competing explanation, a global-throughput counterfactual, a discriminating test, supporting and disconfirming evidence, an owner, and a throughput unit. Record a test result before requesting diagnosis review. Readiness requires two independent accepted origins, a tested alternative, a discriminator result, and a measured baseline owned by the named owner. These are structural checks; the advisor must still judge test quality and causal strength.

The UI’s Reviewed diagnosis represents human review. The internal state name `signed_constraint` is not a managed cryptographic signature, permission grant, or proof of causation. Continue collecting disconfirming observations.

A metric defines the question, formula, unit, population, source, owner, baseline, target, observation window, missing-data reason, and guardrail. Unknown baseline is null with a reason, not zero. Record observations with a numeric value, timestamp and source locator. Observations are appended in new content versions.

An intervention links one candidate, owner and metric to a proposed change, prediction, stop conditions, and review date. Preserve the prediction before observing results. An outcome record freezes the intervention prediction and current measurement snapshot, then adds supported/falsified/inconclusive, window, coverage, confounders, interpretation, next action and sources.

Supported or falsified conclusions require observations. Inconclusive is appropriate when coverage or attribution is insufficient. Reviewing a falsified outcome returns the linked candidate to review-required state. The application does not rewrite the original prediction to match a result.

## 13. Agent governance

Create an agent proposal for named tasks under one accountable human. Tasks must share the selected owner. The proposal pins exact task versions and starts as Draft with empty requested, approved, provisioned and observed scope, and no runtime deployment.

Inspect the gap between the work description and actual customer authority. A title, reviewed task, org chart, application administrator account, or approved report does not supply business permission. Runtime preflight fails closed while identity, policy sources, signing and a tested target adapter are absent.

An agent package is a review artifact containing task instructions, constraints, exclusions, setup requirements and hashes. It does not contain usable grants or credentials, and cannot deploy an agent from this UI. Use the technical integration plan to scope a separately accepted connection.

## 14. Weekly review

Use the derived agenda to inspect returned responses, stale/conflicting tasks, missing baselines and manual cases needing attention. Check the broader record even when the exception list is empty: no recorded exception is not proof that every source or observation is current.

Create a decision/commitment with title, owner, decision, next action and due date. Open it later to mark completion after checking the result. Meeting decisions create follow-up work. They do not issue permission grants or send tasks to an external project-management system.

Bring the previous prediction, new observations, changed sources, open cases, and last commitments to each review. Write what changed, why the interpretation changed, and the next test. Generate the weekly client report after that review.

## 15. Client reports and internal exports

Client reports are Executive, Weekly or Audit packets. Enter the title, explicit audience, purpose, summary, decisions, next steps, limitations and selected records. Creation freezes the current contents and bindings in a Draft report. Draft preview is available for review; delivery download is blocked until approval.

Open the preview and check every selected record, state, date, statement, audience and limitation. Record an approval rationale for the exact version/hash. The server checks current bindings before approval and again before download. If a selected record or evidence changes, create and review a fresh report. Withdraw approval if the report should no longer be distributed.

An approved download is a ZIP containing a printable HTML report, structured JSON, CSV register, read-me and SHA-256 file checksums. HTML escapes source text and CSV protects against formula prefixes. This does not excuse review of free-text content for private or inappropriate material.

The audit report includes up to the latest 500 application events for the selected company. It does not include complete external execution logs, independently signed ledger checkpoints or provisioning receipts. Its explicit coverage statement must remain with the report.

Internal workspace snapshots include described tasks and their current states. Confirmed-work packets include only qualifying current confirmed tasks and explain exclusions. Agent packages include the selected proposal and its work bindings. These internal packets have different review and staleness behavior: they are historical frozen exports, not audience-approved client reports. Source retraction blocks their download; routine later task edits do not retroactively change their frozen contents. Generate a fresh packet when current work is needed.

No report action emails or publishes a packet. Download and use the approved delivery channel yourself. Log recipient, version, date, and distribution decision in the engagement’s agreed system. Downloaded files cannot be remotely revoked.

## 16. System status, retention and recovery

System & connections reports the local database, derived graph, audio storage, and unconfigured integrations. The projection can be repaired from authoritative records. Rebuilding it does not replay business actions. The operator uses the migration and encrypted backup tools described in OPERATIONS.

Typed content, record history and audit metadata persist until an operator executes a separately designed retention/deletion process. Raw audio is access-expired and purged by the local worker. The pilot does not implement comprehensive deletion, legal hold, customer-managed keys, or production object storage. Do not assume the displayed engagement retention statement changes these mechanisms.

If the application is unavailable, preserve local unsent drafts and ask the operator to inspect the server/database. Do not reset Docker volumes or delete the environment file as a troubleshooting shortcut. Recovery uses an authenticated encrypted backup and a separately retained encryption key.

## 17. Common recovery paths

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Save says version conflict | Someone changed the record or company revision | Refresh, compare, and save against the current version |
| Task cannot be reviewed | Missing owner, performer, accepted source, date or unresolved conflict | Open the task and resolve the named gap |
| Task stays awaiting confirmation | One required role, acceptance, version or hash does not match | Inspect requests and confirmation history; issue a current request |
| Invitation no longer works | Used, expired, rotated or withdrawn link | Sign in if enrolled; otherwise ask advisor for a replacement |
| Request expired | Due date passed in UTC | Advisor creates a fresh bounded request |
| Recording cannot start | Permission/device/browser issue | Check microphone permission or use a typed response |
| Clip upload interrupted | Connection or server interruption | Keep the draft; use Upload / resume |
| Framework is blocked | Upstream analysis or accepted sources missing | Complete and review prerequisites |
| Report cannot download | Draft, withdrawn or stale bindings | Review the exact draft or generate a fresh packet |
| Case cannot advance | Wrong step, expired deadline, retry ceiling, or changed workflow | Inspect the reason; resolve the condition or close and restart |
| Org chart is empty | No manager relationships recorded | Use By team or add verified roster relationships |
| Graph is partial | Bounded query or scan limit | Focus a smaller neighborhood and inspect the register |
| Runtime is blocked | No verified integrations | Continue work review; follow the separate integration plan |

When reporting a defect, include the page, record title and ID, expected result, actual result, timestamp, browser, and visible error code. Avoid attaching raw customer evidence, credentials, invitation URLs or backup keys to a public issue.
