import { mkdir, writeFile, readFile } from "node:fs/promises";
import { articles as originalArticles, vendors } from "./learning-content.ts";
import { nextArticles } from "./learning-next.ts";
const articles = [...originalArticles, ...nextArticles];
const root = new URL("../client/public/", import.meta.url);
const origin = new URL(
  process.env.MARKETING_ORIGIN || "https://dutygraph-v2.vercel.app",
).origin;
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const cards = articles
  .map(
    (a) =>
      `<a class="guide-card" href="/learn/${a.slug}/"><span class="eyebrow">${a.label}</span><h2>${a.title}</h2><p>${a.description}</p><span class="text-link">Read the guide →</span></a>`,
  )
  .join("");
const shell = (
  title: string,
  description: string,
  path: string,
  body: string,
  article = false,
) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | DutyGraph</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${origin}${path}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="${article ? "article" : "website"}"><meta property="og:url" content="${origin}${path}"><link rel="icon" href="/brand/dutygraph-symbol.svg"><link rel="stylesheet" href="/landing/landing.css"><link rel="stylesheet" href="/learn/learning.css"><script src="/learn/learning.js" defer></script><script type="application/ld+json">${JSON.stringify(article ? { "@context": "https://schema.org", "@type": "Article", headline: title, description, datePublished: "2026-09-06", dateModified: "2026-09-06", author: { "@type": "Organization", name: "DutyGraph" }, mainEntityOfPage: origin + path } : { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: origin + path }).replaceAll("<", "\\u003c")}</script></head><body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap navigation"><a class="wordmark" href="/landing/"><img src="/brand/dutygraph-symbol.svg" alt="" width="34" height="33"><span>DutyGraph</span></a><nav aria-label="Main navigation"><a href="/learn/">Field guides</a> · <a href="/directory/ai-governance/">Directory</a></nav><a class="button button-small" href="/landing/#pilot">Join the pilot ↗</a></div></header><main id="main" class="wrap learning">${body}<aside class="learn-cta"><p class="eyebrow">START WITH YOUR TEAM</p><h2>Understand the work before you delegate it.</h2><p>We’re seeking 5–10 companies to test advisor-led discovery. Start with a demo and decide whether the pilot fits your team.</p><div class="learn-actions"><a class="button" href="/landing/#pilot">Join the pilot ↗</a><a class="text-link" href="/?demo=discovery">Try the discovery walkthrough →</a></div></aside><section aria-label="More field guides"><h2>Keep exploring</h2><div class="guide-grid">${cards}</div></section></main><footer class="wrap learn-footer"><a href="/landing/">DutyGraph</a><a href="/handbook/25-participant-review.html">Participant guide</a><span>Work made visible. Authority made explicit.</span></footer></body></html>`;
await mkdir(new URL("learn/", root), { recursive: true });
await writeFile(
  new URL("learn/index.html", root),
  shell(
    "AI governance field guides",
    "Understand AI governance, compare the layers, and define the work an agent may do.",
    "/learn/",
    `<div class="learn-hero"><p class="eyebrow">THE DUTYGRAPH FIELD GUIDE</p><h1>Make sense of<br>AI governance.</h1><p class="lead">Start with the questions. Understand the landscape. Put the limits in writing.</p></div><div class="guide-grid">${cards}</div>`,
  ),
);
for (const a of articles) {
  const vendorMap =
    a.slug === "ai-governance-landscape"
      ? `<p><a class="text-link" href="/directory/ai-governance/">Search the full directory →</a></p><section class="landscape" aria-label="Governance landscape"><div class="filters" aria-label="Filter companies">${["All", "AI risk & oversight", "Identity & access", "Work discovery"].map((x, i) => `<button type="button" data-filter="${escape(x)}" aria-pressed="${i === 0}">${x}</button>`).join("")}</div><p id="vendor-count" role="status">6 organizations shown</p><div class="vendor-grid">${vendors.map((v) => `<article class="vendor-card" data-category="${escape(v.category)}"><span class="eyebrow">${v.category}</span><h3>${v.name}</h3><p>${v.description}</p><a href="${v.url}">${v.name === "DutyGraph" ? "Explore the sample story" : "Read the source"} ↗</a></article>`).join("")}</div><p class="small">Representative map · Vendor descriptions, not tested rankings · Checked September 6, 2026</p></section>`
      : "";
  const download =
    a.slug === "agent-manifest-template"
      ? `<aside class="download"><h2>Your review starts with a draft.</h2><p>Editable JSON · No sign-up required · No credentials included</p><a class="button" href="/learn/agent-manifest.json" download>Download the manifest worksheet ↓</a></aside>`
      : "";
  const body = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/landing/">Home</a> / <a href="/learn/">Field guides</a></nav><div class="learn-hero"><p class="eyebrow">${a.label}</p><h1>${a.title}</h1><p class="lead">${a.description}</p><p class="small">DutyGraph editorial · September 6, 2026</p></div>${download}<div class="article-layout"><nav class="contents" aria-label="On this page"><strong>ON THIS PAGE</strong>${a.sections.map(([h], i) => `<a href="#section-${i}">${h}</a>`).join("")}</nav><article class="prose">${a.sections
    .map(
      ([h, p], i) =>
        `<section id="section-${i}"><h2>${h}</h2>${p!
          .split("\n")
          .map((t) => `<p>${t}</p>`)
          .join("")}</section>${i === 0 ? vendorMap : ""}`,
    )
    .join(
      "",
    )}${a.sources.length ? `<section class="sources"><h2>Sources</h2><p>Primary references used in this guide.</p><ul>${a.sources.map(([label, url]) => `<li><a href="${url}">${label} ↗</a></li>`).join("")}</ul></section>` : ""}</article></div>`;
  await mkdir(new URL(`learn/${a.slug}/`, root), { recursive: true });
  const searchTitle =
    (
      {
        "ai-governance": "AI Governance: A Practical Guide",
        "ai-agent-governance":
          "AI Agent Governance: Ownership, Scopes and Approval",
        "ai-governance-landscape":
          "AI Governance Landscape: Platforms and Their Roles",
        "agent-manifest-template":
          "Agent Manifest Template: Free JSON Worksheet",
      } as Record<string, string>
    )[a.slug] ||
    a.slug
      .split("-")
      .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
      .join(" ");
  await writeFile(
    new URL(`learn/${a.slug}/index.html`, root),
    shell(searchTitle, a.description, `/learn/${a.slug}/`, body, true),
  );
}
await writeFile(
  new URL("learn/agent-manifest.json", root),
  JSON.stringify(
    {
      schema: "dutygraph-planning-worksheet-v1",
      status: "draft-not-authorized",
      owner: {
        personId: null,
        role: null,
        identitySource: null,
        verifiedAt: null,
      },
      task: {
        title: null,
        duty: null,
        input: null,
        instructions: [],
        output: null,
        handoff: null,
      },
      allowedScopes: [],
      excludedActions: [],
      evidenceReferences: [],
      humanCheckpoints: [],
      stopConditions: ["Missing or stale permission evidence"],
      approval: { reviewerId: null, version: null, decision: "pending" },
      lifecycle: { reviewAt: null, expiresAt: null, revocationSystem: null },
      warning:
        "Planning worksheet only. Not a credential, signed approval, access policy, or runtime enforcement.",
    },
    null,
    2,
  ),
);
await writeFile(
  new URL("sitemap.xml", root),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/landing/", "/learn/", ...articles.map((a) => `/learn/${a.slug}/`)].map((p) => `<url><loc>${origin}${p}</loc></url>`).join("")}</urlset>`,
);
await writeFile(
  new URL("robots.txt", root),
  `User-agent: *\nDisallow: /api/\nDisallow: /invite/\nSitemap: ${origin}/sitemap.xml\n`,
);
// This source file is copied by Vite after the build generator runs.
const landing = new URL("landing/index.html", root);
let html = await readFile(landing, "utf8");
html = html
  .replace(/\s*<link rel="canonical"[^>]*>/g, "")
  .replace(
    "</title>",
    `</title>\n    <link rel="canonical" href="${origin}/landing/">`,
  );
await writeFile(landing, html);
console.log(
  "Built 7 field guides, resource hub, manifest worksheet, sitemap, and robots.txt",
);
