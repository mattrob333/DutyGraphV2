# Product and engineering decisions

These summarize explicit product direction from the project conversation and implementation choices. They are not independently validated market findings.

| Decision | Rationale | Consequence |
| --- | --- | --- |
| Advisor-first entry | Discovery is the initial value proposition | Keep governance complexity downstream |
| Research before kickoff | Public context improves the first conversation | Do not require nonexistent interview evidence |
| Roster import early | Reporting chart is a useful tangible payoff | Validate CSV identities/managers |
| Voice preferred, typing allowed | Accounts include context and exceptions | Preserve transcript review and accessible alternatives |
| Granular cards before submission | Reduces follow-up friction | AI drafts, participant reviews readable tasks |
| Approve/Edit primary actions | Simpler review | Approval must visibly update the card |
| Approval means understanding | People may disagree about ownership | Resolve conflicts separately; no permission grant |
| Advisor cards first | Scannable work is more actionable than raw transcript | Keep original account accessible but collapsed |
| Stable work map over 3D hairball | Unlabeled networks did not explain useful decisions | Focused relationships remain secondary tools |
| PostgreSQL authoritative | Integrity and provenance need transactional records | Neo4j is a replaceable derived projection |
| Shared evidence for frameworks | Avoid repetitive questionnaires | Track dependency currency and grounding |
| Flexible business types | Companies differ in vocabulary and flows | Templates cannot invent verified operational links |
| Simulations labeled | Demonstrations should not imply live integrations | Keep fixture and production acceptance distinct |
| Pilot-led marketing | Customer outcome proof is still being developed | Avoid major-player/guaranteed-result claims |
| Versioned project wiki | Developer context must evolve with code | Docs updates belong in feature PRs |

## Changes requiring explicit design review

Changing the meaning of approval, tenant isolation, evidence retention, authoritative storage, provider scopes, runtime issuance, or automatic work reassignment affects trust and architecture. Document the decision and migration/acceptance implications before broadening behavior.

## Historical material

Source audits and dated verification records remain valuable, but are not current implementation inventories. The current-state page supersedes stale status language without rewriting past test results.
