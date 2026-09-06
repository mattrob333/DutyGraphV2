export const nextArticles = [
  {
    slug: "ai-governance-readiness-checklist",
    title: "Find the gaps before the pilot starts.",
    description:
      "An AI governance readiness checklist for a scoped enterprise evaluation: sponsor, workflow, evidence, access, data, and review.",
    label: "PREPARE THE EVALUATION",
    sections: [
      [
        "Readiness for one workflow",
        "Start with the workflow you want to understand. An enterprise-wide readiness score can hide a missing owner or unavailable source in the exact process you plan to test. This checklist is a planning aid, not a compliance assessment or certification.",
      ],
      [
        "Name the decision and the people",
        "Write the decision the pilot should support. Name the executive sponsor, the person who runs the work, the participants, and the owner of any affected systems. Confirm who can authorize data collection and who can approve a change. A sponsor and an access approver may be different people.",
      ],
      [
        "Check the information you need",
        "List the source for the current process, relevant policies, software permissions, and a recent example of completed work. Keep dates and owners. Mark unavailable sources as missing. Public research can prepare questions, but it cannot establish internal permissions.",
      ],
      [
        "Agree the collection boundary",
        "Specify what participants may share, which providers will process it, where it is stored, who can read it, and how long it is retained. Confirm any security or procurement review before the first invitation. Do not put confidential material into a public demo or lead form.",
      ],
      [
        "Define success before collection",
        "Choose measures that can be observed: participant completion, time to a reviewed map, advisor effort, unresolved handoffs, and whether the sponsor can make the intended decision. Record a baseline and measurement period. Savings need a separate comparison with real operating data.",
      ],
      [
        "Use a simple decision log",
        "For every item, record Ready, Needs work, or Unknown; name the evidence and the next owner. An unknown is useful because it identifies the next question. Do not average a missing data approval into a reassuring overall score.",
      ],
      [
        "Proceed when the boundary is clear",
        "Begin when the sponsor, work owner, collection terms, participant scope, and intended decision are agreed. If a critical source is unavailable, reduce the scope or resolve the gap first. DutyGraph’s founding pilot is a way to test this method with a focused team.",
      ],
    ],
    sources: [
      [
        "NIST AI RMF core: Govern, Map, Measure, Manage",
        "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/",
      ],
    ],
  },
  {
    slug: "agent-approval-workflow",
    title: "Follow the request all the way to the limit.",
    description:
      "A practical agent approval workflow: request, work context, scope review, approval, issuance, and evidence of downstream enforcement.",
    label: "A WORKED EXAMPLE",
    sections: [
      [
        "A request is not an authorization",
        "A procurement analyst asks for an agent to prepare supplier records. The request describes the problem, desired output, and systems involved. It does not itself permit the agent to change those systems. This example is illustrative.",
      ],
      [
        "1. Read the work context",
        "Link the request to the person’s current task: receive a packet, check required information, and prepare a draft for review. Verify the person’s identity and role from the appropriate sources. Preserve the distinction between an interview account and an approved policy.",
      ],
      [
        "2. Propose a narrow scope",
        "List each resource and action required. Reading an approved folder and creating a draft are different from updating bank details or activating a supplier. Compare requested access with the person’s permitted delegation and company policy. Stop when a required source is missing or stale.",
      ],
      [
        "3. Check combined authority",
        "Review the entire proposed scope. Separate actions can become risky when combined: create a supplier, change its payment details, and approve it. Ask whether the agent or its human owner could control both preparation and approval. Record the policy and any required independent checkpoint.",
      ],
      [
        "4. Review the exact manifest",
        "A reviewer with the required authority inspects the task, source evidence, included actions, excluded actions, and lifecycle conditions. They can trim or reject the request. The approval must bind the exact version; changing its scope requires a new review.",
      ],
      [
        "5. Verify issuance and operation",
        "A production workflow needs supported integrations to create the identity, issue the permitted access, enforce the boundary, and record outcomes. A saved approval is not proof that provisioning succeeded. A failed or uncertain response should remain visible for reconciliation.",
      ],
      [
        "6. Test a change and a stop",
        "Change the owner’s role or expire the approval in a controlled test. Confirm that the relevant access is removed and the action is blocked downstream. DutyGraph’s current governance sample illustrates the request and manifest stages with fictional records and simulated issuance. Live enforcement remains a separate integration requirement.",
      ],
    ],
    sources: [
      [
        "Microsoft Entra agent identity governance",
        "https://learn.microsoft.com/en-us/entra/id-governance/agent-id-governance-overview",
      ],
      [
        "Okta for AI Agents",
        "https://help.okta.com/oie/en-us/content/topics/ai-agents/ai-agents-home.htm",
      ],
    ],
  },
  {
    slug: "ai-agent-separation-of-duties",
    title: "One agent should not quietly become both sides of a check.",
    description:
      "Understand separation of duties for AI agents with a supplier-record example, combined-scope review, and evidence for human checkpoints.",
    label: "CHECK THE COMBINATION",
    sections: [
      [
        "Why the combination matters",
        "A process can separate preparing a change from approving it. When an agent receives permissions across several systems, that separation may disappear. Reviewing one permission at a time can miss the combined capability. The relevant rules depend on the company and process.",
      ],
      [
        "An illustrative supplier example",
        "One person prepares a supplier record. Another verifies bank details. A separate authorized person approves activation. An agent that can create the record, edit the bank details, and approve activation could bypass the intended checks even if each permission has a familiar name.",
      ],
      [
        "Map actions to the control",
        "Write the sensitive action, its resource, the rule requiring separation, and the independent reviewer. Link each proposed agent scope to those items. Inspect the human owner’s other roles and any shared credentials or related agents that could complete the other side.",
      ],
      [
        "A human checkpoint must be real",
        "A label reading “human review” is not enough. Identify who can approve, the exact information they see, the version they approve, and what prevents execution before their decision. Test that the requester cannot approve their own action when policy requires independence.",
      ],
      [
        "Keep exceptions visible",
        "If policy allows an exception, record its approver, reason, duration, compensating checks, and review date. Do not silently widen an agent’s scope because a task is inconvenient. Unknown or conflicting authority should remain unresolved until the appropriate owner decides.",
      ],
      [
        "What DutyGraph contributes",
        "A reviewed work map can show which people prepare, check, approve, and hand off a task. That context can inform an access-policy review. The current governance sample uses fictional records; it does not establish compliance or replace a live IGA policy engine.",
      ],
    ],
    sources: [
      [
        "Saviynt identity governance and administration",
        "https://saviynt.com/products/identity-governance-and-administration",
      ],
    ],
  },
];
