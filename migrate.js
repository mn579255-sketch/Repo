const { Client } = require('pg');
const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.jztgixbnewjribtqvujb',
  password: '441997..mmhh',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await c.connect();
  await c.query("ALTER TABLE departments ADD COLUMN IF NOT EXISTS work_start_hour TEXT DEFAULT '09:00'");
  await c.query("ALTER TABLE departments ADD COLUMN IF NOT EXISTS work_end_hour TEXT DEFAULT '17:00'");
  await c.query("ALTER TABLE departments ADD COLUMN IF NOT EXISTS work_days_per_week INTEGER DEFAULT 5");
  console.log('Done');
  await c.end();
}
run().catch(e => console.error(e));
