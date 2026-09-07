import type { Pool } from "pg";
// Operator-only aggregate report. Never select contact fields or notification envelopes.
export async function pilotSummary(db: Pick<Pool, "query">) {
  const { rows } = await db.query(`
    SELECT a.inquiry_type, count(*)::int AS saved_inquiries,
      count(*) FILTER (WHERE a.created_at >= now() - interval '30 days')::int AS saved_last_30_days,
      count(*) FILTER (WHERE a.stage = 'new')::int AS new,
      count(*) FILTER (WHERE a.stage = 'contacted')::int AS contacted,
      count(*) FILTER (WHERE a.stage = 'qualified')::int AS qualified,
      count(*) FILTER (WHERE a.stage = 'scheduled')::int AS scheduled,
      count(*) FILTER (WHERE a.stage = 'active')::int AS active,
      count(*) FILTER (WHERE a.stage = 'completed')::int AS completed,
      count(*) FILTER (WHERE a.stage = 'closed')::int AS closed,
      count(*) FILTER (WHERE a.next_action_at < (now() AT TIME ZONE 'America/New_York')::date
        AND a.stage NOT IN ('completed','closed'))::int AS overdue_followups,
      count(*) FILTER (WHERE a.next_action_at IS NULL AND a.stage NOT IN ('completed','closed'))::int AS followup_date_missing,
      count(*) FILTER (WHERE n.state = 'pending')::int AS notification_pending,
      count(*) FILTER (WHERE n.state = 'sending')::int AS notification_sending,
      count(*) FILTER (WHERE n.state = 'sent')::int AS notification_provider_accepted,
      count(*) FILTER (WHERE n.state = 'review')::int AS notification_needs_review,
      count(*) FILTER (WHERE n.application_id IS NULL)::int AS notification_not_queued
    FROM pilot_applications a
    LEFT JOIN pilot_notifications n ON n.application_id = a.id
    GROUP BY a.inquiry_type ORDER BY a.inquiry_type
  `);
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "All stored inquiries; stages are current operator classifications, not cumulative conversions.",
    counting:
      "One saved inquiry per email and interest type. A person may appear in more than one type.",
    followupTimezone: "America/New_York",
    notificationMeaning: "Provider acceptance does not prove inbox delivery.",
    byInterest: rows,
  };
}
