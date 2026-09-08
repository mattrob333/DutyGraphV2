import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { briefCategories } from "../shared/business-brief.ts";
import {
  classificationGenerationDraft,
  profileFromClassification,
  validateClassification,
  type ClassificationInput,
} from "../shared/business-classification.ts";
import {
  businessProfileSchema,
  businessTemplates,
} from "../shared/business-types.ts";
import { stageGuidance } from "../shared/stage-guidance.ts";
import { researchQuery } from "../shared/research.ts";

const input: ClassificationInput = {
  name: "Fictional North Advisory",
  website: "https://north.example.com",
  description: "We advise regional manufacturers.",
  revision: 0,
  promptVersion: "synthetic",
  websiteRead: true,
  lookupNote: "Synthetic sources only",
  sources: [
    {
      id: "official",
      title: "North approach",
      url: "https://north.example.com/approach",
      text: "We interview the leadership team before preparing recommendations.",
      retrievedAt: "2026-09-08",
      publishedDate: "2026-08-01",
    },
    {
      id: "peer",
      title: "Fictional South method",
      url: "https://south.example.com/method",
      text: "Our manufacturing advisory team runs an initial process workshop.",
      retrievedAt: "2026-09-07",
      publishedDate: "",
    },
  ],
};
function fixture(): any {
  return {
    industry: "Advisory",
    summary: "A proposed discovery grouping for review.",
    questions: [],
    alternatives: [],
    brief: {
      facts: Object.keys(briefCategories).map((category) => ({
        category,
        label: "Unknown",
        value: "Not established in this fixture.",
        basis: "Not established",
        asOf: "",
        citations: [],
      })),
      monitoring: [],
    },
    recommendations: [
      {
        templateId: "advisory",
        reason: "Company reports advising manufacturers.",
        confidence: "Medium",
        sourceIds: ["description"],
        stages: [
          {
            name: "Understand the engagement",
            description: "Proposed grouping for understanding the client need.",
            functionIds: ["get", "shape"],
            provenance: {
              status: "proposed",
              rationale:
                "The reported leadership interviews suggest a discovery stage; the peer workshop is a comparison to discuss.",
              unknowns: [
                "Whether this company uses workshops is unknown; peer size is unconfirmed.",
              ],
              citations: [
                {
                  kind: "company_reported",
                  sourceId: "official",
                  quote: input.sources[0].text,
                  subject: input.name,
                  relevance:
                    "The company reports interviews before recommendations.",
                },
                {
                  kind: "peer_example",
                  sourceId: "peer",
                  quote: input.sources[1].text,
                  subject: "Fictional South Advisory",
                  relevance:
                    "Both describe manufacturing advisory; workshop use at North is unconfirmed.",
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

test("stage proposals preserve variable counts and resolved source passages and dates across saved-profile parsing", () => {
  for (const count of [1, 4, 9, 16]) {
    const value = fixture();
    value.recommendations[0].stages = Array.from({ length: count }, (_, i) => ({
      ...structuredClone(value.recommendations[0].stages[0]),
      name: `Proposed step ${i}`,
    }));
    // Untrusted model metadata never wins over the source snapshot.
    value.recommendations[0].stages[0].provenance.citations[0].title =
      "Invented title";
    value.recommendations[0].stages[0].provenance.citations[0].publishedDate =
      "2099-01-01";
    const profile = businessProfileSchema.parse(
      JSON.parse(
        JSON.stringify(
          profileFromClassification(validateClassification(value, input)),
        ),
      ),
    );
    assert.equal(profile.streams[0].stages.length, count);
    const provenance = profile.streams[0].stages[0].provenance!;
    assert.equal(provenance.citations[0].title, "North approach");
    assert.equal(provenance.citations[0].publishedDate, "2026-08-01");
    assert.equal(provenance.citations[1].publishedDate, "");
    assert.equal(provenance.citations[1].retrievedAt, "2026-09-07");
    assert.equal(provenance.citations[1].kind, "peer_example");
    assert.match(
      stageGuidance(profile.streams[0].stages[0], profile.streams[0]).label,
      /AI-suggested.*draft/,
    );
  }
});

test("grounding rejects fabricated passages, foreign IDs, peer laundering and peer-only company classification", () => {
  for (const mutate of [
    (v: any) => {
      v.recommendations[0].stages[0].provenance.citations[0].quote =
        "We automatically assign all client work.";
    },
    (v: any) => {
      v.recommendations[0].stages[0].provenance.citations[0].sourceId =
        "another-company-source";
    },
    (v: any) => {
      v.recommendations[0].stages[0].provenance.citations[1].kind =
        "company_reported";
    },
    (v: any) => {
      v.recommendations[0].stages[0].provenance.citations[0].kind =
        "peer_example";
    },
    (v: any) => {
      v.recommendations[0].sourceIds = ["peer"];
    },
    (v: any) => {
      v.recommendations[0].stages[0].provenance.citations = [];
      v.recommendations[0].stages[0].provenance.unknowns = [];
    },
  ]) {
    const value = fixture();
    mutate(value);
    assert.throws(() => validateClassification(value, input));
  }
  const spoofed = structuredClone(input);
  spoofed.sources[0].url =
    "https://north.example.com.attacker.example/approach";
  assert.throws(() => validateClassification(fixture(), spoofed));
});

test("description evidence and uncited AI suggestions stay explicit and legacy jobs retain authored templates", () => {
  const value = fixture();
  const stage = value.recommendations[0].stages[0];
  stage.provenance.citations = [
    {
      ...stage.provenance.citations[0],
      sourceId: "description",
      quote: input.description,
    },
  ];
  let saved = profileFromClassification(validateClassification(value, input));
  assert.equal(saved.streams[0].stages[0].provenance!.citations[0].url, "");
  assert.equal(
    saved.streams[0].stages[0].provenance!.citations[0].publishedDate,
    "",
  );
  stage.provenance.citations = [];
  saved = profileFromClassification(validateClassification(value, input));
  assert.equal(saved.streams[0].stages[0].provenance!.status, "proposed");
  delete value.recommendations[0].stages;
  assert.deepEqual(
    profileFromClassification(validateClassification(value, input)).streams[0]
      .stages,
    businessTemplates.find((t) => t.id === "advisory")!.stages,
  );
  assert.equal(classificationGenerationDraft.safeParse(value).success, false);
});

test("current provider schema requires all fields and peer process retrieval stays in the existing focus", () => {
  const visit = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "object")
      assert.deepEqual(
        [...node.required].sort(),
        Object.keys(node.properties).sort(),
      );
    Object.values(node).forEach((value) => {
      if (Array.isArray(value)) value.forEach(visit);
      else if (typeof value === "object") visit(value);
    });
  };
  visit(z.toJSONSchema(classificationGenerationDraft));
  const query = researchQuery(
    input.name,
    "competitors",
    input.website,
    input.description,
  );
  assert.equal(query.domain, "");
  assert.match(query.query, /documented delivery processes/);
  assert.match(query.query, /not proof of success/);
});
