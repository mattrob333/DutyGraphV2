import test from "node:test";
import assert from "node:assert/strict";
import { normalizeResearch, exaSearch } from "../server/research.ts";
import { publicWebUrl, researchInput } from "../shared/research.ts";
import { schemas } from "../shared/domain.ts";
test("public research rejects credentialed or local URLs and requires an explicit public-query acknowledgement", () => {
  for (const url of [
    "http://localhost",
    "http://127.0.0.1",
    "https://user:pass@example.com",
    "http://internal.local",
    "https://company.com:8443",
    "javascript:alert(1)",
    "https://[::1]",
  ])
    assert.equal(publicWebUrl(url), false, url);
  assert.ok(publicWebUrl("https://www.example.com/about"));
  assert.equal(
    researchInput.safeParse({
      publicName: "Example",
      website: "https://example.com",
      acknowledgePublicQuery: false,
    }).success,
    false,
  );
});
test("research retains bounded inert snapshots, dates and content digests while dropping unusable results", () => {
  const result = normalizeResearch(
    {
      requestId: "test",
      results: [
        { url: "javascript:evil()", text: "ignore" },
        {
          url: "https://example.com",
          title: "<script>inert</script>",
          text: "x".repeat(7000),
          publishedDate: "2026-09-01",
        },
        { url: "https://example.com", text: "duplicate" },
        { url: "https://example.org", text: "" },
      ],
    },
    "2026-09-05T00:00:00Z",
  );
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].text.length, 6000);
  assert.equal(result.sources[0].excerpted, true);
  assert.match(result.sources[0].contentHash, /^[a-f0-9]{64}$/);
  assert.equal(result.sources[0].retrievedAt, "2026-09-05T00:00:00Z");
});
test("Exa adapter uses a fixed endpoint and bounded search with page text, without model summaries or automatic retries", async () => {
  let calls = 0;
  const transport = (async (url: any, options: any) => {
    calls++;
    assert.equal(url, "https://api.exa.ai/search");
    const body = JSON.parse(options.body);
    assert.equal(body.numResults, 5);
    assert.deepEqual(body.includeDomains, ["example.com"]);
    assert.deepEqual(body.contents, { text: true });
    assert.equal(options.redirect, "error");
    return new Response(JSON.stringify({ results: [], requestId: "test" }));
  }) as typeof fetch;
  const result = await exaSearch(
    "Example public business",
    "example.com",
    "synthetic-test-key",
    transport,
  );
  assert.equal(calls, 1);
  assert.deepEqual(result.sources, []);
  await assert.rejects(
    exaSearch("Example", "", "synthetic-test-key", async () => {
      calls++;
      return new Response("secret provider body", { status: 401 });
    }),
    (e) => e instanceof Error && !e.message.includes("secret provider body"),
  );
  assert.equal(calls, 2);
});
test("research titles are trimmed and unusable provider titles fall back to an importable hostname", () => {
  const { sources } = normalizeResearch({
    results: [
      {
        url: "https://example.com/about",
        title: "   \t\n",
        text: "Company description",
      },
      {
        url: "https://example.org/about",
        title: { unexpected: true },
        text: "Another description",
      },
      {
        url: "https://example.net/about",
        title: "  Company overview  ",
        text: "Public overview",
      },
    ],
  });
  assert.deepEqual(
    sources.map((source) => source.title),
    ["example.com", "example.org", "Company overview"],
  );
  for (const source of sources)
    assert.ok(
      schemas.evidence.safeParse({
        title: source.title,
        type: "Public research",
        text: source.text,
        locator: "Research result",
      }).success,
    );
});
test("research preserves serialized URL identity and rejects oversized URLs without truncation", () => {
  const canonical =
      "https://www.example.com/about?section=a%2Fb&version=2#Team",
    prefix = "https://bounded.example/",
    atLimit = prefix + "a".repeat(2000 - prefix.length),
    { sources } = normalizeResearch({
      results: [
        {
          url: "HTTPS://WWW.EXAMPLE.COM:443/about?section=a%2Fb&version=2#Team",
          text: "Original page",
        },
        { url: canonical, text: "Duplicate page" },
        {
          url: atLimit + "x",
          text: "Would link to a different page if truncated",
        },
        {
          url: "https://example.net/" + "é".repeat(400),
          text: "Exceeds the bound after URL serialization",
        },
        { url: atLimit, text: "Exactly at the permitted URL limit" },
      ],
    });
  assert.deepEqual(
    sources.map((source) => source.url),
    [canonical, atLimit],
  );
  assert.equal(sources[0].text, "Original page");
  assert.equal(sources[1].url.length, 2000);
});
