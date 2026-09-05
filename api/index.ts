import { createApp, errorHandler } from "../server/app.ts";
import { assetsRouter } from "../server/assets.ts";
if (!process.env.APP_ORIGIN && process.env.VERCEL_PROJECT_PRODUCTION_URL)
  process.env.APP_ORIGIN = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
const app = createApp();
app.use("/api/v1/companies/:companyId/assets", assetsRouter());
app.use((_req, res) =>
  res.status(404).json({ code: "NOT_FOUND", message: "API route not found." }),
);
app.use(errorHandler);
export default app;
