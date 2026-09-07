import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateDirectory } from "../shared/directory-research.ts";
const read = (n: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../content/directory/${n}.json`, import.meta.url),
      "utf8",
    ),
  );
test("import has 160 distinct evidence-backed entries and 12 matching categories", () => {
  const d = validateDirectory(
    read("entries"),
    read("evidence"),
    read("taxonomy"),
  );
  assert.equal(d.entries.length, 160);
  assert.equal(d.taxonomy.length, 12);
  assert.ok(
    d.evidence.find((p) => p.id === "dutygraph")!.limitations.length > 0,
  );
});
test("directory rejects unsafe URLs, orphaned citations and duplicate entries", () => {
  const e = read("entries"),
    p = read("evidence"),
    t = read("taxonomy");
  e[0].url = "javascript:alert(1)";
  assert.throws(() => validateDirectory(e, p, t));
  p[0].claims[0].sourceIds = ["missing"];
  assert.throws(
    () => validateDirectory(read("entries"), p, t),
    /Broken claim source/,
  );
  const dup = read("entries");
  dup[1] = dup[0];
  assert.throws(() => validateDirectory(dup, read("evidence"), t), /Duplicate/);
});
