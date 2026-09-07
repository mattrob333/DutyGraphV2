# Programmatic SEO verification — September 7, 2026

Changes: 12 original category buyer guides and Markdown evaluation worksheets, category/profile internal links, unified public canonical origin, deterministic validated sitemap, direct marketing root redirect with demo and legacy-bookmark preservation.

Local verification:

- `npm run verify`: build and all 185 tests passed, including database/API tests and two new SEO/routing regressions.
- `npm run verify:seo`: 190 public pages passed unique title/description, canonical, H1, viewport, local link/anchor, JSON-LD parsing and sitemap checks.
- Negative SEO fixtures reject incorrect canonical origins, missing local files/anchors, duplicate titles, noindex public pages, malformed JSON-LD and orphan pages. Private invitation fixtures are excluded.
- Express root routing tests verify 308 behavior, query preservation and demo/sample/view/login/invite exceptions; the Vercel configuration matches the tested query keys.
- Browser checks at 1440px and 390px: directory-to-category navigation, work-delegation guide, related identity guide, worksheet HTTP/content, correct canonical and no horizontal overflow or page JavaScript errors.
- Browser checks preserve `/landing/#graph` to `/login#graph` and keep `/landing/#pilot` on marketing. Screenshot inspection confirms readable mobile layout.
- `git diff --check`: no whitespace errors. The existing application bundle-size warning remains; static SEO pages do not require that application bundle.

These checks do not establish Google indexing, rankings, rich-result eligibility, external vendor accuracy, GA4 collection, Search Console ownership or real-device testing. Production route and deployment verification is performed after publication and reported separately.
