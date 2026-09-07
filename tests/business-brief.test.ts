import test from "node:test";
import assert from "node:assert/strict";
import {
  briefCategories,
  validateBusinessBrief,
} from "../shared/business-brief.ts";
import { researchQuery } from "../shared/research.ts";
import {
  profileFromClassification,
  validateClassification,
} from "../shared/business-classification.ts";

const sources = [
  {
    id: "official",
    title: "Fictional services",
    url: "https://fictional.test.invalid/services",
    text: "We provide AI consulting and custom software builds for regional manufacturers.",
  },
];
const emptyBrief = () => ({
  facts: Object.keys(briefCategories).map((category) => ({
    category,
    label: "Not established",
    value: "Ask leadership; public evidence is missing.",
    basis: "Not established",
    asOf: "",
    citations: [] as any[],
  })),
  monitoring: [] as any[],
});
test("brief requires coverage and rejects invented quotes, foreign sources, unsupported metrics and invented channel sources", () => {
  const brief = emptyBrief();
  assert.doesNotThrow(() => validateBusinessBrief(brief, sources, ""));
  brief.facts[0] = {
    category: "offers",
    label: "Offer",
    value: "AI consulting and custom builds",
    basis: "Reported",
    asOf: "",
    citations: [
      {
        sourceId: "official",
        quote: "We provide AI consulting and custom software builds",
      },
    ],
  };
  assert.doesNotThrow(() => validateBusinessBrief(brief, sources, ""));
  for (const citation of [
    { sourceId: "foreign", quote: "We provide AI consulting" },
    { sourceId: "official", quote: "We have 100 employees." },
  ]) {
    const copy = structuredClone(brief);
    copy.facts[0].citations = [citation];
    assert.throws(() => validateBusinessBrief(copy, sources, ""));
  }
  const unsupported = structuredClone(brief);
  unsupported.facts[2].basis = "Reported";
  unsupported.facts[2].value = "100 employees";
  assert.throws(() => validateBusinessBrief(unsupported, sources, ""));
  assert.throws(() =>
    validateBusinessBrief(
      { ...brief, facts: brief.facts.slice(1) },
      sources,
      "",
    ),
  );
  brief.monitoring = [
    {
      name: "Invented publication",
      feedUrl: "",
      kind: "Publication",
      sourceId: "invented",
      quote: "We provide AI consulting",
      relevance: "Market coverage",
      signal: "Buying intent",
    },
  ];
  assert.throws(() => validateBusinessBrief(brief, sources, ""));
});
test("hybrid streams stay distinct and uncertain alternatives never become operational streams", () => {
  const draft = {
    industry: "AI services",
    summary: "Consulting and custom builds.",
    brief: emptyBrief(),
    questions: ["Which stream is the engagement priority?"],
    alternatives: [
      {
        templateId: "managed-it",
        reason: "Confirm whether ongoing operations are also sold.",
      },
    ],
    recommendations: ["advisory", "custom-software"].map((templateId) => ({
      templateId,
      reason: "Supported by the stated services.",
      confidence: "Medium",
      sourceIds: ["official"],
    })),
  };
  const valid = validateClassification(draft, {
    name: "Fictional",
    website: sources[0].url,
    description: "",
    revision: 0,
    promptVersion: "v2",
    sources,
    websiteRead: true,
    lookupNote: "",
  });
  assert.deepEqual(
    profileFromClassification(valid).streams.map((s) => s.templateId),
    ["advisory", "custom-software"],
  );
  assert.throws(() =>
    validateClassification(
      {
        ...draft,
        alternatives: [{ templateId: "advisory", reason: "Duplicate" }],
      },
      {
        name: "Fictional",
        website: "",
        description: "",
        revision: 0,
        promptVersion: "v2",
        sources,
        websiteRead: false,
        lookupNote: "",
      },
    ),
  );
});
test("later searches use real business context and seek channels instead of generic monitoring tutorials", () => {
  const query = researchQuery(
    "Fictional",
    "competitors",
    "https://fictional.test.invalid",
    "Custom builds",
    sources[0].text,
  );
  assert.equal(query.domain, "");
  assert.match(query.query, /regional manufacturers/);
  assert.match(query.query, /Custom builds/);
  const channels = researchQuery("Fictional", "communities", "", "AI advisory");
  assert.match(channels.query, /homepages/);
  assert.match(channels.query, /Exclude how-to-monitor/);
});

test("published feed addresses require exact evidence, not an invented endpoint", () => {
  const source = {
    id: "channel",
    title: "Fictional manufacturing forum",
    url: "https://forum.test.invalid",
    text: "A community for manufacturing technology leaders. RSS: https://forum.test.invalid/feed.xml",
  };
  const brief = emptyBrief();
  brief.monitoring = [
    {
      name: "Manufacturing forum",
      kind: "Forum",
      sourceId: "channel",
      quote: "A community for manufacturing technology leaders.",
      relevance: "Shared customer market",
      signal: "Questions about implementation",
      feedUrl: "https://forum.test.invalid/feed.xml",
    },
  ];
  assert.doesNotThrow(() => validateBusinessBrief(brief, [source], ""));
  brief.monitoring[0].feedUrl = "https://invented.test.invalid/rss";
  assert.throws(() => validateBusinessBrief(brief, [source], ""));
});
