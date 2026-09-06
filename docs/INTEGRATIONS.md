# External integrations and credentials

Checked September 5, 2026. The application now includes an optional Exa search/content adapter in Discovery → Business research. It is disabled in the delivered local configuration and has been tested with a simulated provider, not a live account. The global search box still searches loaded company records. Release 0.3 adds OpenAI structured discovery drafts and Resend invitation sending through encrypted per-account key settings. OpenAI audio transcription is implemented with participant and advisor review. Customer-system execution remains unimplemented. See [Hosted quickstart](guide/00-hosted-quickstart.md).

## Public research recommendation

Start with Exa for public-source search and content retrieval. Exa's current Search API supports results and requested content, so a separate crawler is not automatically necessary. Add Firecrawl when an engagement needs broader site crawling or page-extraction behavior beyond that initial scope. Firecrawl also offers search; these products overlap and should not both be purchased by default.

Sources: [Exa Search](https://exa.ai/docs/reference/search), [Exa Contents](https://exa.ai/docs/reference/get-contents), [Firecrawl API overview](https://docs.firecrawl.dev/api-reference/v2-introduction).

Exa is implemented for bounded source collection. Firecrawl remains an optional future adapter. No live provider request or provider charge was incurred by the application during this build.

## Pre-meeting research flow

1. Open Discovery → Research & contact. Enter the public business name and optional official website. All four research areas start selected. Each public query is shown; interview text and existing evidence are not sent to Exa.
2. Company overview can be restricted to the official domain. Communities, competitors and industry feeds use the wider web. Each selected area uses one request for up to five results and page text from Exa's fixed HTTPS search endpoint.
3. Inspect the original URL and captured text in Collected sources. Research carries into meeting preparation automatically, without source checkboxes. Import a page separately if it should also appear in the Evidence library, with URL, retrieval date, retained-content hash and provider-run lineage.
4. Draft the preparation email to the point of contact. Use its reply to prepare the leadership agenda. Save reviewed meeting notes, review team dossiers, and create personal questions from each person's role and duties. Email sending is a separate action after saving the requests.
5. Returned interviews supply proposed task cards. Review these drafts, then obtain exact-version owner/performer confirmations. Preserve the original responses and source versions.

Hosted: save the Exa key in Workspace settings. Local-only fallback: set `EXA_API_KEY` and `ENABLE_EXA_RESEARCH=true` in ignored configuration, then restart. Use a provider account spending limit: the application limits request count, not a guaranteed dollar amount. The cap is ten requests per tenant account across its companies in a rolling 24-hour window, including failed/ambiguous attempts.

Each request reserves a durable record before contacting Exa. Replaying its idempotency key does not call the provider again. There are no automatic retries. A process interruption can leave a run with an unknown provider outcome; refresh after five minutes marks the unresolved run accordingly. Check the provider account before deliberately starting another run. This is not a provider-side cancellation or exactly-once billing guarantee. Network timeout is 30 seconds and response size is bounded at 2 MB.

Research history retains up to twenty runs in the UI; the database retains earlier run metadata and snapshots. Automatic research-history deletion, background job cancellation, comprehensive source ACLs and production evaluation remain open. Tenant RLS and advisor-only routes protect the current local scope.

## Credential and service decisions

| Capability | Current state | Needed before connection |
| --- | --- | --- |
| Exa research search/content | Implemented; per-account configuration; simulated-provider tests pass | Project API key, account spend limit and live acceptance |
| Firecrawl site extraction/crawl | Optional; not implemented or configured | Project API key if selected, URL scope, crawl/depth/cost bounds, live acceptance |
| Model-assisted discovery drafts | Implemented via OpenAI Responses API; simulated tests | Project key, sharing consent and live quality/usage acceptance |
| Sixteen framework analyses | Implemented via OpenAI Responses API; versioned canvases and dependency sequence; simulated-provider tests | Account key, input sharing scope and live quality/usage acceptance |
| Audio transcription | Implemented with OpenAI; original audio, editable text and advisor recovery; synthetic tests | Account OpenAI key and live microphone/transcription acceptance |
| Email invitation/reminders | Resend invitation adapter implemented; reminders/webhooks pending | Sender identity/domain, service credentials, consent/delivery/retry/reminder policy |
| Neo4j Aura graph | Connected advisor account; production projection and duplicate-free repeat rebuild verified September 6, 2026; encrypted settings and PostgreSQL fallback | Each additional advisor account supplies its own Aura connection; larger-workload testing remains open |
| Meeting ingestion | No connection | Authorized account, meeting selection/visibility policy, webhook/replay and lineage validation |
| Enterprise identity/policy | No connection | Customer-specific identities, effective-access sources, membership and approval assurance |
| Signet/runtime/customer actions | Fail-closed unconfigured | Managed keys, legitimate authority, precise action/resource scope, conformance and reconciliation |

The application needs its own service credentials. A connector available to the development assistant does not grant the deployed app a reusable API key or commercial account. Put selected credentials in the project's ignored configuration or approved secret store, never source control or chat. Use Workspace settings for OpenAI, Exa, Resend and Neo4j Aura. AES-256-GCM encryption uses a server-only key; database backups alone cannot decrypt credentials. Configuration status does not claim live verification.

## Optional Neo4j Aura projection

Settings accepts an Aura `neo4j+s://…databases.neo4j.io` URI, database username, database name and database password. These are database credentials, not an account sign-in password. Saving enables metadata sync across the advisor account's companies. **Test connection** performs a live connectivity check; **Build company graph** requests the current company projection. On September 6, 2026, authorized operator setup connected the advisor account to Aura instance `a2d3a8fb`. Production maintenance copied Cobalt revision 206: 71 records and 147 relationships. The shared reader validated the snapshot, and a repeat rebuild preserved counts without duplicates. See verification/2026-09-06-guided-release.md for the acceptance details.

Only graph metadata and typed links are copied: record IDs, kinds, titles, states, versions and hashes. Full source bodies, audio and credentials are excluded. PostgreSQL remains authoritative. An unavailable or outdated Aura snapshot falls back to current PostgreSQL records. Removing the connection stops later access but does not remove existing copies from Aura. The verified connection belongs to the configured advisor account; other accounts must configure and test their own connection.

## OpenAI framework analyses

Strategy uses the account's encrypted OpenAI key and selected supported model. Each of the sixteen frameworks has specific system instructions, an explicit variable-input contract, and a strict output schema. A request includes relevant accepted evidence, bounded public-research excerpts, full current direct-upstream analyses, and brief summaries of other completed analyses. Public research stays labeled unverified. Source text is data, never instructions. The app validates section identities, table columns, citation IDs, confidence labels and required input assessments before saving a complete result.

Runs use the Responses API with `store: false`. The app retains its own versioned input snapshot, prompt version, model, provider usage and result in `provider_jobs`. Provider output is an unreviewed analysis, not an authoritative work record. Current framework outputs can inform group reports and the copilot; source citations can reopen the exact saved canvas version.

All required upstream analyses must be current. Source changes and upstream reruns invalidate affected downstream analyses recursively. One click runs one framework. **Run remaining sequence** can run up to sixteen ready analyses in dependency order. These are user-started actions; no recurring paid schedule is configured. The separate framework cap is 32 attempts per tenant account per 24 hours, including failed or uncertain attempts. Requests reserve durable records before calling the provider, reuse idempotency keys, and do not retry provider failures automatically. Tests and the populated-canvas preview used a simulated provider; no paid framework call was made during verification.

See [Live framework canvases](guide/24-live-framework-canvases.md) for source limits and the full output inventory.

## Acceptance of a future research connection

Before marking a connection live, verify one authorized request against the actual provider account, retained URL/date/content lineage, bounded result and cost limits, source review state, retry/cancel behavior, redacted error logs and tenant visibility. Public website material remains untrusted evidence. It must not become application instructions or update confirmed work without review.

Decide whether queries can contain company names or confidential context. A public research search generally does not need private interview text. Site crawling should use an explicit public URL scope and must not expose local/private-network addresses or authentication material. These controls belong in the implementation and tests, not only in an operator note.

No customer permission or execution capability follows from search, scraping, analysis or task confirmation. Those remain separately accepted systems.


## Audio transcription and reviewed evidence

Participants can save a recording, create an editable transcript, and add the checked text to their response. If a participant sends only audio, the advisor can open the returned response, create a transcript, correct it, and choose **Save reviewed transcript as evidence**. This creates a separate accepted evidence record linked to the exact original response and transcription job. It does not rewrite the participant’s submission. Discovery can use that reviewed text; changing or retracting its evidence makes affected drafts stale.

Transcription uses `gpt-4o-transcribe`, the account’s encrypted OpenAI key, a 105-second timeout, and bounded audio (25 MB) and response text. Completed attempts are reused. Failed or uncertain attempts need an explicit retry. The app limits attempts to three per recording and fifty per account per 24 hours. Audio retention also clears unreviewed provider transcript text. Accepted transcript evidence remains in the work record. No live paid transcription or real invitation email was used during automated verification.
