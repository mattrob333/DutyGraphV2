import { frameworkSpecs } from "../shared/framework-specs.ts";
import type { FrameworkInput } from "../server/frameworks.ts";
import type { FrameworkOutput } from "../shared/framework-output.ts";
export function syntheticFramework(input: FrameworkInput): FrameworkOutput {
  const spec = frameworkSpecs[input.frameworkKey],
    source = input.sources[0]?.id;
  return {
    frameworkKey: input.frameworkKey,
    scope: "Synthetic company and supplied period",
    summary:
      "A synthetic analysis for integration tests. This is not company advice.",
    inputs: spec.inputs.map((v) => ({
      key: v.key,
      status: source ? "Partial" : "Missing",
      value: source
        ? "Synthetic source is available; its coverage is partial."
        : "Required information is missing.",
      sourceIds: source ? [source] : [],
    })),
    sections: spec.sections.map((s) => ({
      id: s.id,
      items: [
        {
          title: `Synthetic ${s.label}`,
          detail: source
            ? "Synthetic finding grounded in a test source."
            : "This section needs a source.",
          basis: source ? "Inferred" : "Missing",
          confidence: "Low",
          confidenceReason: "This is synthetic test evidence.",
          sourceIds: source ? [source] : [],
          values: (s.columns || []).map((c) => ({
            key: c.key,
            value: "Missing",
          })),
          nextStep: "Ask the company to confirm the account.",
        },
      ],
    })),
    questions: ["Which part needs confirmation?"],
    warnings: ["Synthetic test data only."],
  };
}
