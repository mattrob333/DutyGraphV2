import test from "node:test";
import assert from "node:assert/strict";
import {
  companySocialLinks,
  companyProfileHtml,
} from "../shared/company-profile.ts";
test("profile social links require exact company website provenance and reject lookalike domains", () => {
  const source = {
    id: "s",
    title: "Company",
    url: "https://example.com/about",
    text: "https://www.linkedin.com/company/example/ https://linkedin.com.evil.com/company/fake https://x.com/intent/post https://instagram.com/example",
  };
  assert.equal(companySocialLinks("https://example.com", [source]).length, 2);
  assert.equal(companySocialLinks("https://another.com", [source]).length, 0);
});
test("portable company profile escapes content and preserves stream identity and evidence", () => {
  const job = {
    id: "j",
    created_at: "2026-09-07",
    input: { name: "<script>alert(1)</script>", website: "", sources: [] },
    result: {
      draft: {
        industry: "Consulting",
        summary: "Overview",
        questions: ["What next?"],
        brief: {
          facts: [
            {
              label: "Team",
              category: "scale",
              basis: "Not established",
              value: "Unknown",
              asOf: "",
              citations: [],
            },
          ],
        },
      },
    },
  };
  const html = companyProfileHtml(job, undefined, [
    { name: "Advice", stages: [{ name: "Diagnose" }] },
    { name: "Build", stages: [{ name: "Deliver" }] },
  ]);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Primary business"));
  assert.ok(html.includes("Supporting business stream"));
  assert.ok(html.includes("Diagnose"));
});
