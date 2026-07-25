async function test() {
  const r = await fetch('https://ebdaa-attendance.vercel.app/api/auth/login', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email:'kareem.marwan', password:'kareem.marwan'})
  });
  const d = await r.json();
  const t = d.token;

  // Get all attendance
  const r2 = await fetch('https://ebdaa-attendance.vercel.app/api/admin/attendance/all', {
    headers: {'Authorization': 'Bearer ' + t}
  });
  const att = await r2.json();
  console.log('All attendance records:', JSON.stringify(att, null, 2));

  // Try to edit the first record if exists
  if (att.length > 0) {
    const rec = att[0];
    console.log('\nTrying to edit:', rec.user_id, rec.date);
    const r3 = await fetch('https://ebdaa-attendance.vercel.app/api/admin/attendance/edit', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t},
      body: JSON.stringify({
        user_id: rec.user_id, date: rec.date,
        check_in_time: '10:00', check_out_time: '18:00',
        status: 'late', notes: 'debug test'
      })
    });
    console.log('Edit status:', r3.status);
    console.log('Edit response:', await r3.text());
  }
}
test();
