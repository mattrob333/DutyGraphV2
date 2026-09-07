import { mkdir, writeFile } from "node:fs/promises";
import { categoryGuides } from "../content/directory/category-guides.ts";
import type { validateDirectory } from "../shared/directory-research.ts";

export const categoryPath = (id: string) =>
  `/directory/ai-governance/categories/${id}/`;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const json = (value: unknown) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");

export async function buildCategories(
  research: ReturnType<typeof validateDirectory>,
  root: URL,
  origin: string,
  page: (
    title: string,
    description: string,
    path: string,
    body: string,
  ) => string,
) {
  const { taxonomy, evidence, entries } = research;
  if (Object.keys(categoryGuides).length !== taxonomy.length)
    throw new Error("Category editorial coverage differs from taxonomy");
  const paths: string[] = [];
  for (const category of taxonomy) {
    const guide = categoryGuides[category.id];
    if (!guide) throw new Error(`Missing buyer guide: ${category.id}`);
    const products = evidence
      .filter(
        (p) =>
          p.primaryCategoryId === category.id ||
          p.secondaryCategoryIds.includes(category.id),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!products.length) throw new Error(`Empty category: ${category.id}`);
    const primary = products.filter(
      (p) => p.primaryCategoryId === category.id,
    ).length;
    const path = categoryPath(category.id);
    const adjacent = category.adjacentCategoryIds as string[];
    for (const id of adjacent)
      if (!categoryGuides[id])
        throw new Error(`Unknown related category: ${id}`);
    const breadcrumbs = [
      {
        name: "AI governance directory",
        item: origin + "/directory/ai-governance/",
      },
      { name: category.label, item: origin + path },
    ];
    const data = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          name: guide.title,
          description: guide.description,
          url: origin + path,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: products.length,
            itemListOrder: "https://schema.org/ItemListOrderAscending",
            itemListElement: products.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: p.name,
              url: origin + `/directory/ai-governance/${p.id}/`,
            })),
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbs.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            ...p,
          })),
        },
      ],
    };
    const productCards = products
      .map((p) => {
        const entry = entries.find((e) => e.name === p.name)!;
        return `<article class="vendor-card directory-card"><p class="eyebrow">${p.primaryCategoryId === category.id ? "Primary category" : "Also covers this layer"}</p><h3><a href="/directory/ai-governance/${p.id}/">${esc(p.name)}</a></h3>${p.id === "dutygraph" ? '<p class="directory-disclosure">Directory publisher · Advisor pilot</p>' : ""}<p>${esc(entry.description)}</p><p class="directory-badges">${esc(p.productType)} · Research snapshot ${esc(entry.reviewed)}</p><dl><dt>Ask for a demonstration</dt><dd>${esc(entry.question)}</dd></dl><p><a href="/directory/ai-governance/${p.id}/">Read sources and limitations →</a></p></article>`;
      })
      .join("");
    const body = `<script type="application/ld+json">${json(data)}</script>
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/directory/ai-governance/">AI governance directory</a> / <span aria-current="page">${esc(category.label)}</span></nav>
      <div class="learn-hero"><p class="eyebrow">THE BUYER'S FIELD GUIDE</p><h1>${esc(guide.title)}</h1><p class="lead">${esc(category.definition)}</p><p>${products.length} related offerings · ${primary} primary listings · ${products.length - primary} overlapping listings</p><div class="learn-actions"><a class="button" href="#offerings">Explore the offerings ↓</a><a href="${path}evaluation-worksheet.md" download>Download evaluation worksheet ↗</a></div><p class="small">Product research snapshot September 6, 2026 · Editorial guide September 7, 2026 · Published by DutyGraph</p></div>
      <div class="article-layout"><nav class="contents" aria-label="On this page"><strong>ON THIS PAGE</strong><a href="#when">When to explore this layer</a><a href="#example">A practical evaluation</a><a href="#questions">Questions for the demonstration</a><a href="#evidence">Evidence to request</a><a href="#boundary">Where this layer stops</a><a href="#offerings">Related offerings</a></nav>
      <article class="prose"><section id="when"><h2>When to explore this layer</h2><p>${esc(guide.trigger)}</p></section>
      <section id="example"><p class="eyebrow">ILLUSTRATIVE EVALUATION · NOT A CUSTOMER RESULT</p><h2>Put a real task in the demonstration.</h2><p>${esc(guide.example)}</p></section>
      <section id="questions"><h2>Questions to bring to the demonstration</h2><ol>${guide.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></section>
      <section id="evidence"><h2>Evidence to request</h2><ul>${guide.evidence.map((e) => `<li>${esc(e)}</li>`).join("")}</ul><p>Record what was demonstrated, what was only described, and what remains unknown. Preserve the product version, environment and date beside each observation.</p><a href="${path}evaluation-worksheet.md" download>Use the editable Markdown worksheet →</a></section>
      <section id="boundary"><h2>Where this layer stops</h2><p>${esc(guide.boundary)}</p><h3>Connect it to the work</h3><p>${esc(guide.workContext)}</p><p><a href="/perspectives/the-demand-side-of-ai-agents/">Read our perspective on the demand side of agents →</a></p></section></article></div>
      <section id="offerings" class="category-offerings"><h2>${products.length} offerings to investigate</h2><p>Alphabetical, not ranked. Membership includes primary and secondary research categories. These products have different scopes; inspect the evidence profile before comparing capabilities.</p><div class="vendor-grid">${productCards}</div></section>
      <section class="category-related"><h2>Follow the next connection</h2><div class="category-links">${adjacent.map((id) => `<a href="${categoryPath(id)}">${esc(taxonomy.find((t) => t.id === id)!.label)} →</a>`).join("")}</div></section>
      <aside class="learn-cta"><p class="eyebrow">BEFORE THE TOOL DECISION</p><h2>Give the agent a clear job.</h2><p>Explore how an advisor turns a person's account into granular tasks and proposed AI boundaries. DutyGraph is recruiting initial pilot teams to test the method.</p><a class="button" href="/?demo=discovery">Try the discovery walkthrough →</a><p><a href="/pilot/">Discuss a pilot for your team ↗</a></p></aside>
      <section class="prose"><h2>About this guide</h2><p>The evaluation questions and fictional scenario are DutyGraph's editorial guidance. Product listings use the supplied source-linked research snapshot. We have not independently tested these offerings. Listing is not an endorsement, certification or working integration.</p><p><a href="/directory/ai-governance/#method">Read the directory methodology</a> · <a href="mailto:hello@dutygraph.com?subject=${encodeURIComponent("Category correction: " + category.label)}">Suggest a correction</a></p></section>`;
    const destination = new URL(path.slice(1), root);
    await mkdir(destination, { recursive: true });
    await writeFile(
      new URL("index.html", destination),
      page(guide.title, guide.description, path, body),
    );
    const worksheet = `# ${guide.title}: evaluation worksheet\n\nSource: ${origin}${path}\nEditorial date: 2026-09-07\n\n## Scope\n\n- Organization / team:\n- Task and expected output:\n- Human owner:\n- Product and version:\n- Evaluation date / environment:\n- Reviewer:\n\n## Questions\n\n${guide.questions.map((q, i) => `### ${i + 1}. ${q}\n\n- Observation (demonstrated / described / unknown):\n- Evidence reference:\n- Limitation or follow-up:\n`).join("\n")}\n## Evidence checklist\n\n${guide.evidence.map((e) => `- [ ] ${e}`).join("\n")}\n\n## Boundary to check\n\n${guide.boundary}\n\n## Decision\n\n- Fit for the scoped task:\n- Unresolved gaps:\n- Next action, owner and date:\n\nThis is a planning worksheet, not an endorsement, access approval or compliance certification. Keep confidential evaluation notes in your organization's approved storage.\n`;
    await writeFile(new URL("evaluation-worksheet.md", destination), worksheet);
    paths.push(path);
  }
  return paths;
}
