// Editorial pages, not keyword-swapped variants. Review vendor sources quarterly.
export const articles = [
  {
    slug: "ai-governance",
    title: "AI governance starts with the work.",
    description:
      "A practical guide to AI governance: responsibilities, risk, access, evidence, and the first questions to ask your team.",
    label: "THE BIG PICTURE",
    sections: [
      [
        "What is AI governance?",
        `AI governance is the set of responsibilities, decisions, and checks a company uses to guide how AI is chosen, used, and reviewed. It covers more than software access. It also asks whether a use is appropriate, how people can challenge an output, and who acts when something goes wrong.
An inventory is a useful start. A usable governance process connects each AI use to a business purpose, a responsible person, an approval, and evidence of what happened.`,
      ],
      [
        "Four questions to organize the work",
        `NIST’s voluntary AI Risk Management Framework uses four functions: Govern, Map, Measure, and Manage. It is a way to organize risk work, not a certification.
Govern: Who makes decisions and who is accountable? Map: What is the context, who is affected, and what could go wrong? Measure: What evidence tells us how the system behaves? Manage: What will we change, limit, or stop when the evidence calls for action?`,
      ],
      [
        "Start with one real task",
        `Consider a team preparing supplier records. An assistant might read a packet and draft missing fields. Changing bank details or approving a supplier is a different action with different consequences. Calling all of these “supplier automation” hides the decisions that matter.
Write down the input, the steps, the expected output, the next recipient, and the software used. Then identify the steps that need a person’s judgment and the actions that require separate permission. This makes a policy specific enough for an operator to use.`,
      ],
      [
        "Separate the types of control",
        `Business review asks whether the work should be done and whether the result is useful. Identity and access controls determine which account can act on which resource. Runtime controls check actions as they happen. Risk and compliance work sets the wider rules and retains evidence.
These layers overlap. Buying one tool does not remove the need to decide who owns the process. Ask which controls are actually enforced, which are recommendations, and which require another system.`,
      ],
      [
        "What to collect in discovery",
        `Ask leadership for goals, priorities, departments, and the people who should take part. Ask team members to explain a recent task in their own words. Capture delays, exceptions, handoffs, and software use alongside the normal process.
Let each person review the task description extracted from their account. Their confirmation means “this describes my understanding of my work.” It does not grant access, prove company policy, or settle a disagreement with another team. An advisor can compare those accounts and resolve the gaps.`,
      ],
      [
        "Where DutyGraph fits",
        `DutyGraph starts with advisor-led discovery and a connected record of people, duties, and tasks. The pilot is intended to test that process with real teams. Its governance sample illustrates how that work context can inform an agent request and a proposed manifest.
The sample does not provision a live identity or enforce permissions in another system. Use the landscape guide to understand the other layers a production program may need.`,
      ],
    ],
    sources: [
      [
        "NIST AI Risk Management Framework",
        "https://www.nist.gov/itl/ai-risk-management-framework",
      ],
      [
        "NIST: the four core functions",
        "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/",
      ],
    ],
  },
  {
    slug: "ai-agent-governance",
    title: "Before an agent acts, define its job.",
    description:
      "A practical AI agent governance checklist covering human ownership, tasks, scopes, approvals, exceptions, and lifecycle changes.",
    label: "FROM POLICY TO A TASK",
    sections: [
      [
        "What changes when AI can take action?",
        `A tool that drafts an answer and an agent that changes a business record create different review needs. An agent can cross systems, pass data to another tool, and repeat a mistake. Governance needs to describe actions and resources, not just the model in use.
For each proposed agent, name the task it supports, the person responsible for that work, the allowed systems, and the conditions that require a human decision.`,
      ],
      [
        "Use six checks before approval",
        `Purpose: Is the requested task clear, with an input and a useful output? Ownership: Is there a named human responsible for it? Scope: Are actions limited to the resources needed for that task?
Separation of duties: Could the proposed combination let one agent both prepare and approve a sensitive change? Evidence: Can a reviewer trace the request to the work description and relevant policy? Lifecycle: What happens when the owner changes jobs, leaves, or no longer needs the agent?`,
      ],
      [
        "Example: draft a supplier record",
        `The request is to turn an approved source packet into a draft supplier record. The allowed actions might be to read a designated folder and create a draft in a staging area. The agent should not infer that this includes bank-account changes, supplier activation, or payment release.
A reviewer should inspect the exact resources and actions. A broad “write suppliers” permission may exceed the job even if the human has that permission. The proposed scope should be the intersection of what the task needs, what the human may delegate, and what company policy allows.`,
      ],
      [
        "A sensible request-to-review flow",
        `Start with the person’s request and current task description. Read identity, HR, and access records from their actual sources. Keep source dates and distinguish verified facts from missing information.
Draft a manifest, show the requested and excluded actions, and route it to the responsible reviewer. Approval should identify the exact version reviewed. Live issuance, runtime enforcement, and revocation then need working integrations and evidence that each action succeeded.`,
      ],
      [
        "Questions to ask a governance vendor",
        `Can we trace an agent back to its owner and business task? Can you show the source of each permission? What happens if a source is stale or unavailable? Can a reviewer reduce scope? How do you detect conflicting combinations of permissions?
Ask for a demonstration of a role change and a failed revocation. A dashboard that records an intention is different from proof that the downstream system changed. Microsoft Entra and Okta document agent identity governance capabilities; evaluate their current requirements alongside your own systems.`,
      ],
      [
        "Try the work-context layer",
        `DutyGraph’s fictional company sample shows a request being evaluated against vendor-shaped records and turned into a proposed manifest. It is a demonstration of the workflow, with simulated approval and issuance.
The pilot starts earlier: leadership kickoff, team responses, participant-reviewed task cards, and advisor review. That work record gives a future agent request a concrete purpose. Download the manifest worksheet to use the same questions in your own review.`,
      ],
    ],
    sources: [
      [
        "Microsoft Entra: governing agent identities",
        "https://learn.microsoft.com/en-us/entra/id-governance/agent-id-governance-overview",
      ],
      [
        "Okta for AI Agents",
        "https://help.okta.com/oie/en-us/content/topics/ai-agents/ai-agents-home.htm",
      ],
    ],
  },
  {
    slug: "ai-governance-landscape",
    title: "One landscape. Several different jobs.",
    description:
      "Explore a source-linked map of AI governance, agent identity, access governance, and DutyGraph’s work-discovery layer.",
    label: "THE GOVERNANCE LANDSCAPE",
    sections: [
      [
        "Read the market by the problem it solves",
        `“AI governance” describes several related markets. Some products focus on enterprise risk and policies. Others focus on agent identities and access. DutyGraph begins with the people doing the work and the tasks they may eventually delegate.
The map below is a representative starting point, not an exhaustive directory or a ranking. Categories overlap. Descriptions summarize vendors’ own public material, checked on September 6, 2026; they are not independent product tests.`,
      ],
      [
        "Where DutyGraph sits",
        `Our starting point is advisor-led discovery: capture how work happens, let people review their task descriptions, and connect people, duties, tasks, and software. This gives a reviewer business context for an agent request.
Identity vendors already address agent ownership and lifecycle. DutyGraph does not claim to replace those controls. Its current governance sample uses fictional, vendor-shaped records and simulated issuance. Live provisioning and enforcement require separate integrations.`,
      ],
      [
        "How to use this map in a buying conversation",
        `Write down your immediate problem before creating a shortlist. If it is an unknown inventory of AI systems, ask about discovery coverage. If it is excessive access, ask about entitlement sources and enforcement. If nobody can explain the task an agent is meant to perform, start with work discovery.
For each shortlisted tool, request a walkthrough using one of your tasks. Follow the evidence from request to approval, live action, review, and removal. Record which steps the product performs and which depend on your team or another system.`,
      ],
      [
        "Avoid the single-platform assumption",
        `A company can need more than one layer. The important question is how they exchange identifiers, policies, decisions, and audit records. Check that a human owner means the same person across HR, identity, and governance records.
Treat a missing connector as implementation work. Treat a simulated connector as a demo. Before production, test both normal actions and failures with the teams who own the source systems.`,
      ],
    ],
    sources: [
      ["NIST AI RMF", "https://www.nist.gov/itl/ai-risk-management-framework"],
    ],
  },
  {
    slug: "agent-manifest-template",
    title: "Put the agent’s boundaries in writing.",
    description:
      "Download an editable agent manifest JSON worksheet for human ownership, duties, tasks, software scopes, approvals, and lifecycle review.",
    label: "A PRACTICAL WORKSHEET",
    sections: [
      [
        "What is an agent manifest?",
        `In this guide, an agent manifest is a structured record of the job an agent is proposed to do and the limits around it. It links a human owner, a task, allowed resources and actions, review requirements, and lifecycle conditions.
This downloadable JSON file is a DutyGraph planning worksheet. It is not an industry standard, a credential, a signed approval, or an executable access policy. It deliberately starts in draft state with missing values.`,
      ],
      [
        "Fill it out from evidence",
        `Start with one task. Record the input, instructions, output, next recipient, and software. Add references to the person’s account and any policy that controls the work. Record when identity and access information was checked.
List allowed actions separately from excluded actions. Replace each placeholder with a real resource identifier and a specific action. Do not place passwords, API keys, personal interview transcripts, or bearer tokens in this file.`,
      ],
      [
        "Example boundaries",
        `For a supplier-record drafting assistant, the allowed work might be “read the approved packet” and “create a staging draft.” The excluded work could include changing bank details, approving the supplier, or releasing payments.
The human review checkpoint might require a named reviewer before any record is activated. If the packet is incomplete or source permissions cannot be verified, the manifest should specify that the process stops and asks the responsible person.`,
      ],
      [
        "Review before implementation",
        `Ask the task owner whether the description matches the work. Ask an authorized reviewer whether the proposed delegation is permitted. These are different questions. Record unresolved conflicts instead of making the manifest appear complete.
A production implementation needs validation against current access and separation-of-duties policy. It also needs a supported way to issue the identity, enforce the allowed actions, log results, and revoke access. The worksheet alone does none of those things.`,
      ],
      [
        "Keep the version and the lifecycle together",
        `When a task changes, compare the new manifest with the approved version. A broader resource scope or new action should trigger review. Decide who receives an alert when the owner changes role or leaves.
Record a review date, an expiry, and the system responsible for revocation. Test that revocation actually reaches the downstream systems. In DutyGraph’s sample these stages are illustrated with fictional records; the pilot helps establish the work descriptions that come before them.`,
      ],
    ],
    sources: [],
  },
];

export const vendors = [
  {
    name: "IBM watsonx.governance",
    category: "AI risk & oversight",
    description:
      "Enterprise AI governance and assurance across models, applications, and agents.",
    url: "https://www.ibm.com/products/watsonx-governance",
  },
  {
    name: "Credo AI",
    category: "AI risk & oversight",
    description:
      "A platform for enterprise AI governance and oversight, including agentic AI.",
    url: "https://www.credo.ai/",
  },
  {
    name: "Microsoft Entra",
    category: "Identity & access",
    description:
      "Agent identity objects and governance of access rights across their lifecycle.",
    url: "https://learn.microsoft.com/en-us/entra/id-governance/agent-id-governance-overview",
  },
  {
    name: "Okta",
    category: "Identity & access",
    description:
      "Agent visibility, least-privilege access, and identity governance.",
    url: "https://help.okta.com/oie/en-us/content/topics/ai-agents/ai-agents-home.htm",
  },
  {
    name: "Saviynt",
    category: "Identity & access",
    description:
      "AI identity visibility, lifecycle governance, and access controls.",
    url: "https://saviynt.com/products/zuma",
  },
  {
    name: "DutyGraph",
    category: "Work discovery",
    description:
      "Advisor-led discovery connecting people, duties, tasks, and software. Governance workflow available as a fictional sample.",
    url: "/landing/#delegation",
  },
];
