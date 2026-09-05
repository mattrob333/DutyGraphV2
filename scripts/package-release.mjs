import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import path from "node:path";
import JSZip from "jszip";

// Run after the final build, PDF generation, commit and CI verification:
//   node scripts/package-release.mjs
// Optional CI_RUN_URL records a verified GitHub Actions run in the manifest.
// Both output paths must be absent. This tool never removes or replaces a pack.
const execute = promisify(execFile);
const repositoryUrl = "https://github.com/mattrob333/DutyGraphV2";
const repo = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(repo, "client/public/handbook");
const outputRoot = path.resolve(repo, "..");
const destination = path.join(outputRoot, "DutyGraph-Delivery-Pack");
const archivePath = path.join(outputRoot, "DutyGraph-Delivery-Pack.zip");
const pdfName = "DutyGraph-Advisor-Handbook.pdf";
const pdfPath = path.join(outputRoot, pdfName);
const extensions = new Set([".html", ".md", ".json", ".zip"]);
const directories = new Set(["contracts", "examples", "verification"]);
const guideNames = [
  "01-start-here",
  "02-walkthrough",
  "03-user-manual",
  "04-advisor-playbook",
  "05-training-workbook",
  "06-facilitator-guide",
  "07-client-deliverables",
  "08-glossary",
];
const referenceNames = [
  "field-reference",
  "operations",
  "architecture",
  "security",
  "integrations",
  "api-reference",
  "release-status",
  "verification",
  "acceptance-checklist",
];
const expected = new Set([
  "index.html",
  "complete-advisor-handbook.html",
  "complete-advisor-handbook.md",
  ...[...guideNames, ...referenceNames].flatMap((name) => [
    `${name}.html`,
    `${name}.md`,
  ]),
  ...["executive", "weekly", "audit"].flatMap((name) => [
    `examples/${name}-client-example.html`,
    `examples/${name}-client-example.zip`,
  ]),
  "examples/confirmed-internal-example.zip",
  "examples/agent-internal-example.zip",
  "examples/training-manifest.json",
  "requirements-status.json",
  "verification/performance-local.json",
  "verification/restore-drill.json",
  "verification/backup-tamper.json",
  "contracts/openapi.json",
  "contracts/routes.json",
  "contracts/framework-registry.json",
]);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const samePath = (a, b) =>
  process.platform === "win32"
    ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase()
    : path.resolve(a) === path.resolve(b);

async function requirePlain(file, directory = false) {
  const stat = await lstat(file);
  if (
    stat.isSymbolicLink() ||
    (directory ? !stat.isDirectory() : !stat.isFile())
  )
    throw new Error(
      `Expected an ordinary ${directory ? "directory" : "file"}: ${file}`,
    );
  if (!samePath(await realpath(file), file))
    throw new Error(`Input path resolves through a link: ${file}`);
  if (!directory && stat.size > 64 * 1024 * 1024)
    throw new Error(
      `Input exceeds the 64 MB per-file packaging limit: ${file}`,
    );
}
async function requireAbsent(file) {
  try {
    await lstat(file);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  throw new Error(
    `Output already exists; preserve or relocate it before packaging: ${file}`,
  );
}
async function collect(folder, prefix = "") {
  const files = [];
  for (const name of (await readdir(folder)).sort()) {
    if (!/^[a-z0-9][a-z0-9.-]*$/.test(name))
      throw new Error(`Unexpected handbook input name: ${prefix}${name}`);
    const relative = prefix + name;
    const absolute = path.join(folder, name);
    const stat = await lstat(absolute);
    if (stat.isDirectory()) {
      if (!directories.has(relative))
        throw new Error(
          `Directory is outside the handbook allowlist: ${relative}`,
        );
      await requirePlain(absolute, true);
      files.push(...(await collect(absolute, relative + "/")));
    } else {
      await requirePlain(absolute);
      if (!extensions.has(path.extname(name)) || !expected.has(relative))
        throw new Error(`File is outside the handbook allowlist: ${relative}`);
      files.push(relative);
    }
  }
  return files;
}
async function inspectExampleArchive(bytes, name) {
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  for (const entry of Object.values(zip.files)) {
    const permissions = Number(entry.unixPermissions || 0);
    if (
      entry.dir ||
      (permissions & 0xf000) === 0xa000 ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(?:html|md|json|csv)$/.test(entry.name) ||
      (entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name)
    )
      throw new Error(`Unexpected entry in generated example archive: ${name}`);
  }
}
function checkOfflineLinks(files) {
  for (const [name, bytes] of files) {
    if (!name.endsWith(".html")) continue;
    for (const [, href] of bytes.toString("utf8").matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:\/\/|mailto:|#)/i.test(href)) continue;
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(name), href.split("#")[0]),
      );
      if (!files.has(target))
        throw new Error(
          `Broken or nonportable handbook link in ${name}: ${href}`,
        );
    }
  }
}

async function main() {
  await requirePlain(repo, true);
  await requirePlain(source, true);
  await requirePlain(pdfPath);
  await requireAbsent(destination);
  await requireAbsent(archivePath);
  const packageJson = JSON.parse(
    await readFile(path.join(repo, "package.json"), "utf8"),
  );
  if (packageJson.name !== "dutygraph-v2" || packageJson.version !== "0.2.0")
    throw new Error(
      "This delivery-pack script is scoped to Duty Graph release 0.2.0.",
    );
  const { stdout: revision } = await execute("git", [
    "-C",
    repo,
    "rev-parse",
    "HEAD",
  ]);
  const gitHead = revision.trim();
  if (!/^[a-f0-9]{40}$/.test(gitHead))
    throw new Error("Could not identify the release Git commit.");
  const { stdout: dirty } = await execute("git", [
    "-C",
    repo,
    "status",
    "--porcelain",
    "--untracked-files=normal",
  ]);
  if (dirty.trim())
    throw new Error(
      "Commit all release source changes before packaging; the checkout must be clean.",
    );
  const ciRunUrl = process.env.CI_RUN_URL?.trim() || null;
  if (
    ciRunUrl &&
    !/^https:\/\/github\.com\/mattrob333\/DutyGraphV2\/actions\/runs\/\d+(?:\/attempts\/\d+)?\/?$/.test(
      ciRunUrl,
    )
  )
    throw new Error(
      "CI_RUN_URL must identify a GitHub Actions run for mattrob333/DutyGraphV2.",
    );
  const names = await collect(source);
  const missing = [...expected].filter((name) => !names.includes(name));
  if (missing.length)
    throw new Error(
      `Handbook is incomplete; run the final build first. Missing: ${missing.join(", ")}`,
    );
  const files = new Map();
  let totalBytes = 0;
  for (const name of names.sort()) {
    const bytes = await readFile(path.join(source, name));
    totalBytes += bytes.length;
    if (totalBytes > 256 * 1024 * 1024)
      throw new Error("Handbook exceeds the 256 MB packaging limit.");
    if (name.endsWith(".json")) JSON.parse(bytes.toString("utf8"));
    if (name.endsWith(".zip")) await inspectExampleArchive(bytes, name);
    files.set(name, bytes);
  }
  checkOfflineLinks(files);
  const pdf = await readFile(pdfPath);
  if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-")
    throw new Error("The advisor handbook is not a PDF file.");
  files.set(pdfName, pdf);
  const packagedAt = new Date().toISOString();
  files.set(
    "START-HERE.md",
    Buffer.from(
      `# Duty Graph 0.2 delivery pack

Open [index.html](index.html) in a browser after extracting the entire ZIP. Keep its folders together. The handbook, examples and technical references work offline; the application itself requires its local server and database.

## Read, follow and practice

- [Product explainer](01-start-here.html)
- [Full user manual](03-user-manual.html)
- [Advisor walkthrough](02-walkthrough.html) and [A-to-Z playbook](04-advisor-playbook.html)
- [Training workbook](05-training-workbook.html) and [facilitator guide and answers](06-facilitator-guide.html)
- [Complete printable advisor handbook](${pdfName}) and [searchable HTML edition](complete-advisor-handbook.html)
- [Client deliverables and example guide](07-client-deliverables.html)

The examples/ folder contains fictional Northstar training outputs generated through the application. Executive, weekly and audit client examples show audience-reviewed client reports. Confirmed-work and agent-proposal internal examples are advisor/implementation review packets. Internal packets are not client reports, permission grants or executable deployments. No real client findings or approvals are asserted.

## Run and inspect the application

Source repository: ${repositoryUrl}

Local application after setup: http://localhost:4317

Follow [the operator runbook](operations.html) for installation, migrations, backup and recovery. This pack contains documentation and examples; obtain the application source and lockfile from the repository. The [verification record](verification.html), [requirement traceability](requirements-status.json), [release status](release-status.html), [acceptance checklist](acceptance-checklist.html) and [integration plan](integrations.html) define the measured behavior and remaining work.

## Release boundary

Version ${packageJson.version} is a local advisor pilot with human-led evidence review, confirmation, manual workflow observation and reporting. It does not complete the full production authority/execution target. Production data access, identity, retention, hosting, independent security/accessibility acceptance and customer-system execution require further work.

Exa public-source collection is implemented but has no project key configured in the delivered local instance and has not been verified against a live provider account. Tests use a simulated provider. An operator must supply the project's Exa credential securely, enable the adapter, establish spending controls and complete live acceptance. Firecrawl is not implemented or configured; model synthesis and transcription are unconfigured or unimplemented. A provider key alone does not implement those missing services. Never put credentials in this pack or in source control.

## Integrity and build identity

Git commit: ${gitHead}

Packaged at: ${packagedAt}

CI run: ${ciRunUrl || "Not recorded in this package; inspect the repository's verified release run."}

SHA256-MANIFEST.json lists the byte length and SHA-256 digest of every payload file, including this note and the PDF. It excludes itself and the containing ZIP because self-hashing is not defined. These checksums detect changed bytes; they are not an independent signature, proof of authorship or production acceptance. No configuration, credentials, database backups or private source handoff documents are included.
`,
      "utf8",
    ),
  );
  const entries = [...files]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, bytes]) => ({
      path: name,
      bytes: bytes.length,
      sha256: sha256(bytes),
    }));
  const manifest = {
    format: "DutyGraph-delivery-pack-v1",
    version: packageJson.version,
    repository: repositoryUrl,
    gitHead,
    checkoutClean: true,
    packagedAt,
    ciRunUrl,
    hashAlgorithm: "SHA-256",
    excludes: ["SHA256-MANIFEST.json itself", "The containing ZIP archive"],
    files: entries,
  };
  files.set(
    "SHA256-MANIFEST.json",
    Buffer.from(JSON.stringify(manifest, null, 2) + "\n"),
  );
  const archive = new JSZip();
  // Stable ordering, permissions and entry times make the ZIP deterministic for
  // a given payload/manifest. packagedAt intentionally identifies each run.
  for (const [name, bytes] of [...files].sort(([a], [b]) => a.localeCompare(b)))
    archive.file(name, bytes, {
      date: new Date("1980-01-01T00:00:00.000Z"),
      createFolders: false,
      unixPermissions: 0o100644,
    });
  const archiveBytes = await archive.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "UNIX",
  });
  // No destination is touched until every input, link and archive has passed.
  await mkdir(destination);
  for (const folder of directories) await mkdir(path.join(destination, folder));
  for (const [name, bytes] of files)
    await writeFile(path.join(destination, name), bytes, { flag: "wx" });
  await writeFile(archivePath, archiveBytes, { flag: "wx" });
  console.log(
    JSON.stringify(
      {
        status: "packaged",
        version: packageJson.version,
        gitHead,
        ciRunUrl,
        packagedAt,
        directory: destination,
        archive: archivePath,
        payloadFiles: entries.length,
        archiveBytes: archiveBytes.length,
        archiveSha256: sha256(archiveBytes),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`Delivery packaging stopped: ${error.message}`);
  console.error(
    "Existing outputs are never removed. If writing failed, preserve and inspect any newly created partial pack before retrying.",
  );
  process.exitCode = 1;
});
