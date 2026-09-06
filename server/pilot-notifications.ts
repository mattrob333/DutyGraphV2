import { pool } from "./db.ts";
import { z } from "zod";
import { canonicalize } from "json-canonicalize";

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function pilotEmail(
  data: Record<string, string>,
  from: string,
  to: string,
) {
  const fields = [
    ["Name", data.name],
    ["Email", data.email],
    ["Company", data.company],
    ["Role", data.role],
    ["Team size", data.team_size],
    ["What they want to improve", data.goal],
  ];
  return {
    from,
    to: [to],
    reply_to: data.email,
    subject: "New DutyGraph pilot request",
    text:
      "New DutyGraph pilot request\n\n" +
      fields.map(([k, v]) => `${k}: ${v}`).join("\n\n"),
    html: `<div style="background:#f4f3ef;padding:24px;font:16px Arial,sans-serif;color:#202225"><div style="max-width:600px;margin:auto;background:white"><div style="padding:24px;background:#202225;color:white;font-size:24px;font-weight:bold">DutyGraph</div><div style="padding:24px"><h1 style="font-size:24px">A new team wants to join the pilot.</h1>${fields.map(([k, v]) => `<p><strong>${escape(k!)}</strong><br>${escape(v!).replaceAll("\n", "<br>")}</p>`).join("")}<p>Reply to this email to contact the applicant. A meeting has not been booked.</p></div></div></div>`,
  };
}

/** Durable queue: disabled until all three operator settings are supplied. */
export async function sendPilotNotifications(send: typeof fetch = fetch) {
  const key = process.env.PILOT_NOTIFY_RESEND_KEY;
  const from = process.env.PILOT_NOTIFY_FROM;
  const to = process.env.PILOT_NOTIFY_TO;
  if (
    !key ||
    !z.email().safeParse(from).success ||
    !z.email().safeParse(to).success
  )
    return;
  for (let i = 0; i < 5; i++) {
    const db = await pool.connect();
    let job: any;
    try {
      await db.query("BEGIN");
      const result = await db.query(
        `SELECT * FROM pilot_notifications WHERE state IN ('pending','sending') AND next_attempt_at<=now() ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 1`,
      );
      job = result.rows[0];
      if (!job) {
        await db.query("COMMIT");
        return;
      }
      // Resend retains idempotency keys for 24 hours. Stop before that window ends.
      if (
        job.first_attempt_at &&
        Date.now() - new Date(job.first_attempt_at).getTime() > 23 * 3600000
      ) {
        await db.query(
          "UPDATE pilot_notifications SET state='review',last_error='Delivery uncertain; check provider before resending' WHERE application_id=$1",
          [job.application_id],
        );
        await db.query("COMMIT");
        continue;
      }
      await db.query(
        "UPDATE pilot_notifications SET state='sending',first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1,next_attempt_at=now()+interval '5 minutes' WHERE application_id=$1",
        [job.application_id],
      );
      if (!job.envelope) {
        const details = (
          await db.query("SELECT * FROM pilot_notification_details($1)", [
            job.application_id,
          ])
        ).rows[0];
        job.envelope = pilotEmail(details, from!, to!);
        await db.query(
          "UPDATE pilot_notifications SET envelope=$2 WHERE application_id=$1",
          [job.application_id, job.envelope],
        );
      }
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
    try {
      const response = await send("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `pilot/${job.application_id}`,
        },
        body: canonicalize(job.envelope),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
      const receipt = (await response.json()) as { id?: string };
      if (!receipt.id) throw new Error("Provider receipt missing");
      await pool.query(
        "UPDATE pilot_notifications SET state='sent',provider_id=$2,last_error=NULL,envelope=NULL WHERE application_id=$1",
        [job.application_id, receipt.id],
      );
    } catch {
      // Retain the exact envelope and idempotency key for a bounded retry.
      await pool.query(
        "UPDATE pilot_notifications SET last_error='Delivery not confirmed; retry pending' WHERE application_id=$1",
        [job.application_id],
      );
    }
  }
}
