# Investment readiness

This is a public product/engineering evidence checklist, not an investor deck, valuation, financial forecast, or claim of traction. It translates the [product vision](Product-Vision.md) into questions a founder and incoming technical lead should be able to answer. Reviewed September 11, 2026.

## The story we are trying to prove

DutyGraph helps an advisor turn fragmented descriptions of work into a reviewed operating record and useful improvement decisions. The initial value is a clear, evidence-backed discovery engagement. The longer-term hypothesis is that maintaining that record through recurring review creates ongoing value, supports an internal owner, and makes bounded AI delegation more accountable.

The product is a hosted pilot. The repository demonstrates implementation and test coverage. It does not establish paying customers, recurring revenue, repeatable ROI, a validated customer segment, or a signed distribution partnership.

## Buyer, user, and business model

| Question | Current direction | Evidence still needed |
| --- | --- | --- |
| Who uses it? | Advisors/facilitators, leadership, and participating employees | Observed completion and usefulness across representative engagements |
| Who buys and why now? | A business seeking operational understanding and improvement; exact buyer/segment is open | Interviews, decision process, budget owner, alternatives, willingness to pay |
| How does it earn revenue? | Discovery engagement, possible recurring advisor support, internal handoff, subscription/channel licensing | Tested packaging/pricing, delivery scope, conversion, renewal, cost and support model |
| What could become defensible? | Reviewed work/evidence relationships, trustworthy change history, repeatable advisor practice | Evidence that these improve outcomes and are difficult to replace; no moat claim from having a graph |
| What might scale? | Reusable delivery practice and a maintainable living record | Advisor training results, effort per company, reliable access/isolation and operating costs |

The vision's 5–10-company pilot aim is a recruitment target, not a verified cohort. Enterprise/channel opportunities are hypotheses until supported by agreements and delivery evidence.

## Proposed north-star measurement

**Companies using a reviewed work map to complete an agreed improvement and review its measured result.**

This is a proposed metric for founder/product review, not existing telemetry or an approved target. Define “active company,” the review window, an eligible improvement, and the evidence standard before reporting it. A completed action without a measured result should remain distinguishable from demonstrated improvement.

Supporting measures should include:

- Participant completion: submissions divided by invited in-scope participants, with the time window and exclusions.
- Time to reviewed map: elapsed time from agreed scope to advisor/client review, plus advisor labor hours.
- Evidence quality: independently reviewed omissions, invented details, incorrect links, and correction effort on a defined sample.
- Useful findings: findings accepted for action, with an owner, baseline, and follow-up date.
- Continuing value: repeat reviews, maintained records, and completed commitments; distinguish activity from improvement.
- Economics: actual model/research/transcription/email/hosting costs, advisor delivery time, support burden, and realized revenue per engagement.

These metrics are not all instrumented. Existing measurements, weekly commitments, and aggregate intake reports can supply parts of an evidence record; they do not automatically calculate cohort retention or unit economics.

## Evidence gates

| Gate | What must be demonstrated | Where to keep the record |
| --- | --- | --- |
| Useful pilot | An authorized hosted audit reaches a client-understood map, sourced findings, and agreed next actions | Sanitized acceptance summary; private client material stays outside Git |
| Repeatable delivery | Another trained advisor can reproduce the process with acceptable effort and correction rates | Delivery playbook, training review, measured pilot comparison |
| Reliable operation | Named service owners, least-privilege access, monitoring, hosted restore/key-recovery drill, incident procedure | Runbooks and dated drill summary; secrets in approved storage |
| Safe team growth | Advisor onboarding/offboarding and company assignments are tested; identity limitations are understood | Access design and acceptance evidence |
| Sustainable offer | Buyer, scope, pricing, delivery cost, ongoing responsibility, and renewal reason are supported by actual engagements | Private commercial records; publish only approved summaries |
| Governed expansion | One external action has conformance-tested authorization, revocation, and unknown-effect handling | Separate design and runtime acceptance records |

## Decisions the owner and incoming lead should settle

1. First pilot segment, company size, scope, and named commercial buyer.
2. Success criteria and consented evidence collection for each pilot.
3. Which work is done by an advisor, the client, or the application.
4. Engagement packaging, recurring review cadence, and ongoing record ownership.
5. Operating/support owners, service budget, and release authority.
6. Company/IP ownership, contributor agreements, and intended repository licensing. No repository license file was present at the reviewed baseline; choose deliberately before broad outside contribution.

Do not store customer contracts, fundraising terms, credentials, private introductions, or identifiable pilot results in this public repo. A restricted diligence folder can hold approved commercial evidence and access-controlled links to technical records.

Use [NEXT-STEPS](../NEXT-STEPS.md) for current execution order and the [takeover assessment](../handoff/2026-09-11-readiness-review.md) for engineering readiness. Fundraising preparation should strengthen evidence for the product's core promise, rather than expanding the feature list solely to look larger.
