import { z } from "zod";
import { writeFile } from "node:fs/promises";
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
    version: "0.1.0",
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
console.log("Generated closed record request schemas from runtime validation.");
