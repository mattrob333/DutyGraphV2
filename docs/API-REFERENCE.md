# Implemented API reference

Release 0.2. This inventory is generated from server route declarations. It describes 41 implemented method/path declarations, not the larger production target. The report format parameter accepts preview or download. Unknown API routes return a structured 404 from the running server.

## Transport and authentication

The browser and API share one loopback origin. API sessions use the HttpOnly dg_session cookie. Sign-in/register/enrollment return a session-bound CSRF token; authenticated changes require X-CSRF-Token. Commands also require a unique Idempotency-Key of at most 128 characters. Reusing a key with identical actor/path/content returns the saved result; changed content conflicts. Invitation bearer URLs are redacted from saved receipts.

Authentication and invitation entry points have a production-default limit of 40 requests per 15 minutes per process/IP. The local service is not a distributed abuse-protection system. Business routes enforce the server actor and tenant context; no request may select a different tenant or role. Advisor routes manage companies within that tenant. Participant routes and assets enforce the assigned person/company/request.

Use expectedVersion for record edits/actions and case progress. Reports/framework saves and graph rebuild use expectedRevision for the company snapshot. Review current data after a 409; do not blindly retry old content with a new key.

## Implemented routes

| Method | Path | Runtime definition |
| --- | --- | --- |
| POST | /api/auth/demo | server/app.ts |
| POST | /api/auth/login | server/app.ts |
| POST | /api/auth/logout | server/app.ts |
| GET | /api/auth/me | server/app.ts |
| GET | /api/auth/options | server/app.ts |
| POST | /api/auth/register | server/app.ts |
| GET | /api/health | server/app.ts |
| GET | /api/invitations/{token} | server/app.ts |
| POST | /api/invitations/{token}/enroll | server/app.ts |
| GET | /api/v1/companies | server/app.ts |
| POST | /api/v1/companies | server/app.ts |
| PATCH | /api/v1/companies/{companyId} | server/app.ts |
| POST | /api/v1/companies/{companyId}/assets | server/assets.ts |
| PUT | /api/v1/companies/{companyId}/assets/{assetId}/chunks/{index} | server/assets.ts |
| GET | /api/v1/companies/{companyId}/assets/{assetId}/content | server/assets.ts |
| POST | /api/v1/companies/{companyId}/assets/{assetId}/finalize | server/assets.ts |
| GET | /api/v1/companies/{companyId}/assets/{assetId}/status | server/assets.ts |
| POST | /api/v1/companies/{companyId}/exports | server/app.ts |
| GET | /api/v1/companies/{companyId}/exports/{recordId}/download | server/app.ts |
| POST | /api/v1/companies/{companyId}/frameworks/{key}/manual | server/app.ts |
| GET | /api/v1/companies/{companyId}/graph | server/app.ts |
| POST | /api/v1/companies/{companyId}/graph/rebuild | server/app.ts |
| POST | /api/v1/companies/{companyId}/records | server/app.ts |
| PATCH | /api/v1/companies/{companyId}/records/{recordId} | server/app.ts |
| POST | /api/v1/companies/{companyId}/records/{recordId}/actions | server/app.ts |
| GET | /api/v1/companies/{companyId}/records/{recordId}/history | server/app.ts |
| POST | /api/v1/companies/{companyId}/reports | server/reports.ts |
| GET | /api/v1/companies/{companyId}/reports/{reportId}/{format} | server/reports.ts |
| POST | /api/v1/companies/{companyId}/reports/{reportId}/review | server/reports.ts |
| POST | /api/v1/companies/{companyId}/requests/{recordId}/issue | server/app.ts |
| GET | /api/v1/companies/{companyId}/research | server/research.ts |
| POST | /api/v1/companies/{companyId}/research | server/research.ts |
| POST | /api/v1/companies/{companyId}/research/{runId}/sources/{index}/import | server/research.ts |
| POST | /api/v1/companies/{companyId}/roster/apply | server/app.ts |
| POST | /api/v1/companies/{companyId}/roster/preview | server/app.ts |
| POST | /api/v1/companies/{companyId}/runtime/preflight | server/app.ts |
| POST | /api/v1/companies/{companyId}/workflows/{workflowId}/cases | server/workflows.ts |
| POST | /api/v1/companies/{companyId}/workflows/cases/{caseId}/actions | server/workflows.ts |
| GET | /api/v1/companies/{companyId}/workspace | server/app.ts |
| GET | /api/v1/participant/requests | server/app.ts |
| POST | /api/v1/participant/requests/{recordId}/submit | server/app.ts |

## Record payloads

POST records accepts a closed object with kind and data. PATCH records/{recordId} accepts data and expectedVersion; the existing record determines kind. The generated OpenAPI file contains a kind-discriminated creation union and runtime Zod input schemas. FIELD-REFERENCE lists the human-readable field limits. Server-generated snapshots, hashes, workflow checkpoints, review flags and authority states cannot be inserted through generic input. Original evidence and requests cannot be edited.

The route inventory is complete for the current declarations, but full response/error schemas and every non-record request body are not yet expressed in OpenAPI. Use the executable API tests and source validators for those exact payloads. This limitation remains in the production contract backlog.

## Main command flows

- Evidence: create a source, inspect it, then record accept; retract requires a reason and invalidates dependent current records.
- Confirmation: review a task, create a request with task IDs, issue a private link, enroll the participant, submit decisions, inspect and accept the returned response. Confirmation binds to the request snapshot, never a client-supplied task hash.
- Report: create with audience/purpose/narrative/recordIds/expectedRevision; review with expectedVersion/contentHash/decision/note; download only when approved and bindings remain current.
- Workflow: create a definition with taskIds/handoffIds/joinPolicy/timeoutHours/maxAttempts; review it; start a case; record step actions with expectedVersion, stepId, action, note and routeIds.
- Asset: create a scoped upload, query status, PUT numbered base64/checksummed chunks, finalize the whole checksum, and read only within scope before expiry. The asset router enforces 25 MB and supported audio MIME types.
- Graph: GET supports focus, depth 0–4, limit 1–150, allowlisted relationships/kinds/states; it does not accept arbitrary query text. Rebuild uses current authoritative records and never invokes external actions.

## Errors and operations

Errors carry a code, readable message, retryable flag and requestId where handled by the application. Typical statuses: 400 invalid command metadata; 401 missing/expired session; 403 actor/origin/CSRF rejection; 404 inaccessible scope; 409 version, binding or transition conflict; 410 expired request/audio; 422 semantic validation; 429 auth throttling; 503 unconfigured runtime. See tests/api.test.ts for executable examples.

The health route checks a live database query and reports local service/version/runtime coverage. It does not prove external provider health, signing or customer-system access. Generated client reports are audience-reviewed local downloads; no route sends email or executes a customer business action.
