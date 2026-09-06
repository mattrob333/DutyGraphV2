import "dotenv/config";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { z } from "zod";
if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error(
    "Set MIGRATION_DATABASE_URL to the operator database connection.",
  );
const db = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
try {
  if (process.argv[2] === "update") {
    if (!process.argv[3])
      throw new Error("Provide a private JSON update file.");
    const data = z
      .object({
        id: z.uuid(),
        stage: z.enum([
          "new",
          "contacted",
          "qualified",
          "scheduled",
          "active",
          "completed",
          "closed",
        ]),
        nextAction: z.string().max(1000),
        nextActionAt: z.iso.date().nullable(),
      })
      .strict()
      .parse(JSON.parse(await readFile(process.argv[3], "utf8")));
    const changed = await db.query(
      "UPDATE pilot_applications SET stage=$2,next_action=$3,next_action_at=$4 WHERE id=$1 RETURNING id",
      [data.id, data.stage, data.nextAction, data.nextActionAt],
    );
    if (!changed.rowCount) throw new Error("Inquiry not found.");
    console.log("Inquiry stage and next action updated.");
  } else if (process.argv[2] && process.argv[2] !== "list")
    throw new Error("Use list or update <private-json-file>.");
  const result = await db.query(
    "SELECT a.id,a.created_at,a.name,a.email,a.company,a.role,a.team_size,a.goal,a.inquiry_type,a.stage,a.next_action,a.next_action_at,n.state AS notification_state,n.attempts,n.provider_id,n.last_error FROM pilot_applications a LEFT JOIN pilot_notifications n ON n.application_id=a.id ORDER BY a.created_at DESC LIMIT 200",
  );
  console.log(JSON.stringify(result.rows, null, 2));
} finally {
  await db.end();
}
