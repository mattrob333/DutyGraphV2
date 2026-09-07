// Build-time validation for our controlled static HTML templates; no network crawl.
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { marketingOrigin as origin } from "./marketing-origin.ts";

const root = resolve("client/public");
// Explicit publication surfaces. Application, private invitation and handbook pages
// are intentionally not discovered into the marketing sitemap.
const surfaces = [
  "landing",
  "learn",
  "pilot",
  "advisors",
  "enterprise",
  "team",
  "directory",
  "newsletter",
  "perspectives",
];
const errors: string[] = [];
const pages = new Map<
  string,
  { html: string; file: string; links: string[] }
>();
const unique = new Map<string, Map<string, string>>();
const decode = (s: string) =>
  s.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
const attrs = (tag: string) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map((m) => [
      m[1].toLowerCase(),
      decode(m[3]),
    ]),
  );
async function htmlFiles(directory: string): Promise<string[]> {
  const items = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of items) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}
function distinct(kind: string, value: string, path: string) {
  if (!value.trim()) {
    errors.push(`${path}: missing ${kind}`);
    return;
  }
  const values = unique.get(kind) || new Map<string, string>();
  if (values.has(value))
    errors.push(`${path}: duplicate ${kind} with ${values.get(value)}`);
  values.set(value, path);
  unique.set(kind, values);
}
for (const surface of surfaces) {
  for (const file of await htmlFiles(resolve(root, surface))) {
    const html = await readFile(file, "utf8");
    const path =
      "/" +
      relative(root, file)
        .split(sep)
        .join("/")
        .replace(/index\.html$/, "");
    const tags = [...html.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map((m) =>
      attrs(m[0]),
    );
    const canonicals = tags.filter((t) => t.rel === "canonical");
    if (canonicals.length !== 1 || canonicals[0].href !== origin + path)
      errors.push(`${path}: canonical must equal ${origin + path}`);
    const descriptions = tags.filter((t) => t.name === "description");
    if (descriptions.length !== 1)
      errors.push(`${path}: expected one description`);
    const titles = [...html.matchAll(/<title>(.*?)<\/title>/gs)];
    if (titles.length !== 1) errors.push(`${path}: expected one title`);
    distinct("title", titles[0]?.[1] || "", path);
    distinct("description", descriptions[0]?.content || "", path);
    if ([...html.matchAll(/<h1\b/gi)].length !== 1)
      errors.push(`${path}: expected one H1`);
    if (
      tags.some(
        (t) => t.name === "robots" && /noindex|none/i.test(t.content || ""),
      )
    )
      errors.push(`${path}: public page is noindex`);
    if (!tags.some((t) => t.name === "viewport"))
      errors.push(`${path}: missing mobile viewport`);
    for (const match of html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    )) {
      try {
        JSON.parse(match[1]);
      } catch {
        errors.push(`${path}: invalid JSON-LD`);
      }
    }
    const links = [...html.matchAll(/<a\b[^>]*>/gi)]
      .map((m) => attrs(m[0]).href)
      .filter(Boolean);
    pages.set(path, { html, file, links });
  }
}
const incoming = new Set<string>();
for (const [path, page] of pages) {
  // Check navigation and assets; external destinations are deliberately not fetched.
  const refs = [
    ...page.html.matchAll(/<(?:a|link|script|img|source)\b[^>]*>/gi),
  ]
    .map((m) => attrs(m[0]))
    .flatMap((t) => [t.href, t.src])
    .filter(Boolean);
  for (const ref of refs) {
    if (/^(?:mailto:|tel:|data:)/i.test(ref)) continue;
    let url: URL;
    try {
      url = new URL(ref, origin + path);
    } catch {
      errors.push(`${path}: invalid URL ${ref}`);
      continue;
    }
    if (url.origin !== origin) continue;
    if (
      url.pathname === "/" ||
      url.pathname === "/login" ||
      url.pathname.startsWith("/api/")
    )
      continue;
    const target = decodeURIComponent(url.pathname);
    const file = resolve(
      root,
      "." + target + (target.endsWith("/") ? "index.html" : ""),
    );
    if (!file.startsWith(root + sep)) {
      errors.push(`${path}: target outside public root`);
      continue;
    }
    try {
      if (!(await stat(file)).isFile())
        errors.push(`${path}: non-file link ${ref}`);
    } catch {
      errors.push(`${path}: broken local link ${ref}`);
      continue;
    }
    if (url.hash && /(?:\.html|\/)$/i.test(target)) {
      const html = pages.get(target)?.html || (await readFile(file, "utf8"));
      const ids = [...html.matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)].map((m) =>
        decode(m[2]),
      );
      if (!ids.includes(decodeURIComponent(url.hash.slice(1))))
        errors.push(`${path}: missing anchor ${ref}`);
    }
  }
  for (const ref of page.links) {
    const url = new URL(ref, origin + path);
    if (url.origin === origin && url.pathname !== path)
      incoming.add(url.pathname);
  }
}
for (const path of pages.keys())
  if (path !== "/landing/" && !incoming.has(path))
    errors.push(`${path}: orphaned marketing page`);
const appShell = await readFile("client/index.html", "utf8");
if (!/name="robots"\s+content="noindex,nofollow"/.test(appShell))
  errors.push("Application shell must remain noindex");
if (errors.length)
  throw new Error(`SEO validation failed:\n${[...new Set(errors)].join("\n")}`);

const paths = [...pages.keys()].sort();
const xml = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${xml(origin + p)}</loc></url>`).join("\n")}\n</urlset>\n`;
const robots = `User-agent: *\nDisallow: /api/\nDisallow: /invite/\nSitemap: ${origin}/sitemap.xml\n`;
if (process.argv.includes("--write")) {
  await writeFile(resolve(root, "sitemap.xml"), sitemap);
  await writeFile(resolve(root, "robots.txt"), robots);
} else {
  if ((await readFile(resolve(root, "sitemap.xml"), "utf8")) !== sitemap)
    throw new Error(
      "Sitemap differs from validated public pages; run npm run build",
    );
  if ((await readFile(resolve(root, "robots.txt"), "utf8")) !== robots)
    throw new Error("Robots sitemap origin differs; run npm run build");
}
console.log(
  `SEO verified: ${pages.size} public pages, unique metadata, canonical origins, local links, anchors, JSON-LD and sitemap. Private app excluded.`,
);
