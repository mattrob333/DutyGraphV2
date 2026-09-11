# Instructions for development agents

These instructions apply to any AI coding agent working in DutyGraph. They describe repository practices, not a required model, vendor, editor, orchestration framework, or review service. Human contributors follow the same engineering agreement in [CONTRIBUTING.md](CONTRIBUTING.md).

## Read before changing behavior

1. [START-HERE.md](START-HERE.md): product context, baseline, decisions, and handoff boundaries.
2. [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md): setup and working agreement.
3. [docs/NEXT-STEPS.md](docs/NEXT-STEPS.md): current priorities; older brainstorms are not automatic instructions.
4. [Repository map](docs/REPOSITORY-MAP.md) and documentation/tests for the affected feature.

Inspect the actual branch and working tree. Preserve unrelated work. Define the expected outcome and make the smallest coherent change. Use normal code review for consequential changes; no named AI or external review integration is required.

## Engineering boundaries

- Validate permissions on the server. Preserve tenant/company/participant isolation, forced row-level security, and the restricted runtime role.
- Preserve evidence, exact versions/hashes, idempotency, and concurrency checks. AI proposals, participant confirmation, advisor approval, and external authority have different meanings.
- PostgreSQL is authoritative; Neo4j is derived. Never infer operational relationships merely to fill a diagram.
- Add migrations; do not rewrite applied schema history. Keep runtime grants and policies aligned.
- Edit generated material at its source; consult the repository map before changing public pages or API references.
- Use fictional local data. Do not point setup, tests, training, sample, or backup scripts at customer production data.
- Keep credentials, raw client material, private leads, bearer links, backups, and machine-specific artifacts out of commits and logs.
- Preserve documented Work Map decisions unless the current task changes them.

## Verification and completion

Use the change-specific checks in CONTRIBUTING.md. Inspect the full diff, including generator output. Report what actually ran, the environment, failures or skipped checks, and whether providers were simulated. Distinguish local results, CI, deployment, provider acceptance, and customer outcomes. Never copy an old passing result as evidence for a new change.

The existing repository convention requires **README.md and DEVLOG.md updates in the same change set**, including documentation-only work. Keep README changes brief and relevant to current context; put dated details, rationale, validation, and limitations in DEVLOG. Update affected technical references and user guides. Do not append release transcripts to the README.

Finish with a reviewable commit or diff and a continuation note describing remaining work. Main is connected to production hosting; publishing or changing external services is a separate release action governed by the current task's authorization.
