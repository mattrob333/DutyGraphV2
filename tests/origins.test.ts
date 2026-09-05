import test from "node:test";
import assert from "node:assert/strict";
import { allowedOrigins } from "../server/origins.ts";

test("custom domain migration allows only explicitly configured exact origins", () => {
  const origins = allowedOrigins({
    APP_ORIGIN: "https://dutygraph.com",
    ADDITIONAL_APP_ORIGINS:
      " https://dutygraph-v2.vercel.app, https://www.dutygraph.com ",
  });
  assert.deepEqual(
    [...origins],
    [
      "https://dutygraph.com",
      "https://dutygraph-v2.vercel.app",
      "https://www.dutygraph.com",
    ],
  );
  for (const hostile of [
    "https://dutygraph.com.evil.example",
    "http://dutygraph.com",
    "https://preview.vercel.app",
    "null",
    "https://dutygraph.com:8443",
  ])
    assert.equal(origins.has(hostile), false);
});

test("malformed, wildcard and credential-bearing origins fail closed", () => {
  const origins = allowedOrigins({
    ADDITIONAL_APP_ORIGINS:
      "*,null,https://user:pass@dutygraph.com,https://dutygraph.com/path,https://dutygraph.com?x=1,file:///tmp",
  });
  assert.equal(origins.size, 0);
  assert.deepEqual(
    [...allowedOrigins({ APP_ORIGIN: "http://localhost:4317/" })],
    ["http://localhost:4317"],
  );
});
