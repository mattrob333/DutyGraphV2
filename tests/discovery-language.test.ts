import test from "node:test";
import assert from "node:assert/strict";
import {
  discoveryFailure,
  openAiDiscovery,
  type DiscoveryInput,
} from "../server/discovery.ts";
import { AppError, pool } from "../server/db.ts";

const input: DiscoveryInput = {
  stage: "interviews",
  company: "Fictional company",
  sources: [],
  people: [],
  fingerprint: "fictional",
  omitted: 0,
};
test("discovery identifies provider timeout without claiming an automatic retry", () => {
  const failure = discoveryFailure(
    new DOMException("timed out", "TimeoutError"),
  );
  assert.equal(failure.state, "unknown");
  assert.match(failure.message, /105 seconds/);
  assert.match(failure.message, /no retry runs automatically/);
  assert.equal(
    discoveryFailure(new AppError(502, "PROVIDER", "Provider failed")).state,
    "failed",
  );
  assert.match(
    discoveryFailure(new TypeError("fetch failed")).message,
    /connection/,
  );
});
test("provider keeps complete short questions and rejects fragments without making another call", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  let fragment = false;
  globalThis.fetch = async (_url, options) => {
    calls++;
    const body = JSON.parse(String(options?.body));
    assert.match(body.instructions, /NEVER split one sentence/);
    assert.match(body.instructions, /ASD-STE100/);
    return new Response(
      JSON.stringify({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  interviews: [
                    {
                      questions: [
                        fragment
                          ? "Check the result and send it to"
                          : "How do you check your work? Who receives it next?",
                      ],
                    },
                  ],
                }),
              },
            ],
          },
        ],
      }),
    );
  };
  try {
    const result: any = await openAiDiscovery(
      input,
      "fictional-key",
      "gpt-5.6-sol",
    );
    assert.equal(result.interviews[0].questions.length, 1);
    fragment = true;
    await assert.rejects(
      openAiDiscovery(input, "fictional-key", "gpt-5.6-sol"),
      /unfinished questions/,
    );
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
    await pool.end();
  }
});
