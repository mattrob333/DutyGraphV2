# Release status

Updated September 7, 2026. Application baseline: `97335fd`, version `0.3.0`.

DutyGraph is a hosted advisor pilot. See the maintained [current-state matrix](wiki/Current-State.md), [roadmap](wiki/Roadmap.md), and [project wiki](wiki/Home.md).

## Delivered in code

- Cross-team work analysis added September 7: structural checks, evidence-cited AI hypotheses, durable attempts and advisor review. See [implementation and limits](team-analysis.md) and [183-test verification](verification/2026-09-07-team-analysis.md).

- Authenticated company workspaces with PostgreSQL records, versions, tenant isolation and audit/confirmation semantics.
- Discovery, roster/reporting charts, invitations, audio/text responses, transcription integration, AI task drafting and participant review.
- Task/duty/handoff records, workflows/cases, a stable company work map and focused relationship exploration.
- Optional Neo4j Aura projection with encrypted account settings and PostgreSQL fallback.
- Sixteen strategy framework specifications/runs and business-type profiles with 52 templates.
- Review/reporting/export surfaces, user help and training.
- Fictional discovery and authority demonstrations.
- Public marketing/intake, governance directory and Perspectives article publishing.

## Verification boundary

Prior work recorded 171 passing unit/database/API tests plus scoped browser checks. Dated evidence lives in [verification](verification/). These results do not establish real-client extraction accuracy, live IAM enforcement, physical-device coverage, or enterprise security acceptance. Documentation updates do not rerun or extend that historical evidence.

Neo4j connectivity was verified for a configured account in earlier work; that is not a statement that every account is configured. Provider configuration, synthetic provider tests, and actual successful paid/delivery requests are separate facts.

## Still open

Real-client discovery validation; cross-team reasoning quality; enterprise identity/access administration; hosted recovery and operating acceptance; comprehensive data lifecycle controls; real HR/IGA provisioning; managed signing and runtime authority enforcement; measured commercial outcomes and advisor scale.

The original [90-requirement matrix](requirements-status.json) preserves the supplied acceptance scope. It is not a current exhaustive feature inventory, and no local feature addition establishes formal production acceptance of every requirement.
