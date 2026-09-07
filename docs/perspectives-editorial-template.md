# DutyGraph Perspectives publishing template

Perspectives is the thought-leadership section at /perspectives/. Field Guides at /learn/ remain practical explainers. The first featured story is “Inside the adaptive business,” published September 7, 2026 by DutyGraph editorial.

## Add an article

Add one Perspective object to content/perspectives.ts. Put the featured article first. Include a permanent kebab-case slug, title, concise description, category, ISO publication date, image path, descriptive alt text, introduction paragraphs, uniquely identified sections, and a single takeaway. Paragraphs are plain text and escaped by the generator. Optional section sources contain a descriptive label and an official HTTPS URL. Add references directly alongside the claim they support.

Run npm run build. scripts/perspectives.ts generates the hub, article pages, RSS feed and sitemap entries. The template supplies an author/date/read-time line, table of contents, pull quote, related reading, pilot/demo links, canonical, Open Graph/Twitter images, and BlogPosting metadata. A new article needs no new layout component. Update dateModified support if making substantive changes after publication; do not change publication dates to simulate freshness.

## Header art direction

Use an original landscape editorial illustration, ideally 16:9. Graphite charcoal, warm ivory, slate blue and a restrained amber accent. Use tactile architectural materials and clear relationships as a metaphor for the article. Avoid text baked into the picture: the title remains accessible HTML and can wrap on mobile. Avoid robots, brains, neon code, fake dashboards, customer logos and invented metrics.

Reusable prompt: “Premium conceptual editorial still-life for DutyGraph Perspectives. [ARTICLE CONCEPT expressed through physical materials]. Restrained charcoal, ivory, slate-blue glass and one amber decision point. Precise composition, soft studio light, generous space, calm architectural visual language. Landscape 16:9. No text, logos, robots, brains, binary code or neon.”

The first illustration was generated using the image-generation tool and copied into client/public/perspectives/images/adaptive-business.png. Original dimensions: 1672 × 941. The source image remains in the local generated-images folder. The public article identifies it as AI-created conceptual art. The same image supports hub, landing feature and social previews.

## Editorial boundaries

Use the corporate editorial byline unless a named author approves attribution. Clearly distinguish a future vision, an illustrative scenario and current capabilities. Do not attribute the supplied podcast summary to speakers without checking the original recording. Do not promise autonomous execution, continuous integrations, guaranteed KPI gains, competitor outperformance or compliance. Current pilot description must match the app. The article cites Anthropic's engineering guidance and NIST's AI RMF for narrow supporting points; those sources do not endorse DutyGraph.

## Review before publishing

Check claims, links, image loading, mobile layout, heading hierarchy, canonical URLs, structured data, RSS and sitemap. Confirm every new article is discoverable from Perspectives; select a landing-page marquee intentionally. Newsletter launch-list signup and RSS are distinct; the feed does not send email.
