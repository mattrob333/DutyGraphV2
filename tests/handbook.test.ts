import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownToHtml, safeLink } from "../shared/handbook.ts";
test("handbook treats raw HTML, script links and code as inert text", () => {
  const html = markdownToHtml(
    "# Guide\n\n<script>alert(1)</script>\n\n[bad](javascript:alert)\n\n```\n<img src=x onerror=alert(1)>\n```",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes('href="#"'));
  assert.equal(safeLink("//evil.example"), "#");
  assert.equal(safeLink("../private.json"), "#");
});
test("handbook preserves accessible headings, ordered steps and table headers", () => {
  const html = markdownToHtml(
    "# Guide\n\n1. **Review** the source\n2. Save `v2`\n\n| State | Meaning |\n| --- | --- |\n| Draft | Needs review |",
  );
  assert.match(html, /<h1>Guide<\/h1>/);
  assert.match(html, /<ol><li><strong>Review<\/strong>/);
  assert.match(html, /<th scope="col">State<\/th>/);
});
