const API = '/api';

function getToken() { return localStorage.getItem('token'); }
function getUser() { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; }
function setAuth(token, user) { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem('token'); localStorage.removeItem('user'); }

async function api(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

const fmt = (n) => (Number(n) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const Icons = {
  attendance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  employees: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  gps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/></svg>',
  report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
};

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon">${Icons.attendance}</div>
          <h1>نظام الحضور والانصراف</h1>
          <p>شركة ابداع للتطوير العقاري</p>
        </div>
        <form id="loginForm">
          <div class="form-group">
            <label>اسم المستخدم أو البريد الإلكتروني</label>
            <input type="text" id="loginEmail" placeholder="اسم المستخدم أو البريد" required>
          </div>
          <div class="form-group">
            <label>كلمة المرور</label>
            <input type="password" id="loginPassword" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn btn-primary">تسجيل الدخول</button>
        </form>
        <div class="auth-footer">
          ليس لديك حساب؟ <a onclick="renderRegister()">سجّل الآن</a>
        </div>
      </div>
    </div>`;
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value }) });
      setAuth(data.token, data.user);
      showToast(data.message, 'success');
      navigate();
    } catch (err) { showToast(err.message, 'error'); }
  };
}

function renderRegister() {
  document.getElementById('app').innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon">${Icons.attendance}</div>
          <h1>إنشاء حساب جديد</h1>
          <p>سجّل كموظف - شركة ابداع للتطوير العقاري</p>
        </div>
        <form id="registerForm">
          <div class="form-group"><label>الاسم الكامل</label><input type="text" id="regName" placeholder="أدخل اسمك" required></div>
          <div class="form-group"><label>رقم الموبايل</label><input type="tel" id="regPhone" placeholder="01xxxxxxxxx" required></div>
          <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="regEmail" placeholder="example@gmail.com" required></div>
          <div class="form-group"><label>كلمة المرور</label><input type="password" id="regPassword" placeholder="6 أحرف على الأقل" required minlength="6"></div>
          <button type="submit" class="btn btn-primary">إنشاء الحساب</button>
        </form>
        <div class="auth-footer">لديك حساب بالفعل؟ <a onclick="renderLogin()">سجّل الدخول</a></div>
      </div>
    </div>`;
  document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name: document.getElementById('regName').value, phone: document.getElementById('regPhone').value, email: document.getElementById('regEmail').value, password: document.getElementById('regPassword').value }) });
      setAuth(data.token, data.user);
      showToast(data.message, 'success');
      navigate();
    } catch (err) { showToast(err.message, 'error'); }
  };
}

/* ============ ADMIN DASHBOARD ============ */
let adminCurrentView = 'dashboard';

function renderAdminDashboard() {
  const user = getUser();
  document.getElementById('app').innerHTML = `
    <div class="top-nav">
      <div class="nav-right">
        <button class="mobile-menu-btn" onclick="toggleSidebar()">${Icons.menu}</button>
        <div class="user-info">
          <span class="user-name">${user.name}</span>
          <span class="user-role role-admin">أدمن</span>
        </div>
      </div>
      <div class="nav-left">
        <button class="btn-logout" onclick="handleLogout()">${Icons.logout} خروج</button>
      </div>
    </div>
    <div class="main-layout">
      <nav class="sidebar" id="sidebar">
        <div class="section-title">القائمة الرئيسية</div>
        <button class="nav-item active" onclick="showAdminView('dashboard', this)">${Icons.stats} لوحة التحكم</button>
        <button class="nav-item" onclick="showAdminView('attendance', this)">${Icons.attendance} سجلات الحضور</button>
        <button class="nav-item" onclick="showAdminView('employees', this)">${Icons.employees} الموظفين</button>
        <div class="section-title">الأقسام والرواتب</div>
        <button class="nav-item" onclick="showAdminView('departments', this)">${Icons.building} الأقسام</button>
        <button class="nav-item" onclick="showAdminView('salary-report', this)">${Icons.money} تقرير الرواتب</button>
        <div class="section-title">الإعدادات</div>
        <button class="nav-item" onclick="showAdminView('location', this)">${Icons.gps} الموقع الجغرافي</button>
        <button class="nav-item" onclick="showAdminView('worksettings', this)">${Icons.settings} ساعات العمل</button>
      </nav>
      <main class="content-area" id="adminContent"></main>
    </div>`;
  showAdminView('dashboard');
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('show'); }

function showAdminView(view, btn) {
  adminCurrentView = view;
  document.querySelectorAll('.sidebar .nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    const labels = { dashboard: 'لوحة', attendance: 'حضور', employees: 'الموظفين', departments: 'الأقسام', 'salary-report': 'الرواتب', location: 'الموقع', worksettings: 'العمل' };
    document.querySelectorAll('.sidebar .nav-item').forEach(b => {
      if (labels[view] && b.textContent.includes(labels[view])) b.classList.add('active');
    });
  }
  const content = document.getElementById('adminContent');
  switch(view) {
    case 'dashboard': loadAdminDashboard(content); break;
    case 'attendance': loadAdminAttendance(content); break;
    case 'employees': loadAdminEmployees(content); break;
    case 'departments': loadAdminDepartments(content); break;
    case 'salary-report': loadAdminSalaryReport(content); break;
    case 'location': loadAdminLocation(content); break;
    case 'worksettings': loadAdminWorkSettings(content); break;
  }
}

async function loadAdminDashboard(el) {
  el.innerHTML = `<div class="page-header"><h2>لوحة التحكم</h2><p>نظرة عامة على حضور وانصراف الموظفين</p></div><div class="spinner"></div>`;
  try {
    const [stats, departments] = await Promise.all([api('/admin/employees-stats'), api('/admin/departments')]);
    el.innerHTML = `
      <div class="page-header"><h2>لوحة التحكم</h2><p>نظرة عامة على حضور وانصراف الموظفين</p></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon blue">${Icons.employees}</div><div class="stat-info"><h4>إجمالي الموظفين</h4><div class="stat-value">${stats.length}</div></div></div>
        <div class="stat-card"><div class="stat-icon green">${Icons.check}</div><div class="stat-info"><h4>متوسط التقييم</h4><div class="stat-value">${stats.length ? (stats.reduce((a,s) => a + s.avg_evaluation, 0) / stats.length).toFixed(1) : '-'}</div></div></div>
        <div class="stat-card"><div class="stat-icon yellow">${Icons.clock}</div><div class="stat-info"><h4>إجمالي التأخير (دقيقة)</h4><div class="stat-value">${stats.reduce((a,s) => a + s.total_late_minutes, 0)}</div></div></div>
        <div class="stat-card"><div class="stat-icon red">${Icons.money}</div><div class="stat-info"><h4>إجمالي الخصومات</h4><div class="stat-value">${fmt(stats.reduce((a,s) => a + (s.salary || 0), 0))} ج.م</div></div></div>
      </div>
      ${departments.length ? `
        <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">
          ${departments.map(d => {
            const deptEmps = stats.filter(s => s.department_id === d.id);
            return `<div class="stat-card" style="cursor:pointer" onclick="showAdminView('employees')"><div class="stat-icon blue">${Icons.building}</div><div class="stat-info"><h4>${d.name}</h4><div class="stat-value">${deptEmps.length}</div></div></div>`;
          }).join('')}
        </div>
      ` : ''}
      <div class="card">
        <div class="card-header"><h3>إحصائيات الموظفين</h3></div>
        ${stats.length ? `<div class="table-container"><table><thead><tr><th>الموظف</th><th>القسم</th><th>الحضور</th><th>التأخير</th><th>الإجمالي</th><th>التقييم</th></tr></thead><tbody>
          ${stats.map(s => `<tr style="cursor:pointer" onclick="showEmployeeDetail(${s.id})">
            <td><strong>${s.name}</strong><br><span style="color:var(--gray-400);font-size:0.75rem">${s.email}</span></td>
            <td><span class="badge badge-present" style="background:#e0e7ff;color:#3730a3">${s.department_name}</span></td>
            <td><span class="badge badge-present">${s.present_days || 0}</span></td>
            <td><span class="badge badge-late">${s.late_days || 0} (${s.total_late_minutes || 0}د)</span></td>
            <td>${s.total_days || 0} يوم</td>
            <td><div class="score-circle ${s.avg_evaluation >= 80 ? 'score-high' : s.avg_evaluation >= 60 ? 'score-medium' : 'score-low'}" style="width:48px;height:48px;font-size:0.875rem">${(s.avg_evaluation || 100).toFixed(0)}</div></td>
          </tr>`).join('')}
        </tbody></table></div>` : '<div class="empty-state"><p>لا يوجد موظفين مسجلين بعد</p></div>'}
      </div>`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

async function loadAdminAttendance(el) {
  el.innerHTML = `<div class="page-header"><h2>سجلات الحضور</h2><p>عرض وتعديل سجلات حضور وانصراف الموظفين</p></div><div class="spinner"></div>`;
  try {
    const now = new Date();
    const attendance = await api(`/admin/attendance/all?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
    el.innerHTML = `
      <div class="page-header"><h2>سجلات الحضور</h2><p>عرض وتعديل سجلات حضور وانصراف الموظفين</p></div>
      <div class="card">
        <div class="filters-bar">
          <select id="attMonth" onchange="filterAttendance()">${[...Array(12)].map((_, i) => `<option value="${i+1}" ${i+1 === now.getMonth()+1 ? 'selected' : ''}>${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][i]}</option>`).join('')}</select>
          <select id="attYear" onchange="filterAttendance()">${[now.getFullYear(), now.getFullYear()-1].map(y => `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`).join('')}</select>
          <button class="btn btn-primary btn-sm" onclick="showManualAttendanceModal()">+ تسجيل يدوي</button>
        </div>
        <div id="attendanceTable">${renderAttendanceTable(attendance)}</div>
      </div>`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

function renderAttendanceTable(records) {
  if (!records.length) return '<div class="empty-state"><p>لا توجد سجلات في هذا الفترة</p></div>';
  return `<div class="table-container"><table><thead><tr><th>التاريخ</th><th>الموظف</th><th>الحضور</th><th>الانصراف</th><th>الحالة</th><th>الملاحظات</th></tr></thead><tbody>
    ${records.map(r => `<tr>
      <td>${r.date}</td>
      <td><strong>${r.employee_name}</strong></td>
      <td>${r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
      <td>${r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
      <td><span class="badge badge-${r.status}">${r.status === 'present' ? 'حاضر' : r.status === 'late' ? 'متأخر' : r.status === 'absent' ? 'غائب' : 'انصراف مبكر'}</span></td>
      <td>${r.notes || '-'}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

async function filterAttendance() {
  const month = document.getElementById('attMonth').value;
  const year = document.getElementById('attYear').value;
  try {
    const records = await api(`/admin/attendance/all?month=${month}&year=${year}`);
    document.getElementById('attendanceTable').innerHTML = renderAttendanceTable(records);
  } catch (err) { showToast(err.message, 'error'); }
}

async function showManualAttendanceModal() {
  const employees = await api('/admin/employees');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `<div class="modal">
    <h3>تسجيل حضور يدوي</h3>
    <form id="manualAttForm">
      <div class="form-group"><label>الموظف</label><select id="manualUserId" required><option value="">اختر الموظف</option>${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>التاريخ</label><input type="date" id="manualDate" value="${new Date().toISOString().split('T')[0]}" required></div>
      <div class="form-group"><label>وقت الحضور</label><input type="time" id="manualCheckIn"></div>
      <div class="form-group"><label>وقت الانصراف</label><input type="time" id="manualCheckOut"></div>
      <div class="form-group"><label>الحالة</label><select id="manualStatus"><option value="present">حاضر</option><option value="late">متأخر</option><option value="absent">غائب</option></select></div>
      <div class="form-group"><label>ملاحظات</label><input type="text" id="manualNotes" placeholder="اختياري"></div>
      <div style="display:flex;gap:8px"><button type="submit" class="btn btn-primary">حفظ</button><button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">إلغاء</button></div>
    </form></div>`;
  document.body.appendChild(overlay);
  document.getElementById('manualAttForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/admin/attendance/manual', { method: 'POST', body: JSON.stringify({ user_id: document.getElementById('manualUserId').value, date: document.getElementById('manualDate').value, check_in_time: document.getElementById('manualCheckIn').value || null, check_out_time: document.getElementById('manualCheckOut').value || null, status: document.getElementById('manualStatus').value, notes: document.getElementById('manualNotes').value || null }) });
      showToast('تم حفظ السجل بنجاح', 'success');
      overlay.remove();
      showAdminView('attendance');
    } catch (err) { showToast(err.message, 'error'); }
  };
}

async function loadAdminEmployees(el) {
  el.innerHTML = `<div class="page-header"><h2>الموظفين</h2><p>إدارة حسابات الموظفين</p></div><div class="spinner"></div>`;
  try {
    const [employees, departments] = await Promise.all([api('/admin/employees'), api('/admin/departments')]);
    el.innerHTML = `
      <div class="page-header"><h2>الموظفين</h2><p>إدارة حسابات الموظفين</p></div>
      ${employees.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
          ${employees.map(e => `
            <div class="employee-card" onclick="showEmployeeDetail(${e.id})">
              <div class="employee-avatar">${e.name.charAt(0)}</div>
              <div class="employee-details" style="flex:1">
                <h4>${e.name}</h4>
                <p>${e.email}</p>
                <p><span class="badge badge-present" style="background:#e0e7ff;color:#3730a3">${e.department_name}</span></p>
                ${e.salary ? `<p style="color:var(--success);font-weight:600">${fmt(e.salary)} ج.م/شهر</p>` : ''}
              </div>
              <div style="display:flex;gap:4px">
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();showEditEmployeeModal(${e.id},'${e.name.replace(/'/g,"\\'")}',${e.department_id || 'null'},${e.salary || 0})" title="تعديل">${Icons.edit}</button>
                <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteEmployee(${e.id},'${e.name.replace(/'/g,"\\'")}')" title="حذف">${Icons.trash}</button>
              </div>
            </div>
          `).join('')}
        </div>` : '<div class="empty-state"><p>لا يوجد موظفين مسجلين</p></div>'}`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

async function showEditEmployeeModal(id, name, currentDeptId, currentSalary) {
  const departments = await api('/admin/departments');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `<div class="modal">
    <h3>تعديل بيانات: ${name}</h3>
    <form id="editEmpForm">
      <div class="form-group"><label>القسم</label><select id="editDeptId"><option value="">غير محدد</option>${departments.map(d => `<option value="${d.id}" ${d.id === currentDeptId ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>الراتب الشهري (ج.م)</label><input type="number" id="editSalary" value="${currentSalary}" min="0" step="100"></div>
      <div style="display:flex;gap:8px"><button type="submit" class="btn btn-primary">حفظ</button><button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">إلغاء</button></div>
    </form></div>`;
  document.body.appendChild(overlay);
  document.getElementById('editEmpForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api(`/admin/employees/${id}`, { method: 'PUT', body: JSON.stringify({ department_id: document.getElementById('editDeptId').value || null, salary: parseFloat(document.getElementById('editSalary').value) || 0 }) });
      showToast('تم تحديث بيانات الموظف بنجاح', 'success');
      overlay.remove();
      showAdminView('employees');
    } catch (err) { showToast(err.message, 'error'); }
  };
}

async function showEmployeeDetail(id) {
  const content = document.getElementById('adminContent');
  content.innerHTML = `<div class="spinner"></div>`;
  try {
    const emp = await api(`/admin/employees/${id}`);
    content.innerHTML = `
      <div style="margin-bottom:16px"><button class="btn btn-outline btn-sm" onclick="showAdminView('${adminCurrentView}')">${Icons.back} رجوع</button></div>
      <div class="card">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <div class="employee-avatar" style="width:64px;height:64px;font-size:1.5rem">${emp.name.charAt(0)}</div>
          <div>
            <h2>${emp.name}</h2>
            <p style="color:var(--gray-500)">${emp.email} | ${emp.phone}</p>
            <p><span class="badge badge-present" style="background:#e0e7ff;color:#3730a3">${emp.department_name}</span></p>
            ${emp.salary ? `<p style="color:var(--success);font-weight:600">الراتب: ${fmt(emp.salary)} ج.م | الساعة: ${fmt(emp.salary / 240)} ج.م</p>` : '<p style="color:var(--danger)">لم يتم تحديد الراتب بعد</p>'}
          </div>
        </div>
      </div>
      ${emp.attendance.length ? `<div class="card"><div class="card-header"><h3>آخر سجلات الحضور</h3></div><div class="table-container"><table><thead><tr><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>الحالة</th></tr></thead><tbody>
        ${emp.attendance.slice(0, 15).map(a => `<tr><td>${a.date}</td><td>${a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '-'}</td><td>${a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '-'}</td><td><span class="badge badge-${a.status}">${a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : 'غائب'}</span></td></tr>`).join('')}
      </tbody></table></div></div>` : ''}`;
  } catch (err) { content.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

function deleteEmployee(id, name) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `<div class="modal"><h3>تأكيد الحذف</h3><p style="margin-bottom:20px">هل أنت متأكد من حذف الموظف "<strong>${name}</strong>"؟</p><div style="display:flex;gap:8px"><button class="btn btn-danger" onclick="confirmDeleteEmployee(${id})">نعم، احذف</button><button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
}

async function confirmDeleteEmployee(id) {
  try { await api(`/admin/employees/${id}`, { method: 'DELETE' }); showToast('تم حذف الموظف بنجاح', 'success'); document.querySelector('.modal-overlay').remove(); showAdminView('employees'); } catch (err) { showToast(err.message, 'error'); }
}

/* ============ DEPARTMENTS ============ */
async function loadAdminDepartments(el) {
  el.innerHTML = `<div class="page-header"><h2>الأقسام</h2><p>إدارة أقسام الشركة</p></div><div class="spinner"></div>`;
  try {
    const departments = await api('/admin/departments');
    const stats = await api('/admin/employees-stats');
    el.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div><h2>الأقسام</h2><p>إدارة أقسام الشركة</p></div>
        <button class="btn btn-primary btn-sm" onclick="showAddDepartmentModal()">+ إضافة قسم</button>
      </div>
      ${departments.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${departments.map(d => {
          const deptEmps = stats.filter(s => s.department_id === d.id);
          const deptSalary = deptEmps.reduce((a, s) => a + (s.salary || 0), 0);
          return `<div class="card" style="cursor:default">
            <div style="display:flex;justify-content:space-between;align-items:start">
              <div><h3 style="color:var(--primary)">${d.name}</h3>${d.description ? `<p style="color:var(--gray-500);font-size:0.875rem">${d.description}</p>` : ''}</div>
              <div style="display:flex;gap:4px">
                <button class="btn btn-outline btn-sm" onclick="showEditDepartmentModal(${d.id},'${d.name.replace(/'/g,"\\'")}','${(d.description||'').replace(/'/g,"\\'")}')">${Icons.edit}</button>
                <button class="btn btn-danger btn-sm" onclick="deleteDepartment(${d.id},'${d.name.replace(/'/g,"\\'")}')">${Icons.trash}</button>
              </div>
            </div>
            <div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap">
              <div class="stat-card" style="flex:1;min-width:100px;padding:12px"><div class="stat-info"><h4>الموظفين</h4><div class="stat-value" style="font-size:1.25rem">${deptEmps.length}</div></div></div>
              <div class="stat-card" style="flex:1;min-width:100px;padding:12px"><div class="stat-info"><h4>إجمالي الرواتب</h4><div class="stat-value" style="font-size:1rem">${fmt(deptSalary)} ج.م</div></div></div>
              <div class="stat-card" style="flex:1;min-width:100px;padding:12px"><div class="stat-info"><h4>متوسط التقييم</h4><div class="stat-value" style="font-size:1rem">${deptEmps.length ? (deptEmps.reduce((a,s) => a + s.avg_evaluation, 0) / deptEmps.length).toFixed(1) : '-'}</div></div></div>
            </div>
          </div>`;
        }).join('')}
      </div>` : '<div class="empty-state"><p>لا يوجد أقسام بعد. أضف قسم جديد للبدء.</p></div>'}`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

function showAddDepartmentModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `<div class="modal"><h3>إضافة قسم جديد</h3>
    <form id="addDeptForm">
      <div class="form-group"><label>اسم القسم</label><input type="text" id="deptName" placeholder="مثال: إدارة مالية" required></div>
      <div class="form-group"><label>الوصف (اختياري)</label><input type="text" id="deptDesc" placeholder="وصف القسم"></div>
      <div style="display:flex;gap:8px"><button type="submit" class="btn btn-primary">إضافة</button><button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">إلغاء</button></div>
    </form></div>`;
  document.body.appendChild(overlay);
  document.getElementById('addDeptForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/admin/departments', { method: 'POST', body: JSON.stringify({ name: document.getElementById('deptName').value, description: document.getElementById('deptDesc').value }) });
      showToast('تم إضافة القسم بنجاح', 'success');
      overlay.remove();
      showAdminView('departments');
    } catch (err) { showToast(err.message, 'error'); }
  };
}

function showEditDepartmentModal(id, name, desc) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `<div class="modal"><h3>تعديل القسم</h3>
    <form id="editDeptForm">
      <div class="form-group"><label>اسم القسم</label><input type="text" id="deptName" value="${name}" required></div>
      <div class="form-group"><label>الوصف</label><input type="text" id="deptDesc" value="${desc}"></div>
      <div style="display:flex;gap:8px"><button type="submit" class="btn btn-primary">حفظ</button><button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">إلغاء</button></div>
    </form></div>`;
  document.body.appendChild(overlay);
  document.getElementById('editDeptForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api(`/admin/departments/${id}`, { method: 'PUT', body: JSON.stringify({ name: document.getElementById('deptName').value, description: document.getElementById('deptDesc').value }) });
      showToast('تم تحديث القسم بنجاح', 'success');
      overlay.remove();
      showAdminView('departments');
    } catch (err) { showToast(err.message, 'error'); }
  };
}

function deleteDepartment(id, name) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `<div class="modal"><h3>حذف القسم</h3><p style="margin-bottom:20px">هل أنت متأكد من حذف قسم "<strong>${name}</strong>"؟ سيتم إلغاء تعيين الموظفين من هذا القسم.</p><div style="display:flex;gap:8px"><button class="btn btn-danger" onclick="confirmDeleteDept(${id})">نعم، احذف</button><button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
}

async function confirmDeleteDept(id) {
  try { await api(`/admin/departments/${id}`, { method: 'DELETE' }); showToast('تم حذف القسم بنجاح', 'success'); document.querySelector('.modal-overlay').remove(); showAdminView('departments'); } catch (err) { showToast(err.message, 'error'); }
}

/* ============ SALARY REPORT ============ */
async function loadAdminSalaryReport(el) {
  const now = new Date();
  el.innerHTML = `<div class="page-header"><h2>تقرير الرواتب والخصومات</h2><p>حساب الخصومات بناءً على التأخيرات والانصراف المبكر</p></div><div class="spinner"></div>`;
  try {
    const report = await api(`/admin/salary-report?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
    const totalSalary = report.reduce((a, r) => a + r.salary, 0);
    const totalDeductions = report.reduce((a, r) => a + r.deduction_amount, 0);
    const totalNet = report.reduce((a, r) => a + r.net_salary, 0);

    el.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div><h2>تقرير الرواتب والخصومات</h2><p>الشهر: ${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][now.getMonth()]} ${now.getFullYear()}</p></div>
        <div class="filters-bar">
          <select id="salaryMonth" onchange="filterSalaryReport()">${[...Array(12)].map((_, i) => `<option value="${i+1}" ${i+1 === now.getMonth()+1 ? 'selected' : ''}>${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][i]}</option>`).join('')}</select>
          <select id="salaryYear" onchange="filterSalaryReport()">${[now.getFullYear(), now.getFullYear()-1].map(y => `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`).join('')}</select>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon green">${Icons.money}</div><div class="stat-info"><h4>إجمالي الرواتب</h4><div class="stat-value">${fmt(totalSalary)} ج.م</div></div></div>
        <div class="stat-card"><div class="stat-icon red">${Icons.alert}</div><div class="stat-info"><h4>إجمالي الخصومات</h4><div class="stat-value">${fmt(totalDeductions)} ج.م</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">${Icons.check}</div><div class="stat-info"><h4>صافي الرواتب</h4><div class="stat-value">${fmt(totalNet)} ج.م</div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>${Icons.report} تفاصيل كل موظف</h3></div>
        <div id="salaryReportTable">
          ${renderSalaryReportTable(report)}
        </div>
      </div>`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

function renderSalaryReportTable(report) {
  if (!report.length) return '<div class="empty-state"><p>لا يوجد موظفين</p></div>';
  return `<div class="table-container"><table><thead><tr><th>الموظف</th><th>القسم</th><th>الراتب</th><th>أيام الحضور</th><th>أيام التأخير</th><th>دقائق التأخير</th><th>دقائق الانصراف المبكر</th><th>الخصم</th><th>الراتب الصافي</th></tr></thead><tbody>
    ${report.map(r => `<tr>
      <td><strong>${r.name}</strong></td>
      <td><span class="badge badge-present" style="background:#e0e7ff;color:#3730a3">${r.department_name}</span></td>
      <td>${fmt(r.salary)}</td>
      <td><span class="badge badge-present">${r.present_days}</span></td>
      <td><span class="badge badge-late">${r.late_days}</span></td>
      <td>${r.total_late_minutes} دقيقة</td>
      <td>${r.total_early_leave_minutes} دقيقة</td>
      <td style="color:var(--danger);font-weight:600">-${fmt(r.deduction_amount)} ج.م</td>
      <td style="color:var(--success);font-weight:700">${fmt(r.net_salary)} ج.م</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

async function filterSalaryReport() {
  const month = document.getElementById('salaryMonth').value;
  const year = document.getElementById('salaryYear').value;
  try {
    const report = await api(`/admin/salary-report?month=${month}&year=${year}`);
    document.getElementById('salaryReportTable').innerHTML = renderSalaryReportTable(report);
  } catch (err) { showToast(err.message, 'error'); }
}

/* ============ SETTINGS ============ */
async function loadAdminLocation(el) {
  el.innerHTML = `<div class="page-header"><h2>الموقع الجغرافي</h2><p>تحديد الموقع المسموح للحضور</p></div><div class="spinner"></div>`;
  try {
    const location = await api('/admin/location').catch(() => null);
    el.innerHTML = `
      <div class="page-header"><h2>الموقع الجغرافي</h2><p>تحديد الموقع المسموح للحضور</p></div>
      <div class="card">
        <div class="card-header"><h3>${Icons.gps} تحديد موقع الشركة</h3></div>
        <p style="color:var(--gray-500);margin-bottom:12px">انقر على الخريطة لتحديد موقع الشركة.</p>
        <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="useMyLocation()">${Icons.gps} استخدام موقعي</button>
          <div style="display:flex;align-items:center;gap:8px"><label style="font-size:0.875rem;color:var(--gray-600)">نصف القطر:</label><input type="number" id="radiusInput" value="${location ? location.radius : 100}" min="10" max="5000" style="width:80px;padding:6px;border:2px solid var(--gray-200);border-radius:6px"> متر</div>
        </div>
        <div id="map" class="map-container"></div>
        <div id="locationCoords" style="margin-top:12px;font-size:0.875rem;color:var(--gray-500)">${location ? `الموقع الحالي: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} | النطاق: ${location.radius}م` : 'لم يتم تحديد موقع بعد'}</div>
        <button class="btn btn-success" style="margin-top:16px;width:auto" onclick="saveLocation()">${Icons.check} حفظ الموقع</button>
      </div>`;
    initMap(location ? location.latitude : 30.0444, location ? location.longitude : 31.2357, location ? location.radius : 100);
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

let map, marker, radiusCircle;
function initMap(lat, lng, radius) {
  map = L.map('map').setView([lat, lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
  marker = L.marker([lat, lng], { draggable: true }).addTo(map);
  radiusCircle = L.circle([lat, lng], { radius, color: '#2563eb', fillColor: '#dbeafe', fillOpacity: 0.3 }).addTo(map);
  marker.on('dragend', function(e) { const pos = e.target.getLatLng(); updateMapPosition(pos.lat, pos.lng); });
  map.on('click', function(e) { const pos = e.latlng; marker.setLatLng(pos); updateMapPosition(pos.lat, pos.lng); });
}

function updateMapPosition(lat, lng) {
  const radius = parseInt(document.getElementById('radiusInput').value) || 100;
  radiusCircle.setLatLng([lat, lng]).setRadius(radius);
  document.getElementById('locationCoords').textContent = `الموقع المحدد: ${lat.toFixed(6)}, ${lng.toFixed(6)} | النطاق: ${radius}م`;
}

function useMyLocation() {
  if (!navigator.geolocation) { showToast('متصفحك لا يدعم تحديد الموقع', 'error'); return; }
  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude } = pos.coords;
    map.setView([latitude, longitude], 16);
    marker.setLatLng([latitude, longitude]);
    updateMapPosition(latitude, longitude);
    showToast('تم تحديد موقعك بنجاح', 'success');
  }, (err) => { showToast('لم يتم السماح بالوصول للموقع: ' + err.message, 'error'); }, { enableHighAccuracy: true, timeout: 10000 });
}

async function saveLocation() {
  const pos = marker.getLatLng();
  const radius = parseInt(document.getElementById('radiusInput').value) || 100;
  try { await api('/admin/location', { method: 'POST', body: JSON.stringify({ latitude: pos.lat, longitude: pos.lng, radius }) }); showToast('تم حفظ الموقع بنجاح', 'success'); } catch (err) { showToast(err.message, 'error'); }
}

async function loadAdminWorkSettings(el) {
  el.innerHTML = `<div class="spinner"></div>`;
  try {
    const settings = await api('/admin/settings');
    el.innerHTML = `<div class="page-header"><h2>ساعات العمل</h2><p>تحديد مواعيد العمل اليومية</p></div>
      <div class="card"><form id="workSettingsForm">
        <div class="form-group"><label>وقت بداية الدوام</label><input type="time" id="workStart" value="${settings.work_start_hour}" required></div>
        <div class="form-group"><label>وقت نهاية الدوام</label><input type="time" id="workEnd" value="${settings.work_end_hour}" required></div>
        <button type="submit" class="btn btn-primary" style="width:auto">${Icons.check} حفظ الإعدادات</button>
      </form></div>`;
    document.getElementById('workSettingsForm').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/admin/settings', { method: 'PUT', body: JSON.stringify({ work_start_hour: document.getElementById('workStart').value, work_end_hour: document.getElementById('workEnd').value }) }); showToast('تم تحديث ساعات العمل بنجاح', 'success'); } catch (err) { showToast(err.message, 'error'); }
    };
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

/* ============ EMPLOYEE DASHBOARD ============ */
let empCurrentView = 'today';

function renderEmployeeDashboard() {
  const user = getUser();
  document.getElementById('app').innerHTML = `
    <div class="top-nav">
      <div class="nav-right">
        <div class="user-info">
          <span class="user-name">${user.name}</span>
          <span class="user-role role-employee">موظف</span>
        </div>
      </div>
      <div class="nav-left">
        <button class="btn-logout" onclick="handleLogout()">${Icons.logout} خروج</button>
      </div>
    </div>
    <div class="main-layout">
      <nav class="sidebar" id="sidebar">
        <div class="section-title">القائمة</div>
        <button class="nav-item active" onclick="showEmpView('today', this)">${Icons.check} حضور اليوم</button>
        <button class="nav-item" onclick="showEmpView('attendance', this)">${Icons.attendance} سجلات الحضور</button>
        <button class="nav-item" onclick="showEmpView('evaluation', this)">${Icons.stats} تقييمي</button>
        <button class="nav-item" onclick="showEmpView('salary', this)">${Icons.money} راتبي</button>
        <div class="section-title">حسابي</div>
        <button class="nav-item" onclick="showEmpView('profile', this)">${Icons.edit} بياناتي</button>
      </nav>
      <main class="content-area" id="empContent"></main>
    </div>`;
  showEmpView('today');
}

function showEmpView(view, btn) {
  empCurrentView = view;
  document.querySelectorAll('.sidebar .nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const content = document.getElementById('empContent');
  switch(view) {
    case 'today': loadEmpToday(content); break;
    case 'attendance': loadEmpAttendance(content); break;
    case 'evaluation': loadEmpEvaluation(content); break;
    case 'salary': loadEmpSalary(content); break;
    case 'profile': loadEmpProfile(content); break;
  }
}

async function loadEmpToday(el) {
  el.innerHTML = `<div class="page-header"><h2>حضور اليوم</h2></div><div class="spinner"></div>`;
  try {
    const [todayStatus, location] = await Promise.all([api('/employee/today-status'), api('/employee/location').catch(() => null)]);
    const isCheckedIn = todayStatus.check_in_time ? true : false;
    const isCheckedOut = todayStatus.check_out_time ? true : false;
    const status = todayStatus.status;
    const date = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let statusHTML = '';
    if (!isCheckedIn) {
      statusHTML = `<div class="gps-section">
        <div style="margin-bottom:12px;color:var(--gray-500);font-size:0.875rem">${date}</div>
        ${!location ? `<div class="gps-circle out-range">${Icons.alert}<span class="gps-text">لم يُعيَّن موقع</span></div><p class="gps-info" style="color:var(--danger)">لم يتم تحديد موقع الشركة بعد.</p>` :
        `<p style="color:var(--gray-600);margin-bottom:16px">اضغط على الزر للتحقق من موقعك وتسجيل الحضور</p><div class="gps-buttons"><button class="btn btn-success" onclick="checkInWithGPS()">${Icons.gps} تسجيل الحضور بموقع GPS</button></div>`}
      </div>`;
    } else {
      const checkInTime = new Date(todayStatus.check_in_time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'});
      statusHTML = `<div class="today-status-card">
        <div class="status-icon">${isCheckedOut ? '✅' : '🟢'}</div>
        <h3 style="color:${status === 'late' ? 'var(--warning)' : 'var(--success)'}">${status === 'late' ? 'متأخر' : 'حاضر'}</h3>
        <p style="margin-top:8px">وقت الحضور: ${checkInTime}</p>
        ${isCheckedOut ? `<p style="margin-top:4px">وقت الانصراف: ${new Date(todayStatus.check_out_time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</p>` : ''}
        <div class="action-buttons">${!isCheckedOut ? `<button class="btn btn-danger" onclick="checkOutWithGPS()">${Icons.logout} تسجيل الانصراف</button>` : ''}</div>
      </div>`;
    }
    el.innerHTML = `<div class="page-header"><h2>حضور اليوم</h2><p>${date}</p></div><div class="card">${statusHTML}</div>`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

async function checkInWithGPS() {
  showToast('جاري تحديد موقعك...', 'info');
  if (!navigator.geolocation) { showToast('متصفحك لا يدعم تحديد الموقع', 'error'); return; }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try { const result = await api('/employee/checkin', { method: 'POST', body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }) }); showToast(result.message, 'success'); loadEmpToday(document.getElementById('empContent')); } catch (err) { showToast(err.message, 'error'); }
  }, (err) => { showToast('لم يتم السماح بالوصول للموقع: ' + err.message, 'error'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

async function checkOutWithGPS() {
  showToast('جاري تحديد موقعك...', 'info');
  if (!navigator.geolocation) { showToast('متصفحك لا يدعم تحديد الموقع', 'error'); return; }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try { const result = await api('/employee/checkout', { method: 'POST', body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }) }); showToast(result.message, 'success'); loadEmpToday(document.getElementById('empContent')); } catch (err) { showToast(err.message, 'error'); }
  }, (err) => { showToast('لم يتم السماح بالوصول للموقع: ' + err.message, 'error'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

async function loadEmpAttendance(el) {
  el.innerHTML = `<div class="page-header"><h2>سجلات حضوري</h2></div><div class="spinner"></div>`;
  try {
    const now = new Date();
    const records = await api(`/employee/my-attendance?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
    el.innerHTML = `<div class="page-header"><h2>سجلات حضوري</h2><p>جميع سجلات حضورك وانصرافك</p></div>
      <div class="card"><div class="filters-bar">
        <select id="empAttMonth" onchange="filterEmpAttendance()">${[...Array(12)].map((_, i) => `<option value="${i+1}" ${i+1 === now.getMonth()+1 ? 'selected' : ''}>${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][i]}</option>`).join('')}</select>
        <select id="empAttYear" onchange="filterEmpAttendance()">${[now.getFullYear(), now.getFullYear()-1].map(y => `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`).join('')}</select>
      </div><div id="empAttendanceTable">${renderEmpAttendanceTable(records)}</div></div>`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

function renderEmpAttendanceTable(records) {
  if (!records.length) return '<div class="empty-state"><p>لا توجد سجلات في هذا الفترة</p></div>';
  return `<div class="table-container"><table><thead><tr><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>الحالة</th></tr></thead><tbody>
    ${records.map(r => `<tr><td>${r.date}</td><td>${r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '-'}</td><td>${r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '-'}</td><td><span class="badge badge-${r.status}">${r.status === 'present' ? 'حاضر' : r.status === 'late' ? 'متأخر' : r.status === 'absent' ? 'غائب' : 'انصراف مبكر'}</span></td></tr>`).join('')}
  </tbody></table></div>`;
}

async function filterEmpAttendance() {
  const month = document.getElementById('empAttMonth').value;
  const year = document.getElementById('empAttYear').value;
  try { const records = await api(`/employee/my-attendance?month=${month}&year=${year}`); document.getElementById('empAttendanceTable').innerHTML = renderEmpAttendanceTable(records); } catch (err) { showToast(err.message, 'error'); }
}

async function loadEmpEvaluation(el) {
  el.innerHTML = `<div class="spinner"></div>`;
  try {
    const data = await api('/employee/my-evaluations');
    const { summary, evaluations } = data;
    const avgScore = summary.avg_score || 100;
    const scoreClass = avgScore >= 80 ? 'score-high' : avgScore >= 60 ? 'score-medium' : 'score-low';
    el.innerHTML = `<div class="page-header"><h2>تقييمي</h2><p>ملخص أداءك وتقييمك العام</p></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon green">${Icons.check}</div><div class="stat-info"><h4>أيام الحضور</h4><div class="stat-value">${summary.present_days || 0}</div></div></div>
        <div class="stat-card"><div class="stat-icon yellow">${Icons.clock}</div><div class="stat-info"><h4>أيام التأخير</h4><div class="stat-value">${summary.late_days || 0}</div></div></div>
        <div class="stat-card"><div class="stat-icon red">${Icons.alert}</div><div class="stat-info"><h4>إجمالي التأخير</h4><div class="stat-value">${summary.total_late_minutes || 0} د</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">${Icons.stats}</div><div class="stat-info"><h4>السجلات</h4><div class="stat-value">${summary.total_days || 0}</div></div></div>
      </div>
      <div class="card" style="text-align:center;padding:40px"><h3 style="margin-bottom:20px">تقييمك الشامل</h3><div class="score-circle ${scoreClass}" style="width:120px;height:120px;font-size:2rem;margin:0 auto">${avgScore.toFixed(1)}</div><p style="margin-top:12px;color:var(--gray-500)">${avgScore >= 80 ? 'أداء ممتاز' : avgScore >= 60 ? 'أداء جيد' : avgScore >= 40 ? 'يحتاج تحسين' : 'أداء ضعيف'}</p></div>
      ${evaluations.length ? `<div class="card"><div class="card-header"><h3>سجل التقييم اليومي</h3></div><div class="table-container"><table><thead><tr><th>التاريخ</th><th>التقييم</th><th>التأخير</th><th>الانصراف المبكر</th></tr></thead><tbody>
        ${evaluations.map(e => `<tr><td>${e.date}</td><td><div class="score-circle ${e.evaluation_score >= 80 ? 'score-high' : e.evaluation_score >= 60 ? 'score-medium' : 'score-low'}" style="width:40px;height:40px;font-size:0.75rem;display:inline-flex">${e.evaluation_score.toFixed(0)}</div></td><td>${e.total_late_minutes} دقيقة</td><td>${e.early_leave_minutes} دقيقة</td></tr>`).join('')}
      </tbody></table></div></div>` : ''}`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

async function loadEmpSalary(el) {
  el.innerHTML = `<div class="spinner"></div>`;
  try {
    const data = await api('/employee/my-salary');
    const now = new Date();
    const monthName = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][now.getMonth()];

    if (!data.salary) {
      el.innerHTML = `<div class="page-header"><h2>راتبي</h2><p>${monthName} ${data.year}</p></div>
        <div class="card" style="text-align:center;padding:40px"><div class="empty-state"><p>لم يتم تحديد راتبك بعد. يرجى مراجعة المدير.</p></div></div>`;
      return;
    }

    el.innerHTML = `<div class="page-header"><h2>راتبي</h2><p>${monthName} ${data.year}</p></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon green">${Icons.money}</div><div class="stat-info"><h4>الراتب الأساسي</h4><div class="stat-value">${fmt(data.salary)} ج.م</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">${Icons.clock}</div><div class="stat-info"><h4>الساعة/ ${fmt(data.hourly_rate)} ج.م</h4><div class="stat-info"><h4>الدقيقة/ ${fmt(data.per_minute_rate)} ج.م</h4></div></div></div>
        <div class="stat-card"><div class="stat-icon red">${Icons.alert}</div><div class="stat-info"><h4>دقائق التأخير</h4><div class="stat-value">${data.total_late_minutes} د</div></div></div>
        <div class="stat-card"><div class="stat-icon yellow">${Icons.clock}</div><div class="stat-info"><h4>دقائق الانصراف المبكر</h4><div class="stat-value">${data.total_early_leave_minutes} د</div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>${Icons.report} كشف راتب ${monthName}</h3></div>
        <div class="table-container"><table>
          <tbody>
            <tr><td style="font-weight:700">الراتب الأساسي</td><td style="text-align:left;font-weight:700">${fmt(data.salary)} ج.م</td></tr>
            <tr><td>دقائق التأخير (× 2)</td><td style="text-align:left;color:var(--danger)">${data.total_late_minutes} دقيقة</td></tr>
            <tr><td>دقائق الانصراف المبكر (× 2)</td><td style="text-align:left;color:var(--danger)">${data.total_early_leave_minutes} دقيقة</td></tr>
            <tr><td>إجمالي دقائق الخصم</td><td style="text-align:left;color:var(--danger)">${data.total_deduction_minutes} دقيقة</td></tr>
            <tr style="border-top:2px solid var(--gray-200)"><td style="font-weight:700;color:var(--danger)">مبلغ الخصم</td><td style="text-align:left;font-weight:700;color:var(--danger)">-${fmt(data.deduction_amount)} ج.م</td></tr>
            <tr style="background:var(--success-light)"><td style="font-weight:700;font-size:1.125rem">الراتب الصافي</td><td style="text-align:left;font-weight:700;font-size:1.125rem;color:var(--success)">${fmt(data.net_salary)} ج.م</td></tr>
          </tbody>
        </table></div>
      </div>
      <div class="card" style="padding:16px;color:var(--gray-500);font-size:0.8125rem">
        <p><strong>ملاحظة:</strong> الراتب يُقسم على 30 يوم × 8 ساعات = 240 ساعة شهرياً. كل دقيقة تأخير أو انصراف مبكر تُخصم مرتين من الراتب.</p>
      </div>`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

async function loadEmpProfile(el) {
  el.innerHTML = `<div class="spinner"></div>`;
  try {
    const [userData, depts] = await Promise.all([api('/auth/me'), api('/employee/departments').catch(() => [])]);

    el.innerHTML = `<div class="page-header"><h2>بياناتي الشخصية</h2><p>تعديل القسم والراتب</p></div>
      <div class="card">
        <form id="profileForm">
          <div class="form-group"><label>الاسم</label><input type="text" value="${userData.name}" disabled style="background:var(--gray-50)"></div>
          <div class="form-group"><label>البريد الإلكتروني</label><input type="text" value="${userData.email}" disabled style="background:var(--gray-50)"></div>
          <div class="form-group"><label>رقم الموبايل</label><input type="text" value="${userData.phone}" disabled style="background:var(--gray-50)"></div>
          <div class="form-group"><label>القسم</label><select id="myDept"><option value="">اختر القسم</option>${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>الراتب الشهري (ج.م)</label><input type="number" id="mySalary" min="0" step="100" placeholder="أدخل راتبك الشهري"></div>
          <button type="submit" class="btn btn-primary" style="width:auto">${Icons.check} حفظ البيانات</button>
        </form>
      </div>`;

    api('/employee/my-salary').then(s => {
      if (s.salary) document.getElementById('mySalary').value = s.salary;
    });

    if (userData.department_id) document.getElementById('myDept').value = userData.department_id;
    if (userData.salary) document.getElementById('mySalary').value = userData.salary;

    document.getElementById('profileForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const body = {
          department_id: document.getElementById('myDept').value || null,
          salary: parseFloat(document.getElementById('mySalary').value) || 0
        };
        const result = await api('/employee/profile', { method: 'PUT', body: JSON.stringify(body) });
        showToast(result.message, 'success');
      } catch (err) { showToast(err.message, 'error'); }
    };
  } catch (err) { el.innerHTML = `<div class="empty-state"><p>خطأ: ${err.message}</p></div>`; }
}

/* ============ NAVIGATION ============ */
function handleLogout() { clearAuth(); renderLogin(); }
function navigate() {
  const user = getUser();
  if (!user) renderLogin();
  else if (user.role === 'admin') renderAdminDashboard();
  else renderEmployeeDashboard();
}

navigate();
