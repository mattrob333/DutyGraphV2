import JSZip from "jszip";
import { createHash } from "node:crypto";
import type pg from "pg";
import { hash, putRecord } from "./db.ts";
import { confirmationStatus, type User } from "../shared/domain.ts";
export async function createExport(
  db: pg.PoolClient,
  user: User,
  company: any,
  kind: "workspace" | "confirmed" | "agent",
  agentId?: string,
) {
  const all = (
    await db.query(
      "SELECT * FROM records WHERE company_id=$1 ORDER BY created_at,id",
      [company.id],
    )
  ).rows;
  const confirmations = (
    await db.query("SELECT * FROM confirmations WHERE company_id=$1", [
      company.id,
    ])
  ).rows;
  const tasks = all.filter((r) => r.kind === "task");
  let included = tasks.filter(
    (t) =>
      kind === "workspace" ||
      confirmationStatus(t, confirmations) === "confirmed",
  );
  const agent = all.find((r) => r.id === agentId && r.kind === "agent");
  if (kind === "agent")
    included = included.filter((t) =>
      agent?.data.taskBindings?.some(
        (b: any) =>
          b.id === t.id && b.version === t.version && b.hash === t.hash,
      ),
    );
  const excluded = tasks
    .filter((t) => !included.some((i) => i.id === t.id))
    .map((t) => ({
      id: t.id,
      title: t.title,
      version: t.version,
      reason:
        confirmationStatus(t, confirmations) === "confirmed"
          ? "Not bound to this current proposal"
          : confirmationStatus(t, confirmations),
    }));
  const packet = {
    schemaVersion: "0.1.0",
    canonicalization: "json-canonicalize",
    kind,
    audience: "Assigned advisor — internal review",
    company: {
      id: company.id,
      name: company.name,
      scope: company.scope,
      goal: company.goal,
    },
    sourceRevision: company.revision,
    generatedAt: new Date().toISOString(),
    sandbox: company.sandbox,
    compatibility: "instruction-compatible",
    authorization: "none",
    runtime: "not_deployed",
    coverage:
      "Work descriptions and confirmation history only. No permission grant, provisioning receipt, or observed execution.",
    tasks: included.map((t) => ({
      id: t.id,
      version: t.version,
      title: t.title,
      hash: t.hash,
      state: confirmationStatus(t, confirmations),
      data: t.data,
    })),
    excluded,
    people: all
      .filter((r) => r.kind === "person")
      .map((r) => ({
        id: r.id,
        name: r.title,
        role: r.data.role,
        team: r.data.team,
      })),
    evidence: all
      .filter((r) => r.kind === "evidence" && r.state === "accepted")
      .map((r) => ({
        id: r.id,
        title: r.title,
        version: r.version,
        hash: r.hash,
        locator: r.data.locator,
        originId: r.data.originId,
      })),
    agent: agent
      ? {
          id: agent.id,
          version: agent.version,
          title: agent.title,
          hash: agent.hash,
          ownerId: agent.data.ownerId,
        }
      : null,
  };
  const contentHash = hash(packet);
  return putRecord(
    db,
    user,
    company.id,
    "export",
    (kind === "workspace"
      ? "Workspace snapshot"
      : kind === "confirmed"
        ? "Confirmed work packet"
        : "Draft agent package") +
      " · " +
      new Date().toISOString().slice(0, 10),
    { packet, contentHash },
    "ready",
    undefined,
    "Frozen internal export; raw evidence and credentials excluded",
  );
}
export async function exportZip(record: any) {
  const zip = new JSZip(),
    packet = record.data.packet;
  const manifest = JSON.stringify(packet, null, 2);
  const instructions = [
    "# " + packet.company.name,
    "",
    "Purpose: " + packet.company.goal,
    "",
    "DRAFT INSTRUCTIONS. This package grants no authority and does not deploy an agent.",
    "",
    ...packet.tasks.flatMap((t: any) => [
      "## " + t.title + " (v" + t.version + ")",
      "",
      t.data.instructions,
      "",
      "Human checkpoint: " + t.data.humanGate,
      "",
      "Do not: " + t.data.denied.join("; "),
      "",
    ]),
  ].join("\n");
  const guide =
    "# Setup and control requirements\n\n1. Review each task and source reference with the accountable human.\n2. Establish legitimate authority separately from technical access.\n3. Configure and test a bounded runtime adapter.\n4. Obtain exact-version approvals in the customer approval system.\n5. Prove enforcement and revocation before execution.\n\nNo runtime adapter is provisioned by this package. Missing and excluded records are listed in manifest.json. Raw recordings and source text are omitted.\n";
  zip.file("manifest.json", manifest);
  zip.file("instructions.md", instructions);
  zip.file("SETUP.md", guide);
  const fileHash = (text: string) =>
    createHash("sha256").update(text, "utf8").digest("hex");
  zip.file(
    "checksums.json",
    JSON.stringify(
      {
        canonicalPacketHash: record.data.contentHash,
        canonicalization: "json-canonicalize@3.0.0",
        files: {
          "manifest.json": fileHash(manifest),
          "instructions.md": fileHash(instructions),
          "SETUP.md": fileHash(guide),
        },
        algorithm: "SHA-256 of UTF-8 file bytes",
      },
      null,
      2,
    ),
  );
  return zip.generateAsync({ type: "nodebuffer" });
}
