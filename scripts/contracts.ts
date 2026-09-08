import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { schemas } from "../shared/domain.ts";
const definitions = Object.fromEntries(
  Object.entries(schemas).map(([k, s]) => [
    k,
    z.toJSONSchema(s, { target: "draft-2020-12", io: "input" }),
  ]),
);
const create = {
  oneOf: Object.entries(definitions).map(([kind, schema]) => ({
    type: "object",
    required: ["kind", "data"],
    additionalProperties: false,
    properties: { kind: { const: kind }, data: schema },
  })),
};
const recordPath = "/api/v1/companies/{companyId}/records";
const doc = {
  openapi: "3.1.1",
  info: {
    title: "Duty Graph local pilot — implemented record transport",
    version: "0.3.0",
    description:
      "Generated from runtime Zod request schemas. Covers the generic record creation/edit transport only. This is not the complete 92-route target API contract.",
  },
  servers: [{ url: "http://localhost:4317" }],
  paths: {
    [recordPath]: {
      post: {
        operationId: "createRecord",
        security: [{ cookieSession: [], csrf: [] }],
        parameters: [
          {
            name: "companyId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string", maxLength: 128 },
          },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: create } },
        },
        responses: {
          "201": {
            description:
              "Created immutable content version, audit event, and outbox event.",
          },
          "401": { description: "Unauthenticated" },
          "403": { description: "Actor or CSRF rejected" },
          "404": { description: "Company inaccessible" },
          "409": { description: "Command conflict" },
          "422": { description: "Shape or semantic validation failed" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieSession: { type: "apiKey", in: "cookie", name: "dg_session" },
      csrf: { type: "apiKey", in: "header", name: "X-CSRF-Token" },
    },
    schemas: definitions,
  },
};
await writeFile("contracts/openapi.json", JSON.stringify(doc, null, 2) + "\n");
const routes: { method: string; path: string; source: string }[] = [];
for (const [source, prefix] of [
  ["server/app.ts", "/api/v1"],
  ["server/assets.ts", "/api/v1/companies/:companyId/assets"],
  ["server/reports.ts", "/api/v1/companies/:companyId/reports"],
  ["server/audit-brief.ts", "/api/v1/companies/:companyId/audit-brief"],
  ["server/workflows.ts", "/api/v1/companies/:companyId/workflows"],
  ["server/research.ts", "/api/v1/companies/:companyId/research"],
  [
    "server/business-classification.ts",
    "/api/v1/companies/:companyId/business-classification",
  ],
  ["server/team-analysis.ts", "/api/v1/companies/:companyId/team-analysis"],
  ["server/providers.ts", "/api/v1/companies/:companyId/providers"],
  ["server/invitations.ts", "/api/v1/companies/:companyId/requests"],
  ["server/ai.ts", "/api/v1/companies/:companyId/ai"],
  ["server/discovery.ts", "/api/v1/companies/:companyId/discovery"],
  ["server/work-links.ts", "/api/v1/companies/:companyId/work-links"],
  ["server/work-gaps.ts", "/api/v1/companies/:companyId/work-gaps"],
  ["server/team-link.ts", "/api/invitations"],
  ["server/pilot-inbox.ts", "/api/v1"],
  ["server/agent-requests.ts", "/api/v1/companies/:companyId/agent-requests"],
  ["server/neo4j.ts", "/api/v1/companies/:companyId/neo4j"],
  ["server/frameworks.ts", "/api/v1/companies/:companyId/framework-runs"],
  ["server/transcription.ts", "/api/v1/companies/:companyId/assets"],
  ["server/strategy.ts", "/api/v1/companies/:companyId/strategy-briefs"],
]) {
  const code = await readFile(source, "utf8");
  for (const match of code.matchAll(
    /\b(app|api|router)\.(get|post|patch|put|delete)\(\s*"([^"]+)"/g,
  )) {
    const path = (
      match[1] === "app"
        ? match[3]
        : prefix + (match[3] === "/" ? "" : match[3])
    ).replace(/:([a-zA-Z]+)/g, "{$1}");
    routes.push({ method: match[2].toUpperCase(), path, source });
  }
}
routes.sort(
  (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
);
await writeFile(
  "contracts/routes.json",
  JSON.stringify(
    {
      version: "0.3.0",
      notice:
        "Implemented route inventory extracted from server declarations. OpenAPI currently provides closed generic-record creation schemas; it is not a full production target contract.",
      routes,
    },
    null,
    2,
  ) + "\n",
);
const reference = `# Implemented API reference\n\nRelease 0.3. This inventory is generated from server route declarations. It describes ${routes.length} implemented method/path declarations, not the larger production target. The report format parameter accepts preview or download. Unknown API routes return a structured 404 from the running server.\n\n## Transport and authentication\n\nThe browser and API share one origin (localhost or the production Vercel URL). API sessions use the HttpOnly dg_session cookie. Sign-in/register/enrollment return a session-bound CSRF token; authenticated changes require X-CSRF-Token. Commands also require a unique Idempotency-Key of at most 128 characters. Reusing a key with identical actor/path/content returns the saved result; changed content conflicts. Invitation bearer URLs are redacted from saved receipts.\n\nAuthentication and invitation entry points have a production-default limit of 40 requests per 15 minutes per IP. Hosted limits use a PostgreSQL counter shared by function instances; local limits are per process. Provider-key settings share this limiter. Business routes enforce the server actor and tenant context; no request may select a different tenant or role. Advisor routes manage companies within that tenant. Participant routes and assets enforce the assigned person/company/request.\n\nUse expectedVersion for record edits/actions and case progress. Reports/framework saves and graph rebuild use expectedRevision for the company snapshot. Review current data after a 409; do not blindly retry old content with a new key.\n\n## Implemented routes\n\n| Method | Path | Runtime definition |\n| --- | --- | --- |\n${routes.map((r) => `| ${r.method} | ${r.path} | ${r.source} |`).join("\n")}\n\n## Record payloads\n\nPOST records accepts a closed object with kind and data. PATCH records/{recordId} accepts data and expectedVersion; the existing record determines kind. The generated OpenAPI file contains a kind-discriminated creation union and runtime Zod input schemas. FIELD-REFERENCE lists the human-readable field limits. Server-generated snapshots, hashes, workflow checkpoints, review flags and authority states cannot be inserted through generic input. Original evidence and requests cannot be edited.\n\nThe route inventory is complete for the current declarations, but full response/error schemas and every non-record request body are not yet expressed in OpenAPI. Use the executable API tests and source validators for those exact payloads. This limitation remains in the production contract backlog.\n\n## Main command flows\n\n- Evidence: create a source, inspect it, then record accept; retract requires a reason and invalidates dependent current records.\n- Confirmation: review a task, create a request with task IDs, issue a private link, enroll the participant, submit decisions, inspect and accept the returned response. Confirmation binds to the request snapshot, never a client-supplied task hash.\n- Report: create with audience/purpose/narrative/recordIds/expectedRevision; review with expectedVersion/contentHash/decision/note; download only when approved and bindings remain current.\n- Workflow: create a definition with taskIds/handoffIds/joinPolicy/timeoutHours/maxAttempts; review it; start a case; record step actions with expectedVersion, stepId, action, note and routeIds.\n- Asset: create a scoped upload, query status, PUT numbered base64/checksummed chunks, finalize the whole checksum, and read only within scope before expiry. The asset router enforces 25 MB and supported audio MIME types.\n- Graph: GET supports focus, depth 0–4, limit 1–150, allowlisted relationships/kinds/states; it does not accept arbitrary query text. Rebuild uses current authoritative records and never invokes external actions.\n\n## Errors and operations\n\nErrors carry a code, readable message, retryable flag and requestId where handled by the application. Typical statuses: 400 invalid command metadata; 401 missing/expired session; 403 actor/origin/CSRF rejection; 404 inaccessible scope; 409 version, binding or transition conflict; 410 expired request/audio; 422 semantic validation; 429 auth throttling; 503 unconfigured runtime. See tests/api.test.ts for executable examples.\n\nThe health route checks a live database query and reports service/version/runtime coverage. It does not prove external provider health, signing or customer-system access. Generated client reports are audience-reviewed local downloads; the explicit request email endpoint sends through the configured Resend account. No route executes a customer business action.\n`;
await writeFile("docs/API-REFERENCE.md", reference);
console.log("Generated closed record request schemas from runtime validation.");
console.log(
  `Inventoried ${routes.length} implemented method/path declarations.`,
);
