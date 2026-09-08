# Hosted pilot: start here

Release 0.3 provides hosted advisor workspaces, a private synthetic sample, encrypted account API-key settings, discovery drafts and invitation email. The current path begins in Discovery and ends with reviewable work records. This remains a pilot, with the production gaps listed below.

## First visit

1. Open https://dutygraph-v2.vercel.app and create your advisor account. Choose a strong password and keep it in your password manager; password recovery and email verification are not implemented yet.
2. Open Workspace settings → Explore a fictional company → Open my sample company. Cobalt is clearly synthetic and private to your account. Loading it does not send email or call AI/search providers. Reopening returns the same sample, preserving your edits.
3. Open **Company Work Map**. Select a business stream and stage to highlight the recorded organization, then select a person to see their duties, tasks and flows. Work with no stage, no owner or a removed stage remains visible for repair. The map uses explicit assignments; it does not infer membership from a title, department, reporting line or task value stage. PostgreSQL holds the authoritative records. Optional Neo4j Aura can project the graph, with current PostgreSQL records available when Aura is absent or behind.
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

Start with the shared compact company snapshot and its proposed business streams. Review the public findings, then draft the preparation email to your point of contact. Save and preview it before sending the private link. The contact opens the kickoff preparation page without an account: they can correct the snapshot, upload a CSV or add the roster manually, connect managers, nominate executive attendees and pilot participants, and share leadership context by typing or voice. The advisor reviews the returned package before importing people or preparing the two-hour leadership meeting.

After the meeting, save the guided notes, review the team dossiers, create one tailored work request per selected pilot participant, and choose which recipients to email. The send review lists the exact people and addresses; previewing or saving a request does not send it. Work response links also open without an account. Each recipient can type or record a response, transcribe a short clip when enabled, review the text, and send it. The advisor then reviews the account and task cards, resolves gaps and ownership, and confirms the exact current work when needed.

Read [From business research to confirmed work](23-discovery-to-confirmed-work.md) for each button and handoff. Research has a ten-request allowance per account per day; the guided discovery AI has a separate thirty-run allowance. Provider charges apply. Failed or uncertain attempts count and do not retry automatically.

## Invite someone to answer questions

1. Add or review the person with their correct email address. Prepare a work-capture or exact-task confirmation request in Discovery.
2. Review the questions, recipient, due date and privacy notice. For a team batch, select the people explicitly and use the review screen to check the final recipient list. Configure Resend's verified sender in Settings first.
3. Open the request and click Send invitation email. This is the action that sends email; preparing a request, previewing the response form or generating a manual link does not send one.
4. A successful API response appears as Accepted by Resend. Inbox delivery, bounce tracking and reminders are not implemented yet. If the outcome is unknown, check the Resend dashboard before sending again. There are at most fifty attempts per account per rolling 24 hours.
5. The recipient opens the private seven-day link without an account or password, reads the notice and answers the assigned questions. They can type or record up to three minutes per clip. When enabled, **Transcribe into my response** adds editable text; they review it before sending. The recording stays in the page until it is transcribed or discarded. Text drafts save on the same device. A failed transcription keeps the recording and allows another attempt or a typed answer.
6. After submission, the advisor sees the returned request in Discovery and reviews it. A response records the person’s account; it does not confirm company ownership, approval or permission to automate. Task cards remain proposed until the advisor reviews them and obtains any required exact-version owner and performer confirmations.

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
