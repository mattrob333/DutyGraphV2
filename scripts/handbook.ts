import { readdir, readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { z } from "zod";
import { schemas } from "../shared/domain.ts";
import { markdownToHtml, escapeHtml } from "../shared/handbook.ts";
const destination = "client/public/handbook";
await mkdir(destination, { recursive: true });
const style = `:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;color:#20313b;background:#edf1f2;font:16px/1.75 system-ui,sans-serif}header{background:#183540;color:#fff;padding:38px max(24px,calc((100vw - 980px)/2))}header p{color:#d3e2e6;margin:4px 0}main{max-width:1040px;margin:30px auto;background:white;padding:48px;border-radius:12px}h1{font-size:38px;line-height:1.15;margin:10px 0 25px}h2{font-size:26px;line-height:1.3;margin:38px 0 14px;color:#173d49}h3{font-size:20px}p{margin:14px 0}li{margin:9px 0}a{color:#0b617b}nav{margin-bottom:25px}table{border-collapse:collapse;width:100%;font-size:14px;margin:22px 0}td,th{border:1px solid #cdd6d9;text-align:left;vertical-align:top;padding:10px}th{background:#edf3f5}pre{background:#f1f4f5;padding:18px;overflow:auto;font-size:13px}blockquote{border-left:4px solid #82a9b4;margin:20px 0;padding:10px 22px;background:#f0f5f6}.table-scroll{overflow:auto}code{overflow-wrap:anywhere}.chapter{border-top:1px solid #ccd8dc;margin-top:60px;padding-top:30px}footer{font-size:12px;color:#687c85;margin-top:45px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.cards a{display:block;border:1px solid #cfdbdf;border-radius:8px;padding:20px;text-decoration:none;background:#f8fafb}.eyebrow{letter-spacing:2px;font-size:12px;font-weight:700}@media(max-width:650px){main{padding:22px;margin:10px}h1{font-size:29px}}@page{size:A4;margin:18mm}@media print{body{background:white;font-size:10pt;line-height:1.5}header,nav,.no-print{display:none}main{padding:0;margin:0;max-width:none}h1{font-size:25pt}h2{font-size:17pt;break-after:avoid}h3{break-after:avoid}table{font-size:8.5pt}thead{display:table-header-group}tr{break-inside:avoid}.chapter{break-before:page;border:0;padding:0}a{color:inherit}pre{white-space:pre-wrap;overflow-wrap:anywhere}footer{font-size:8pt}}`;
const page = (title: string, body: string, index = true) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | Duty Graph 0.3</title><style>${style}</style></head><body><header><div class="eyebrow">DUTY GRAPH · ADVISOR ENABLEMENT</div><p>Release 0.3 · Hosted advisor pilot · September 2026</p></header><main>${index ? '<nav><a href="index.html">← Handbook contents</a></nav>' : ""}${body}<footer>Duty Graph 0.3. Authored guidance for the implemented application. Northstar examples are synthetic. Work review, authority, deployment and observed execution remain distinct.</footer></main></body></html>`;
const documents: { name: string; title: string; markdown: string }[] = [];
for (const name of (await readdir("docs/guide"))
  .filter((n) => n.endsWith(".md"))
  .sort()) {
  const markdown = await readFile("docs/guide/" + name, "utf8");
  documents.push({
    name: name.replace(".md", ".html"),
    title: markdown.match(/^# (.+)/)![1],
    markdown,
  });
}
let fields =
  "# Record-field reference\n\nGenerated from the same runtime schemas that validate saved records. Required fields, defaults and limits below describe API input. The manual explains their business meaning. Internal snapshots and server-computed fields are not editable inputs.\n\n";
for (const [kind, schema] of Object.entries(schemas)) {
  const definition: any = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io: "input",
  });
  fields += `## ${kind}\n\n| Field | Required | Shape and limits |\n| --- | --- | --- |\n`;
  for (const [key, value] of Object.entries(definition.properties || {}) as [
    string,
    any,
  ][]) {
    const desc = value.enum
      ? value.enum.join(", ")
      : value.type ||
        value.format ||
        (value.anyOf || value.oneOf
          ? "union; see API schema"
          : "structured value");
    const limits = [
      value.format,
      value.minLength ? `min ${value.minLength} characters` : null,
      value.maxLength ? `max ${value.maxLength} characters` : null,
      value.maxItems ? `max ${value.maxItems} items` : null,
      value.minimum !== undefined ? `minimum ${value.minimum}` : null,
      value.maximum !== undefined ? `maximum ${value.maximum}` : null,
      value.default !== undefined
        ? `default ${JSON.stringify(value.default)}`
        : null,
    ]
      .filter(Boolean)
      .join("; ");
    fields += `| ${key} | ${definition.required?.includes(key) ? "Yes" : "No"} | ${desc}${limits ? "; " + limits : ""} |\n`;
  }
  fields += "\n";
}
await writeFile("docs/FIELD-REFERENCE.md", fields.trimEnd() + "\n");
const guides = [...documents];
for (const name of [
  "FIELD-REFERENCE",
  "OPERATIONS",
  "ARCHITECTURE",
  "SECURITY",
  "INTEGRATIONS",
  "API-REFERENCE",
  "RELEASE-STATUS",
  "VERIFICATION",
  "ACCEPTANCE-CHECKLIST",
]) {
  try {
    const markdown = await readFile(`docs/${name}.md`, "utf8");
    documents.push({
      name: name.toLowerCase() + ".html",
      title: markdown.match(/^# (.+)/)?.[1] || name,
      markdown,
    });
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
  }
}
for (const doc of documents) {
  await writeFile(
    `${destination}/${doc.name}`,
    page(doc.title, markdownToHtml(doc.markdown)),
  );
  await writeFile(
    `${destination}/${doc.name.replace(".html", ".md")}`,
    doc.markdown,
  );
}
await writeFile(
  `${destination}/complete-advisor-handbook.html`,
  page(
    "Complete advisor handbook",
    "<h1>Duty Graph advisor handbook</h1><p>Explainer, walkthrough, full user manual, playbook, training workbook, facilitator answers, client deliverables and glossary.</p>" +
      guides
        .map(
          (g) =>
            `<section class="chapter">${markdownToHtml(g.markdown)}</section>`,
        )
        .join(""),
  ),
);
await writeFile(
  `${destination}/complete-advisor-handbook.md`,
  guides.map((g) => g.markdown).join("\n\n"),
);
await mkdir(`${destination}/examples`, { recursive: true });
let examples: string[] = [];
try {
  examples = (await readdir("docs/examples")).filter((n) =>
    /\.(zip|html|json|csv|md)$/.test(n),
  );
  for (const name of examples)
    await cp(`docs/examples/${name}`, `${destination}/examples/${name}`);
} catch (error: any) {
  if (error.code !== "ENOENT") throw error;
}
// Copy only reviewed release evidence and public contracts. Never sweep work/,
// configuration, backups, or the private source handoff into a public handbook.
const attachments = [
  {
    source: "docs/requirements-status.json",
    name: "requirements-status.json",
    title: "Requirement traceability and remaining acceptance",
  },
  {
    source: "docs/verification/performance-local.json",
    name: "verification/performance-local.json",
    title: "Local performance measurements",
  },
  {
    source: "docs/verification/restore-drill.json",
    name: "verification/restore-drill.json",
    title: "Sanitized encrypted restore-drill result",
  },
  {
    source: "docs/verification/backup-tamper.json",
    name: "verification/backup-tamper.json",
    title: "Backup tamper-rejection result",
  },
  {
    source: "contracts/openapi.json",
    name: "contracts/openapi.json",
    title: "Generated OpenAPI record-input schemas",
  },
  {
    source: "contracts/routes.json",
    name: "contracts/routes.json",
    title: "Generated implemented-route inventory",
  },
  {
    source: "contracts/framework-registry.json",
    name: "contracts/framework-registry.json",
    title: "Framework registry",
  },
];
for (const folder of ["verification", "contracts"])
  await mkdir(`${destination}/${folder}`, { recursive: true });
for (const attachment of attachments)
  await cp(attachment.source, `${destination}/${attachment.name}`);
const contents = `<h1>Understand the work.<br>Guide the next decision.</h1><p>A complete learning and operating pack for Duty Graph 0.3. Start with the explainer, follow the guided engagement, then practice the difficult cases.</p><h2>Advisor guides</h2><div class="cards">${guides.map((d) => `<a href="${d.name}">${escapeHtml(d.title)}</a>`).join("")}</div><p><a href="complete-advisor-handbook.html">Open all advisor guides in one printable document</a> · <a href="complete-advisor-handbook.md">Editable Markdown source</a></p><h2>Client examples</h2><p>Actual application-generated packages from the fictional Northstar training company. These are not real client findings.</p><ul>${examples.map((n) => `<li><a href="examples/${n}">${escapeHtml(n)}</a></li>`).join("")}</ul><h2>Technical handoff</h2><ul>${documents
  .slice(guides.length)
  .map((d) => `<li><a href="${d.name}">${escapeHtml(d.title)}</a></li>`)
  .join(
    "",
  )}</ul><h2>Verification and contracts</h2><p>Portable JSON references for the measured local release, its implementation contracts and remaining production acceptance. Verification uses synthetic data; the complete application source remains in the repository.</p><ul>${attachments.map((a) => `<li><a href="${a.name}">${escapeHtml(a.title)}</a></li>`).join("")}</ul>`;
await writeFile(
  `${destination}/index.html`,
  page("Handbook and delivery pack", contents, false),
);
console.log(
  `Built portable handbook: ${documents.length} guides/references, ${examples.length} example files, ${attachments.length} verification/contract references.`,
);
