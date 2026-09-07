# Operations and deployment

## Environments

Local development uses the dedicated Docker PostgreSQL database and loopback server. Hosted production uses Vercel and a separate Neon PostgreSQL database. Local users and samples are not automatically copied to hosting.

The public domain is dutygraph.com. Root is the public marketing entry; login is a separate entry. See [domain runbook](../CUSTOM-DOMAIN.md). Changing DNS or email records is not part of a normal code release.

## Release procedure

1. Review the diff and any migration/schema/provider impact.
2. Run generated contracts and relevant verification; CI includes build, tests, audit, training, and local recovery checks.
3. Apply necessary migrations using the migration-owner connection through a controlled release procedure.
4. Merge/push the reviewed source to the linked repository only when ready to publish. Main is connected to Vercel.
5. Verify the deployment state and commit, then inspect actual hosted behavior.
6. Check the public page, login/origin-sensitive writes, affected feature, and relevant tenant isolation. Fixture browser checks are not real provider acceptance.

A successful build does not prove runtime configuration. A “configured” badge does not prove a provider request succeeded. Keep release evidence dated and specific.

## Configuration

- `APP_DATABASE_URL`: hosted restricted runtime connection.
- `MIGRATION_DATABASE_URL`: migration/operator access, never browser configuration.
- `PROVIDER_ENCRYPTION_KEY`: server-only encryption key; retain independent secure recovery custody.
- `APP_ORIGIN` / allowed origins: canonical request/session boundaries.
- `CRON_SECRET`: protects maintenance.
- `ENABLE_DEMO`: local shared demo behavior; hosted authenticated fictional samples are separate.
- `PILOT_NOTIFY_RESEND_KEY`, `PILOT_NOTIFY_FROM`, `PILOT_NOTIFY_TO`: operator lead notification settings, separate from tenant invitation configuration.

Use [hosting](../HOSTING.md), [operations](../OPERATIONS.md), and [integrations](../INTEGRATIONS.md) for details. Never expose server keys through client build variables.

## Recovery and retention

The repository backup/restore scripts target the dedicated local Docker database. They do not prove hosted Neon recovery. Production recovery needs a rehearsed restore, encryption-key recovery, appropriate retention, and ownership.

Maintenance refreshes projections and applies retention. Projection repair is not replaying business actions. Removing a connection is not necessarily deleting already projected remote data.

## Open operating work

Hosted recovery drills, monitoring/alert ownership, production load/SLO acceptance, comprehensive deletion/legal holds, email delivery lifecycle, and enterprise identity controls require additional work. Do not describe local restore success as a production disaster-recovery guarantee.
