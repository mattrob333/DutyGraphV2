import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { marketingOrigin as origin } from "./marketing-origin.ts";

const root = new URL("../client/public/", import.meta.url);
const settings = JSON.parse(
  await readFile(
    new URL("../content/measurement.json", import.meta.url),
    "utf8",
  ),
);
const measurementId = settings.ga4MeasurementId;
const verification = settings.searchConsoleVerification;
if (measurementId !== null && !/^G-[A-Z0-9]{6,20}$/.test(measurementId))
  throw new Error("Invalid GA4 public measurement ID");
if (verification !== null && !/^[a-zA-Z0-9_-]{20,100}$/.test(verification))
  throw new Error("Invalid Search Console verification tag");
const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const json = (value: unknown) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");
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
  "privacy",
];
await mkdir(new URL("privacy/", root), { recursive: true });
await writeFile(
  new URL("privacy/index.html", root),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy & Website Measurement | DutyGraph</title><meta name="description" content="How DutyGraph handles public inquiries, optional website analytics and your measurement choices. Contact us about your information."><link rel="canonical" href="${origin}/privacy/"><link rel="icon" href="/brand/dutygraph-symbol.svg"><link rel="stylesheet" href="/landing/landing.css"><link rel="stylesheet" href="/learn/learning.css"></head><body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap navigation"><a class="wordmark" href="/landing/">DutyGraph</a><a href="/pilot/">Explore the pilot</a></div></header><main id="main" class="wrap learning"><div class="learn-hero"><p class="eyebrow">A TIER 4 INTELLIGENCE COMPANY</p><h1>Privacy & website measurement</h1><p class="lead">Understand what the public website collects and choose whether to allow optional analytics.</p><p>Updated September 7, 2026</p></div><article class="prose"><section><h2>Inquiries and newsletter interest</h2><p>When you submit an inquiry, we store your name, business email, company, role, team size, stated goal and contact consent so we can review and respond. The newsletter launch list stores your email and newsletter consent separately. Joining that list does not confirm an active newsletter subscription or a pilot place.</p><p>Inquiry records are stored in our application database. If notification delivery is configured, an email service delivers the inquiry notification to our team. This information is used to handle your request. Please do not put confidential client information or sensitive personal information into the public forms.</p></section><section><h2>Optional Google Analytics</h2><p>${measurementId ? "Google Analytics is available on public marketing pages only after you choose Allow analytics." : "Optional Google Analytics is prepared but not yet configured on this release."} It measures which public pages are viewed, worksheet downloads, entry into the fictional demo, and inquiry form starts and successful receipts. We do not send form answers, names, email addresses, employee transcripts or task-card evidence in these analytics events.</p><p>Our events use the public page address without query strings or fragments, and do not include the referring page address. Google receives technical connection information when an allowed analytics request reaches its service and may use analytics cookies to distinguish visits. Advertising storage, advertising personalization and Google signals are disabled in our implementation.</p><p>These measurements describe consenting visitors and successful receipts, including repeat inquiries. They are not a count of unique qualified leads, booked meetings or delivered emails.</p><p><a href="https://policies.google.com/privacy">Google's privacy policy</a> explains how Google handles information received by its services.</p></section><section><h2>Your choices</h2><p>Choose No thanks to continue without loading the Google tag. You can change your decision using Analytics choices in the footer when analytics is configured. We remember the choice in this browser for up to 180 days. Clearing browser storage also resets it. If storage is unavailable, your choice applies to the current page.</p><p>We honor Global Privacy Control and the browser's Do Not Track setting by keeping optional analytics off. Withdrawing consent stops our subsequent analytics events and removes the analytics cookies our page can access. It does not delete data previously received by Google.</p></section><section><h2>Private workspaces</h2><p>This public-site analytics code is not installed in login, private participant links or authenticated company workspaces. Workspaces and participant responses have separate access controls and operational records. This page describes public website measurement; it is not a substitute for an organization's pilot agreement or data-processing arrangements.</p></section><section><h2>Contact us about your information</h2><p>Email <a href="mailto:hello@dutygraph.com">hello@dutygraph.com</a> to ask about an inquiry or newsletter-interest record, request a correction or removal, or raise a privacy question. Include enough information to locate your request. We may need to verify that the request is yours.</p></section></article></main><footer class="wrap learn-footer"><a href="/landing/">DutyGraph</a><a href="mailto:hello@dutygraph.com">Contact</a></footer></body></html>`,
);

async function files(directory: URL): Promise<URL[]> {
  const result: URL[] = [];
  for (const e of await readdir(directory, { withFileTypes: true })) {
    if (e.isDirectory())
      result.push(...(await files(new URL(e.name + "/", directory))));
    else if (e.name.endsWith(".html")) result.push(new URL(e.name, directory));
  }
  return result;
}
const pages = (
  await Promise.all(surfaces.map((s) => files(new URL(s + "/", root))))
).flat();
// Only our published worksheets are eligible download event values.
const downloads = [
  "/learn/agent-manifest.json",
  ...JSON.parse(
    await readFile(
      new URL("../content/directory/taxonomy.json", import.meta.url),
      "utf8",
    ),
  ).map(
    (t: { id: string }) =>
      `/directory/ai-governance/categories/${t.id}/evaluation-worksheet.md`,
  ),
];
for (const file of pages) {
  let html = (await readFile(file, "utf8")).replace(
    /<!-- dutygraph-measurement:start -->[\s\S]*?<!-- dutygraph-measurement:end -->/g,
    "",
  );
  const path =
    "/" + file.href.slice(root.href.length).replace(/index\.html$/, "");
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1] || "DutyGraph";
  const group = path.split("/")[1];
  const snippet = `<!-- dutygraph-measurement:start --><script id="dutygraph-measurement" type="application/json">${json({ measurementId, origin, path, title, group, downloads })}</script><link rel="stylesheet" href="/measurement/measurement.css"><script src="/measurement/measurement.js" defer></script>${path === "/landing/" && verification ? `<meta name="google-site-verification" content="${esc(verification)}">` : ""}<!-- dutygraph-measurement:end -->`;
  html = html.replace("</head>", snippet + "</head>");
  if (!html.includes('href="/privacy/"'))
    html = html.replace(
      "</footer>",
      '<a href="/privacy/">Privacy & measurement</a></footer>',
    );
  await writeFile(file, html);
}
console.log(
  `Prepared consent-gated measurement on ${pages.length} public pages. GA4: ${measurementId ? "configured" : "off"}. Search Console: ${verification ? "tag configured" : "not configured"}.`,
);
