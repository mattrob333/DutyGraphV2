import test from "node:test";
import assert from "node:assert/strict";
import { reportRecord, renderReport, reportZip } from "../server/reports.ts";
import type { RecordRow } from "../shared/domain.ts";
import JSZip from "jszip";
const packet = {
  title: "<script>alert(1)</script>",
  company: { name: "Synthetic company", scope: "Test" },
  generatedAt: "2026-09-05T12:00:00Z",
  sourceRevision: 1,
  audience: ["<img src=x onerror=alert(1)>"],
  purpose: "Scope",
  summary: "User-supplied <b>text</b>",
  decisions: "",
  nextSteps: "Review source",
  limitations: "Synthetic",
  coverage: { participants: 1, responded: 0, confirmedTasks: 0, totalTasks: 1 },
  records: [],
  collectionNotice: "Scoped record",
};
test("client HTML escapes source-controlled text and contains no executable script", () => {
  const html = renderReport(packet);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("DRAFT"));
  const training = renderReport({ ...packet, sandbox: true });
  assert.ok(training.includes("This company and its people"));
  assert.ok(!training.includes("Cobalt"));
});
test("person report fields omit email and internal identity mapping", () => {
  const person = {
    id: "p",
    kind: "person",
    title: "Person",
    data: {
      role: "Buyer",
      team: "Procurement",
      email: "private@example.invalid",
      externalId: "secret-subject",
    },
  } as RecordRow;
  const output = JSON.stringify(reportRecord(person, [person]));
  assert.ok(!output.includes("private@example.invalid"));
  assert.ok(!output.includes("secret-subject"));
});
test("CSV neutralizes formulas even after whitespace", async () => {
  const p = {
    ...packet,
    records: [
      {
        kind: "task",
        title: ' =HYPERLINK("https://example.invalid")',
        version: 1,
        state: "proposed",
        id: "t",
        fields: {},
      },
    ],
  };
  const zip = await JSZip.loadAsync(
    await reportZip({ hash: "hash", data: { packet: p } } as RecordRow),
  );
  const csv = await zip.file("record-register.csv")!.async("string");
  assert.ok(csv.includes("\"' =HYPERLINK"));
});
