# Desktop-to-laptop artifact audit

September 9, 2026. Repository: `mattrob333/DutyGraphV2`, branch `main`. This repository is **public**. The product baseline before this handoff was `acb7b79`; all application changes were already committed and pushed. The only initially untracked directory was `.superdesign/`.

## What travels with Git

- Application/server code, migrations through 0012, dependency lockfile, setup and verification scripts, CI and hosting configuration.
- Current website, all four gallery screenshots, approved brand assets, content sources and generated public pages. The new Company Work Map image is already tracked.
- Product/framework specifications, requirement-status history, user guides, development log and dated verification evidence.
- [Start here](../../START-HERE.md), [current priorities](../NEXT-STEPS.md), and [settled design decisions](../work-map-design-decisions.md). A new Codex session does not need the desktop chat transcript.
- The public gallery browser check is promoted from a PC-specific working script into [a portable optional script](../../scripts/browser/README.md).

## What stays separate

| Local material | Laptop action |
| --- | --- |
| `.env`, encryption keys, account/provider credentials | Fresh local setup generates local credentials. Use existing service access for hosted operations. Never commit these files. |
| PostgreSQL Docker volume | A fresh clone creates a separate development database. Use the same hosted account for company records saved on dutygraph.com. Git does not synchronize databases. |
| `work/backups/*.dgbak` and the separate backup key | Private recovery material. If desktop-local records are needed on the laptop, arrange encrypted transfer and separate key custody. Do not put archives or keys in this public repo. |
| Browser sessions, unsent text/audio drafts | Browser-local state does not travel with Git. Save/submit important drafts through the app before relying on another device. |
| `work/` screenshots, fixture accounts, logs and ad hoc drivers | Disposable or sensitive verification artifacts. Maintained evidence is summarized in tracked verification docs; regenerate local artifacts as needed. |
| `.superdesign/` drafts/resume fingerprints | Historical design-tool state, now ignored as a whole. Current decisions are curated into the tracked design document. Existing local files are preserved; no dependency on that service for development. |
| `node_modules`, `dist`, generated handbook, `.vercel` link state | Reinstall/build/relink when required; not handoff dependencies. |

## Files outside this repository

The enclosing desktop workspace also contains predecessor source, the original handoff/spec archive, commercial and GTM material, old delivery bundles/PDFs, and brand explorations. They are not runtime dependencies. The existing [source audit](../SOURCE-AUDIT.md) intentionally keeps the commercial handoff outside the public repository. Current implementation, relevant public specifications and approved assets are already represented here.

Those private archives have **not** been bulk-copied into Git or deleted. They may be useful for historical/commercial work, but the application can be continued from this repo. If they are needed on the road, use an owner-controlled private transfer separately. This audit is not a claim that every desktop file has been synchronized.

## Recovery status at handoff

The latest existing local encrypted archive observed was `dutygraph-2026-09-08T16-20-39-320Z.dgbak` (60,264,477 bytes). A September 9 backup attempt failed because the local database on port 55437 was stopped. Docker Desktop did not expose its Linux engine after a start attempt. **No fresh backup or restore drill succeeded in this handoff.** Older archives remain untouched; they may omit subsequent local changes.

When the local engine is available, use `npm.cmd run backup` and the documented isolated `restore:drill` flow. Do not delete the existing volume or restore over a working database as a startup repair. See [operations](../wiki/Operations-and-Deployment.md).

No credentials, client evidence, private archives or browser storage were uploaded as part of this handoff. Application/provider data hosted elsewhere remains in those services.
