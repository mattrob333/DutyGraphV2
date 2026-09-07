import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { publicEntry } from "../server/public-entry.ts";

test("public root redirects directly while preserving campaign queries and app entry points", async () => {
  const app = express();
  app.use(publicEntry);
  app.use((_req, res) => res.status(200).send("app or public route"));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const path of ["/", "/?utm_source=directory&utm_campaign=pilot"]) {
      const r = await fetch(origin + path, { redirect: "manual" });
      assert.equal(r.status, 308);
      assert.equal(
        r.headers.get("location"),
        "/landing/" + new URL(origin + path).search,
      );
    }
    for (const path of [
      "/?demo=discovery",
      "/?sample=1",
      "/?view=graph",
      "/?demo=",
      "/login",
      "/invite/test",
      "/landing/",
    ]) {
      assert.equal(
        (await fetch(origin + path, { redirect: "manual" })).status,
        200,
        path,
      );
    }
    const config = JSON.parse(
      readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
    );
    const rule = config.redirects.find(
      (r: { source: string }) => r.source === "/",
    );
    assert.equal(rule.destination, "/landing/");
    assert.equal(rule.permanent, true);
    assert.deepEqual(
      rule.missing,
      ["demo", "sample", "view"].map((key) => ({ type: "query", key })),
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  }
});
