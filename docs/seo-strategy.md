# DutyGraph search and lead strategy

## Start with a useful answer

The first audience is an advisor, business leader, or internal sponsor who needs to understand work before assigning AI. The offer is a demo and a possible place in a 5–10 company pilot. We do not yet have validated time savings or customer outcome claims.

Published first cluster:

| Page                            | Search intent                                         | Next action                                     |
| ------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| /learn/ai-governance/           | What is AI governance? Where do we start?             | Read the agent guide or try discovery           |
| /learn/ai-agent-governance/     | How do we govern an agent's tasks and access?         | Use the manifest worksheet or join pilot        |
| /learn/ai-governance-landscape/ | Which types of tools exist? Where does DutyGraph fit? | Read primary vendor sources, explore the sample |
| /learn/agent-manifest-template/ | Find a concrete agent review template                 | Download ungated JSON, request a demo           |

These are intent hypotheses, not measured keyword volume estimates. The guides are static HTML with unique titles, descriptions, canonicals, internal links, Article metadata, and a sitemap. App and private participant shells have noindex. The landscape is a representative source-linked map, not a vendor ranking. Recheck sources quarterly and before comparative campaigns.

## Next editorial priorities

1. Agent request and approval workflow: a worked example with explicit source, scope, and review states.
2. AI governance readiness checklist: people, process, inventory, access, evidence, lifecycle.
3. AI agent separation of duties: a prepare-versus-approve example reviewed by a security specialist.
4. Advisor-led process discovery: a real pilot case study when we have permission and measured results.
5. Agent governance audit evidence: records an auditor can inspect; no promise of SOC 2 compliance.

Do not publish thin industry or vendor-alternative pages by replacing names in one template. Add pages only when we can provide a distinct example, evidence, or useful tool. A future dataset of task patterns could support substantive pages by workflow, each with inputs, outputs, handoffs, software boundaries, and review questions.

## Conversion and measurement

All Join the Pilot links reach /landing/#pilot. The public form saves name, email, company, role, team size, goal, and contact consent. A successful receipt means saved, not booked. Duplicate emails do not create duplicate applications. The original record stays stored even if notification delivery fails.

Once a domain is chosen: attach it to Vercel, set MARKETING_ORIGIN to its HTTPS origin, rebuild, and redirect the old public marketing URLs to the new domain. Verify the property in Google Search Console and submit /sitemap.xml. Canonicals currently use the live Vercel origin. Do not redirect private invitation URLs without testing them.

Next analytics setup requires the selected GA4 property/measurement ID and an agreed consent configuration. Track guide views, manifest downloads, walkthrough entry, pilot form start, and successful saved application. Never include names, emails, company names, answers, private-link tokens, or form contents in analytics. No GA tracking is active in this change.

Review Search Console impressions, query intent, indexed pages, and successful applications by entry page monthly. Measure qualified pilot conversations, not just traffic. Expand pages based on actual questions and search evidence.

## Lead email activation

Domain purchase is not required for the form or the public pages. For notification sending, verify a sender domain in Resend and add the supplied DNS records at Porkbun. Forwarding a mailbox alone does not verify permission to send through Resend.

Set these server-only production variables in Vercel, then redeploy:

- PILOT_NOTIFY_RESEND_KEY: a Resend sending key.
- PILOT_NOTIFY_FROM: a verified sender email address (plain address).
- PILOT_NOTIFY_TO: the owner's destination email address (plain address).

Missing or invalid settings leave delivery off. New applications queue atomically through a database trigger. The existing authenticated five-minute maintenance job sends up to five notifications per run. The exact message and recipient are retained during retries. A stable idempotency key prevents provider duplicates within its 24-hour window; after 23 hours of uncertain attempts, the queue stops for operator review. Changing recipient settings does not alter an already attempted message.

The queue starts with applications submitted after migration 0008. Earlier applications remain available in the operator inbox; they are not automatically emailed. No applicant confirmation email is sent. Replies to the notification address the applicant.

Run `node scripts/pilot-inbox.mjs` with the operator database connection to view applications and delivery state. Treat this output as private. For a `review` state, check the provider receipt before any manual resend. A `sent` state records provider acceptance, not proof of inbox delivery. No email is sent until configured.
