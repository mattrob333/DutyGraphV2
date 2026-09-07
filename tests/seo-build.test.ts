import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("SEO publishing rejects broken pages and excludes private surfaces", () => {
  const temporary = mkdtempSync(resolve(tmpdir(), "dutygraph-seo-"));
  const root = resolve(temporary, "client/public");
  const cli = fileURLToPath(
    new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url),
  );
  const script = fileURLToPath(
    new URL("../scripts/verify-seo.ts", import.meta.url),
  );
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
  const html = (name: string) =>
    `<!doctype html><html><head><title>${name}</title><meta name="description" content="Description of ${name}"><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://dutygraph.com/${name}/"></head><body><h1>${name}</h1>${surfaces.map((s) => `<a href="/${s}/">${s}</a>`).join("")}</body></html>`;
  const target = resolve(root, "learn/index.html");
  const run = (write = false) =>
    execFileSync(
      process.execPath,
      [cli, script, ...(write ? ["--write"] : [])],
      {
        cwd: temporary,
        env: { ...process.env, MARKETING_ORIGIN: "https://dutygraph.com" },
        encoding: "utf8",
        stdio: "pipe",
      },
    );
  try {
    for (const surface of [...surfaces, "invite"]) {
      mkdirSync(resolve(root, surface), { recursive: true });
      writeFileSync(resolve(root, surface, "index.html"), html(surface));
    }
    writeFileSync(
      resolve(temporary, "client/index.html"),
      '<meta name="robots" content="noindex,nofollow">',
    );
    assert.match(run(true), /10 public pages/);
    assert.match(run(), /SEO verified/);
    const sitemap = readFileSync(resolve(root, "sitemap.xml"), "utf8");
    assert.ok(!sitemap.includes("/invite/"));
    const rejects = (changed: string, reason: RegExp) => {
      writeFileSync(target, changed);
      assert.throws(
        () => run(),
        (error) => reason.test(String((error as { stderr: string }).stderr)),
      );
      writeFileSync(target, html("learn"));
    };
    rejects(
      html("learn").replace(
        "https://dutygraph.com/learn/",
        "https://wrong.example/learn/",
      ),
      /canonical must equal/,
    );
    rejects(
      html("learn") + '<a href="/missing/">Broken</a>',
      /broken local link/,
    );
    rejects(
      html("learn") + '<a href="/pilot/#missing">Broken anchor</a>',
      /missing anchor/,
    );
    rejects(
      html("learn").replace("<title>learn</title>", "<title>pilot</title>"),
      /duplicate title/,
    );
    rejects(
      html("learn") + '<meta name="robots" content="noindex">',
      /public page is noindex/,
    );
    rejects(
      html("learn") + '<script type="application/ld+json">{broken}</script>',
      /invalid JSON-LD/,
    );
    writeFileSync(
      resolve(root, "learn/orphan.html"),
      html("orphan").replace("/orphan/", "/learn/orphan.html"),
    );
    assert.throws(
      () => run(),
      (error) =>
        /orphaned marketing page/.test(
          String((error as { stderr: string }).stderr),
        ),
    );
  } finally {
    // Remove only the unique temporary directory created by this test.
    assert.equal(dirname(temporary), resolve(tmpdir()));
    assert.ok(temporary.startsWith(resolve(tmpdir(), "dutygraph-seo-")));
    rmSync(temporary, { recursive: true, force: true });
  }
});
