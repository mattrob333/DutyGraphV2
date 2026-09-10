# Resume DutyGraph on another computer

Updated September 9, 2026. This is the starting point for the owner and a new Codex session. Read [AGENTS.md](AGENTS.md), this page, and [next work](docs/NEXT-STEPS.md) before changing the app. The chat history is not required.

## Where we left it

DutyGraph is a working **advisor pilot**, with a hosted website and application at [dutygraph.com](https://dutygraph.com). The latest product change before this handoff is `acb7b793a20bf17fbc883c7fd73c98ebf9c62707`: the polished Company Work Map became the first website gallery screenshot. It passed [CI](https://github.com/mattrob333/DutyGraphV2/actions/runs/34299928369), deployed to production, and passed 21 read-only live gallery checks. The implementation suite contains 318 tests. This handoff does not mean a real client audit has been completed.

- **Marquee experience:** company identity → workstream stages → highlighted people and duties → tasks and recorded flows. Tabs are Work map / Work flows / Tasks.
- **Look:** recessed near-black workstream background, lighter charcoal cards, soft shadows, neutral hover, slight steel tint on selected borders. The owner explicitly rejected blue-on-blue fills and decorative green accents. See [design decisions](docs/work-map-design-decisions.md).
- **Automation:** discovery and private replies can assemble proposed duties, tasks and stage/person links. Evidence, version checks and human confirmation still matter. Missing documentation is not proof that a company has no process.
- **Commercial path:** public request → advisor inbox → research → kickoff → roster → interviews → mapped work → client brief/report → Strategy and Weekly review. Much of this exists; the complete hosted journey with real providers remains the main acceptance task.
- **Website:** four authentic fictional-sample screenshots; new Work Map first. SEO/content and consent-gated measurement code exist. GA4 and Search Console IDs are still null in source.
- **Do not remove yet:** Workflows & cases remains in the sidebar with a distinct branching icon. We recommended parking that entry, but the owner has not authorized that removal. Reusable workflow recommendations are an idea, not a shipped library.

## Laptop setup

Use Node **24.x**, Git, and Docker Desktop with Linux containers. No files from the desktop are needed for a fresh local development database.

```powershell
git clone https://github.com/mattrob333/DutyGraphV2.git
cd DutyGraphV2
git status --short
git pull --ff-only
npm.cmd ci
npm.cmd run setup
npm.cmd run dev
```

Open [localhost:4317/login](http://localhost:4317/login) for the app and [localhost:4317/landing/](http://localhost:4317/landing/) for the website. The API and Vite run together. If the repository already exists on the laptop, inspect its status before pulling; preserve any local edits. A fresh clone starts from current `main`, not a branch copied from an old chat.

`setup` creates `.env` with fresh random credentials only when absent, starts this project's database on **127.0.0.1:55437**, and applies migrations through **0012**. Do **not** copy `.env.example` placeholders into `.env` first. Do not point setup, tests or training at production. Do not delete a Docker volume to fix startup. If port 4317 is occupied, identify its owner before changing anything.

Create a local account through the app and open its fictional sample company. Account/provider settings and real company records from dutygraph.com do not appear in a fresh local database. Use the same hosted account on the laptop to access hosted company work. Browser sessions and unsent browser drafts do not travel through Git.

Optional providers are configured separately in Workspace settings; a normal code/UI session does not require paid calls. Local admin/runtime DB roles and provider encryption keys are generated locally. Hosted Vercel/DB/provider access requires the owner's existing service access, not a file from this public repo. The demo inbox requires explicit operator provisioning; see [demo requests](docs/demo-requests.md).

## Working and verification

```powershell
git switch -c laptop/next-change
npm.cmd run contracts
npm.cmd run verify
npm.cmd audit --audit-level=high
npm.cmd run training
```

Choose checks appropriate to the change. `verify` builds generated public/help content, type-checks and runs the unit/database/API tests. Tests/training require the dedicated local database. `npm.cmd run verify:clean-install` checks migration replay in an isolated temporary Docker database. For public content, build and `npm.cmd run verify:seo` plus browser review are the relevant path. The optional portable gallery check is described in [browser checks](scripts/browser/README.md).

Update README and DEVLOG with every changeset. Keep older dated verification as history; do not replace it with invented new results. Main is connected to Vercel and a push can publish immediately. Check current working state, CI and exact deployed commit before claiming a release. Follow the owner's current release instructions.

## Read next

1. [Current state](docs/wiki/Current-State.md) — what exists and its limits.
2. [Next steps](docs/NEXT-STEPS.md) — concrete priorities and acceptance checks.
3. [Design decisions](docs/work-map-design-decisions.md) — preserve the agreed UX.
4. [PC-only artifact audit](docs/handoff/2026-09-09-artifact-audit.md) — what travels in Git and what needs separate custody.
5. [DEVLOG](DEVLOG.md) — dated implementation history; newest entries first.

## Paste into laptop Codex

> Continue DutyGraph in this checkout. Read AGENTS.md, START-HERE.md, docs/NEXT-STEPS.md and docs/wiki/Current-State.md. Inspect branch/status and remote state first. Preserve the current Company Work Map design described in docs/work-map-design-decisions.md. Tell me the current baseline and the next useful task before making a major product change. Use a fresh local fictional company for development; never copy credentials or customer data into Git. The full hosted audit walkthrough, Google activation, advisor access decisions and client-outcome validation are still open. Do not treat every historical brainstorm or old roadmap item as an unfinished instruction. Update README and DEVLOG with changes and distinguish local checks, CI, deployment and real-client acceptance.
