import test from "node:test";
import assert from "node:assert/strict";
import { sendResend } from "../server/invitations.ts";
import { openAiDraft, validateDraft, type AiInput } from "../server/ai.ts";
const input: AiInput = {
  mode: "brief",
  company: "Synthetic",
  sources: [
    {
      id: "source-1",
      title: "Source",
      version: 1,
      hash: "hash",
      state: "accepted",
      locator: "Example",
      text: "Untrusted source text",
      excerpted: false,
    },
  ],
};
const draft = {
  summary: "Draft",
  claims: [
    { text: "May be relevant", basis: "Inferred", sourceIds: ["source-1"] },
  ],
  questions: [],
  tasks: [],
  hypotheses: [],
};
test("Resend transport uses fixed endpoint, idempotency and a plain-text private invitation", async () => {
  let calls = 0;
  const output = await sendResend(
    {
      from: "advisor@example.com",
      to: ["person@example.com"],
      subject: "Private session",
      text: "Synthetic link",
    },
    "test-key",
    "job-id",
    async (url, options) => {
      calls++;
      assert.equal(url, "https://api.resend.com/emails");
      assert.equal((options?.headers as any)["Idempotency-Key"], "job-id");
      assert.equal(options?.redirect, "error");
      assert.equal(
        JSON.parse(String(options?.body)).to[0],
        "person@example.com",
      );
      return new Response(JSON.stringify({ id: "message-id" }));
    },
  );
  assert.equal(output.id, "message-id");
  assert.equal(calls, 1);
  await assert.rejects(
    () =>
      sendResend(
        {
          from: "a@example.com",
          to: ["b@example.com"],
          subject: "Test",
          text: "Test",
        },
        "key",
        "id",
        async () => new Response("private diagnostic", { status: 403 }),
      ),
    /HTTP 403/,
  );
});
test("OpenAI adapter requests structured drafts without tools or stored responses", async () => {
  const result = await openAiDraft(
    input,
    "synthetic-key",
    "gpt-5-mini",
    async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const body = JSON.parse(String(options?.body));
      assert.equal(body.store, false);
      assert.equal(body.tools, undefined);
      assert.equal(body.text.format.type, "json_schema");
      assert.equal(body.text.format.strict, true);
      assert.equal(body.max_output_tokens, 6000);
      return new Response(
        JSON.stringify({
          id: "response",
          status: "completed",
          output: [
            { content: [{ type: "output_text", text: JSON.stringify(draft) }] },
          ],
        }),
      );
    },
  );
  assert.deepEqual(result.draft, draft);
  assert.throws(
    () =>
      validateDraft(
        {
          ...draft,
          claims: [{ ...draft.claims[0], sourceIds: ["other-tenant"] }],
        },
        input,
      ),
    /outside this request/,
  );
  await assert.rejects(
    () =>
      openAiDraft(
        input,
        "key",
        "gpt-5-mini",
        async () =>
          new Response(JSON.stringify({ status: "incomplete", output: [] })),
      ),
    /did not complete/,
  );
  await assert.rejects(
    () =>
      openAiDraft(
        input,
        "key",
        "gpt-5-mini",
        async () =>
          new Response(
            JSON.stringify({
              status: "completed",
              output: [{ content: [{ type: "refusal", refusal: "No" }] }],
            }),
          ),
      ),
    /declined/,
  );
});

import { audioRange } from "../server/audio-range.ts";
test("audio ranges are bounded for hosted playback and reject invalid offsets", () => {
  assert.deepEqual(audioRange("bytes=0-", 5000000), { start: 0, end: 1048575 });
  assert.deepEqual(audioRange("bytes=1048576-2097151", 5000000), {
    start: 1048576,
    end: 2097151,
  });
  assert.deepEqual(audioRange("bytes=-50", 100), { start: 50, end: 99 });
  assert.equal(audioRange("bytes=100-", 100), false);
  assert.equal(audioRange("bytes=20-10", 100), false);
  assert.equal(audioRange("bytes=0-2,4-6", 100), false);
  assert.equal(audioRange(undefined, 100), null);
});

test("current models reach Responses with selected reasoning, sufficient output budget and strict drafts", async () => {
  for (const model of [
    "gpt-6-astra",
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
  ]) {
    await openAiDraft(
      { ...input, reasoning: "high" },
      "synthetic-key",
      model,
      async (url, options) => {
        const body = JSON.parse(String(options?.body));
        assert.equal(body.model, model);
        assert.equal(body.reasoning.effort, "high");
        assert.equal(body.max_output_tokens, 12000);
        assert.equal(body.text.format.strict, true);
        assert.equal(body.store, false);
        return new Response(
          JSON.stringify({
            id: "synthetic-response",
            status: "completed",
            output: [
              {
                content: [{ type: "output_text", text: JSON.stringify(draft) }],
              },
            ],
          }),
        );
      },
    );
  }
});
