import { buildCategories, categoryPath } from "./directory-categories.ts";
import { marketingOrigin } from "./marketing-origin.ts";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { validateDirectory } from "../shared/directory-research.ts";
const root = new URL("../client/public/", import.meta.url);
const content = new URL("../content/directory/", import.meta.url);
const origin = marketingOrigin;
const read = async (name: string) =>
  JSON.parse(await readFile(new URL(name, content), "utf8"));
const { entries, evidence, taxonomy } = validateDirectory(
  await read("entries.json"),
  await read("evidence.json"),
  await read("taxonomy.json"),
);
entries.sort((a, b) => a.name.localeCompare(b.name));
const esc = (x: string) =>
  x
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const labels: Record<string, string> = {
  documented: "Documented by provider",
  vendor_claim: "Vendor claim",
  independently_supported: "Independently corroborated",
  not_found: "Not established in this research",
};
const structuredList = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "AI governance directory",
  itemListElement: entries.map((e, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: e.name,
    url: `${origin}/directory/ai-governance/${evidence.find((p) => p.name === e.name)!.id}/`,
  })),
}).replaceAll("<", "\\u003c");
const page = (
  title: string,
  description: string,
  path: string,
  body: string,
  script = false,
) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | DutyGraph</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${origin}${path}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${origin}${path}"><link rel="icon" href="/brand/dutygraph-symbol.svg"><link rel="stylesheet" href="/landing/landing.css"><link rel="stylesheet" href="/learn/learning.css"><link rel="stylesheet" href="/directory/directory.css">${script ? '<script src="/directory/directory.js" defer></script>' : ""}</head><body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap navigation"><a class="wordmark" href="/landing/"><img src="/brand/dutygraph-symbol.svg" width="34" height="33" alt=""><span>DutyGraph</span></a><a href="/directory/ai-governance/">AI governance directory</a></div></header><main id="main" class="wrap learning">${body}</main><footer class="wrap learn-footer"><a href="/landing/">DutyGraph</a><a href="/learn/">Field guides</a><a href="/advisors/">Advisor program</a><a href="mailto:hello@dutygraph.com">Corrections & inquiries</a><span>A Tier 4 Intelligence company</span></footer></body></html>`;
const dir = new URL("directory/ai-governance/", root);
await mkdir(dir, { recursive: true });
const cards = [];
for (const e of entries) {
  const p = evidence.find((x) => x.name === e.name)!;
  const categoryIds = [p.primaryCategoryId, ...p.secondaryCategoryIds];
  const tags = categoryIds.map(
    (id) => taxonomy.find((t) => t.id === id)!.label,
  );
  const status = p.claims.some((c) =>
    ["documented", "independently_supported"].includes(c.support),
  )
    ? "Includes documentation or corroboration"
    : "Marketing-supported research";
  const path = `/directory/ai-governance/${p.id}/`;
  const disclosure =
    p.id === "dutygraph"
      ? '<p class="directory-disclosure">Directory publisher · Advisor pilot · Governance examples are fictional; no live integration or customer outcome is implied.</p>'
      : "";
  cards.push(
    `<article class="vendor-card directory-card" id="${p.id}" data-category="${esc(e.category)}" data-categories="${esc(JSON.stringify(tags))}" data-type="${esc(p.productType)}" data-search="${esc([e.name, p.companyName, ...tags, e.description, ...p.buyerRoles, ...p.problemsSolved].join(" ").toLowerCase())}"><p class="eyebrow">${esc(e.category)}</p><h2><a href="${path}">${esc(e.name)}</a></h2>${disclosure}<p>${esc(e.description)}</p><p class="directory-badges">${esc(p.productType)} · ${esc(p.availability.replaceAll("_", " "))}</p><p class="small">${status}</p><dl><dt>Ask for a demonstration</dt><dd>${esc(e.question)}</dd></dl><p><a href="${path}">Read evidence & limitations →</a></p><p class="small">Research snapshot ${esc(e.reviewed)} · <a href="#${p.id}">Link to entry</a></p></article>`,
  );
  const sourceList = p.sources
    .map(
      (s) =>
        `<li id="source-${esc(s.id)}"><a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.title)}</a> · ${esc(s.publisher)} · ${esc(s.type.replaceAll("_", " "))}<br><small>Access date reported by researcher: ${esc(s.accessedAt)}</small></li>`,
    )
    .join("");
  const claims = p.claims
    .map(
      (c) =>
        `<article class="directory-claim"><p class="eyebrow">${labels[c.support]}</p><p>${esc(c.statement)}</p>${c.limitations ? `<p class="small"><strong>Limit:</strong> ${esc(c.limitations)}</p>` : ""}<p>${c.sourceIds.map((id) => `<a href="#source-${esc(id)}">Source ${esc(id)}</a>`).join(" · ")}</p></article>`,
    )
    .join("");
  await mkdir(new URL(`${p.id}/`, dir), { recursive: true });
  await writeFile(
    new URL(`${p.id}/index.html`, dir),
    page(
      e.name,
      `Research profile of ${e.name}: capabilities, source evidence, limitations and questions for buyers.`,
      path,
      `<div class="learn-hero"><p class="eyebrow">${esc(e.category)}</p><h1>${esc(e.name)}</h1>${disclosure}<p class="lead">${esc(e.description)}</p><p>${esc(p.productType)} · ${esc(p.availability.replaceAll("_", " "))} · Research snapshot ${esc(e.reviewed)}</p><a href="${esc(e.url)}">Visit the official product source ↗</a></div><section class="prose"><h2>Where it fits</h2><p>${categoryIds.map((id) => `<a href="${categoryPath(id)}">${esc(taxonomy.find((t) => t.id === id)!.label)}</a>`).join(" · ")}</p><p>Useful conversation with: ${p.buyerRoles.map(esc).join(", ")}.</p><h2>Ask for a demonstration</h2><p>${esc(e.question)}</p><h2>Capabilities and evidence</h2><p>Support labels reflect the supplied research. Documentation and vendor claims are not independent product tests. “Not established” means the researcher did not find support; it does not prove a capability is absent.</p>${claims}<h2>Limitations to discuss</h2><ul>${p.limitations.map((l) => `<li>${esc(l)}</li>`).join("") || "<li>No additional limitations recorded; validate fit with the provider.</li>"}</ul><h2>Sources</h2><ol>${sourceList}</ol><p>Listing does not imply partnership, supplier status, a working DutyGraph integration, or a compliance certification.</p><a href="mailto:hello@dutygraph.com?subject=${encodeURIComponent("Directory correction: " + e.name)}">Suggest a correction</a></section>`,
    ),
  );
}
const body = `<div class="learn-hero"><p class="eyebrow">AN EDITORIAL DIRECTORY · ${entries.length} PRODUCTS, PROJECTS & SERVICES</p><h1>Find the layer<br>you need.</h1><p class="lead">Explore ${taxonomy.length} parts of AI governance. Understand what each offering addresses, inspect its evidence, and bring a better question to the next conversation.</p><p class="small">Research snapshot September 6, 2026 · Published by DutyGraph · No paid placements</p></div><section class="category-hub"><h2>Explore the ${taxonomy.length} governance categories</h2><p>Each guide includes evaluation questions, a fictional test scenario, related offerings and a downloadable worksheet.</p><div class="category-links">${taxonomy.map((t) => `<a href="${categoryPath(t.id)}"><strong>${esc(t.label)}</strong><span>${esc(t.definition)}</span><small>Explore the buyer guide →</small></a>`).join("")}</div></section><section class="directory-tools" aria-label="Search directory"><label for="directory-search">Search products, roles, or problems</label><input id="directory-search" type="search" placeholder="Try access review, shadow AI, or a company" maxlength="100"><label for="directory-category">Governance category</label><select id="directory-category"><option>All</option>${taxonomy.map((t) => `<option>${esc(t.label)}</option>`).join("")}</select><label for="directory-type">Offering type<select id="directory-type"><option value="All">All types</option>${[...new Set(evidence.map((e) => e.productType))].map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select></label><button type="button" id="directory-reset">Clear filters</button><p role="status" id="directory-count">${entries.length} offerings shown</p></section><p id="directory-empty" hidden>No entries match. Try a broader term or clear the filters.</p><div class="vendor-grid">${cards.join("")}</div><section class="learn-cta"><h2>Understand the work.<br>Then choose the tool.</h2><p>DutyGraph helps advisors connect people, duties, tasks, and proposed AI delegation. Explore our pilot and the work behind an agent request.</p><a class="button" href="/pilot/">Join the advisor-led pilot →</a></section><section class="prose" id="method"><h2>How to use this research</h2><p>This directory imports a source-linked research snapshot supplied on September 6, 2026. Each offering has a separate evidence profile. Support labels distinguish provider documentation, marketing claims, independent corroboration, and unanswered questions. We have not independently tested these products.</p><p>Categories overlap; filters include secondary categories. Commercial software, open-source projects, hybrid offerings and advisory services are labeled separately. Coverage is not exhaustive and English-language research underrepresents some regions.</p><p>DutyGraph publishes this directory and labels its own entry. Alphabetical listing does not imply ranking, partnership, Telarus supplier status, a live integration, or certification. Confirm current availability and licensing with each provider. Research candidates awaiting review are not published.</p><p><a href="mailto:hello@dutygraph.com?subject=Directory%20correction">Suggest a correction</a> · <a href="/directory/ai-governance/entries.json" download>Download entries</a> · <a href="/directory/ai-governance/evidence.json" download>Download evidence</a> · <a href="/directory/ai-governance/taxonomy.json" download>Download categories</a></p></section>`;
await writeFile(
  new URL("index.html", dir),
  page(
    `AI Governance Directory: ${entries.length} Products, Projects & Services`,
    "Explore AI governance products by category, offering type, source evidence and buyer questions.",
    "/directory/ai-governance/",
    `<script type="application/ld+json">${structuredList}</script>${body}`,
    true,
  ),
);
for (const [name, data] of [
  ["entries.json", entries],
  ["evidence.json", evidence],
  ["taxonomy.json", taxonomy],
] as const)
  await writeFile(new URL(name, dir), JSON.stringify(data, null, 2));
await buildCategories({ entries, evidence, taxonomy }, root, origin, page);
console.log(
  `Built directory: ${entries.length} offerings, ${taxonomy.length} categories and ${evidence.length} evidence profiles.`,
);
