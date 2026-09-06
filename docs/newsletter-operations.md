# The Governance Brief

Published by DutyGraph. Planned twice monthly; delivery is not active.

The public /newsletter/ page contains a preview edition and a separate interest form. POST /api/newsletter-interest stores the email, consent version, creation time, and pending_confirmation state. Pilot inquiries never become newsletter subscribers. Duplicates receive the same receipt and do not overwrite state. Public reads are not available; the web role cannot read the interest table. No email is queued or sent by this endpoint.

Before sending: configure a verified sender and a newsletter provider with confirmation, suppression, and unsubscribe handling. Import pending records only into a confirmation workflow—not an active broadcast audience. Record actual confirmation evidence before changing state. A row labeled confirmed without provider evidence is not sufficient.

Launch checklist: sender identity, reply mailbox, approved publication identity/address details, confirmation flow, visible unsubscribe, suppression test, delivery/bounce handling, and one reviewed issue. Do not automatically resubscribe a suppressed address. Agree a retention policy for unconfirmed interest and remove records that are no longer needed.

Editorial format: one primary question; one practical example; source-linked industry context when used; clearly labeled DutyGraph product note; one main action. Do not claim market leadership or customer results without evidence. No paid placement or independent-publication claim is made.

Next issue drafts: who owns an agent when roles change; why a human-review label is not an enforced checkpoint; how to compare discovery output across advisors. Use completed pilot evidence only with permission.
