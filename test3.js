async function test() {
  try {
    // Test login
    const r = await fetch('https://ebdaa-attendance.vercel.app/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email:'kareem.marwan', password:'kareem.marwan'})
    });
    console.log('Login status:', r.status);
    if (r.status !== 200) {
      const text = await r.text();
      console.log('Login error:', text.substring(0, 300));
      return;
    }
    const d = await r.json();
    const t = d.token;
    console.log('Login OK, user:', d.user.name);

    // Test employee-status
    const r2 = await fetch('https://ebdaa-attendance.vercel.app/api/admin/employee-status', {
      headers: {'Authorization': 'Bearer '+t}
    });
    console.log('Employee status:', r2.status);
    const st = await r2.json();
    console.log('Total:', st.total, 'Present:', st.present);
    console.log('Dept stats:', JSON.stringify(st.departmentStats, null, 2));

    // Test salary-report
    const month = new Date().getMonth()+1;
    const year = new Date().getFullYear();
    const r3 = await fetch('https://ebdaa-attendance.vercel.app/api/admin/salary-report?month='+month+'&year='+year, {
      headers: {'Authorization': 'Bearer '+t}
    });
    console.log('Salary report:', r3.status);
    const sal = await r3.json();
    if (Array.isArray(sal)) {
      sal.forEach(s => console.log(s.name + ':', 'deduction=' + s.deduction_amount, 'overtime=' + s.overtime_pay, 'net=' + s.net_salary));
    } else {
      console.log('Salary error:', JSON.stringify(sal));
    }

    // Test attendance filtered
    const r4 = await fetch('https://ebdaa-attendance.vercel.app/api/admin/attendance/filtered?month='+month+'&year='+year, {
      headers: {'Authorization': 'Bearer '+t}
    });
    console.log('Attendance filtered:', r4.status);
    const att = await r4.json();
    console.log('Records:', att.length);
  } catch(e) { console.error('ERROR:', e.message); }
}
test();
