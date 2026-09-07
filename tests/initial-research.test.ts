import test from "node:test";
import assert from "node:assert/strict";
import {
  collectInitialResearch,
  type ResearchPlan,
} from "../client/src/initial-research.ts";
test("the initial pass runs selected searches in order and resumes without repeating completed work", async () => {
  const original = globalThis.fetch,
    calls: any[] = [];
  let fail = true;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options?.body as string);
    calls.push({
      focus: body.focus,
      key: (options?.headers as any)["Idempotency-Key"],
    });
    if (body.focus === "communities" && fail)
      throw new Error("Synthetic connection lost");
    return new Response(JSON.stringify({ id: body.focus, state: "complete" }), {
      status: 200,
    });
  };
  try {
    let checkpoint: ResearchPlan = {
      intake: { name: "Synthetic", website: "", description: "Example" },
      focuses: ["company", "communities", "competitors", "industry"],
      keys: ["a", "b", "c", "d"],
      index: 0,
      runIds: [],
      classificationKey: "e",
      revision: 0,
    };
    await assert.rejects(
      collectInitialResearch("company", checkpoint, (next) => {
        checkpoint = next;
      }),
    );
    assert.equal(checkpoint.index, 1);
    fail = false;
    const result = await collectInitialResearch(
      "company",
      checkpoint,
      (next) => {
        checkpoint = next;
      },
    );
    assert.deepEqual(result.runIds, [
      "company",
      "communities",
      "competitors",
      "industry",
    ]);
    assert.deepEqual(
      calls.map((c) => c.focus),
      ["company", "communities", "communities", "competitors", "industry"],
    );
    assert.equal(calls[1].key, calls[2].key);
  } finally {
    globalThis.fetch = original;
  }
});
