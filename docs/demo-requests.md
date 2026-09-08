# Public demo requests

The public form collects company name and website, team size, contact name, work email and role. The goal is optional. Website is a separate `companyUrl` field; the existing hidden `website` spam trap stays unchanged. Older requests without a URL remain readable and can add it in Discovery.

Demo requests appear only for explicitly provisioned operator advisors. Account self-registration does not grant access to global leads. Both an exact server email allowlist and an administrator-managed user/tenant database mapping are required. Converted requests are visible only to operators in the company tenant. Other advisors retain their normal company workspaces.

## Operator setup

Apply migration 0011 using the normal migration-owner workflow. Create and verify the intended advisor account through the existing account process. On the intended database, provision that exact existing account:

```sh
node scripts/provision-pilot-inbox.mjs operator@example.com
```

The script uses `MIGRATION_DATABASE_URL`; it does not create accounts or send email. Independently verify account ownership before provisioning. Configure `PILOT_INBOX_EMAILS` with comma-separated operator emails on the application host. If unset, the application falls back to `PILOT_NOTIFY_TO`; an explicitly empty value disables access. The database mapping cannot be inserted or changed through the runtime role because its forced RLS has no mutation policies. Revoke access by removing the mapping with the administrator connection or removing the email from the application allowlist.

## Advisor flow

The inbox refreshes every 15 seconds while visible and on focus. Research this company creates one company, its contact record and retained intake, then opens Discovery for initial research. Repeated clicks reuse the same company. The company retains `settings.demoApplicationId`, `settings.demoContact` and `settings.businessIntake`; the contact retains the source request ID. Research and kickoff use the existing provider and review workflow. Opening a request does not send invitations or book a meeting.

Manage follow-up changes the request stage and next action. Saving compares both original fields so concurrent advisor changes produce a conflict instead of silently overwriting newer work. The form retains the draft for review after a conflict.

Public receipts are identical for duplicates, and public requests remain write-only. Notification delivery uses its existing separate durable queue and operator configuration. Local synthetic checks do not establish hosted delivery or real-provider research acceptance.
