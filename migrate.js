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
  await c.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS checkout_date DATE");
  await c.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS checkout_time TEXT");
  await c.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS checkout_lat NUMERIC");
  await c.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS checkout_lng NUMERIC");
  await c.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS admin_reviewed_by INTEGER");
  await c.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS admin_status TEXT DEFAULT 'pending'");
  console.log('Done');
  await c.end();
}
run().catch(e => console.error(e));
