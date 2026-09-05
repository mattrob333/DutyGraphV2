# Release 0.3 - hosted advisor pilot

This release adds a Vercel/Neon hosted pilot, private sample workspaces, encrypted account key settings, OpenAI discovery drafts and Resend invitation sending to the human-led advisor journey and training materials. It does **not** complete the full 90-requirement production target in the supplied handoff. Provider adapters need credentials and live acceptance; enterprise authority and live execution remain unimplemented; independent production acceptance remains open.

## Delivered behavior

| Area | Implemented in the local application |
| --- | --- |
| Scope and kickoff | Engagement plan, sponsor/roster coverage, bounded executive questions, preserved request plan |
| Pre-meeting research | Optional Exa source collection, public query preview, bounded requests, durable replay prevention, source snapshots and unreviewed evidence import; no live key configured |
| People and organization | CSV preview/quarantine, reported managers, teams, explicit duty claims and task responsibilities |
| Evidence and capture | Immutable typed/audio originals, private local enrollment, resumable uploads, review/retraction and dependent staleness |
| Work | Versioned tasks, unresolved proposals, exact owner/performer confirmation, conflict handling, duties and handoff contracts |
| Graph | Focused semantic columns, labeled routes, actual handoff workflow diagrams, team-to-duty maps, recorded-manager chart, register, bounded API and repair |
| Workflows | Reviewed acyclic definitions, pinned dependencies, manual cases, selected routes, all/any joins, deadlines, failures, retries and history |
| Strategy | Human-authored framework DAG, testable hypotheses, measurements, preserved intervention predictions and reviewed outcomes |
| Weekly review | Evidence/work exceptions, cases needing attention, owner/action/due-date commitments |
| Client delivery | Frozen executive/weekly/audit reports, explicit audience approval, current binding checks, printable HTML and checksummed ZIPs |
| Internal handoff | Workspace, confirmed-work and non-operative agent proposal packages with exclusions |
| Operations | Forced tenant RLS, serialized multi-record commands, immutable history, outbox, versioned migration ledger, encrypted backup and separate-database restore drill |
| Enablement | Searchable help, eight advisor guides, full manual, A-to-Z playbook, workshop/answers, actual synthetic examples, portable HTML/Markdown and PDF |

## Verified boundaries

The verification record distinguishes pure tests, real API/database tests, the synthetic advisor journey, browser checks, dependency audit, local performance and backup/restore. Passing these does not certify production security, diagnostic accuracy or customer-system execution. See VERIFICATION.md and docs/verification for exact evidence.

The original Cobalt sample remains unchanged by the training journey. Northstar is a separate synthetic company whose scripted local participant confirmations are clearly labeled training. No real customer approval, email, permission grant or business action was created.

## Remaining work before production

| Workstream | Concrete remaining acceptance |
| --- | --- |
| Identity and data access | Verified enrollment/recovery, SSO/MFA where required, company memberships, evidence ACLs, administrator lifecycle |
| Ingestion and analysis | Scanned private storage, document/transcript lineage, provider-backed jobs, reviewed changesets, budgets/cancellation and empirical evaluation |
| External research | Exa project credential and live acceptance, provider spend limits, research retention/cancellation and wider source evaluation; Firecrawl optional |
| Core production domains | Full operational-model compiler, authority baseline/control context, complete non-record API request/response contract |
| Customer authority and runtime | Effective-access/policy adapters, authenticated staged approvals, managed Signet keys, exact target action, revocation, idempotent side effects and reconciliation |
| Operations | Off-host key/backup custody, full recovery cutover, comprehensive deletion/hold, monitoring/SLOs, large-load and distributed-worker evaluation |
| Independent release assurance | Full accessibility/browser matrix, physical microphone tests, security review/penetration test, blind diagnostic evaluation and owner acceptance |
| Enterprise expansion | SSO/SCIM, deployment/isolation choices, permission-safe portfolio reporting and additional adapters |

Hosted Exa, OpenAI and Resend use Workspace settings. See guide/00-hosted-quickstart.md for the current provider workflow; the 0.2 delivery pack remains a historical local release. Neo4j is not connected. The app fails closed for live runtime preflight. INTEGRATIONS.md records implementation, credential needs and live acceptance boundaries.

## Requirement traceability

requirements-status.json maps all 90 supplied requirement IDs to implementation evidence and remaining work. Local subset means part of a requirement has working code. Open means the complete behavior is not implemented. No requirement is marked formally production-accepted by this local development run.

The source audit remains a bounded inspection of predecessor projects, not a claim that those repositories were fully executed or verified. The current source, lockfile and GitHub CI run identify this repository's release.
