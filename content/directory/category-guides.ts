// Original editorial guidance. Product claims remain in the separately sourced research files.
export type CategoryGuide = {
  title: string;
  description: string;
  trigger: string;
  example: string;
  questions: string[];
  evidence: string[];
  boundary: string;
  workContext: string;
};
export const categoryGuides: Record<string, CategoryGuide> = {
  "work-delegation": {
    title: "Work Discovery & Human Delegation Tools",
    description:
      "Compare work discovery and human delegation tools. Map duties, task inputs, outputs and approval boundaries before requesting an AI agent.",
    trigger:
      "Start here when a team asks for an agent but cannot yet describe its exact job. An org chart names people; the missing information is often what arrives, what each person does, and what the next person needs. Interview the people doing the work before treating a broad duty as an automation specification.",
    example:
      "In a fictional procurement team, 'maintain supplier records' contains several different tasks: check a document packet, prepare a draft record, resolve missing information, request Finance verification, and route approval. A document-completeness draft is a different delegation from changing banking details. Give each task a named human, an output and a stopping condition.",
    questions: [
      "Can one duty become several independently reviewable tasks, with inputs, actions, software and handoffs?",
      "Can two employees describe the same handoff differently without one account silently replacing the other?",
      "Does confirming a task description remain separate from approving access or issuing an agent?",
      "Can a reviewer trace a proposed delegation back to the original account and the exact version reviewed?",
    ],
    evidence: [
      "A task card and its source account",
      "A disagreement preserved for review",
      "A bounded delegation proposal with explicit exclusions",
    ],
    boundary:
      "A clear task record does not enforce access at runtime. Identity, policy checks and runtime controls still need to restrict the deployed agent. Process mining and task mining are adjacent ways to discover work; they can provide useful evidence even when they do not produce an agent delegation record.",
    workContext:
      "DutyGraph is being developed in this layer. Its advisor-led pilot connects employee accounts to granular task cards and proposed delegation. Product fit and discovery outcomes still need validation with pilot teams.",
  },
  "agent-building": {
    title: "AI Agent Building & Orchestration Platforms",
    description:
      "Evaluate AI agent builders and orchestration platforms using approval, recovery, versioning and tool-boundary questions, with source-linked profiles.",
    trigger:
      "Explore this layer after a task has a usable specification and someone owns the outcome. Builders turn instructions and tools into executable workflows. Your evaluation should exercise how execution behaves when a tool fails, a person rejects a step, or a run needs to resume.",
    example:
      "For a fictional service desk, an agent may classify a request and draft a response. In a demonstration, interrupt the workflow after classification and before sending. Resume it, change the draft, then reject the send. Observe whether recovery repeats an external action and whether the approval still applies to the edited content.",
    questions: [
      "Which tool calls require approval, and is approval bound to the exact proposed action?",
      "What happens after a timeout when the remote system may already have accepted the request?",
      "Can workflow, model and prompt versions be reconstructed for an earlier run?",
      "How are credentials isolated between customers, employees and separate agent runs?",
    ],
    evidence: [
      "A recorded failure-and-resume demonstration",
      "Versioned workflow configuration",
      "Tool-call and approval logs from the same execution",
    ],
    boundary:
      "An orchestration feature is not evidence that every connected system enforces the intended policy. Verify the limits of each tool and connector. A builder also cannot establish that the business needed the proposed workflow in the first place.",
    workContext:
      "Use a reviewed work unit as the implementation brief: a defined input, expected result, permitted tools, human checkpoint and stop condition. DutyGraph's discovery examples help frame that brief; a directory listing is not a working connector.",
  },
  "agent-discovery": {
    title: "AI Agent Discovery & Inventory Tools",
    description:
      "Explore agent inventory and shadow AI discovery tools. Ask about coverage, unknown owners, reconciliation and the evidence behind each discovered asset.",
    trigger:
      "Start an inventory evaluation when teams cannot explain which agents exist, who owns them, or where they run. Separate the assets a tool can actually observe from those it infers. An empty result for an unconnected environment should not look like proof that no agents exist there.",
    example:
      "Place a fictional test agent in an approved development environment and another in a separately scoped sandbox. Ask the vendor to identify which surfaces it can see, how each agent was found, and how a duplicate identity is reconciled. Remove one asset and inspect how long the inventory takes to reflect that change.",
    questions: [
      "Which environments and identity types are observed, and which remain outside coverage?",
      "What evidence makes this asset an agent rather than a service account or application?",
      "How are owner assignments established and unowned assets queued for review?",
      "Can changes and deletions be distinguished from a connector that stopped reporting?",
    ],
    evidence: [
      "A connector coverage map",
      "Discovery provenance and last-seen timestamps",
      "An ownership and duplicate-resolution record",
    ],
    boundary:
      "Finding an agent does not establish its business purpose or prove its permissions are appropriate. Connect inventory to access review and work ownership. Avoid treating discovery coverage as a security or compliance verdict.",
    workContext:
      "The upstream question is why the agent exists: which person's duty and which task justify it? A work map can supply that business context while inventory tools report the assets they observe.",
  },
  "identity-access": {
    title: "AI Agent Identity & Access Management Tools",
    description:
      "Compare agent identity and access tools with questions about human ownership, least privilege, credential lifetime, revocation and delegation evidence.",
    trigger:
      "Evaluate this layer when an agent needs an identity or credentials to reach company systems. Begin with the task and resource boundary. A person's broad account access should not automatically become the permissions of every agent they request.",
    example:
      "A fictional analyst needs an agent to read approved invoice records and prepare an exception list. Request read access to that bounded dataset, then attempt an update and access to a different team's data. Change the analyst's role and test revocation. Record where propagation is immediate and where a token may remain usable.",
    questions: [
      "Is the agent linked to a responsible human and a specific delegation record?",
      "Can access be limited by action, resource, tenant and duration rather than a broad application role?",
      "How are credentials issued, rotated and revoked, including already-issued tokens?",
      "What happens to agent access when its owner leaves, changes role or loses an entitlement?",
    ],
    evidence: [
      "An entitlement and resource-scope record",
      "Allowed and denied access attempts",
      "A lifecycle change with measured revocation behavior",
    ],
    boundary:
      "Authentication answers which identity is calling. It does not, by itself, explain why a business task was delegated or whether every requested action is appropriate. Runtime authorization and separation-of-duties decisions may live in other systems.",
    workContext:
      "Discovery should produce the reason for access before credentials are requested. DutyGraph can describe proposed task boundaries; the connected identity and access systems must enforce actual permissions.",
  },
  "runtime-controls": {
    title: "AI Agent Runtime Authorization & Control Tools",
    description:
      "Evaluate runtime authorization for AI agents: action checks, approval binding, fail-closed behavior and enforcement across tool calls.",
    trigger:
      "Look here when a proposed agent can perform consequential actions and you need a decision at execution time. A policy written in a manifest is only useful if the execution path checks it. Draw the full path from agent to tool to target system before assessing coverage.",
    example:
      "For a fictional procurement agent, allow preparation of a supplier draft but require a separate approval for activation. Try the activation through each available tool path, alter the payload after approval, and make the authorization service unavailable. The demonstration should reveal bypasses and the documented failure behavior.",
    questions: [
      "Where is the decision enforced, and can another connector bypass it?",
      "Is approval tied to the exact resource, action, payload and policy version?",
      "Does a failed policy lookup deny, defer or allow the action?",
      "How do expiry, replay prevention and emergency revocation work for pending actions?",
    ],
    evidence: [
      "An enforcement-path diagram",
      "Denied bypass and altered-payload attempts",
      "Decision logs identifying the policy and approval versions",
    ],
    boundary:
      "Runtime controls evaluate actions in their coverage. They do not establish whether the company's policy is correct, resolve an unclear business owner, or guarantee that an allowed action produces a good outcome.",
    workContext:
      "An explicit work unit makes the policy review concrete: prepare this artifact, read these resources, and stop before this decision. That is the upstream specification DutyGraph aims to help an advisor assemble.",
  },
  "agent-security": {
    title: "AI Agent Security & Threat Detection Tools",
    description:
      "Explore agent security tools using concrete prompt-injection, tool misuse, detection and response scenarios, with product evidence and limitations.",
    trigger:
      "Use this category when agents consume untrusted content or can act through tools. Define the attack surface: incoming documents, retrieved pages, prompts, connectors and outputs. Ask which surfaces are inspected and whether the product blocks, alerts or only records a suspicious event.",
    example:
      "In a controlled fictional test, put an instruction to export supplier information inside a document that an assistant is meant to summarize. Observe whether the instruction is treated as document content, whether a prohibited tool call is attempted, and what an operator can investigate afterward. Use synthetic data and an isolated target.",
    questions: [
      "Which prompt-injection and tool-abuse surfaces are tested, and which are excluded?",
      "Does the product prevent the action or notify someone after it occurred?",
      "How are benign unusual requests separated from attacks, and how can false positives be reviewed?",
      "What evidence is available for response without exposing unnecessary sensitive content?",
    ],
    evidence: [
      "A scoped adversarial test report",
      "A prevented or detected event with its action timeline",
      "False-positive review and incident-response procedures",
    ],
    boundary:
      "No single demonstration establishes complete protection. Combine security testing with least privilege, data controls and task boundaries. A security alert does not replace a business decision about whether the agent should have been doing that work.",
    workContext:
      "A documented task gives investigators an expected behavior to compare against: which information the agent should read, which artifact it should produce, and which actions lie outside its purpose.",
  },
  "ai-risk": {
    title: "AI Risk & Governance Management Platforms",
    description:
      "Compare AI risk and governance platforms using use-case ownership, assessment, control-evidence and change-review questions for enterprise buyers.",
    trigger:
      "Consider program-level governance when teams need a common inventory of AI use cases, accountable reviewers, risk decisions and follow-up actions. Start with the decisions you must make and the evidence needed for them. A completed questionnaire should not be mistaken for a tested control.",
    example:
      "Register a fictional customer-support use case, record its data access and human escalation, then change the agent from drafting answers to sending them. Ask the platform to show what must be reassessed, who receives the review, and how the previous decision remains available for inspection.",
    questions: [
      "Are assessments attached to a specific use case, owner and version?",
      "Can a scope change reopen the relevant review without erasing the earlier decision?",
      "Does the evidence distinguish a declared control from an observed test result?",
      "Can reviewers export the decision, exceptions, evidence and unresolved follow-up together?",
    ],
    evidence: [
      "A versioned use-case assessment",
      "An exception with a named owner and review date",
      "A change-triggered reassessment and evidence export",
    ],
    boundary:
      "A governance platform can organize a program; it does not itself provide a legal conclusion or certify compliance. Applicable obligations and assurance needs depend on the organization and use case and require the appropriate specialists.",
    workContext:
      "Granular task descriptions make a use-case assessment less abstract. An advisor can distinguish drafting, deciding and executing before asking risk reviewers to assess a broad label such as 'customer-service agent'.",
  },
  evaluation: {
    title: "AI Agent Evaluation & Testing Tools",
    description:
      "Evaluate AI testing platforms through task-specific datasets, failure cases, human review, regression checks and reproducible test evidence.",
    trigger:
      "Start testing before using a new agent on real work and repeat it when models, instructions, data or tools change. Define success using the task's expected output, not simply whether the response sounds plausible. Keep a held-out set of cases that was not used to tune the system.",
    example:
      "For a fictional supplier-packet checker, prepare complete packets, missing documents, contradictory details and unreadable files. Score the result against a human-reviewed checklist. Track invented information and inappropriate approval separately from formatting errors. Include a case where the right response is to stop and ask a person.",
    questions: [
      "Can the evaluation score actual tool behavior and final artifacts, not just response text?",
      "Who defines ground truth, and can disagreements between human reviewers be retained?",
      "Are model, prompt, dataset and scorer versions recorded for reproducibility?",
      "Can a regression block release, and what happens when results are uncertain?",
    ],
    evidence: [
      "A versioned dataset with held-out cases",
      "Per-case results and error categories",
      "A release comparison and human review record",
    ],
    boundary:
      "Passing a benchmark supports a conclusion about the tested cases. It does not prove performance for every customer, input or environment. Evaluation and production monitoring complement one another.",
    workContext:
      "Task cards can supply the evaluation contract: expected input, useful output, handoff requirements and stop conditions. Real examples and reviewer judgments are still needed to build a credible test set.",
  },
  observability: {
    title: "AI Agent Observability & Tracing Tools",
    description:
      "Compare agent observability tools for execution traces, version history, tool-call correlation, failure diagnosis and sensitive-data handling.",
    trigger:
      "Use tracing when a team cannot explain why an agent returned a result or where execution failed. Start with an incident question you want to answer. A dashboard of aggregate latency and cost may be useful, but it should lead to the individual execution and its relevant context.",
    example:
      "A fictional status-summary agent reports an outdated handoff. Trace the run from input selection through retrieval and tool calls to the final summary. Determine whether the stale result came from the source, a cache, a failed tool call or the model. Verify which sensitive details are redacted and who can inspect the trace.",
    questions: [
      "Can a run be followed across orchestration, model calls and external tools with stable correlation IDs?",
      "Which prompt, workflow, model and data versions are retained?",
      "Can missing telemetry be distinguished from a step that did not execute?",
      "How are trace access, retention, redaction and deletion configured?",
    ],
    evidence: [
      "An end-to-end execution trace",
      "A failure investigation linked to a specific run",
      "Telemetry access and retention settings",
    ],
    boundary:
      "A recorded trace is evidence of observed execution, not proof that an action was authorized or a result was correct. Instrumentation gaps should remain visible. Tracing does not replace independent evaluation or enforcement.",
    workContext:
      "Link a technical run to the task it serves so an advisor or process owner can understand its business consequence. A failed handoff then has a named recipient and an expected result, not just an error code.",
  },
  "data-governance": {
    title: "AI Data Governance & Privacy Tools",
    description:
      "Explore AI data governance and privacy tools for retrieval permissions, sensitive-data handling, redaction, lineage and deletion testing.",
    trigger:
      "Evaluate data controls when an agent retrieves company information, sends content to a model or stores outputs that may expose sensitive material. Map the path of data before choosing a control. Input filtering, retrieval authorization and output redaction address different points in that path.",
    example:
      "In a fictional internal assistant test, create two teams with different document permissions. Ask both for the same supplier summary, then revoke a document grant. Check retrieval results, generated answers, caches and trace storage. Record whether previously generated material remains available after the source access changes.",
    questions: [
      "Are source permissions enforced at retrieval time and after entitlement changes?",
      "Which copies of data are retained in prompts, outputs, logs, indexes and caches?",
      "What can redaction miss, and can a reviewer inspect the transformation safely?",
      "Can lineage and deletion behavior be demonstrated across the complete data path?",
    ],
    evidence: [
      "A data-flow and retention map",
      "Cross-team permission and revocation tests",
      "A redaction or deletion trace showing covered stores",
    ],
    boundary:
      "A privacy feature is not a general compliance determination. Establish the applicable requirements with the responsible team. Data protection also depends on the identity, tool permissions and operational configuration around the product.",
    workContext:
      "The task determines which data is necessary. Describing the minimum input for a work unit helps a reviewer question broad requests to expose an entire drive, mailbox or customer database.",
  },
  "model-governance": {
    title: "AI Model Lifecycle & Governance Platforms",
    description:
      "Compare model governance tools using registry, validation, approval, deployment, drift and rollback questions with source-linked product profiles.",
    trigger:
      "Use model lifecycle controls when several teams create, adapt or deploy models and need a reliable record of which version is approved for which purpose. Separate an experiment's promising result from permission to deploy it into a particular business workflow.",
    example:
      "For a fictional document-classification model, register training and validation references, record its intended use and obtain a release decision. Replace the model version, then simulate worse performance on a new document type. Ask how the affected deployments are located, reviewed and rolled back.",
    questions: [
      "Can a model version be traced to its data references, evaluation and approval?",
      "Are approved uses and deployment environments explicitly scoped?",
      "Which changes or monitoring thresholds trigger revalidation?",
      "Can operators identify every affected deployment and recover a prior approved version?",
    ],
    evidence: [
      "A model registry entry with lineage",
      "An approval tied to a version and intended use",
      "A revalidation or rollback exercise",
    ],
    boundary:
      "A governed model can still be placed inside a poorly specified or overprivileged agent. Model controls address a component; agent behavior also depends on tools, orchestration, retrieval and the task being performed.",
    workContext:
      "Connect a model-dependent workflow to its work owner and output requirement. This gives a model change a business review path and helps explain which downstream handoffs could be affected.",
  },
  services: {
    title: "AI Governance Consulting & Assurance Services",
    description:
      "Evaluate AI governance advisory and assurance services by engagement scope, evidence, independence, deliverables and internal handoff requirements.",
    trigger:
      "Consider an external engagement when the organization needs specialist review, implementation help or a repeatable operating process. Define the question the engagement must answer before asking for a broad AI governance program. Separate advisory work, implementation, training and independent assurance in the scope.",
    example:
      "A fictional company wants to review one department's proposed agents. Ask a provider to scope interviews, work mapping, technical tests, decision workshops and the final handoff. Specify which outputs the internal owner receives and which unresolved questions remain their responsibility after the engagement ends.",
    questions: [
      "What concrete deliverables and acceptance criteria are included, and what is out of scope?",
      "Which claims rely on interviews, documents, technical testing or independent assessment?",
      "Who performs the work, and how are relevant experience and independence demonstrated?",
      "What training, update process and reusable records remain with the client?",
    ],
    evidence: [
      "A scoped statement of work and sample deliverable",
      "A methodology with evidence requirements",
      "A client handoff plan with named responsibilities",
    ],
    boundary:
      "An advisory engagement is not automatically an audit or certification. Verify any claimed accreditation and its exact scope directly with the relevant body. A software license and a human-delivered engagement should be compared as different offerings.",
    workContext:
      "DutyGraph is designed for advisors to gather work evidence and guide a client through discovery. Its pilot is intended to test that delivery method; it does not confer a professional credential or substitute for independent assurance.",
  },
};
