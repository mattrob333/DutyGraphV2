# Business briefing verification — September 7, 2026

## Scope

Initial research now returns a structured briefing with six fact areas, quote-level provenance and distinct monitoring recommendations. Primary/supporting business streams remain separate from uncertain alternatives. Matching saved company intake carries the brief into contact and agenda generation.

## Local checks

- `npm run verify`: build and all **209 tests passed**, using the dedicated local PostgreSQL environment and synthetic providers. Includes invalid citation/quote/metric rejection, hybrid versus alternative models, quoted feed-address validation, foreign-company research rejection, contextual queries, matching/mismatched kickoff context, and current/legacy idempotent resume.
- `npm run contracts`: **89 routes** inventoried, generated contract files unchanged.
- `npm audit --audit-level=low`: **0 vulnerabilities**.
- Browser at `http://127.0.0.1:4339/login#discovery`: executed four synthetic searches and generated the briefing through the real API/UI path. Verified automatic focus, evidence expansion, primary-stream reorder, save-and-prepare-email handoff to the contact field, and persistence after reload. No email sent.
- Desktop three-column dashboard and 390×844 mobile single-column layout inspected. Mobile document width 380px within a 390px viewport; briefing width 312px. Existing sidebar collapses. Dark and light themes inspected; final release status is separate.

## Limits

All business facts used for tests and the local preview are explicitly fictional. No paid Exa/OpenAI requests or real-company fact audit was performed. Exact quote validation proves an excerpt contains the quote; it cannot independently verify a source or guarantee that the model's interpretation follows from it. Public research is a draft for advisor review. Missing data remains visible, and RSS addresses are not connectivity-tested. A fresh research pass is needed to replace older saved output with the new briefing format. Existing raw research remains available.

Production release and CI results are separate from these local checks.
