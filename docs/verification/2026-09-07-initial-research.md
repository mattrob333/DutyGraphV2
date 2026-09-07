# Initial research and framework presentation verification

Date: September 7, 2026. Scope: one-form public research, proposed business classification, retained kickoff context, and shared framework rendering.

## Automated checks

- `npm run verify`: build and all 204 tests passed, zero failures/skips. Build retains the existing large-client-chunk warning.
- Eight new synthetic tests cover classification across the 52 allowed templates, citation/schema rejection, tenant isolation, revision guards, idempotency, paid-call quotas, URL-only and retrieval-failure handling, collected-source reuse, and interrupted sequence resumption without repeating completed work.
- `npm run contracts`: generated inventory contains 89 route declarations, including classification GET/POST. The OpenAPI document remains a partial record-transport schema, not a complete response contract.
- `npm audit --audit-level=low`: zero vulnerabilities. `git diff --check`: clean.

## Browser checks

A local server on port 4339 used an isolated fictional advisor/company and injected research, classification and framework providers. No paid provider request or email was sent.

- Initial Discovery displayed one company/website/description form and a collapsed drawer with four selected research areas.
- One action collected four synthetic research runs, displayed a structured advisory-business recommendation, and saved its profile and intake. Refresh retained the saved profile and sources; no fifth website search was used by classification.
- All sixteen framework canvases rendered in a synthetic gallery. Table fields included mobile labels; confidence explanations remained expandable. The static gallery establishes rendering, not hydrated section-navigation interaction.
- At a 390-pixel viewport, the discovery page and a populated VRIO table had no horizontal page overflow. Phone screenshots showed stacked form and table content. This is browser viewport coverage, not physical-device testing.

## Boundaries

Exa/OpenAI keys and billing must be enabled for real searches/classification. These checks do not establish provider availability, real-company recommendation accuracy, employee task validity, or governance authority. The Industry Map remains a separate deeper analysis with its normal prerequisites. The browser drives the initial sequence; saved work is durable, but its local continuation plan can be lost when browser session storage is cleared.

## Hosted publication

Implementation `736e394f1e554ae594983479e3e2c0052eac16f7` passed [CI 34165840592](https://github.com/mattrob333/DutyGraphV2/actions/runs/34165840592), including the synthetic advisor journey and encrypted backup recovery. Vercel deployment `dpl_DMz8gPC792gKuNMb4Fyy9YEmxFMb` reported READY for that exact commit. Production `/login` returned 200 and referenced `/assets/index-BEmkLZ0C.js`, which contains the new research action, classification route and coverage drawer. The updated discovery handbook returned 200 with the new instructions. Unauthenticated access to the classification endpoint returned 401. No real-account research or classification request was sent in production.
