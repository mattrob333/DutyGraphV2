import test from "node:test";
import assert from "node:assert/strict";
import { invitationTemplate } from "../server/invitation-template.ts";
import {
  transcribeAudio,
  transcriptionModel,
} from "../server/transcription.ts";

test("invitation template preserves tailored instructions and escapes all HTML fields", () => {
  const result = invitationTemplate({
    company: "Example <script>bad()</script>",
    person: { title: "A & B", data: { role: "CEO", team: "Leadership" } },
    request: {
      title: "First <meeting>",
      data: {
        type: "leadership",
        questionPlanVersion: "discovery-contact:v1",
        emailSubject: "Prepare\nfor kickoff",
        emailBody: "Bring your leadership team.\n\nBring the employee roster.",
        questions: ["What is your <vision> & goal?"],
        dueDate: "2099-01-01",
      },
    },
    url: "https://example.com/invite/private-token",
  });
  assert.equal(result.subject, "Prepare for kickoff");
  assert.ok(result.text.includes("Bring the employee roster."));
  assert.ok(result.text.includes("What is your <vision> & goal?"));
  assert.ok(result.html.includes("What is your &lt;vision&gt; &amp; goal?"));
  assert.ok(!result.html.includes("<script>"));
  assert.ok(result.html.includes("CEO · Leadership"));
  assert.ok(
    result.html.includes('href="https://example.com/invite/private-token"'),
  );
  assert.ok(!result.html.includes("<img"));
});

test("transcription sends bounded multipart audio to the fixed endpoint and preserves text", async () => {
  let calls = 0;
  const result = await transcribeAudio(
    { bytes: Buffer.from("synthetic audio"), mime: "audio/webm;codecs=opus" },
    "synthetic-key",
    async (url, options) => {
      calls++;
      assert.equal(url, "https://api.openai.com/v1/audio/transcriptions");
      assert.equal(options?.redirect, "error");
      assert.equal(
        (options?.headers as any).Authorization,
        "Bearer synthetic-key",
      );
      const form = options?.body as FormData;
      assert.equal(form.get("model"), transcriptionModel);
      assert.equal(form.get("response_format"), "json");
      const audio = form.get("file") as File;
      assert.equal(audio.name, "response.webm");
      assert.equal(await audio.text(), "synthetic audio");
      return new Response(
        JSON.stringify({ text: "We receive the order, then check stock." }),
        { headers: { "x-request-id": "synthetic-request" } },
      );
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.text, "We receive the order, then check stock.");
  assert.equal(result.requestId, "synthetic-request");
});

test("transcription rejects unsupported uploads and hides provider error bodies", async () => {
  let calls = 0;
  const transport: typeof fetch = async () => {
    calls++;
    return new Response("sensitive diagnostic", { status: 401 });
  };
  await assert.rejects(
    () =>
      transcribeAudio(
        { bytes: Buffer.from("x"), mime: "text/html" },
        "test",
        transport,
      ),
    /not supported/,
  );
  assert.equal(calls, 0);
  await assert.rejects(
    () =>
      transcribeAudio(
        { bytes: Buffer.from("x"), mime: "audio/wav" },
        "test",
        transport,
      ),
    (e: any) =>
      e.code === "TRANSCRIPTION_REJECTED" &&
      !e.message.includes("sensitive diagnostic"),
  );
  await assert.rejects(
    () =>
      transcribeAudio(
        { bytes: Buffer.from("x"), mime: "audio/wav" },
        "test",
        async () => new Response("x".repeat(500001)),
      ),
    /too large/,
  );
});

test("work and leadership emails explain their own private capture and review sequence", () => {
  const template = (type: string) =>
    invitationTemplate({
      company: "Synthetic",
      person: {
        title: "Amina",
        data: { role: "Coordinator", team: "Service" },
      },
      request: {
        title: "Explain your work",
        data: { type, questions: ["What do you receive?"] },
      },
      url: "https://example.test/invite/synthetic",
    });
  const work = template("work"),
    leadership = template("leadership"),
    confirmation = template("confirmation");
  for (const message of [work, leadership]) {
    assert.match(message.text, /Voice is preferred/);
    assert.match(message.text, /Save recording/);
    assert.match(message.text, /If you recorded or uploaded audio/);
    assert.match(message.text, /Typed answers can go straight to review/);
    assert.match(message.text, /Send my response/);
    assert.match(
      message.html,
      /href="https:\/\/example.test\/invite\/synthetic"/,
    );
  }
  assert.match(work.text, /Create my task cards/);
  assert.match(work.text, /Approval records your understanding/);
  assert.ok(!leadership.text.includes("Create my task cards"));
  assert.ok(!confirmation.text.includes("Start recording"));
  assert.match(work.html, /<p style="[^"]*">If you recorded/);
});


test("kickoff email has wider labeled sections, real bullets and no exposed bearer URL", () => {
 const result = invitationTemplate({company:"Synthetic",person:{title:"Test",data:{}},request:{title:"Kickoff",data:{questionPlanVersion:"discovery-contact:v1",emailBody:"Meeting context.\n\n- Team roster\n- Goals",questions:["Which leaders?"]}},url:"https://dutygraph.com/invite/synthetic-token"});
 assert.ok(result.html.includes("max-width:800px"));
 for (const heading of ["Your kickoff brief", "Questions to consider", "What to prepare", "About your private link"]) assert.ok(result.html.includes(heading));
 assert.ok(result.html.includes("<ul"));
 assert.ok(!result.html.includes(">https://dutygraph.com/invite/synthetic-token<"));
 assert.ok(result.html.includes('href="https://dutygraph.com/invite/synthetic-token"'));
 assert.ok(result.text.includes("https://dutygraph.com/invite/synthetic-token"));
});
