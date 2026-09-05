import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
if (!existsSync(".env")) {
  const admin = randomBytes(24).toString("hex"),
    app = randomBytes(24).toString("hex");
  writeFileSync(
    ".env",
    `PORT=4317\nAPP_ORIGIN=http://localhost:4317\nPOSTGRES_PASSWORD=${admin}\nAPP_DATABASE_PASSWORD=${app}\nMIGRATION_DATABASE_URL=postgres://postgres:${admin}@127.0.0.1:55437/dutygraph\nDATABASE_URL=postgres://dutygraph_app:${app}@127.0.0.1:55437/dutygraph\nENABLE_DEMO=true\n`,
  );
  console.log("Created local database credentials in ignored .env.");
}
const result = spawnSync(
  "docker",
  [
    "compose",
    "--env-file",
    ".env",
    "-f",
    "infra/compose.yaml",
    "up",
    "-d",
    "--wait",
  ],
  { stdio: "inherit" },
);
if (result.status) process.exit(result.status);
const migration = spawnSync(
  process.execPath,
  ["--import", "tsx", "server/migrate.ts"],
  { stdio: "inherit" },
);
process.exit(migration.status ?? 1);
