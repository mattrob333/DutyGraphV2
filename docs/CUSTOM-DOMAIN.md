# DutyGraph domain rollout

## Current preparation

`dutygraph.com` and `www.dutygraph.com` are attached to the existing Vercel project `dutygraph-v2`. Porkbun remains the authoritative DNS provider. Website DNS and HTTPS verification are still pending.

Vercel CLI returned the following website configuration on September 5, 2026:

| Type | Host in Porkbun | Value |
| --- | --- | --- |
| A | empty (root) | 76.76.21.21 |
| A | www | 76.76.21.21 |

Replace only conflicting parking/website records at those exact hosts. Keep the existing `fwd1.porkbun.com` and `fwd2.porkbun.com` MX records, email TXT records, and unrelated subdomains. Do not change nameservers.

## Application transition

`APP_ORIGIN` is the canonical origin used for participant invitation URLs and secure cookies. `ADDITIONAL_APP_ORIGINS` accepts a comma-separated list of exact trusted origins for requests during domain migration. No wildcard or request-derived origin is trusted. Authentication, CSRF and tenant checks still apply.

Until DNS and HTTPS pass, retain `APP_ORIGIN=https://dutygraph-v2.vercel.app`, with `https://dutygraph.com,https://www.dutygraph.com` in the additional allowlist. After verification, change `APP_ORIGIN` to `https://dutygraph.com`, retain the old Vercel origin temporarily in the additional allowlist, and redeploy. Existing invitations on the Vercel address remain usable. A session on the old hostname does not sign the user into the new hostname automatically.

Verify health, sign-in, authenticated mutation, private invitation opening, and rejection of unrelated origins on the deployed code. Make www redirect to the root domain after both certificates are valid. Do not redirect active testers away from the Vercel origin during the initial transition.

## Email verification

Connecting the website does not verify an email sender. In Resend, create a dedicated sending domain, such as `mail.dutygraph.com`, then copy the exact DKIM and return-path SPF/MX records Resend provides into Porkbun. The DKIM value is account-specific and must not be invented. Verify the records in Resend and configure an address such as `invitations@mail.dutygraph.com` in Workspace settings with the account's Resend API key.

Keep Porkbun's root MX records. Resend's return-path MX belongs to its specified subdomain; it does not replace the inbound mailbox configuration. A Resend sender is not automatically a receiving mailbox. Do not claim successful delivery until an explicitly authorized recipient test has been received.

Reference: [Resend domain setup](https://resend.com/docs/dashboard/domains/introduction).
