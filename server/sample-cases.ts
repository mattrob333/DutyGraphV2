import type { RecordRow } from "../shared/domain.ts";
import { startCase, advanceCase } from "../shared/workflow.ts";
export function sampleCases(records: RecordRow[]) {
  const examples = [
    {
      key: "supplier-workflow",
      sampleKey: "supplier-case-preview",
      title: "Illustrative case · Atlas supplier approval",
      route: [
        "supplier-packet",
        "supplier-draft",
        "supplier-verify",
        "supplier-result",
      ],
      pause: "supplier-approve",
      note: "The bank check is complete. The supplier cannot be activated because the approval owner is not settled.",
    },
    {
      key: "order-workflow",
      sampleKey: "order-case-preview",
      title: "Illustrative case · Beacon order shortage",
      route: ["order-intake", "order-stock"],
      pause: "order-shortage",
      note: "The order is valid. Stock is short. Procurement must obtain the receipt, stock reservation and the customer’s accepted date.",
    },
  ];
  return examples.flatMap((example) => {
    const flow = records.find(
      (r) => r.kind === "workflow" && r.data.sampleKey === example.key,
    );
    if (!flow || records.some((r) => r.data.sampleKey === example.sampleKey))
      return [];
    const at = Date.UTC(2026, 8, 5, 14),
      keyId = (key: string) =>
        records.find((r) => r.data.sampleKey === key)?.id;
    let steps = startCase(flow.data.taskIds, flow.data.links, 24, at);
    const path = [...example.route, example.pause].map(keyId);
    for (let i = 0; i < example.route.length; i++) {
      const step = steps.find((s) => s.id === path[i]);
      if (!step || step.state !== "ready") return [];
      step.state = "completed";
      step.completedAt = new Date(at + i * 60000).toISOString();
      step.dueAt = null;
      step.note = "Illustrative completion. This is not a real observation.";
      step.routes = flow.data.links
        .filter((l: any) => l.from === step.id && l.to === path[i + 1])
        .map((l: any) => l.id);
      steps = advanceCase(steps, flow.data.links, flow.data.joinPolicy, 24, at);
    }
    steps = steps.map((s) => ({
      ...s,
      dueAt: null,
      note: s.id === keyId(example.pause) ? example.note : s.note,
    }));
    return [
      {
        title: example.title,
        data: {
          sampleKey: example.sampleKey,
          sampleVersion: "case-preview-v1",
          workflowId: flow.id,
          workflowVersion: flow.version,
          workflowHash: flow.hash,
          definition: flow.data,
          steps,
          inputReference:
            "Fictional walkthrough only. No business transaction or live timer.",
          events: [],
          executionMode: "illustrative_snapshot",
          summary: example.note,
        },
      },
    ];
  });
}
