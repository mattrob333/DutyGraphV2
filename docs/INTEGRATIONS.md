# External integrations and credentials

Checked September 5, 2026. The application now includes an optional Exa search/content adapter in Discovery → Business research. It is disabled in the delivered local configuration and has been tested with a simulated provider, not a live account. The global search box still searches loaded company records. Model analysis, transcription and customer-system execution remain unconfigured or unimplemented.

## Public research recommendation

Start with Exa for public-source search and content retrieval. Exa's current Search API supports results and requested content, so a separate crawler is not automatically necessary. Add Firecrawl when an engagement needs broader site crawling or page-extraction behavior beyond that initial scope. Firecrawl also offers search; these products overlap and should not both be purchased by default.

Sources: [Exa Search](https://exa.ai/docs/reference/search), [Exa Contents](https://exa.ai/docs/reference/get-contents), [Firecrawl API overview](https://docs.firecrawl.dev/api-reference/v2-introduction).

Exa is implemented for bounded source collection. Firecrawl remains an optional future adapter. No live provider request or provider charge was incurred by the application during this build.

## Pre-meeting research flow

1. Open Business research. Enter the public business name and optional official website. The exact public query is shown; interview text and existing evidence are not sent.
2. With a website, the search is restricted to its domain. Without it, search covers broader public context. A run requests up to five results and page text from Exa's fixed HTTPS search endpoint.
3. Inspect the original URL and captured text. Import useful sources into the Evidence library as pending review, with URL, retrieval date, retained-content SHA-256 and provider-run lineage. The first 6,000 characters are retained per source; excerpts are marked.
4. Draft the initial picture and questions as an advisor. This release does not generate the business model with an LLM. At kickoff, have the team correct public claims and identify internal gaps. Keep corrections as new evidence rather than rewriting the original source.
5. Review sources, revise task descriptions and obtain exact-version owner/performer confirmations separately.

Set `EXA_API_KEY` in the ignored project configuration or secret store and `ENABLE_EXA_RESEARCH=true`, then restart the service. Both are required. Use a provider account spending limit: the application limits request count, not a guaranteed dollar amount. The cap is ten requests per tenant account across its companies in a rolling 24-hour window, including failed/ambiguous attempts.

Each request reserves a durable record before contacting Exa. Replaying its idempotency key does not call the provider again. There are no automatic retries. A process interruption can leave a run with an unknown provider outcome; refresh after five minutes marks the unresolved run accordingly. Check the provider account before deliberately starting another run. This is not a provider-side cancellation or exactly-once billing guarantee. Network timeout is 30 seconds and response size is bounded at 2 MB.

Research history retains up to twenty runs in the UI; the database retains earlier run metadata and snapshots. Automatic research-history deletion, background job cancellation, comprehensive source ACLs and production evaluation remain open. Tenant RLS and advisor-only routes protect the current local scope.

## Credential and service decisions

| Capability | Current state | Needed before connection |
| --- | --- | --- |
| Exa research search/content | Implemented; disabled; simulated-provider tests pass | Project API key, operator enablement, account spend limit and live acceptance |
| Firecrawl site extraction/crawl | Optional; not implemented or configured | Project API key if selected, URL scope, crawl/depth/cost bounds, live acceptance |
| Model-assisted analysis/extraction | Unconfigured | Secure project credential decision, processing policy, budgets, reviewed output and evaluation |
| Audio transcription | Unconfigured | Selected provider, media/retention policy, credential and lineage/recovery validation |
| Email invitation/reminders | Manual links only | Sender identity/domain, service credentials, consent/delivery/retry/reminder policy |
| Neo4j graph | Local PostgreSQL projection used | Service provisioning, scoped adapter, checkpoints/rebuild and performance acceptance |
| Meeting ingestion | No connection | Authorized account, meeting selection/visibility policy, webhook/replay and lineage validation |
| Enterprise identity/policy | No connection | Customer-specific identities, effective-access sources, membership and approval assurance |
| Signet/runtime/customer actions | Fail-closed unconfigured | Managed keys, legitimate authority, precise action/resource scope, conformance and reconciliation |

The application needs its own service credentials. A connector available to the development assistant does not grant the deployed app a reusable API key or commercial account. Put selected credentials in the project's ignored configuration or approved secret store, never source control or chat. Only the implemented Exa adapter responds to the documented key and enablement flag; adding other provider variables does not implement those services.

## Acceptance of a future research connection

Before marking a connection live, verify one authorized request against the actual provider account, retained URL/date/content lineage, bounded result and cost limits, source review state, retry/cancel behavior, redacted error logs and tenant visibility. Public website material remains untrusted evidence. It must not become application instructions or update confirmed work without review.

Decide whether queries can contain company names or confidential context. A public research search generally does not need private interview text. Site crawling should use an explicit public URL scope and must not expose local/private-network addresses or authentication material. These controls belong in the implementation and tests, not only in an operator note.

No customer permission or execution capability follows from search, scraping, analysis or task confirmation. Those remain separately accepted systems.
