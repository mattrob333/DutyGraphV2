# Public landing page — design and verification

## Current implementation

The canonical page is `client/public/landing/index.html`, with `landing.css`, `landing.js`, and local assets alongside it. Vite copies these files into `dist/landing/`; the normal Vercel build publishes `/landing/`. The app remains at `/` for existing testers.

- Sign in links to `/`.
- Create workspace links to `/?signup=1`; the app reads this parameter to open registration.
- Product, method, and question links navigate to sections of this page.
- No form on the marketing page collects personal data or sends email.

The previous `outputs/DutyGraph-Brand/landing-page-draft.html` is an earlier design export. This implementation replaces it as the source of truth.

## Design decisions

The approved DutyGraph symbol is reused without changing its geometry. The design uses DM Sans, flat charcoal and warm ivory surfaces, thin rules, restrained accent chips, and an editorial type scale. There are no gradients, fabricated testimonials, customer-logo claims, or invented business results.

The first section after the hero contains a wide three-view product gallery. It uses authentic application captures from the local fictional Cobalt company:

1. `company-graph.png`: supplier onboarding, its exception paths, and open approval responsibility.
2. `task-library.png`: value stages and Human / AI / AI + human review cards.
3. `human-checkpoint.png`: a task selected in the graph with its human checkpoint and linked records.

`task-detail.png` supplies the supporting task-record section. These are screenshots of the working application, not generated product mockups. Account details and workspace navigation are excluded from the captures. The page clearly labels the company as fictional and distinguishes proposed AI roles and described software from deployed agents or verified connections.

The Superdesign draft was refined in place to version 2 at project `2818b97b-15a2-447b-ba01-1ecad0826726`, draft `a2646318-e1b4-4d33-aed7-a001d202439b`. The production implementation adds real screenshots, native CSS, local fonts, and working interactions. It does not depend on the design service or an external script CDN at runtime.

## Adversarial walkthrough findings and fixes

| First-time visitor concern | Result |
| --- | --- |
| Is this another org chart or an AI automation builder? | Hero and product sections explain the work record; FAQ states that the pilot does not execute agents in client systems. |
| Are these screenshots real or aspirational? | Captured actual Cobalt views and labeled them as illustrative. No fabricated interface shown as shipped. |
| Can I understand a small graph on my phone? | Show a readable crop and a full-size viewer with horizontal scrolling on small screens. |
| Does the gallery move while I am reading or using a keyboard? | Pauses on hover, focus, manual selection, hidden page, and when outside the viewport. Starts paused for reduced-motion users. |
| Can I reach all content without a mouse? | Proper tab roles, arrow/Home/End navigation, visible focus, native expandable FAQs, Escape-to-close image viewer, and restored opener focus. |
| Where do the sign-up buttons go? | Actual app registration entry; no lead form or dead-end CTA. |
| What services do I have to pay for? | FAQ names the provider keys, verified sender requirement, and separate provider usage billing. |

## Verification

Browser checks passed at 360, 390, 768, 1024, 1440, and 1920 pixels. No document-level horizontal overflow, failed page assets, or browser script errors were found. Verified manual gallery selection, keyboard tabs, automatic advancement, manual pause, reduced-motion default, full-size image opening/closing, focus restoration, FAQ expansion, and internal anchor targets. JavaScript syntax check passed. The page was visually inspected on desktop and mobile.

The screenshots required no external AI calls or invitations. Production deployment and the app's registration query parameter are integrated by the main release task.

For repeatable local captures and checks, the development-only scripts are `work/capture-marketing.mjs` and `work/verify-marketing.mjs` (ignored scratch tooling). Static local preview used `http://127.0.0.1:4320/landing/`.

## Runtime assets

Four PNG screenshots total approximately 699 KB. The page serves its DM Sans WOFF2 files locally; the font's license is included in `assets/fonts/LICENSE`. Images below the initial gallery load lazily. All marketing scripts and styles are same-origin files.
