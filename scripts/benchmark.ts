import "dotenv/config";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { createApp, errorHandler } from "../server/app.ts";
import { registerAccount } from "../server/auth.ts";
import { pool, tx, putRecord } from "../server/db.ts";
const app = createApp();
app.use(errorHandler);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.once("listening", r));
const origin = `http://127.0.0.1:${(server.address() as any).port}`;
try {
  const password = randomBytes(24).toString("hex"),
    email = `perf-${randomUUID()}@training.invalid`;
  const user = await registerAccount({
    name: "Synthetic performance fixture",
    email,
    password,
    companyName: "Isolated performance fixture",
    scope: "Read-only local benchmark of synthetic records",
    goal: "Measure graph and workspace query latency; no production SLO claim.",
  });
  const seed = await tx(user.tenant_id, async (db) => {
    const company = (await db.query("SELECT * FROM companies LIMIT 1")).rows[0];
    const owner = await putRecord(
      db,
      user,
      company.id,
      "person",
      "Benchmark owner",
      {
        name: "Benchmark owner",
        email: "owner@training.invalid",
        role: "Owner",
        team: "Bench",
        managerId: "",
      },
      "reported",
    );
    const evidence = await putRecord(
      db,
      user,
      company.id,
      "evidence",
      "Synthetic benchmark source",
      {
        title: "Synthetic benchmark source",
        text: "x".repeat(3000),
        locator: "Generated performance fixture",
        originId: randomUUID(),
      },
      "accepted",
    );
    for (let i = 0; i < 998; i++)
      await putRecord(
        db,
        user,
        company.id,
        "task",
        `Synthetic task ${i + 1}`,
        {
          title: `Synthetic task ${i + 1}`,
          ownerId: owner.id,
          performerId: owner.id,
          purpose: "Measure local read performance",
          instructions: "Synthetic work description. ".repeat(20),
          evidenceIds: [evidence.id],
          reviewDue: "2099-01-01",
          reviewed: false,
          conflict: false,
        },
        "proposed",
      );
    return { companyId: company.id, focus: owner.id };
  });
  const login = await fetch(origin + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error("Benchmark login failed");
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  const paths = {
    graph: `/api/v1/companies/${seed.companyId}/graph`,
    focusedGraph: `/api/v1/companies/${seed.companyId}/graph?focus=${seed.focus}&depth=2`,
    workspace: `/api/v1/companies/${seed.companyId}/workspace`,
  };
  const results: Record<string, unknown> = {};
  for (const [name, path] of Object.entries(paths)) {
    const times: number[] = [];
    let bytes = 0,
      failures = 0;
    for (let batch = 0; batch < 15; batch++)
      await Promise.all(
        Array.from({ length: 8 }, async () => {
          const start = performance.now();
          const response = await fetch(origin + path, {
            headers: { Cookie: cookie },
          });
          const body = await response.text();
          times.push(performance.now() - start);
          bytes = Buffer.byteLength(body);
          if (!response.ok) failures++;
          if (
            name !== "workspace" &&
            response.ok &&
            JSON.parse(body).nodes.length > 150
          )
            throw new Error("Graph node budget exceeded");
        }),
      );
    times.sort((a, b) => a - b);
    const p = (percent: number) =>
      Math.round(times[Math.ceil(times.length * percent) - 1] * 10) / 10;
    results[name] = {
      requests: times.length,
      concurrency: 8,
      failures,
      p50Ms: p(0.5),
      p95Ms: p(0.95),
      p99Ms: p(0.99),
      maximumMs: p(1),
      responseBytes: bytes,
    };
    if (failures || p(0.95) > (name === "workspace" ? 1500 : 1000))
      throw new Error(`Local regression budget failed for ${name}`);
  }
  const report = {
    measuredAt: new Date().toISOString(),
    environment:
      "Loopback Node 24 and dedicated PostgreSQL 17 on developer workstation",
    fixtureRecords: 1000,
    implementation:
      "Authoritative PostgreSQL graph fallback; no Neo4j or network provider",
    results,
    interpretation:
      "Bounded local read workload only. Not a production capacity, availability or multi-tenant isolation certification. No external side effects.",
    regressionBudgets: { graphP95Ms: 1000, workspaceP95Ms: 1500 },
  };
  await mkdir("docs/verification", { recursive: true });
  await writeFile(
    "docs/verification/performance-local.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.end();
}
