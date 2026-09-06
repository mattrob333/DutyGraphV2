import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import neo4j from "neo4j-driver";
import {
  closeNeo4jDrivers,
  isAuraUri,
  neo4jCredentialsSchema,
  neo4jPublicStatus,
  projectionData,
  projectionFingerprint,
  readNeo4jSnapshot,
  snapshotFor,
  writeProjection,
} from "../server/neo4j.ts";
import { sealSecret, openSecret } from "../server/providers.ts";
import { boundedGraph } from "../server/graph-query.ts";

const tenant = randomUUID(),
  company = randomUUID();
const records = [
  {
    id: "person-a",
    tenant_id: tenant,
    company_id: company,
    kind: "person",
    title: "Maya",
    state: "reported",
    version: 1,
    hash: "person-hash",
    data: { email: "private@example.test" },
  },
  {
    id: "task-a",
    tenant_id: tenant,
    company_id: company,
    kind: "task",
    title: "Check the packet",
    state: "proposed",
    version: 2,
    hash: "task-hash",
    data: {
      ownerId: "person-a",
      performerId: "person-a",
      evidenceIds: ["source-a"],
      instructions: "Private instructions",
    },
  },
  {
    id: "source-a",
    tenant_id: tenant,
    company_id: company,
    kind: "evidence",
    title: "Interview",
    state: "accepted",
    version: 1,
    hash: "source-hash",
    data: {
      text: "Private interview transcript",
      audioKey: "private/audio.webm",
    },
  },
];
const credentials = {
  uri: "neo4j+s://1234abcd.databases.neo4j.io",
  username: "neo4j",
  database: "neo4j",
  password: "test-only-database-password",
};
afterEach(async () => {
  await closeNeo4jDrivers();
  mock.restoreAll();
});

test("Aura URLs accept only verified TLS Aura database hosts", () => {
  for (const uri of [
    credentials.uri,
    credentials.uri + ":7687",
    credentials.uri + "/",
  ])
    assert.ok(isAuraUri(uri), uri);
  for (const uri of [
    "bolt://1234abcd.databases.neo4j.io",
    "neo4j+ssc://1234abcd.databases.neo4j.io",
    "neo4j+s://localhost",
    "neo4j+s://127.0.0.1",
    "neo4j+s://[::1]",
    "neo4j+s://1234abcd.databases.neo4j.io.evil.test",
    "neo4j+s://evil.test/1234abcd.databases.neo4j.io",
    "neo4j+s://user:password@1234abcd.databases.neo4j.io",
    credentials.uri + ":443",
    credentials.uri + "?region=x",
    credentials.uri + "/private",
  ])
    assert.equal(
      neo4jCredentialsSchema.safeParse({ ...credentials, uri }).success,
      false,
      uri,
    );
  assert.equal(
    neo4jCredentialsSchema.safeParse({
      ...credentials,
      cypher: "MATCH (n) DETACH DELETE n",
    }).success,
    false,
  );
});
test("stored credential blobs are bound to the account and public status never returns secrets", () => {
  const previous = process.env.PROVIDER_ENCRYPTION_KEY;
  process.env.PROVIDER_ENCRYPTION_KEY = "a".repeat(64);
  try {
    const sealed = sealSecret(JSON.stringify(credentials), tenant + ":neo4j");
    assert.equal(sealed.includes(credentials.password), false);
    assert.equal(
      JSON.parse(openSecret(sealed, tenant + ":neo4j")).password,
      credentials.password,
    );
    assert.throws(() => openSecret(sealed, randomUUID() + ":neo4j"));
    const status = neo4jPublicStatus({
      enabled: true,
      encrypted_key: sealed,
      config: {
        endpoint: credentials.uri,
        username: "neo4j",
        database: "neo4j",
        verifiedAt: null,
        password: "must-not-leak",
      },
    });
    assert.equal(status.configured, true);
    assert.equal(status.connected, false);
    assert.equal(JSON.stringify(status).includes("must-not-leak"), false);
    assert.equal(JSON.stringify(status).includes("encrypted_key"), false);
  } finally {
    if (previous === undefined) delete process.env.PROVIDER_ENCRYPTION_KEY;
    else process.env.PROVIDER_ENCRYPTION_KEY = previous;
  }
});
test("the projection includes relationships but excludes interview text, instructions, emails and audio", () => {
  const snapshot = snapshotFor(tenant, company, 7, records);
  assert.equal(snapshot.nodes.length, 3);
  assert.equal(snapshot.edges.length, 3);
  for (const text of [
    "Private interview transcript",
    "Private instructions",
    "private@example.test",
    "private/audio.webm",
  ])
    assert.equal(JSON.stringify(snapshot).includes(text), false);
  assert.throws(
    () => snapshotFor(tenant, randomUUID(), 7, records),
    /requested company/,
  );
  assert.throws(
    () => snapshotFor(randomUUID(), company, 7, records),
    /requested company/,
  );
  assert.throws(
    () =>
      snapshotFor(
        tenant,
        company,
        7,
        Array.from({ length: 5001 }, (_, i) => ({
          ...records[0],
          id: String(i),
        })),
      ),
    /projection limit/,
  );
});
test("a fingerprint changes for edits, confirmations and order, and ignores unprojected bodies", () => {
  const baseline = projectionFingerprint(records);
  assert.notEqual(
    projectionFingerprint(
      records.map((r) => ({
        ...r,
        state: r.id === "task-a" ? "confirmed" : r.state,
      })),
    ),
    baseline,
  );
  assert.notEqual(
    projectionFingerprint(
      records.map((r) => ({
        ...r,
        hash: r.id === "task-a" ? "new-hash" : r.hash,
      })),
    ),
    baseline,
  );
  assert.notEqual(projectionFingerprint([...records].reverse()), baseline);
  assert.equal(
    projectionFingerprint(
      records.map((r) => ({
        ...r,
        data: {
          ...r.data,
          text: "Changed raw text; hash held constant for this test",
        },
      })),
    ),
    baseline,
  );
});
function fakeTransaction(
  revision = -1,
  fingerprint = "",
  stored = projectionData(records),
) {
  const calls: { query: string; parameters: any }[] = [];
  const transaction = {
    run: async (query: string, parameters: any) => {
      calls.push({ query, parameters });
      if (query.includes("RETURN n.id AS id"))
        return {
          records: stored.nodes.map((row) => ({ toObject: () => row })),
        };
      if (query.includes("RETURN a.id AS source"))
        return {
          records: stored.edges.map((row) => ({ toObject: () => row })),
        };
      return {
        records: [
          {
            get: (key: string) =>
              ({ revision, fingerprint, nodes: records.length, edges: 3 })[key],
          },
        ],
      };
    },
  };
  return { calls, transaction: transaction as any };
}
test("rebuilding is idempotent and an older worker cannot overwrite a newer projection", async () => {
  const snapshot = snapshotFor(tenant, company, 7, records);
  for (const [revision, fingerprint, reason] of [
    [7, snapshot.fingerprint, "already_current"],
    [8, "other", "newer_revision"],
  ] as const) {
    const fake = fakeTransaction(revision, fingerprint);
    assert.deepEqual(await writeProjection(fake.transaction, snapshot), {
      written: false,
      reason,
    });
    assert.equal(fake.calls.length, reason === "already_current" ? 3 : 1);
    assert.match(fake.calls[0].query, /writeLock=coalesce/);
  }
});

test("rebuild repairs missing or altered payload even when company metadata still matches", async () => {
  const snapshot = snapshotFor(tenant, company, 7, records);
  const altered = projectionData(records);
  altered.nodes[0].title = "Changed directly in Aura";
  const malformed = projectionData(records);
  malformed.nodes[1].id = null as any;
  for (const stored of [
    { nodes: [], edges: [] },
    { nodes: snapshot.nodes, edges: snapshot.edges.slice(1) },
    altered,
    malformed,
  ]) {
    const fake = fakeTransaction(7, snapshot.fingerprint, stored);
    assert.deepEqual(await writeProjection(fake.transaction, snapshot), {
      written: true,
      reason: "updated",
    });
    assert.equal(fake.calls.length, 8);
    const copiedNodes = fake.calls.find((c) => c.parameters.nodes)!.parameters
      .nodes;
    assert.deepEqual(
      copiedNodes.map(({ key, ...node }: any) => node),
      snapshot.nodes,
    );
    const copiedEdges = fake.calls.find((c) => c.parameters.edges)!.parameters
      .edges;
    assert.deepEqual(
      copiedEdges.map(
        ({ ordinal, sourceKey, targetKey, ...edge }: any) => edge,
      ),
      snapshot.edges,
    );
    assert.ok(fake.calls.at(-1)!.query.includes("c.fingerprint=$fingerprint"));
    assert.ok(
      fake.calls.every((c) => c.parameters.scope === `${tenant}:${company}`),
    );
  }
});
test("rebuild queries bind tenant/company scope on every operation and never detach foreign relationships", async () => {
  const injected = "x' }) DETACH DELETE n //";
  const snapshot = snapshotFor(
    tenant,
    company,
    7,
    records.map((r) => ({ ...r, title: injected })),
  );
  const fake = fakeTransaction();
  assert.deepEqual(await writeProjection(fake.transaction, snapshot), {
    written: true,
    reason: "updated",
  });
  assert.equal(fake.calls.length, 6);
  for (const call of fake.calls) {
    assert.equal(call.parameters.scope, `${tenant}:${company}`);
    assert.equal(call.query.includes(injected), false);
    assert.equal(call.query.includes("DETACH DELETE"), false);
  }
  const nodeCall = fake.calls.find((c) => c.parameters.nodes);
  assert.equal(nodeCall?.parameters.nodes[0].title, injected);
  assert.ok(
    nodeCall?.parameters.nodes.every((n: any) =>
      n.key.startsWith(`${tenant}:${company}:`),
    ),
  );
  const edgeCall = fake.calls.find((c) => c.parameters.edges);
  assert.ok(
    edgeCall?.parameters.edges.every(
      (e: any) =>
        e.sourceKey.startsWith(`${tenant}:${company}:`) &&
        e.targetKey.startsWith(`${tenant}:${company}:`),
    ),
  );
});

function fakeReadConnection(
  options: {
    revisionMatches?: boolean;
    alterNode?: boolean;
    fail?: boolean;
    hang?: boolean;
  } = {},
) {
  const currentTenant = randomUUID(),
    currentCompany = randomUUID(),
    connectionId = randomUUID();
  const previous = process.env.PROVIDER_ENCRYPTION_KEY;
  process.env.PROVIDER_ENCRYPTION_KEY = "a".repeat(64);
  const encrypted = sealSecret(
    JSON.stringify(credentials),
    currentTenant + ":neo4j",
  );
  // Restore after each test with the returned helper; no actual driver or network is used.
  const db = {
    query: async () => ({
      rows: [
        { encrypted_key: encrypted, enabled: true, config: { connectionId } },
      ],
    }),
  } as any;
  const data = projectionData(records),
    queries: { query: string; params: any }[] = [];
  let sessions = 0;
  const session = {
    close: async () => {},
    executeRead: async (fn: any) => {
      if (options.fail)
        throw new Error("Sensitive URI/password must not escape");
      if (options.hang) return new Promise(() => {});
      return fn({
        run: async (query: string, params: any) => {
          queries.push({ query, params });
          if (query.includes("DGCompany"))
            return {
              records:
                options.revisionMatches === false
                  ? []
                  : [
                      {
                        get: (k: string) =>
                          k === "nodes" ? data.nodes.length : data.edges.length,
                      },
                    ],
            };
          if (query.includes("DG_LINK"))
            return {
              records: data.edges.map((row) => ({ toObject: () => row })),
            };
          return {
            records: data.nodes.map((row, i) => ({
              toObject: () =>
                options.alterNode && i === 0
                  ? { ...row, title: "Stale title" }
                  : row,
            })),
          };
        },
      });
    },
  };
  mock.method(
    neo4j,
    "driver",
    () =>
      ({
        session: () => {
          sessions++;
          return session;
        },
        close: async () => {},
      }) as any,
  );
  return {
    db,
    tenant: currentTenant,
    company: currentCompany,
    queries,
    sessions: () => sessions,
    restore: () => {
      if (previous === undefined) delete process.env.PROVIDER_ENCRYPTION_KEY;
      else process.env.PROVIDER_ENCRYPTION_KEY = previous;
    },
  };
}
test("a verified current snapshot produces the same filtered graph as authoritative records", async () => {
  const fake = fakeReadConnection();
  try {
    const snapshot = await readNeo4jSnapshot(
      fake.tenant,
      fake.company,
      7,
      projectionFingerprint(records),
      fake.db,
    );
    assert.ok(snapshot);
    assert.deepEqual(
      boundedGraph(
        snapshot.nodes,
        { limit: 2, depth: 1, focus: "person-a" },
        snapshot.edges,
      ),
      boundedGraph(records, { limit: 2, depth: 1, focus: "person-a" }),
    );
    assert.ok(
      fake.queries.every(
        (q) => q.params.scope === `${fake.tenant}:${fake.company}`,
      ),
    );
  } finally {
    fake.restore();
  }
});
test("a mismatched revision or copied payload falls back instead of serving stale records", async () => {
  for (const options of [{ revisionMatches: false }, { alterNode: true }]) {
    const fake = fakeReadConnection(options);
    try {
      assert.equal(
        await readNeo4jSnapshot(
          fake.tenant,
          fake.company,
          7,
          projectionFingerprint(records),
          fake.db,
        ),
        null,
      );
    } finally {
      fake.restore();
      await closeNeo4jDrivers();
      mock.restoreAll();
    }
  }
});
test("a failed driver opens a circuit so repeated graph reads return without reconnecting", async () => {
  const fake = fakeReadConnection({ fail: true });
  try {
    for (let i = 0; i < 2; i++)
      assert.equal(
        await readNeo4jSnapshot(
          fake.tenant,
          fake.company,
          7,
          projectionFingerprint(records),
          fake.db,
        ),
        null,
      );
    assert.equal(fake.sessions(), 1);
  } finally {
    fake.restore();
  }
});
test("an unresponsive Aura read yields to PostgreSQL within the short read deadline", async () => {
  const fake = fakeReadConnection({ hang: true }),
    start = performance.now();
  try {
    assert.equal(
      await readNeo4jSnapshot(
        fake.tenant,
        fake.company,
        7,
        projectionFingerprint(records),
        fake.db,
      ),
      null,
    );
    assert.ok(
      performance.now() - start < 3000,
      "Fallback must not wait for an unresponsive driver.",
    );
  } finally {
    fake.restore();
  }
});
