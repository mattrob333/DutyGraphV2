# Cross-team analysis verification — September 7, 2026

## Implemented scope

A real company analysis endpoint, bounded context/output contracts, structural checks, durable provider-attempt history, advisor finding decisions, and a Discovery review panel. No customer records or external providers were changed by tests.

## Evidence

- Build/type checking passed.
- Full unit/database/API suite: 183 tests passed.
- New coverage includes unauthorized/foreign-tenant/participant rejection, CSRF, source freshness, exact immutable snapshot retrieval, same-key replay, identical-context reuse, concurrent requests, mid-run changes, invalid citations, unknown network outcomes, abandoned-job expiry and attempt caps.
- Advisor review persistence, replay, optimistic concurrency, foreign-company access and stale-result rejection exercised against local PostgreSQL.
- Output checks reject invented sources/quotes, unsupported AI ownership, prohibited tasks and one-task conflict claims.
- Transport tests verify no-store, no redirects, incomplete/refusal handling and response-size bounds.
- Browser fixture checks: entry from overview responses, generation, decision persistence, source disclosure, stale decision disabling, 1440px and 390px layouts.

## Limits

Provider responses were synthetic. Browser API responses were mocked; database/API tests were separate. These tests are not evidence that the model accurately finds operational conflicts, that a live paid provider succeeds, or that a suggested AI task is authorized.

The existing build still reports a large application chunk warning. No new production migration is required. The job ledger is durable; execution is still request-driven, with uncertain outcomes retained for deliberate follow-up.

