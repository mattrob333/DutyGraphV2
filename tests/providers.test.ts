import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { sealSecret, openSecret } from "../server/providers.ts";
process.env.PROVIDER_ENCRYPTION_KEY = randomBytes(32).toString("hex");
test("encrypted keys bind to the tenant and provider and reject tampering", () => {
  const value = sealSecret("synthetic test value", "tenant-a:exa");
  assert.equal(openSecret(value, "tenant-a:exa"), "synthetic test value");
  assert.throws(() => openSecret(value, "tenant-b:exa"));
  assert.throws(() => openSecret(value, "tenant-a:openai"));
  const parts = value.split(".");
  parts[2] = Buffer.from("changed bytes").toString("base64");
  assert.throws(() => openSecret(parts.join("."), "tenant-a:exa"));
});
