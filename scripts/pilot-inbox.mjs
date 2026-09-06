import 'dotenv/config';
import pg from 'pg';
if (!process.env.MIGRATION_DATABASE_URL) throw new Error('Set MIGRATION_DATABASE_URL to the operator database connection.');
const db = new pg.Pool({connectionString:process.env.MIGRATION_DATABASE_URL});
try {
  const result = await db.query('SELECT a.id,a.created_at,a.name,a.email,a.company,a.role,a.team_size,a.goal,n.state AS notification_state,n.attempts,n.provider_id,n.last_error FROM pilot_applications a LEFT JOIN pilot_notifications n ON n.application_id=a.id ORDER BY a.created_at DESC LIMIT 200');
  console.log(JSON.stringify(result.rows,null,2));
} finally { await db.end(); }
