import { marketingOrigin } from "./marketing-origin.ts";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { perspectives } from "../content/perspectives.ts";
const root = new URL("../client/public/", import.meta.url);
const origin = marketingOrigin;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const json = (v: unknown) => JSON.stringify(v).replaceAll("<", "\\u003c");
const date = (s: string) =>
  new Date(s + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const url = (slug: string) => `/perspectives/${slug}/`;
const shell = (
  title: string,
  description: string,
  path: string,
  body: string,
  image?: string,
  schema?: unknown,
) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#131416"><title>${esc(title)} | DutyGraph</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${origin}${path}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${origin}${path}"><meta property="og:type" content="${image ? "article" : "website"}">${image ? `<meta property="og:image" content="${origin}${image}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${origin}${image}">` : ""}<link rel="icon" href="/brand/dutygraph-symbol.svg"><link rel="stylesheet" href="/landing/landing.css"><link rel="stylesheet" href="/perspectives/perspectives.css"><link rel="alternate" type="application/rss+xml" title="DutyGraph Perspectives" href="/perspectives/feed.xml">${schema ? `<script type="application/ld+json">${json(schema)}</script>` : ""}</head><body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap navigation"><a class="wordmark" href="/landing/"><img src="/brand/dutygraph-symbol.svg" alt="" width="34" height="33"><span>DutyGraph</span></a><nav aria-label="Main navigation"><a href="/perspectives/">Perspectives</a><a href="/learn/">Field guides</a><a href="/directory/ai-governance/">Directory</a></nav><a class="text-link" href="/pilot/">Join the pilot ↗</a></div></header><main id="main">${body}</main><footer class="wrap editorial-footer"><a href="/landing/">DutyGraph</a><a href="/perspectives/">Perspectives</a><a href="/newsletter/">The Governance Brief</a><a href="mailto:hello@dutygraph.com">Get in touch</a><span>A Tier 4 Intelligence company</span></footer></body></html>`;
const destination = new URL("perspectives/", root);
await mkdir(destination, { recursive: true });
const slugs = new Set<string>();
for (const a of perspectives) {
  if (!/^[a-z0-9-]+$/.test(a.slug) || slugs.has(a.slug))
    throw Error("Invalid or duplicate article slug");
  slugs.add(a.slug);
  if (new Set(a.sections.map((s) => s.id)).size !== a.sections.length)
    throw Error("Duplicate section anchor");
  await access(new URL(a.image.slice(1), root));
  const words = [...a.introduction, ...a.sections.flatMap((s) => s.paragraphs)]
      .join(" ")
      .split(/\s+/).length,
    minutes = Math.ceil(words / 220);
  const hero = `<div class="wrap article-heading"><nav class="editorial-breadcrumb" aria-label="Breadcrumb"><a href="/perspectives/">Perspectives</a><span>/</span><span>${esc(a.category)}</span></nav><p class="eyebrow">${esc(a.category)} · Perspective</p><h1>${esc(a.title)}</h1><p class="article-deck">${esc(a.description)}</p><p class="article-byline">DutyGraph editorial <span>·</span> <time datetime="${a.published}">${date(a.published)}</time> <span>·</span> ${minutes} min read</p></div><figure class="wrap editorial-hero"><img src="${a.image}" alt="${esc(a.imageAlt)}" width="1536" height="864" fetchpriority="high"><figcaption>Conceptual illustration created with AI for DutyGraph Perspectives.</figcaption></figure>`;
  const body = `${hero}<div class="wrap reading-layout"><aside class="article-contents"><strong>In this article</strong>${a.sections.map((s) => `<a href="#${s.id}">${esc(s.title)}</a>`).join("")}<a class="rss-link" href="/perspectives/feed.xml">Follow via RSS ↗</a></aside><article class="editorial-prose"><div class="article-intro">${a.introduction.map((p) => `<p>${esc(p)}</p>`).join("")}</div><blockquote>${esc(a.takeaway)}</blockquote>${a.sections.map((s) => `<section id="${s.id}"><h2>${esc(s.title)}</h2>${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}${s.sources?.length ? `<p class="article-source">References: ${s.sources.map((ref) => `<a href="${esc(ref.url)}">${esc(ref.label)}</a>`).join(" · ")}.</p>` : ""}</section>`).join("")}<div class="editorial-next"><p class="eyebrow">Explore the idea in practice</p><h2>Start with a clearer picture of the work.</h2><p>Walk through a fictional discovery session, or discuss a pilot for one flow in your company.</p><div><a class="button" href="/?demo=discovery">Explore the example →</a><a class="text-link" href="/pilot/">Join the pilot ↗</a></div></div><p class="article-endnote">This article presents DutyGraph’s perspective on a possible future operating model. It makes no prediction of guaranteed business results. References inform the discussion and do not imply endorsement of DutyGraph.</p><nav class="related-reading" aria-label="Related reading"><h2>Keep exploring</h2><a href="/learn/ai-agent-governance/">AI agent governance: ownership, scopes and approval →</a><a href="/directory/ai-governance/">Explore the AI governance directory →</a></nav></article></div>`;
  await mkdir(new URL(`${a.slug}/`, destination), { recursive: true });
  await writeFile(
    new URL(`${a.slug}/index.html`, destination),
    shell(a.seoTitle || a.title, a.description, url(a.slug), body, a.image, {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: a.title,
      description: a.description,
      image: [origin + a.image],
      datePublished: a.published,
      dateModified: a.updated || a.published,
      author: {
        "@type": "Organization",
        name: "DutyGraph editorial",
        url: origin + "/perspectives/",
      },
      publisher: {
        "@type": "Organization",
        name: "DutyGraph",
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: origin + "/brand/dutygraph-symbol.svg",
        },
      },
      mainEntityOfPage: origin + url(a.slug),
      wordCount: words,
      articleSection: a.category,
    }),
  );
}
const featured = perspectives[0];
await writeFile(
  new URL("index.html", destination),
  shell(
    "Perspectives on AI, Strategy and the Future of Work",
    "Ideas for advisors and leaders building more adaptive businesses. Explore AI strategy, connected work and accountable delegation.",
    "/perspectives/",
    `<div class="wrap perspectives-heading"><p class="eyebrow">DUTYGRAPH PERSPECTIVES</p><h1>The business<br>we’re building toward.</h1><p>Ideas for people connecting strategy, everyday work, and responsible AI.</p></div><section class="wrap featured-story" aria-label="Featured article"><a class="featured-art" href="${url(featured.slug)}"><img src="${featured.image}" alt="${esc(featured.imageAlt)}" width="1536" height="864" fetchpriority="high"></a><div><p class="eyebrow">Featured perspective · ${esc(featured.category)}</p><h2><a href="${url(featured.slug)}">${esc(featured.title)}</a></h2><p>${esc(featured.description)}</p><p class="article-byline">DutyGraph editorial · ${date(featured.published)}</p><a class="text-link" href="${url(featured.slug)}">Read the perspective →</a></div></section>${
      perspectives.length > 1
        ? `<section class="wrap story-grid">${perspectives
            .slice(1)
            .map(
              (a) =>
                `<article><a href="${url(a.slug)}"><img src="${a.image}" alt="${esc(a.imageAlt)}" width="1536" height="864" loading="lazy"><h2>${esc(a.title)}</h2></a><p>${esc(a.description)}</p></article>`,
            )
            .join("")}</section>`
        : ""
    }<section class="wrap perspectives-follow"><div><p class="eyebrow">IDEAS + PRACTICE</p><h2>Keep the conversation grounded.</h2><p>Our Perspectives explore where business could go. Our Field Guides help you take the next practical step.</p></div><div><a class="button" href="/learn/">Explore the field guides →</a><a href="/newsletter/">The Governance Brief launch list ↗</a><a href="/perspectives/feed.xml">Subscribe via RSS ↗</a></div></section>`,
    undefined,
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "DutyGraph Perspectives",
      url: origin + "/perspectives/",
      blogPost: perspectives.map((a) => ({
        "@type": "BlogPosting",
        headline: a.title,
        url: origin + url(a.slug),
      })),
    },
  ),
);
await writeFile(
  new URL("feed.xml", destination),
  `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>DutyGraph Perspectives</title><link>${origin}/perspectives/</link><description>AI, strategy and the adaptive business.</description><language>en-us</language>${perspectives.map((a) => `<item><title>${esc(a.title)}</title><link>${origin}${url(a.slug)}</link><guid>${origin}${url(a.slug)}</guid><description>${esc(a.description)}</description><pubDate>${new Date(a.published + "T12:00:00Z").toUTCString()}</pubDate></item>`).join("")}</channel></rss>`,
);
console.log(
  `Built Perspectives hub, ${perspectives.length} articles and RSS feed.`,
);
