# Programmatic SEO publishing

Updated September 7, 2026.

## What is published

The directory combines 160 researched offering profiles with 12 category buyer guides. Each category has original editorial questions, an illustrative evaluation, evidence requirements, limits, related categories and a downloadable Markdown worksheet. This is a research-assisted buying resource, not a ranking or claim of complete market coverage.

The category taxonomy represents governance layers, including work discovery, agent building, discovery/inventory, identity, runtime controls, security, risk management, evaluation, observability, data privacy, model lifecycle and advisory services. Products can appear in multiple layers. Counts are offerings, not unique companies, and category counts must not be added together as market totals.

## Source of truth

| Source | Responsibility |
| --- | --- |
| `content/directory/entries.json`, `evidence.json`, `taxonomy.json` | Sourced product facts, claim support, category membership |
| `content/directory/category-guides.ts` | Original evaluation questions, scenarios, boundaries and work context |
| `shared/directory-research.ts` | Import validation for research |
| `scripts/directory.ts` | Directory hub, product profiles and category generation entry |
| `scripts/directory-categories.ts` | Escaped static category HTML, visible schema and worksheets |
| `scripts/marketing-origin.ts` | One HTTPS public origin for all publishers |
| `scripts/verify-seo.ts` | Final public-page audit and deterministic sitemap/robots writer |

Edit sources, then run `npm run build`. Generated HTML and worksheets are committed for review; do not edit them directly. Build invokes every publisher before the final SEO validator and Vite. Individual publishers no longer append to a shared sitemap in sequence. `npm run verify:seo` audits existing output without changing it and detects an outdated sitemap.

The default origin is `https://dutygraph.com`. `MARKETING_ORIGIN` may deliberately override it for another HTTPS deployment. Application origin and authentication allowlists are separate settings; changing marketing canonicals does not change invitation or cookie behavior.

## Adding or refreshing a category

1. Establish a distinct buyer question and include/exclude boundary in the taxonomy. Preserve supported membership in the research files.
2. Write the category guide using a concrete task, relevant failure cases, testable demonstration questions, evidence artifacts and an honest boundary. Label fictional examples. Do not merely swap industry or product names.
3. Add reciprocal links to neighboring categories where the work actually crosses into another layer. Every category needs a guide and at least one researched offering.
4. Review new product claims against primary sources. Editing a template does not refresh a product's research date or validate an old capability claim.
5. Run the build and tests; inspect desktop/mobile navigation, download content, primary/secondary labels and the pilot CTA.

The generator keeps imported source evidence separate from our editorial recommendations. Worksheets have empty observation fields for a buyer's own findings. Product profiles carry limitations and source links; the guide does not imply those questions have already been answered by every listed vendor.

## Automated checks

The validator scans only declared marketing surfaces: landing, learn, pilot, advisors, enterprise, team, directory, newsletter, perspectives and privacy. At this release it discovers 191 pages. It requires one title, description, H1 and canonical per page; unique titles/descriptions; the correct canonical origin/path; a viewport; parseable JSON-LD; existing local navigation/assets and fragment targets; inbound links for every non-home page; and no public `noindex` flag. It requires the app shell to retain `noindex,nofollow`.

After validation, build writes a sorted sitemap and robots file. No artificial freshness dates or keyword-priority scores are generated. The auditor is designed for the project's controlled static HTML templates, not arbitrary third-party HTML. It does not test remote vendor URLs, search rankings, schema rich-result eligibility, Google indexing, semantic content quality or real-device accessibility.

Regression tests inject wrong canonicals, duplicate titles, invalid schema, missing links/anchors, orphan pages and `noindex` into public fixtures. They also verify that invitation pages do not enter the marketing sitemap.

## Root entry and existing bookmarks

Vercel sends `/` directly to `/landing/` with a permanent redirect unless a `demo`, `sample` or `view` query key is present. Campaign parameters carry through. Local Express mirrors this rule. `/login` and `/invite/...` continue to use the private app shell. Known old `/#graph`-style bookmarks retain their fragment through the redirect; landing JavaScript takes those bookmarks to `/login#graph`. Normal marketing anchors such as `#pilot` remain on the landing page.

This replaces the bare root's former noindex app document followed by a JavaScript-only marketing redirect. Verify both the HTTP response and browser behavior when changing these routes.

## Measurement and search activation

The consent-gated measurement layer, privacy page and aggregate pilot report are implemented. Google account completion and Search Console ownership verification still need owner approval. Tracking remains off while `content/measurement.json` contains null IDs. See [website measurement](website-measurement.md) for activation, event definitions, tests and the distinction between receipts and qualified inquiries.

## References

- [Google: scaled content and doorway policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google: canonical URL consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Vercel: configuration redirects](https://vercel.com/docs/routing/redirects/configuration-redirects)
- [DutyGraph SEO strategy](seo-strategy.md)
