# Cross-team discovery analysis

Implemented September 7, 2026. Open Discovery → Review task cards → Review the work across the team.

## What this adds

The real advisor workflow can compare company work records rather than relying on prepared demo findings. Deterministic checks identify missing active owners/performers, existing conflict flags, missing/unaccepted supporting evidence, and handoffs referencing inactive or absent tasks.

Optional AI analysis produces hypotheses about ownership, handoffs, conflicting task accounts, bounded AI candidates, and measurement questions. Each finding contains exact source excerpts, a next action, a validation question, an investigation/delegation boundary, and human review.

The advisor can mark a finding for client discussion or dismiss it with a reason. This persists in the job result and audit history. It does not edit task cards, settle company authority, or issue agents.

## Context contract

Sources are active people, tasks, duties, handoffs, workflows, engagements, accepted evidence, and recorded work requests. Field allowlists omit person email fields, invitation links, raw response records and audio. Accepted evidence text can still contain personal information; this is not a redaction/DLP service.

The snapshot includes source ID, kind, title, state, version, content hash, and the selected text. Requests contribute completion coverage, not their private links or email bodies. Coverage is the number of recorded work requests returned, not a claim that the entire company participated.

The review deliberately does not combine live public research or all framework artifacts yet. Its first job is to compare work descriptions. Future context sources need explicit provenance, freshness and scope rules.

Current bounds: at most 1,000 company records inspected, 600 included sources, and 240,000 serialized source characters. Exceeding scope fails before a provider call; the app does not silently analyze a truncated subset.

## Execution and resilience

Uses the existing tenant-scoped `provider_jobs` ledger; no database migration is required.

1. GET context/checks and fingerprint.
2. POST with consent, the displayed fingerprint and Idempotency-Key.
3. Within the command transaction: verify scope/freshness, block overlapping work, reuse a completed identical snapshot, enforce a rolling 12-attempt/account/day cap, reserve a job and audit receipt.
4. Call the configured OpenAI provider outside the transaction.
5. Validate the structured result and exact source citations.
6. Persist complete, failed or unknown outcome without mutating authoritative records.

The same command key does not repeat a provider call. A new command for an identical completed context reuses the saved analysis. Failures and uncertain attempts count toward the cap. The cap bounds attempts, not dollar spend.

The model request uses the account model/reasoning configuration, store=false, a 100-second abort signal, strict schema, no redirects, and bounded response reading. No automatic retry is made. These are request-driven jobs with durable attempt history, **not a background resumable queue**. After five minutes an abandoned running attempt becomes unknown when the review is read or another attempt is reserved. Late results cannot revive an expired attempt.

## Output gates

- Strict output schema, at most 20 distinct findings.
- Every citation must reference the supplied company snapshot and contain an exact excerpt.
- A possible cross-task conflict must cite at least two distinct task records.
- AI candidates must cite a task with an active linked accountable person and must exclude prohibited work.
- Prompts require hypotheses, limited confidence, narrow scope and a human review boundary.

Exact citation validation checks that the text exists. It does not prove the observation logically follows from the text. Prompt-injection instructions are treated as untrusted source data, but model behavior still needs adversarial and real-account evaluation.

## Review and history

Source changes produce a different context fingerprint. Previous results remain readable with a stale warning; new advisor decisions against stale results are rejected. Review writes also require the expected review version, preventing one advisor from silently overwriting another.

History shows the latest 20 attempts. A source-snapshot endpoint resolves exact run IDs within the authenticated company. Model output remains unchanged when advisor review metadata is updated; audit events retain the decision trail.

## API

All routes are advisor-only under `/api/v1/companies/:companyId/team-analysis`, with the existing authentication, origin, CSRF and tenant boundaries.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | / | Current checks, coverage, fingerprint, configuration and history |
| POST | / | Reserve/run or reuse analysis; body consent=true, fingerprint |
| GET | /:runId/sources | Inspect saved source snapshots |
| POST | /:runId/review | findingId, decision=discuss/dismissed, note, expectedReviewVersion |

See `shared/team-analysis.ts`, `server/team-analysis.ts`, `client/src/TeamAnalysis.tsx` and the two team-analysis test files.

## Acceptance remaining

No paid provider run or real-client quality acceptance was performed during implementation. Regression tests use injected providers with a real local PostgreSQL API. Browser checks use fictional API fixtures.

Next: evaluate representative accounts for useful versus false findings, measure advisor correction effort, test larger-company scope needs, integrate selected findings into audience-reviewed client reports, and decide whether sustained workloads require a background queue.

