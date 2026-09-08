import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorkspaceReader } from "../client/src/workspace-reader.ts";
function deferred<T>() {
  let resolve!: (v: T) => void, reject!: (e: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
test("workspace switch cannot display a late response from another company", async () => {
  const a = deferred<string>(),
    b = deferred<string>();
  const reader = createWorkspaceReader((id) =>
    id === "a" ? a.promise : b.promise,
  );
  reader.select("a");
  const first = reader.read("a");
  reader.select("b");
  const next = reader.read("b");
  b.resolve("B data");
  assert.equal(await next, "B data");
  a.resolve("A data");
  assert.equal(await first, undefined);
});
test("switching away and back still discards the original request", async () => {
  const a = deferred<string>();
  const reader = createWorkspaceReader(() => a.promise);
  reader.select("a");
  const original = reader.read("a");
  reader.select("b");
  reader.select("a");
  a.resolve("Old A");
  assert.equal(await original, undefined);
});
test("later refresh wins and obsolete errors never interrupt the current workspace", async () => {
  const first = deferred<string>(),
    second = deferred<string>();
  let calls = 0;
  const reader = createWorkspaceReader(() =>
    calls++ ? second.promise : first.promise,
  );
  reader.select("a");
  const old = reader.read("a"),
    fresh = reader.read("a");
  second.resolve("new");
  assert.equal(await fresh, "new");
  first.reject(new Error("late failure"));
  assert.equal(await old, undefined);
});
test("current request failures remain visible", async () => {
  const reader = createWorkspaceReader(async () => {
    throw new Error("offline");
  });
  reader.select("a");
  await assert.rejects(reader.read("a"), /offline/);
  assert.equal(await reader.read("b"), undefined);
});
