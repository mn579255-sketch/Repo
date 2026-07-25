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
  await c.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE");
  await c.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE");
  await c.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT");
  await c.query("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in_address TEXT");
  await c.query("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_address TEXT");
  await c.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS checkout_address TEXT");
  console.log('Done');
  await c.end();
}
run().catch(e => console.error(e));
