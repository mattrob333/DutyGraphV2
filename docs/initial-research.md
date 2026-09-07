# One-form initial research

Discovery starts with the public company name, official URL and an optional short description. **Research this company** runs the selected public searches sequentially and then requests a structured operating-model recommendation. The four areas—company overview, customer communities, competitors/channels and industry news—are selected by default inside a collapsed coverage drawer. The advisor can uncheck any area before starting.

The Industry Map stays a separate, deeper analysis after collection. This keeps the initial pass bounded, allows the advisor to inspect the sources, and avoids repeating the initial searches inside a giant model request. The current map feeds later kickoff preparation and strategy frameworks. Its analytical prerequisites still apply; this change does not bypass framework dependency checks.

## Results and review

The recommendation includes the sector, up to three supported operating models for hybrid companies, a plain-English explanation, confidence and kickoff questions. Stages come from the validated 52-model catalog, not fabricated task assignments. A readable preview precedes **Use this business profile**; manual classification and stage editing are secondary. Saving stores a proposed profile and the intake details, adapts kickoff guidance, and supplies description/profile context to later research and framework runs. No employee duties or agent permissions are created.

Collected public pages remain available to discovery and strategy without importing them as accepted evidence. The classification reuses the exact completed research-run IDs from the pass and does not make a fifth search. Citations are validated against the supplied excerpts and description. A URL alone is never treated as proof of what a company does. No usable excerpts and no description produces an actionable error.

## Configuration and limits

- Exa supplies public search results; OpenAI supplies the classification. Each uses the advisor account's encrypted provider configuration. Without Exa, a description can still support classification. Without OpenAI, public research can still be collected, but no AI classification is claimed.
- The default pass uses four Exa calls and one OpenAI call. Each search requests up to five sources. Classification reads up to three excerpts from each selected research run (at most twelve, 4,000 characters each), so all four areas can contribute. The prompt distinguishes target-company facts from competitor and industry examples. A direct classification request without a research pass may retrieve five official-site excerpts first.
- Ten public searches and ten business-classification attempts are permitted per account in a rolling 24-hour window. Shared research reservation locking prevents the two entry points from exceeding the research quota concurrently.
- The browser drives the sequence and must remain open. Completed work is durable in PostgreSQL. Session storage preserves the intake, command keys and current step for this browser's interrupted pass. Resume reuses the same command key; completed searches are not repeated. A terminal failed step offers an explicit retry. Closing the browser/session can lose the local continuation plan; inspect saved sources before starting another pass.
- No automatic retry, no background schedule, and no emails. Provider and network failures preserve the existing business profile. A company revision change requires a fresh suggestion or refresh before saving.

## Implementation

`shared/business-classification.ts` defines the intake, strict recommendation schema, instruction set and catalog-to-profile mapping. `server/business-classification.ts` exposes advisor-only GET/POST `/api/v1/companies/:companyId/business-classification`; provider jobs retain input snapshots, result and terminal status. The ordinary business-profile PUT accepts an optional validated `intake` and uses optimistic revision checks. No database migration is needed.

`client/src/initial-research.ts` implements resumable sequential collection. The existing research provider, source import, tenant/CSRF controls and idempotency transport remain in use. BusinessProfilePanel owns the single form; BusinessResearch displays collected sources in the initial journey. The API does not infer operational truth from marketing sources: recommendations are proposed context for leadership review.

## Framework presentation

All sixteen framework canvases retain their own layout and schema. Numbered section navigation, finding counts and summary counts make long analyses easier to scan. Confidence explanations open on click rather than relying on hover. On narrow screens, data-table rows become labeled vertical records. Source links and explicit gaps remain visible; styling does not strengthen the evidence or certify conclusions.

Validation uses fictional fixtures and mocked providers. Real-company classification quality, paid provider execution and source usefulness still need representative pilot acceptance.
