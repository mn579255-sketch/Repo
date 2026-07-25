const { initDatabase, getDb } = require('./database');

async function test() {
  initDatabase();
  const db = getDb();
  
  // Test getByLogin
  console.log('Testing getByLogin...');
  const user = await db.users.getByLogin('kareem.marwan');
  console.log('User found:', user ? user.name : 'NOT FOUND');
  
  // Test getAllByDate
  const today = new Date().toISOString().split('T')[0];
  console.log('Testing getAllByDate for', today, '...');
  const att = await db.attendance.getAllByDate(today);
  console.log('Attendance records:', att.length);
  
  // Test getAll
  const allUsers = await db.users.getAll();
  console.log('Total users:', allUsers.length);
  
  // Test work_settings
  const settings = await db.work_settings.get();
  console.log('Work settings:', settings);
  
  // Test requests
  const requests = await db.requests.getAll();
  console.log('Total requests:', requests.length);
}

test().catch(e => console.error('ERROR:', e));
