# Hosted pilot: start here

Release 0.3 adds Vercel hosting, a private sample company, encrypted account API-key settings, OpenAI discovery drafts and Resend invitation sending. The earlier guides explain the underlying advisor workflow; this chapter supersedes their local-only and manual-email setup notes. This remains a pilot, with the production gaps listed below.

## First visit

1. Open https://dutygraph-v2.vercel.app and create your advisor account. Choose a strong password and keep it in your password manager; password recovery and email verification are not implemented yet.
2. Open Workspace settings → Explore a fictional company → Open my sample company. Cobalt is private to your account. Loading it does not send email or call AI/search providers. Reopening returns the same sample, preserving your edits.
3. Use Company graph to inspect connected evidence, workflow, teams and duties. Reporting lines appear only where recorded. PostgreSQL holds the authoritative records. Optional Neo4j Aura can project the graph, with current PostgreSQL records available when Aura is absent or behind.
4. Use the company selector → New company workspace for your own business. Keep real records separate from the fictional sample.

## Connect your services

Open Workspace settings → API keys & connections. Enter the provider key and save while signed in to your advisor account. No account password is requested. Keys are encrypted with AES-256-GCM on the server, bound to the account/provider, and never returned to the browser. They apply to all companies in your account. Saving does not make a provider call or verify that a key works. Hosted accounts never share an operator's paid key.

| Service | What to enter | Where to try it |
| --- | --- | --- |
| Exa | Exa project API key | Discovery → Business research |
| OpenAI | OpenAI project API key, model and reasoning effort | Discovery and Strategy |
| Resend | Resend API key and an email address on a domain verified in Resend | Open a participant request → Send invitation email |

Provider billing and account spending limits are managed with each provider. Removing a saved key stops subsequent calls using it; an already-started provider request may finish. The OpenAI connection used by the development assistant is separate from your application's credentials. Do not send API keys through chat or put them in repository files.

The separate **Neo4j company graph** section accepts your Aura URI, database username, database name and database password. Use the `neo4j+s://…databases.neo4j.io` address from Aura. Saving enables metadata sync for companies in your advisor account. **Test connection** verifies the database, and **Build company graph** requests a current projection. Original records remain in PostgreSQL; full evidence text and recordings are not copied. Removing the connection stops later access without deleting copies already in Aura. The pilot advisor account's connection and projection were verified on September 6, 2026. New accounts must save and test their own connection.

## Research a real business before the first meeting

Open Discovery and follow its five steps: **Research & contact**, **Leadership meeting**, **Review the team**, **Team interviews**, and **Review task cards**. The app carries the relevant sources forward. You do not select evidence checkboxes in this journey.

Start with all four public research areas. Draft the preparation email to your one point of contact. Save and preview it, then send the private response link. Use the contact's reply to prepare the live meeting guide. Save the kickoff notes, review the resulting team dossiers, create the personal interviews, and send them to the reviewed team. Returned interviews supply proposed task cards, which need an exact human check.

Read [From business research to confirmed work](23-discovery-to-confirmed-work.md) for each button and handoff. Research has a ten-request allowance per account per day; the guided discovery AI has a separate thirty-run allowance. Provider charges apply. Failed or uncertain attempts count and do not retry automatically.

## Invite someone to answer questions

1. Add the participant with their correct email address. Use a separate participant address when testing; the current pilot does not let one email hold both advisor and participant accounts. Prepare a work-capture or exact-task confirmation request in Discovery.
2. Review the questions, recipient, due date and privacy notice. Configure Resend's verified sender in Settings first.
3. Open the request and click Send invitation email. This is the action that sends email; preparing a request or generating a manual link does not send one.
4. A successful API response appears as Accepted by Resend. Inbox delivery, bounce tracking and reminders are not implemented yet. If the outcome is unknown, check the Resend dashboard before sending again. There are at most fifty attempts per account per rolling 24 hours.
5. The recipient clicks their private seven-day link, creates a participant password (or uses their existing password), reads the notice and opens their assigned questions. They can type answers or record up to 20 minutes. **Save recording** uploads and verifies the clip. If OpenAI is configured, **Create transcript** produces editable text. The participant checks the transcript, adds it to the written answer, then chooses **Send my response**. The recording remains attached. Text drafts save on the same device. A failed transcription keeps the recording and offers an explicit retry or a typed answer.
6. After submission, the advisor sees the returned request in Discovery and reviews it. A participant reply alone does not confirm current task ownership; the existing exact-version confirmation and advisor-review rules still apply.

You can also generate a private link and share it yourself. Every replacement link revokes previous unused links for that request. Withdrawing a request revokes unused invitations and blocks new replies. Links are bearer secrets; do not forward them to someone else. Use **Preview email** to inspect the branded HTML invitation before sending. The email includes the company, the recipient's role, the actual request questions, preparation instructions and a private response link. Replies and full task records are not included in invitation emails.

## What is still unfinished

Firecrawl, email delivery webhooks/reminders, password recovery, verified identity/SSO/MFA, full production retention/deletion, external authority integrations and governed customer-system execution remain open. The graph uses a custom SVG view, with an optional current Neo4j Aura projection and PostgreSQL fallback. The pilot advisor account's live Aura projection and repeat rebuild were verified. Hosted operation and passing tests do not certify the full original production specification.

Provider adapters have automated simulated-response tests. Actual AI quality, Exa results and email receipt require live acceptance with your configured accounts. No live paid AI/search calls or real invitation emails were made during this release verification.

## Current model choices

New OpenAI configurations default to GPT-5.6 Sol with medium reasoning. GPT-6 Astra, GPT-5.6 Terra and GPT-5.6 Luna are also available; legacy configurations remain selectable. The chosen model and reasoning effort apply to meeting briefs, task drafts and hypothesis drafts. Exa performs source collection separately. Modern model calls allow up to 12,000 output tokens including reasoning, with a 105-second provider timeout. High reasoning can take longer and cost more; no automatic model downgrade or retry occurs. Model access depends on your OpenAI project.

API IDs and reasoning support were checked against the [official OpenAI model catalog](https://developers.openai.com/api/docs/models) on September 5, 2026. This update is verified with adapter contract tests, not a claim of live output quality from your key.


### Audio transcription

Transcription uses the advisor account’s encrypted OpenAI key and the `gpt-4o-transcribe` speech model. It is separate from the reasoning model chosen for Discovery. Recordings can be up to 25 MB. The app permits up to three transcription attempts per recording and fifty per account in 24 hours. Completed jobs are reused. Failed or uncertain attempts do not retry automatically. Review the text for names and numbers before submitting. Provider response text is bounded; audio content and provider diagnostics never appear in application errors.

The original clip keeps its checksum and request/person link. The unedited machine transcript is retained with its source recording; retention clears that job result when the recording expires. A participant’s submitted, reviewed text becomes part of the response and can be accepted into evidence. Browser microphone behavior, paid transcription quality and inbox delivery still require acceptance with the configured accounts. Automated tests use synthetic providers and send no email.


If a participant sends audio without written text, open the returned response and create its transcript. Compare it with the recording, correct any errors, then choose **Save reviewed transcript as evidence**. Discovery can now use that text to prepare the next step. The original response and recording remain unchanged. A second copy is not created when the same review is saved again.
