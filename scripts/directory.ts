import { mkdir, writeFile, readFile } from "node:fs/promises";
import { vendors } from "./learning-content.ts";
const root = new URL("../client/public/", import.meta.url);
const origin = new URL(
  process.env.MARKETING_ORIGIN || "https://dutygraph-v2.vercel.app",
).origin;
const entries = [
  ...vendors,
  {
    name: "SailPoint",
    category: "Identity & access",
    description:
      "Agent identity visibility, human ownership, and access review within its identity security platform.",
    url: "https://www.sailpoint.com/products/agent-identity-security",
  },
  {
    name: "OneTrust",
    category: "AI risk & oversight",
    description:
      "AI inventory, risk assessment, ownership, and governance workflows across an AI program.",
    url: "https://www.onetrust.com/solutions/ai-governance/",
  },
  {
    name: "Aembit",
    category: "Runtime access",
    description:
      "Policy-based access for agents and workloads, with identity verification and short-lived credentials.",
    url: "https://docs.aembit.io/get-started/use-cases/ai-agents/",
  },
].sort((a, b) => a.name.localeCompare(b.name));
const questions: Record<string, string> = {
  Aembit:
    "Show how a denied request and a revoked user-agent combination behave in our target system.",
  "Credo AI":
    "Show how a policy becomes an assigned review and how the decision retains its supporting evidence.",
  DutyGraph:
    "Show how a participant-reviewed task reaches the advisor and how an unresolved handoff stays visible.",
  "IBM watsonx.governance":
    "Show which governance and monitoring functions apply to our chosen model, application, and hosting setup.",
  "Microsoft Entra":
    "Show the agent objects, access review, and owner lifecycle behavior supported by our tenant and license.",
  Okta: "Show how agent discovery, identity, and access controls cover the specific agent platform we use.",
  OneTrust:
    "Show how our AI inventory, risk review, and technical controls remain linked after a system changes.",
  SailPoint:
    "Show how ownership succession, access review, and tool-service accounts are governed in our deployment.",
  Saviynt:
    "Show which source systems provide current entitlements and how a conflicting access request is handled.",
};
const buyers: Record<string, string> = {
  "AI risk & oversight": "AI program, risk, and governance teams",
  "Identity & access": "Identity, access, and security teams",
  "Runtime access": "Platform engineering and security teams",
  "Work discovery": "Advisors, business sponsors, and work owners",
};
const esc = (x: string) =>
  x.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const slug = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const data = entries.map((e) => ({
  ...e,
  question: questions[e.name],
  reviewed: "2026-09-06",
}));
const body = entries
  .map(
    (e) =>
      `<article class="vendor-card directory-card" id="${slug(e.name)}" data-category="${esc(e.category)}" data-search="${esc(`${e.name} ${e.category} ${e.description} ${buyers[e.category]}`.toLowerCase())}"><p class="eyebrow">${e.category}</p><h2>${e.name}</h2>${e.name === "DutyGraph" ? '<p class="small">Directory publisher · Hosted pilot and fictional governance sample</p>' : ""}<p>${e.description}</p><dl><dt>Useful conversation with</dt><dd>${buyers[e.category]}</dd><dt>Ask for a demonstration</dt><dd>${questions[e.name]}</dd></dl><p><a href="${e.url}">${e.name === "DutyGraph" ? "Read the product scope" : "Read the official source"} ↗</a></p><p class="small">Source reviewed September 6, 2026 · <a href="#${slug(e.name)}">Link to entry</a></p></article>`,
  )
  .join("");
await mkdir(new URL("directory/ai-governance/", root), { recursive: true });
await writeFile(
  new URL("directory/ai-governance/index.html", root),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Governance Directory: Platforms, Roles & Evaluation Questions | DutyGraph</title><meta name="description" content="Search a curated AI governance directory covering risk oversight, agent identity, runtime access, and work discovery. Compare roles with primary sources."><link rel="canonical" href="${origin}/directory/ai-governance/"><meta property="og:title" content="The AI governance directory"><meta property="og:description" content="Find the layer you need. Ask better evaluation questions."><meta property="og:type" content="website"><link rel="icon" href="/brand/dutygraph-symbol.svg"><link rel="stylesheet" href="/landing/landing.css"><link rel="stylesheet" href="/learn/learning.css"><link rel="stylesheet" href="/directory/directory.css"><script src="/directory/directory.js" defer></script><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: "AI governance directory", itemListElement: entries.map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.name, url: origin + "/directory/ai-governance/#" + slug(e.name) })) })}</script></head><body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap navigation"><a class="wordmark" href="/landing/"><img src="/brand/dutygraph-symbol.svg" width="34" height="33" alt=""><span>DutyGraph</span></a><a href="/learn/ai-governance-landscape/">Understand the landscape</a></div></header><main id="main" class="wrap learning"><div class="learn-hero"><p class="eyebrow">AN EDITORIAL DIRECTORY · 9 ORGANIZATIONS</p><h1>Find the layer<br>you need.</h1><p class="lead">AI governance is several jobs. Explore the platforms, understand their focus, and bring a better question to the next conversation.</p><p class="small">Curated by DutyGraph · Reviewed September 6, 2026</p></div><section class="directory-tools" aria-label="Search directory"><label for="directory-search">Search companies, roles, or capabilities</label><input id="directory-search" type="search" placeholder="Try identity, risk, or a company name" maxlength="100"><label for="directory-category">Primary focus</label><select id="directory-category">${["All", "AI risk & oversight", "Identity & access", "Runtime access", "Work discovery"].map((x) => `<option>${x}</option>`).join("")}</select><button type="button" id="directory-reset">Clear filters</button><p role="status" id="directory-count">9 organizations shown</p></section><p id="directory-empty" hidden>No entries match. Try a broader term or clear the filters.</p><div class="vendor-grid">${body}</div><section class="learn-cta"><h2>Start with the problem.<br>Then choose the tool.</h2><p>A useful discovery process helps an advisor understand the work, the people, and the missing information before making a recommendation.</p><div class="learn-actions"><a class="button" href="/advisors/">Explore the advisor method →</a><a class="text-link" href="/pilot/">Bring a company workflow →</a></div></section><section class="prose" id="method"><h2>How this directory is maintained</h2><p>Entries are selected from official product pages and documentation relevant to AI governance. Descriptions summarize the source, not independent performance tests. Categories indicate a primary focus and can overlap. This first edition is not exhaustive; an absent company is not a negative assessment.</p><p>DutyGraph publishes this directory and includes its own product, clearly labeled. Entries are alphabetical and there are no paid placements in this edition. Listing a vendor does not imply a partnership, Telarus supplier status, or a working DutyGraph integration. Confirm availability, licensing, and deployment requirements directly with each provider.</p><p>Our editorial aim is to add verified coverage and review sources quarterly. We will not automatically publish vendor submissions. To suggest a correction, use the inquiry form and name the entry with an official source link.</p><p><a href="/landing/?interest=enterprise#pilot">Suggest a correction →</a> · <a href="/directory/ai-governance/entries.json" download>Download the source-linked directory JSON ↓</a></p></section></main><footer class="wrap learn-footer"><a href="/landing/">DutyGraph</a><a href="/learn/">Field guides</a><a href="/advisors/">Advisor program</a><a href="/newsletter/">The Governance Brief</a></footer></body></html>`,
);
await writeFile(
  new URL("directory/ai-governance/entries.json", root),
  JSON.stringify(data, null, 2),
);
const sitemap = new URL("sitemap.xml", root);
await writeFile(
  sitemap,
  (await readFile(sitemap, "utf8")).replace(
    "</urlset>",
    `<url><loc>${origin}/directory/ai-governance/</loc></url></urlset>`,
  ),
);
console.log(
  "Built searchable AI governance directory with 9 source-linked entries.",
);
