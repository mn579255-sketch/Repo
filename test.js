async function test() {
  try {
    const r = await fetch('https://ebdaa-attendance.vercel.app/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email:'kareem.marwan', password:'kareem.marwan'})
    });
    console.log('Login status:', r.status);
    const text = await r.text();
    console.log('Login body:', text.substring(0, 500));
  } catch(e) { console.error('Error:', e.message); }
}
test();
