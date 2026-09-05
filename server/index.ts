import "dotenv/config";
import { createApp, errorHandler } from "./app.ts";
import { assetsRouter } from "./assets.ts";
import { projectAll } from "./projection.ts";
import { pool } from "./db.ts";
import { runRetention } from "./retention.ts";
import express from "express";
import path from "node:path";
const app = createApp();
app.use("/api/v1/companies/:companyId/assets", assetsRouter());
app.use("/api", (_req, res) =>
  res
    .status(404)
    .json({
      code: "NOT_IMPLEMENTED",
      message: "This API route is not implemented in the local pilot.",
    }),
);
if (process.argv.includes("--production")) {
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use(errorHandler);
await pool.query("SELECT 1");
const port = Number(process.env.PORT || 4317);
const server = app.listen(port, "127.0.0.1", () =>
  console.log(
    `Duty Graph ready at http://localhost:${port} — PostgreSQL backed local pilot`,
  ),
);
server.on("error", (e) => {
  console.error("Could not bind Duty Graph port:", e.message);
  process.exit(1);
});
const worker = setInterval(
  () =>
    projectAll().catch(() =>
      console.error(
        "Graph projection delayed. Authoritative records remain available.",
      ),
    ),
  2000,
);
const retention = setInterval(
  () =>
    runRetention().catch(() => console.error("Audio retention job delayed.")),
  60000,
);
void runRetention();
process.on("SIGTERM", () => {
  clearInterval(worker);
  clearInterval(retention);
  server.close(() => pool.end().then(() => process.exit(0)));
});
