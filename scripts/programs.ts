import { marketingOrigin } from "./marketing-origin.ts";
import { mkdir, writeFile } from "node:fs/promises";
const root = new URL("../client/public/", import.meta.url);
const origin = marketingOrigin;
const pages = [
  {
    slug: "pilot",
    label: "FOUNDING COMPANY PILOT",
    title: "One team. One workflow. A clearer picture.",
    description:
      "Join a focused, advisor-led discovery pilot. Map responsibilities, task handoffs, and software before deciding where AI belongs.",
    interest: "pilot",
    cta: "Request a pilot conversation",
    sections: [
      [
        "A practical starting point for an enterprise",
        "Choose one cross-team workflow that matters: supplier onboarding, customer order handling, or an internal request process. Start with a manageable group of people who actually do the work. The initial scope can sit inside a much larger company.",
      ],
      [
        "What we will work toward together",
        "A reviewed map of people, duties, tasks, software, and handoffs. A record of gaps or disagreements that need a decision. A prioritized next-step brief, with each finding linked to the information behind it. These are pilot deliverables to agree in scope—not a promise that every company will find an automation opportunity.",
      ],
      [
        "01 · Agree the question",
        "Name an executive sponsor and a day-to-day contact. Choose the workflow, participants, decision to support, and information permitted for collection. Agree the scope, schedule, fees, and data-handling terms before work starts.",
      ],
      [
        "02 · Hear from leadership and the team",
        "Use a leadership kickoff to establish goals and review the roster. Each participant then receives a private link to explain their work by voice or text. Voice is preferred because a real example can reveal exceptions and frustrations. The person checks the extracted task cards before submitting.",
      ],
      [
        "03 · Review the work together",
        "The advisor compares accounts, checks evidence, and brings unresolved handoffs or responsibilities back to the right people. A participant confirms their own understanding; this does not settle company authority or approve access.",
      ],
      [
        "04 · Decide what happens next",
        "Hold a readout with the sponsor. Choose a small improvement, collect further evidence, or stop if the findings do not justify more work. Continued support and a later internal handoff are separate decisions.",
      ],
      [
        "A good fit for the first cohort",
        "A sponsor who can convene leadership, a named work owner, a team willing to respond, and one concrete operating question. A starting group of roughly 10–25 participants is our proposed pilot scope, not an enrollment limit or a proven optimal size.",
      ],
      [
        "What we will measure",
        "Response completion, time to first reviewed work map, advisor delivery hours, participant corrections, unresolved handoffs, and sponsor assessment of usefulness. We are recruiting 5–10 pilot companies to test the method. We do not yet have validated speed or savings claims.",
      ],
    ],
  },
  {
    slug: "advisors",
    label: "THE ADVISOR PROGRAM",
    title: "A repeatable method. Your judgment at the center.",
    description:
      "Learn to lead company discovery with DutyGraph, from executive kickoff through participant-reviewed task cards and a useful client readout.",
    interest: "advisor",
    cta: "Discuss the advisor program",
    sections: [
      [
        "Build a practice around understanding the work",
        "DutyGraph is being developed for advisors who help companies identify what to improve and where AI may fit. The proposed path is training, practice in a fictional company, a supervised engagement, and a reviewed handoff. Early advisors help us test and refine the method.",
      ],
      [
        "What you will learn",
        "Qualify a bounded engagement. Prepare a research-based leadership meeting. Turn the agreed roster into useful team questions. Review returned accounts and task cards. Trace findings to evidence. Deliver a clear next-step brief without turning an unverified answer into a fact.",
      ],
      [
        "Practice before working independently",
        "The starter curriculum includes six modules and a sample-company exercise. An experienced reviewer should observe the advisor’s kickoff and inspect the final evidence trail. Completion of a page or quiz is not professional certification or authorization to handle client data.",
      ],
      [
        "The delivery standard",
        "Each engagement needs an agreed scope, named sponsor, approved collection terms, reviewed roster, participant accounts, an unresolved-issues log, and an approved readout. Advisors must distinguish a person’s account, company-approved work, and permission to delegate to an agent.",
      ],
      [
        "Designed for a later handoff",
        "The goal is a company work record that a trained internal owner can maintain. A support period, internal-owner training, and subscription terms would be agreed separately. We are testing delivery effort and the transition before promising a scalable service model.",
      ],
      [
        "For advisory firms and channel organizations",
        "We are exploring an advisor-led licensing model with training, quality review, and company workspaces. Commercial terms, support responsibilities, and distribution arrangements are not finalized. No channel affiliation is implied.",
      ],
      [
        "Start with the training materials",
        "Read the starter curriculum, try the fictional discovery walkthrough, and bring one workflow you know well. Tell us about your advisory experience and whether you can help supervise or run an initial pilot.",
      ],
    ],
  },
  {
    slug: "enterprise",
    label: "ENTERPRISE DISCOVERY & AI GOVERNANCE",
    title: "Know the work behind the agent.",
    description:
      "Connect people, duties, tasks, and software through advisor-led discovery. Start with a focused enterprise evaluation and explicit readiness checks.",
    interest: "enterprise",
    cta: "Discuss an enterprise evaluation",
    sections: [
      [
        "The business question comes first",
        "Before assigning an agent, understand the task it will perform, who is responsible, what information it receives, and what systems it touches. DutyGraph gives an advisor a structured way to collect and review that context with your team.",
      ],
      [
        "Start small enough to learn",
        "An enterprise evaluation can begin with one business unit or workflow. Agree the scope with the sponsor and the teams responsible for security and data. A smaller initial scope makes it easier to inspect the resulting work record and estimate the effort needed to maintain it.",
      ],
      [
        "What is available in the pilot",
        "A hosted advisor workspace, public research collection, private participant requests, voice or typed responses, participant review of extracted task descriptions, a company graph, and advisor review workflows. AI features require configured providers. The public walkthrough uses fictional data.",
      ],
      [
        "What the governance sample demonstrates",
        "A fictional person requests an agent; vendor-shaped identity, HR, and access records inform a proposed manifest. Review and issuance are simulated. The sample does not provision a live Okta or Entra identity, change Saviynt access, or enforce production permissions.",
      ],
      [
        "What an enterprise evaluation must establish",
        "Confirm the intended data, approved providers, hosting requirements, retention and deletion process, identity requirements, audit needs, support coverage, and incident contacts. Validate controls with your security team before collecting real client information.",
      ],
      [
        "Readiness is evidence, not a badge",
        "This page is not a SOC 2 attestation or a security certification. Enterprise SSO, procurement documentation, independent security assessment, service commitments, and required integrations need explicit evaluation. We will distinguish current behavior from work that remains.",
      ],
      [
        "A path from discovery to continued use",
        "First establish a useful work map. Then review improvement opportunities and test an intervention. If continued use makes sense, train an internal owner and agree the subscription and support model. An ongoing engagement is not an automatic outcome of a pilot.",
      ],
    ],
  },
  {
    slug: "team",
    label: "HELP BUILD DUTYGRAPH",
    title: "Build something companies can trust with real work.",
    description:
      "Explore contributing to DutyGraph in enterprise engineering, advisor delivery, identity security, and channel development.",
    interest: "team",
    cta: "Start a team conversation",
    sections: [
      [
        "The problem we are working on",
        "Companies need to understand what people are responsible for before deciding which tasks to delegate to AI. We are building an advisor-led way to collect that work context, review it with the people involved, and connect it to governance decisions.",
      ],
      [
        "The stage, plainly",
        "The hosted pilot product and fictional walkthroughs are available. We are recruiting initial pilot companies and working toward a repeatable delivery method. Customer outcomes, commercial repeatability, and broad enterprise readiness still need evidence.",
      ],
      [
        "Enterprise product engineering",
        "Help turn a working pilot into a reliable enterprise product: tenant isolation, identity, observability, testing, recovery, and carefully scoped integrations. Bring examples of systems you have shipped and operated, including how you handled failure.",
      ],
      [
        "Advisor delivery and enablement",
        "Help run discovery with a real team, challenge unclear findings, and train the next advisor. Show how you facilitate executive conversations, resolve conflicting accounts, and produce a useful readout with a clear evidence trail.",
      ],
      [
        "Identity and security expertise",
        "Help evaluate delegation boundaries, separation of duties, approval records, lifecycle changes, and downstream enforcement. Experience with real IAM and IGA deployments matters more than a broad AI title.",
      ],
      [
        "Channel and enterprise relationships",
        "Help test how a work-discovery product can fit into advisory practices and enterprise procurement. We need evidence from customer conversations and delivery economics before scaling distribution.",
      ],
      [
        "How a conversation starts",
        "Tell us which problem you can help solve and share a nonconfidential example of relevant work. We will discuss scope, availability, and possible terms directly. These are expressions of interest, not confirmed vacancies, employment offers, or promises of equity.",
      ],
    ],
  },
];
for (const p of pages) {
  const links =
    p.slug === "advisors"
      ? '<div class="download"><h2>Open the starter curriculum.</h2><p>Six modules, a practical exercise, and a reviewer rubric.</p><a class="button" href="/handbook/26-advisor-starter-program.html">Read the advisor starter guide →</a><p><a href="/?demo=discovery">Try the participant walkthrough →</a></p></div>'
      : "";
  const url = `/landing/?interest=${p.interest}#pilot`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${p.slug === "pilot" ? "Enterprise Discovery Pilot" : p.slug === "advisors" ? "AI Discovery Advisor Program" : p.slug === "enterprise" ? "Enterprise AI Work Discovery" : "Help Build DutyGraph"} | DutyGraph</title><meta name="description" content="${p.description}"><link rel="canonical" href="${origin}/${p.slug}/"><meta property="og:title" content="${p.title}"><meta property="og:description" content="${p.description}"><meta property="og:type" content="website"><meta property="og:url" content="${origin}/${p.slug}/"><link rel="icon" href="/brand/dutygraph-symbol.svg"><link rel="stylesheet" href="/landing/landing.css"><link rel="stylesheet" href="/learn/learning.css"></head><body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap navigation"><a class="wordmark" href="/landing/"><img src="/brand/dutygraph-symbol.svg" alt="" width="34" height="33"><span>DutyGraph</span></a><nav aria-label="Main navigation"><a href="/pilot/">Pilot</a> · <a href="/advisors/">Advisors</a> · <a href="/learn/">Guides</a></nav></div></header><main class="wrap learning" id="main"><div class="learn-hero"><p class="eyebrow">${p.label}</p><h1>${p.title}</h1><p class="lead">${p.description}</p><div class="learn-actions"><a class="button" href="${url}">${p.cta} ↗</a><a class="text-link" href="/?demo=discovery">See how discovery works →</a></div></div>${links}<div class="article-layout"><nav class="contents" aria-label="On this page"><strong>ON THIS PAGE</strong>${p.sections.map(([h], i) => `<a href="#step-${i}">${h}</a>`).join("")}</nav><article class="prose">${p.sections.map(([h, t], i) => `<section id="step-${i}"><h2>${h}</h2><p>${t}</p></section>`).join("")}</article></div><aside class="learn-cta"><p class="eyebrow">THE NEXT STEP</p><h2>${p.cta}.</h2><p>A short conversation to check fit and agree what comes next. No program place, meeting, or commercial commitment is confirmed by submitting.</p><a class="button" href="${url}">${p.cta} ↗</a></aside></main><footer class="wrap learn-footer"><a href="/landing/">DutyGraph</a><a href="/enterprise/">Enterprise</a><a href="/advisors/">Advisors</a><a href="/team/">Help build DutyGraph</a><a href="/learn/">Field guides</a></footer></body></html>`;
  await mkdir(new URL(`${p.slug}/`, root), { recursive: true });
  await writeFile(new URL(`${p.slug}/index.html`, root), html);
}
console.log("Built pilot, advisor, enterprise, and team pages.");
