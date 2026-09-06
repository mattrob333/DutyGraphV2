import 'dotenv/config';
import pg from 'pg';
if (!process.env.MIGRATION_DATABASE_URL) throw new Error('Set MIGRATION_DATABASE_URL to the operator database connection.');
const db = new pg.Pool({connectionString:process.env.MIGRATION_DATABASE_URL});
try {
  const result = await db.query('SELECT id,created_at,name,email,company,role,team_size,goal FROM pilot_applications ORDER BY created_at DESC LIMIT 200');
  console.log(JSON.stringify(result.rows,null,2));
} finally { await db.end(); }
