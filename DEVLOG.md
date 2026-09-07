# DutyGraph development log

Newest entries first. This log was established September 7, 2026. The two preceding website releases are backfilled below; older history remains in Git and dated [verification records](docs/verification/). This is not a claim that every historical change has been reconstructed.

For every future logical change, update this log and the [README](README.md) together. Record the date, change and reason, affected areas, checks actually performed, known publication status, and remaining work. Link a commit or detailed evidence when available. Do not include credentials, private transcripts or lead details.

## 2026-09-07 — Documentation updates required for every change

- **Change and reason:** Established this development log and the owner's requirement to update it and the README for every change, so a new developer can follow implementation and product decisions. Refreshed the README from its older baseline through release `178aba0`.
- **Affected areas:** README, contributing instructions, repository agent instructions, development log and documentation index. Added current measurement status, SEO inventory, aggregate pilot-report command and links to detailed references.
- **Validation:** Documentation link and diff review. No application behavior changed; runtime tests were not rerun for this documentation-only change.
- **Remaining work:** Google terms acceptance, Analytics activation and Search Console ownership verification remain pending approval. This documentation change does not complete them.

## 2026-09-07 — Consent-gated website measurement and pilot reporting

Release: [`178aba0`](https://github.com/mattrob333/DutyGraphV2/commit/178aba032c25f39fa101ec77fb5071b9b36b8189).

- **Change and reason:** Added a public-page analytics layer with explicit consent and withdrawal; inquiry/newsletter receipt hooks; a privacy page; and an operator aggregate report covering inquiry stages, follow-up dates and notification status. Distinguishes receipt events from unique saved inquiries and qualified prospects. Fixed mobile footer overflow and consent-dismissal scroll behavior.
- **Affected areas:** Public marketing assets, measurement generator/configuration, pilot operator tooling, SEO inventory, tests and operational documentation. Private employee responses and workspace pages are excluded from public-site analytics.
- **Validation:** Build and all 190 tests passed, including consent/data-minimization and real SQL aggregate tests. CI passed. Browser layout checked at 390px and 1440px; isolated measurement fixture blocked third-party requests. See [verification](docs/verification/2026-09-07-website-measurement.md) and [measurement runbook](docs/website-measurement.md).
- **Publication:** Vercel reported this exact commit READY. Production privacy page, measurement script, landing configuration and 191-page sitemap were checked successfully.
- **Remaining work:** Measurement ID and Search Console tag intentionally remain null. Google account setup is prepared at the legal-terms step; Search Console is prepared at ownership verification. Owner approval is required before completion. No live analytics collection, Google indexing or production email delivery is claimed.

## 2026-09-07 — Governance category buyer guides and public SEO validation

Release: [`6f2e3b3`](https://github.com/mattrob333/DutyGraphV2/commit/6f2e3b3e3bb5b35e79020ba549a48e74717e5a1a).

- **Change and reason:** Published 12 distinct category buyer guides and evaluation worksheets around the 160 researched offering profiles. Added deterministic public-page validation and sitemap generation, shared marketing canonicals, and direct root-to-landing routing while retaining demo and old workspace entry behavior.
- **Affected areas:** Directory content and generators, public entry routing, SEO validation, public pages and documentation.
- **Validation:** Build and all 185 tests passed for that release. The then-current sitemap contained 190 public pages. See [dated SEO verification](docs/verification/2026-09-07-programmatic-seo.md).
- **Publication:** CI succeeded and the matching Vercel release was verified READY. Production public routes were checked after publication.
- **Remaining work:** Crawlable pages and a sitemap do not establish search indexing or ranking. Product claims retain their source research dates; the new templates did not independently revalidate every vendor.
