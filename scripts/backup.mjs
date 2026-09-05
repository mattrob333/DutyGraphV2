import "dotenv/config";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import pg from "pg";
import path from "node:path";
const mode = process.argv[2] || "create";
if (!["create", "drill"].includes(mode))
  throw new Error(
    "Use backup.mjs create or backup.mjs drill <encrypted backup>.",
  );
const connection = new URL(process.env.MIGRATION_DATABASE_URL);
if (
  connection.hostname !== "127.0.0.1" ||
  connection.port !== "55437" ||
  connection.pathname !== "/dutygraph"
)
  throw new Error(
    "This tool is limited to the dedicated local Duty Graph database.",
  );
const folder = path.resolve("work/backups");
await mkdir(folder, { recursive: true });
const keyPath = path.join(folder, "backup-key.hex");
let key;
try {
  key = Buffer.from((await readFile(keyPath, "utf8")).trim(), "hex");
} catch (e) {
  if (e.code !== "ENOENT" || mode !== "create") throw e;
  key = randomBytes(32);
  await writeFile(keyPath, key.toString("hex"), { mode: 0o600, flag: "wx" });
}
if (key.length !== 32) throw new Error("Invalid backup key file.");
const run = (args, input) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      [
        "compose",
        "--env-file",
        ".env",
        "-f",
        "infra/compose.yaml",
        "exec",
        "-T",
        "postgres",
        ...args,
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const output = [];
    child.stdout.on("data", (b) => output.push(b));
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) =>
      code
        ? reject(
            new Error(
              `Backup subprocess failed (${code}); no secret-bearing output is printed.`,
            ),
          )
        : resolve(Buffer.concat(output)),
    );
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
const pool = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const fingerprint = async (db, includeResearch = true) => {
  const result = (
    await db.query(
      "SELECT (SELECT count(*)::int FROM records) records,(SELECT count(*)::int FROM record_versions) versions,(SELECT count(*)::int FROM audit_events) audit_events,(SELECT count(*)::int FROM companies) companies,(SELECT count(*)::int FROM users) users,(SELECT md5(coalesce(string_agg(id::text||hash,',' ORDER BY id),'')) FROM records) record_digest",
    )
  ).rows[0];
  if (includeResearch)
    Object.assign(
      result,
      (
        await db.query(
          "SELECT count(*)::int research_runs,md5(coalesce(string_agg(id::text||query||domain||state||results::text,',' ORDER BY id),'')) research_digest FROM research_runs",
        )
      ).rows[0],
    );
  return result;
};
try {
  if (mode === "create") {
    const db = await pool.connect();
    try {
      await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const snapshot = (await db.query("SELECT pg_export_snapshot() snapshot"))
        .rows[0].snapshot;
      const counts = await fingerprint(db);
      const dump = await run([
        "pg_dump",
        "-U",
        "postgres",
        "-d",
        "dutygraph",
        "-Fc",
        "--snapshot=" + snapshot,
      ]);
      const createdAt = new Date().toISOString(),
        header = {
          format: "DutyGraph-encrypted-backup-v1",
          createdAt,
          counts,
          sha256: createHash("sha256").update(dump).digest("hex"),
        };
      const iv = randomBytes(12),
        cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from(JSON.stringify(header)));
      const encrypted = Buffer.concat([cipher.update(dump), cipher.final()]);
      const file = path.join(
        folder,
        "dutygraph-" + createdAt.replaceAll(/[:.]/g, "-") + ".dgbak",
      );
      await writeFile(
        file,
        JSON.stringify({
          header,
          iv: iv.toString("base64"),
          tag: cipher.getAuthTag().toString("base64"),
          ciphertext: encrypted.toString("base64"),
        }),
        { flag: "wx", mode: 0o600 },
      );
      await db.query("COMMIT");
      console.log(
        JSON.stringify({
          status: "encrypted",
          file,
          keyPath,
          counts,
          bytes: encrypted.length,
        }),
      );
    } catch (e) {
      await db.query("ROLLBACK");
      throw e;
    } finally {
      db.release();
    }
  } else {
    const supplied = process.argv[3];
    if (!supplied)
      throw new Error(
        "Specify an encrypted .dgbak backup for an isolated restore drill.",
      );
    const file = path.resolve(supplied);
    if (!file.endsWith(".dgbak")) throw new Error("Expected a .dgbak file.");
    const packet = JSON.parse(await readFile(file, "utf8"));
    if (packet.header?.format !== "DutyGraph-encrypted-backup-v1")
      throw new Error("Unsupported backup format.");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(packet.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(JSON.stringify(packet.header)));
    decipher.setAuthTag(Buffer.from(packet.tag, "base64"));
    const dump = Buffer.concat([
      decipher.update(Buffer.from(packet.ciphertext, "base64")),
      decipher.final(),
    ]);
    if (
      createHash("sha256").update(dump).digest("hex") !== packet.header.sha256
    )
      throw new Error("Backup checksum mismatch.");
    const drillDb = "dutygraph_restore_" + Date.now();
    if (!/^dutygraph_restore_\d+$/.test(drillDb))
      throw new Error("Unsafe drill database name.");
    const started = Date.now();
    await pool.query(`CREATE DATABASE ${drillDb}`);
    let validation;
    try {
      await run(
        [
          "pg_restore",
          "-U",
          "postgres",
          "--exit-on-error",
          "--no-owner",
          "-d",
          drillDb,
        ],
        dump,
      );
      const url = new URL(process.env.MIGRATION_DATABASE_URL);
      url.pathname = "/" + drillDb;
      const restored = new pg.Pool({ connectionString: url.toString() });
      try {
        validation = await fingerprint(
          restored,
          Object.hasOwn(packet.header.counts, "research_runs"),
        );
        if (JSON.stringify(validation) !== JSON.stringify(packet.header.counts))
          throw new Error(
            "Restored counts or record digest differ from the frozen backup snapshot.",
          );
      } finally {
        await restored.end();
      }
      const report = {
        status: "passed",
        backupCreatedAt: packet.header.createdAt,
        restoredDatabase: drillDb,
        elapsedMs: Date.now() - started,
        validation,
        originalDatabase: "unchanged",
        notice:
          "Local drill only; no production RPO/RTO or off-host recovery claim.",
      };
      await writeFile(
        path.join(folder, "latest-restore-drill.json"),
        JSON.stringify(report, null, 2),
      );
      console.log(JSON.stringify(report));
    } finally {
      await pool.query(`DROP DATABASE ${drillDb}`);
    }
  }
} finally {
  await pool.end();
}
