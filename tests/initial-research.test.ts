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
      context: body.contextRunIds,
      description: body.description,
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
      version: 2,
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
    assert.deepEqual(calls[0].context, []);
    assert.deepEqual(calls[1].context, ["company"]);
    assert.equal(calls[1].description, "Example");
  } finally {
    globalThis.fetch = original;
  }
});

test("resuming a legacy pass retains its original request body for idempotency", async () => {
  const original = globalThis.fetch;
  let sent: any;
  globalThis.fetch = async (_url, options) => {
    sent = JSON.parse(options?.body as string);
    return new Response(JSON.stringify({ id: "legacy", state: "complete" }), {
      status: 200,
    });
  };
  try {
    await collectInitialResearch(
      "company",
      {
        intake: { name: "Legacy", website: "", description: "Consulting" },
        focuses: ["company"],
        keys: ["existing-command"],
        index: 0,
        runIds: [],
        classificationKey: "existing-analysis",
        revision: 0,
      },
      () => {},
    );
    assert.deepEqual(sent, {
      publicName: "Legacy",
      website: "",
      focus: "company",
      acknowledgePublicQuery: true,
    });
  } finally {
    globalThis.fetch = original;
  }
});
