import test from "node:test";
import assert from "node:assert/strict";
import { strategyContext } from "../server/strategy.ts";
import { validateDraft } from "../server/ai.ts";
import { researchInput, researchQuery } from "../shared/research.ts";
import type { RecordRow } from "../shared/domain.ts";
const record = (id: string, kind: string, data: any, state = "accepted") =>
  ({
    id,
    kind,
    title: id,
    data,
    state,
    version: 1,
    hash: id,
    updated_at: "2026-09-05",
  }) as RecordRow;
test("strategy context uses relevant accepted evidence and excludes withdrawn or stale work", () => {
  const records = [
    record("business", "evidence", { bucket: "biz", text: "public facts" }),
    record("call", "evidence", { bucket: "calls", text: "customer account" }),
    record(
      "private",
      "evidence",
      { bucket: "biz", text: "not accepted" },
      "proposed",
    ),
    record(
      "old",
      "framework",
      { key: "bmc", analysis: "old conclusions" },
      "stale",
    ),
    record(
      "bmc",
      "framework",
      { key: "bmc", analysis: "current interpretation" },
      "review_required",
    ),
    record("person", "person", { email: "private@example.com" }),
  ];
  const business = strategyContext(records, "business");
  assert.deepEqual(
    business.sources.map((s) => s.id),
    ["business", "call", "bmc"],
  );
  assert.ok(!JSON.stringify(business).includes("private@example.com"));
  assert.notEqual(
    business.fingerprint,
    strategyContext(
      [
        ...records,
        record("new", "evidence", { bucket: "biz", text: "new context" }),
      ],
      "business",
    ).fingerprint,
  );
  assert.notEqual(
    business.fingerprint,
    strategyContext(
      records.map((r) =>
        r.id === "business" ? { ...r, state: "retracted" } : r,
      ),
      "business",
    ).fingerprint,
  );
  assert.equal(
    business.fingerprint,
    strategyContext(
      [
        ...records,
        record("other-call", "evidence", {
          bucket: "org",
          text: "outside this group",
        }),
      ],
      "business",
    ).fingerprint,
  );
});
test("strategy context discloses caps and binds even omitted records to change detection", () => {
  const records = Array.from({ length: 30 }, (_, i) =>
    record(String(i).padStart(2, "0"), "evidence", {
      bucket: "biz",
      text: "x".repeat(5000),
    }),
  );
  const context = strategyContext(records, "overview");
  assert.equal(context.sources.length, 24);
  assert.equal(context.omitted, 6);
  assert.ok(
    context.sources.every((s) => s.excerpted && s.text.length === 4000),
  );
  assert.notEqual(
    context.fingerprint,
    strategyContext(
      records.map((r) =>
        r.id === "29" ? { ...r, hash: "changed", version: 2 } : r,
      ),
      "overview",
    ).fingerprint,
  );
});
test("strategy findings require valid source citations and cannot smuggle in task proposals", () => {
  const input = {
    mode: "strategy",
    company: "Synthetic",
    sources: strategyContext(
      [record("source", "evidence", { bucket: "biz", text: "facts" })],
      "overview",
    ).sources,
  };
  const draft = {
    summary: "Draft",
    claims: [
      { text: "Interpretation", basis: "Inferred", sourceIds: ["source"] },
    ],
    questions: [],
    tasks: [],
    hypotheses: [],
  };
  assert.equal(validateDraft(draft, input).summary, "Draft");
  assert.throws(() =>
    validateDraft(
      { ...draft, claims: [{ ...draft.claims[0], sourceIds: [] }] },
      input,
    ),
  );
  assert.throws(() =>
    validateDraft(
      { ...draft, claims: [{ ...draft.claims[0], sourceIds: ["foreign"] }] },
      input,
    ),
  );
});
test("community and competitor research uses the wider web and preserves company-domain search", () => {
  assert.equal(
    researchInput.parse({ publicName: "Acme", acknowledgePublicQuery: true })
      .focus,
    "company",
  );
  assert.equal(
    researchQuery("Acme", "company", "https://example.com").domain,
    "example.com",
  );
  assert.equal(
    researchQuery("Acme", "communities", "https://example.com").domain,
    "",
  );
  assert.match(researchQuery("Acme", "communities", "").query, /subreddit/);
  assert.match(researchQuery("Acme", "industry", "").query, /headcount/);
});
