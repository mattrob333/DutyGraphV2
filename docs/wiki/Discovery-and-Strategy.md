# Discovery and strategy

## One evidence base

Research gives an initial picture. Leadership supplies goals and structure. Participants describe work. Advisor review resolves or records disagreements. Frameworks interpret that shared context rather than asking the company to complete sixteen disconnected questionnaires.

Participant extraction should separate duties from tasks and tasks from ordered actions. It must use the person's role and kickoff context without filling gaps with unsupported operational details. Preserve the account from which a draft came.

## Business-specific kickoff and capture

The [kickoff and capture contract](../kickoff-capture.md) connects all 52 operating-model templates and hybrid streams to an eight-part leadership guide. Optional structured notes and a transcript become one saved meeting account. Reviewed duty descriptions carry the actual task examples, dependencies and software into personal interviews and participant extraction. Templates remain questions, never evidence of a procedure or authority.

Branded HTML/text invitations and the participant page share recording, transcription, card review and submission guidance. The participant draft validates cited source IDs and person assignments against the supplied context before returning cards.

## Industry mapping

Industry mapping can run during early research before kickoff. The supplied detailed industry-mapping instructions were adapted into structured output with fourteen sections and grounding requirements. It is a baseline that can be revisited as evidence improves, not a definitive market truth.

Sources: `shared/industry-map-prompt.ts`, [industry-map reference](../industry-map.md), and the framework registry.

## Framework execution

Sixteen frameworks have explicit specifications and structured outputs. The registry is the source of truth for exact framework names and upstream dependencies: `contracts/framework-registry.json`. Prompt/output logic lives in `shared/framework-specs.ts`, `framework-guides.ts`, `framework-output.ts`, and `server/frameworks.ts`.

A run receives applicable evidence/research and current upstream artifacts. Direct upstream artifacts carry detailed context; other completed artifacts can provide summaries. Missing or stale dependencies must not be cited as completed analysis. Input changes and upstream reruns invalidate downstream currency.

Claims distinguish known, inferred, assumed, and missing information, with evidence references. Prefer a labeled gap to a plausible invented fact. Model output is validated and stored as a draft artifact, not silently promoted to authoritative tasks.

User-started sequence runs are bounded. They are not a background recurring strategist. Provider jobs capture inputs, prompt/model information, and usage; failures must not create unlimited automatic retries.

## Business classification

The 52 business-type templates use a common backbone: get work, shape work, commit work, do work, collect value, keep/grow the customer. Industry-specific names make that understandable to a manufacturer, SaaS company, advisory firm, and others.

Companies can have multiple flows and custom stages. Classification is proposed/reviewed context, not a rigid ontology that forces every internal process into sales-to-cash. A company profile changing must make dependent analysis stale.

Current templates do not automatically turn into verified workflow/task connections. That compiler is a future step requiring evidence and review.

## Acceptance priorities

Evaluate extraction using representative real accounts with permission: missed tasks, invented details, incorrect handoffs, correction effort, and review completion. Evaluate framework reasoning separately: evidence fidelity, dependency freshness, useful questions, and actionable findings. A valid JSON object is necessary but not evidence of a good business recommendation.
