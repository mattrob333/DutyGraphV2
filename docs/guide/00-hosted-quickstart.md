# Hosted pilot: start here

Release 0.3 adds Vercel hosting, a private sample company, encrypted account API-key settings, OpenAI discovery drafts and Resend invitation sending. The earlier guides explain the underlying advisor workflow; this chapter supersedes their local-only and manual-email setup notes. This remains a pilot, with the production gaps listed below.

## First visit

1. Open https://dutygraph-v2.vercel.app and create your advisor account. Choose a strong password and keep it in your password manager; password recovery and email verification are not implemented yet.
2. Open Workspace settings → Explore a fictional company → Open my sample company. Cobalt is private to your account. Loading it does not send email or call AI/search providers. Reopening returns the same sample, preserving your edits.
3. Use Company graph to inspect connected evidence, workflow, teams and duties. Reporting lines appear only where recorded. PostgreSQL holds records and the derived graph; Neo4j is not connected.
4. Use the company selector → New company workspace for your own business. Keep real records separate from the fictional sample.

## Connect your services

Open Workspace settings → API keys & connections. Enter the provider key and save while signed in to your advisor account. No account password is requested. Keys are encrypted with AES-256-GCM on the server, bound to the account/provider, and never returned to the browser. They apply to all companies in your account. Saving does not make a provider call or verify that a key works. Hosted accounts never share an operator's paid key.

| Service | What to enter | Where to try it |
| --- | --- | --- |
| Exa | Exa project API key | Discovery → Business research |
| OpenAI | OpenAI project API key, model and reasoning effort | AI discovery drafts beneath Business research |
| Resend | Resend API key and an email address on a domain verified in Resend | Open a participant request → Send invitation email |

Provider billing and account spending limits are managed with each provider. Removing a saved key stops subsequent calls using it; an already-started provider request may finish. The OpenAI connection used by the development assistant is separate from your application's credentials. Do not send API keys through chat or put them in repository files.

## Research a real business before the first meeting

1. Enter its public company name and official website in Business research. Review the displayed query and acknowledge sending it to Exa. This search sends the public query, not private interview evidence.
2. Run search and inspect the retrieved source URLs and text. Up to five pages are returned, with up to 6,000 retained characters each. Import useful pages as unreviewed evidence.
3. Under AI discovery drafts, choose First-meeting brief and select up to eight sources. Review the sharing notice and explicitly authorize sending the excerpts to OpenAI. Each source contributes at most 4,000 characters.
4. Review the summary, inferred/assumed/missing claims and questions. Source labels point back to the selected records. A source identifier is a traceability check, not proof that the model interpreted the text correctly.
5. At kickoff, ask the team to correct the draft. Record their answers as new evidence, preserving the original public sources. Review and accept sources before deriving work from them.
6. Choose task drafting or hypothesis drafting when useful. Review task suggestions in the normal task editor, filling missing ownership, boundaries and review dates. Hypotheses remain suggestions to evaluate in Strategy. Nothing is automatically confirmed, approved or executed.

AI history marks drafts stale when their pinned sources change. Model refusals, incomplete results and unexpected citations are not imported. Exa and OpenAI each allow ten attempts per account per rolling 24 hours. Failed or uncertain attempts count. Requests do not retry automatically; check provider usage before deliberately starting another attempt.

## Invite someone to answer questions

1. Add the participant with their correct email address. Use a separate participant address when testing; the current pilot does not let one email hold both advisor and participant accounts. Prepare a work-capture or exact-task confirmation request in Discovery.
2. Review the questions, recipient, due date and privacy notice. Configure Resend's verified sender in Settings first.
3. Open the request and click Send invitation email. This is the action that sends email; preparing a request or generating a manual link does not send one.
4. A successful API response appears as Accepted by Resend. Inbox delivery, bounce tracking and reminders are not implemented yet. If the outcome is unknown, check the Resend dashboard before sending again. There are at most fifty attempts per account per rolling 24 hours.
5. The recipient clicks their private seven-day link, creates a participant password (or uses their existing password), reads the notice and opens their assigned questions. They can type answers or use the existing audio-capture flow. Transcription is not connected; typed answers remain the clearest way to test the complete workflow.
6. After submission, the advisor sees the returned request in Discovery and reviews it. A participant reply alone does not confirm current task ownership; the existing exact-version confirmation and advisor-review rules still apply.

You can also generate a private link and share it yourself. Every replacement link revokes previous unused links for that request. Withdrawing a request revokes unused invitations and blocks new replies. Links are bearer secrets; do not forward them to someone else. Email content includes the company name and private session link, not the participant's answers or full task records.

## What is still unfinished

Neo4j, Firecrawl, audio transcription, email delivery webhooks/reminders, password recovery, verified identity/SSO/MFA, full production retention/deletion, external authority integrations and governed customer-system execution remain open. The graph you see is a custom SVG view over PostgreSQL, not a Neo4j connection or React Flow component. Hosted operation and passing tests do not certify the full original production specification.

Provider adapters have automated simulated-response tests. Actual AI quality, Exa results and email receipt require live acceptance with your configured accounts. No live paid AI/search calls or real invitation emails were made during this release verification.

## Current model choices

New OpenAI configurations default to GPT-5.6 Sol with medium reasoning. GPT-6 Astra, GPT-5.6 Terra and GPT-5.6 Luna are also available; legacy configurations remain selectable. The chosen model and reasoning effort apply to meeting briefs, task drafts and hypothesis drafts. Exa performs source collection separately. Modern model calls allow up to 12,000 output tokens including reasoning, with a 105-second provider timeout. High reasoning can take longer and cost more; no automatic model downgrade or retry occurs. Model access depends on your OpenAI project.

API IDs and reasoning support were checked against the [official OpenAI model catalog](https://developers.openai.com/api/docs/models) on September 5, 2026. This update is verified with adapter contract tests, not a claim of live output quality from your key.
