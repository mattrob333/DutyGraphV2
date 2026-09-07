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

The approval workflow, readiness checklist and separation-of-duties guides are now published, bringing the field-guide collection to seven. Specialist review is still a separate requirement before presenting guidance as assurance.

1. Advisor-led process discovery: a real pilot case study when we have permission and measured results.
2. Agent governance audit evidence: records an auditor can inspect; no promise of SOC 2 compliance.
3. Distinct task-pattern worksheets informed by real discovery, with confidential details removed and publication permission.

Do not publish thin industry or vendor-alternative pages by replacing names in one template. Add pages only when we can provide a distinct example, evidence, or useful tool. A future dataset of task patterns could support substantive pages by workflow, each with inputs, outputs, handoffs, software boundaries, and review questions.

## Programmatic publishing added September 7, 2026

The directory has 160 source-linked offering profiles, plus 12 crawlable category buyer guides at `/directory/ai-governance/categories/{category-id}/`. These are different governance layers, not keyword-swapped industry pages. Each guide adds a distinct evaluation scenario, four buyer questions, evidence to request, boundaries, related categories and an ungated Markdown evaluation worksheet. Primary and secondary category membership are labeled and counted separately.

The hub links to every category; profiles link back to their categories; category pages link to relevant profiles and adjacent layers. CollectionPage, ItemList and BreadcrumbList JSON-LD describe visible content. Vendor research dates stay September 6; new editorial guidance is dated September 7. No fake ratings, rankings, customer outcomes or unsupported integration claims are added.

Publishing workflow and validation details: [programmatic SEO](programmatic-seo.md). The deterministic final sitemap includes 191 public pages at this release; it excludes application, invitation and handbook surfaces.

## Conversion and measurement

All Join the Pilot links reach /landing/#pilot. The public form saves name, email, company, role, team size, goal, and contact consent. A successful receipt means saved, not booked. Duplicate emails do not create duplicate applications. The original record stays stored even if notification delivery fails.

All static publishers now share `scripts/marketing-origin.ts`, defaulting to `https://dutygraph.com`. An explicit `MARKETING_ORIGIN` overrides that default and must be HTTPS. The root URL redirects directly to `/landing/`; demo/sample/view queries continue to the app, and known legacy workspace fragments return to `/login`. No blanket cross-host redirect has been added for old private invitations.

Google Search Console property verification and sitemap submission remain operational steps to verify in the owner account. Submit `https://dutygraph.com/sitemap.xml` after verification. A sitemap and crawlable HTML do not establish that Google has indexed or ranked the pages.

The consent-gated tracking code and privacy explanation are implemented; Google activation is pending owner approval. No GA tracking is active with the current null measurement ID. See [website measurement](website-measurement.md) for event definitions and activation. Public receipt counts include repeat inquiries, so qualified leads are measured separately with the operator aggregate report.

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
