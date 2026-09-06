# Agent requests and connected authority example

The Cobalt sample shows a person requesting an agent, a versioned manifest, a narrowed scope, a simulated notary review and simulated issuance. No vendor is contacted by this example. No credential, signature or access grant is created. The separate live issuance endpoint remains blocked.

Open Agent governance, choose an example, select Create demo request, then Prepare manifest. Expand each source to see its data and documentation. Two requested scopes are eligible; changing supplier bank details is excluded. The inactive-worker, stale-source and conflicting-access examples cannot advance. Source record changes invalidate the manifest. Rebuilding clears the displayed sample review and issuance; immutable record versions retain history.

## Source shapes

All values are fictional. These are reduced responses, not complete vendor schemas or certified connectors. Documentation was inspected on 2026-09-06.

| Source | Reference and shape | Use in the example |
| --- | --- | --- |
| Workday | [Get_Workers, Human Resources v46.2](https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v46.2/Get_Workers.html): Worker reference, Worker_Data and Employment_Data/Worker_Status_Data. Displayed as a reduced XML-to-object projection, not vendor JSON. | Primary employment status and worker identifier. |
| Okta | [Users API v1](https://developer.okta.com/docs/api/openapi/okta-management/management/tags/user): id, status and profile. | Primary identity, job title and department. An active account does not prove application permissions. |
| Entra ID | [Microsoft Graph user v1.0](https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0): id, employeeId, accountEnabled, department, jobTitle. | Illustrates an alternative identity adapter. Explicit selection is needed for non-default properties. |
| Oracle HCM | [Workers and assignments](https://docs.oracle.com/en/cloud/saas/human-resources/farws/api-workers-work-relationships-assignments.html), REST 11.13.18.05: collection envelope and PersonId/PersonNumber. | Illustrates an alternative HR source; does not establish Oracle ERP access. |
| Saviynt | [Vendor Go SDK Users package](https://pkg.go.dev/github.com/saviynt/saviynt-api-go-client/users), ECM v5 getUser: msg, displaycount, totalcount, errorCode, userdetails; username, userKey, displayname, statuskey. | Identity correlation example. Access and SoD endpoint mappings still require tenant-specific verification. |
| Company policy | DutyGraph fixture, not a vendor response. SOP-SUP-004 v3 plus explicit effective access, delegable access, task need and runtime boundary. | Sample policy and instructions. Do not describe these invented fields as Saviynt's API. |

Workday and Okta are designated primary sources in the sample; Entra and Oracle illustrate alternatives. A real deployment chooses authority per attribute. It must not blindly combine competing HR records. The demo maps Tariq explicitly; real correlation requires reviewed external identifiers, not a name match.

## Adapter boundary and live onboarding

`AuthorityAdapter.collect(subjectId)` returns the normalized `AuthorityContext`. Snapshots retain source, endpoint, version, timestamp, format and raw subset. The manifest stores these snapshots under its hash. `evaluateAuthority` intersects requested scope with all four boundaries. Unknown actions, stale data, inactive identities and conflicts fail closed. AI instructions are proposals and cannot enlarge this intersection.

Only the mock adapter exists today. Real adapters require tenant-approved authentication, least-privilege reads, schema validation, pagination, throttling, source freshness, effective dates, reviewed identity correlation, resource/action mapping and access/SoD evaluation. SOPs normally come from a document source linked to policy. Vendor profiles alone are insufficient. The current demo is a replaceable boundary, not a one-click production connector.

Before live issuance, add an independently verified notary policy, exact-manifest signed attestations, managed signing keys, target provisioning, enforceable resource restrictions, expiry and revocation receipts. The current independent business review is not notary authority. The demo review names a fictional reviewer and records the actual operator separately. No demo artifact is executable.

## Request portal and auditor view

Participants can request help for themselves and their linked tasks. Advisors can prepare structured manifests or request a separately labeled AI draft using configured OpenAI credentials. The auditor tab traces each request to its person, task versions, requested software and review; it is not a complete SOC 2 evidence graph. The original records remain in PostgreSQL. New agent-request records are not yet projected as separate Neo4j nodes.

The marketing feature explains the person-duty-task-scope-agent chain. It intentionally avoids unsupported market exclusivity claims. Live provisioning, signed attestations and automatic revocation are disclosed as integration work.
