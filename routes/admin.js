const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

router.get('/location', async (req, res) => {
  const db = getDb();
  try {
    const location = await db.company_location.get();
    if (!location) return res.status(404).json({ error: 'لم يتم تعيين موقع الشركة بعد' });
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الموقع' });
  }
});

router.post('/location', async (req, res) => {
  const db = getDb();
  try {
    const { latitude, longitude, radius } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'خط العرض وخط الطول مطلوبين' });
    await db.company_location.set({ latitude, longitude, radius: radius || 100, set_by: req.user.id });
    res.json({ message: 'تم تحديث موقع الشركة بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ الموقع' });
  }
});

router.get('/settings', async (req, res) => {
  const db = getDb();
  try {
    const settings = await db.work_settings.get();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

router.put('/settings', async (req, res) => {
  const db = getDb();
  try {
    const { work_start_hour, work_end_hour } = req.body;
    if (!work_start_hour || !work_end_hour) return res.status(400).json({ error: 'ساعات العمل مطلوبة' });
    await db.work_settings.update({ work_start_hour, work_end_hour });
    res.json({ message: 'تم تحديث ساعات العمل بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث الإعدادات' });
  }
});

router.get('/employees', async (req, res) => {
  const db = getDb();
  try {
    const employees = await db.users.getEmployees();
    const departments = await db.departments.getAll();
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = d.name; });
    const mapped = employees.map(u => ({
      id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role,
      department_id: u.department_id, department_name: deptMap[u.department_id] || 'غير محدد',
      salary: u.salary || 0, created_at: u.created_at
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الموظفين' });
  }
});

router.get('/employees/:id', async (req, res) => {
  const db = getDb();
  try {
    const id = parseInt(req.params.id);
    const user = await db.users.get(id);
    if (!user || user.role !== 'employee') return res.status(404).json({ error: 'الموظف غير موجود' });
    const departments = await db.departments.getAll();
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = d.name; });
    const attendance = (await db.attendance.getByUser(id)).slice(0, 30);
    const evaluations = (await db.daily_evaluations.getByUser(id)).slice(0, 30);
    res.json({
      id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role,
      department_id: user.department_id, department_name: deptMap[user.department_id] || 'غير محدد',
      salary: user.salary || 0, created_at: user.created_at, attendance, evaluations
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الموظف' });
  }
});

router.put('/employees/:id', async (req, res) => {
  const db = getDb();
  try {
    const id = parseInt(req.params.id);
    const user = await db.users.get(id);
    if (!user || user.role !== 'employee') return res.status(404).json({ error: 'الموظف غير موجود' });
    const { department_id, salary } = req.body;
    const updates = {};
    if (department_id !== undefined) updates.department_id = department_id || null;
    if (salary !== undefined) updates.salary = salary;
    await db.users.update(id, updates);
    res.json({ message: 'تم تحديث بيانات الموظف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث بيانات الموظف: ' + err.message });
  }
});

router.delete('/employees/:id', async (req, res) => {
  const db = getDb();
  try {
    const id = parseInt(req.params.id);
    const user = await db.users.get(id);
    if (!user || user.role !== 'employee') return res.status(404).json({ error: 'الموظف غير موجود' });
    await db.daily_evaluations.removeByUser(id);
    await db.attendance.removeByUser(id);
    await db.users.remove(id);
    res.json({ message: 'تم حذف الموظف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف الموظف' });
  }
});

router.get('/attendance/all', async (req, res) => {
  const db = getDb();
  try {
    const { date, month, year } = req.query;
    let records;
    if (date) {
      records = await db.attendance.getAllByDate(date);
    } else if (month && year) {
      records = await db.attendance.getAllByMonth(parseInt(month), parseInt(year));
    } else {
      records = await db.attendance.getAll();
    }
    const users = await db.users.getAll();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const enriched = records.map(r => ({
      ...r,
      employee_name: userMap[r.user_id] ? userMap[r.user_id].name : 'غير معروف',
      employee_phone: userMap[r.user_id] ? userMap[r.user_id].phone : '',
      employee_email: userMap[r.user_id] ? userMap[r.user_id].email : ''
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الحضور' });
  }
});

router.get('/employees-stats', async (req, res) => {
  const db = getDb();
  try {
    const employees = await db.users.getEmployees();
    const departments = await db.departments.getAll();
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = d.name; });
    const stats = [];
    for (const emp of employees) {
      const attStats = await db.attendance.getUserStats(emp.id);
      const evalSummary = await db.daily_evaluations.getSummary(emp.id);
      stats.push({
        id: emp.id, name: emp.name, phone: emp.phone, email: emp.email,
        department_id: emp.department_id, department_name: deptMap[emp.department_id] || 'غير محدد',
        salary: emp.salary || 0,
        ...attStats,
        avg_evaluation: evalSummary.avg_score,
        total_late_minutes: evalSummary.total_late_minutes,
        total_early_leave: evalSummary.total_early_leave
      });
    }
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
});

router.get('/salary-report', async (req, res) => {
  const db = getDb();
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();

    const employees = await db.users.getEmployees();
    const departments = await db.departments.getAll();
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = d.name; });

    const report = [];
    for (const emp of employees) {
      const attendance = await db.attendance.getByUserMonth(emp.id, m, y);
      const evaluations = await db.daily_evaluations.getByUserMonth(emp.id, m, y);
      const salary = emp.salary || 0;
      const hourlyRate = salary / (30 * 8);
      const perMinuteRate = hourlyRate / 60;

      let totalLateMinutes = 0;
      let totalEarlyLeave = 0;
      let lateDays = 0;
      let earlyDays = 0;
      let presentDays = 0;

      for (const att of attendance) {
        if (att.status === 'late') {
          lateDays++;
          if (att.check_in_time && att.check_out_time) {
            const lateMin = calculateLateMinutesFromTimes(att.check_in_time, att.check_out_time, '09:00');
            totalLateMinutes += lateMin;
          }
        }
        if (att.status === 'present') presentDays++;
        if (att.check_out_time) {
          const earlyMin = calculateEarlyLeaveFromTimes(att.check_out_time, '17:00');
          if (earlyMin > 0) {
            totalEarlyLeave += earlyMin;
            earlyDays++;
          }
        }
      }

      const totalDeductionMinutes = totalLateMinutes + totalEarlyLeave;
      const deductionAmount = totalDeductionMinutes * perMinuteRate * 2;
      const netSalary = Math.max(0, salary - deductionAmount);

      report.push({
        id: emp.id,
        name: emp.name,
        department_name: deptMap[emp.department_id] || 'غير محدد',
        salary,
        hourly_rate: Math.round(hourlyRate * 100) / 100,
        present_days: presentDays,
        late_days: lateDays,
        early_days: earlyDays,
        total_late_minutes: totalLateMinutes,
        total_early_leave_minutes: totalEarlyLeave,
        total_deduction_minutes: totalDeductionMinutes,
        deduction_amount: Math.round(deductionAmount * 100) / 100,
        net_salary: Math.round(netSalary * 100) / 100
      });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب تقرير الرواتب: ' + err.message });
  }
});

function calculateLateMinutesFromTimes(checkInTime, checkOutTime, workStart) {
  try {
    const ci = new Date(checkInTime);
    const startParts = workStart.split(':');
    const ciMinutes = ci.getHours() * 60 + ci.getMinutes();
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    return Math.max(0, ciMinutes - startMinutes);
  } catch { return 0; }
}

function calculateEarlyLeaveFromTimes(checkOutTime, workEnd) {
  try {
    const co = new Date(checkOutTime);
    const endParts = workEnd.split(':');
    const coMinutes = co.getHours() * 60 + co.getMinutes();
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return Math.max(0, endMinutes - coMinutes);
  } catch { return 0; }
}

router.post('/attendance/manual', async (req, res) => {
  const db = getDb();
  try {
    const { user_id, date, check_in_time, check_out_time, status, notes } = req.body;
    if (!user_id || !date) return res.status(400).json({ error: 'معرف الموظف والتاريخ مطلوبين' });
    const existing = await db.attendance.get(parseInt(user_id), date);
    if (existing) {
      await db.attendance.update(parseInt(user_id), date, {
        check_in_time: check_in_time || existing.check_in_time,
        check_out_time: check_out_time || existing.check_out_time,
        status: status || existing.status,
        notes: notes || existing.notes
      });
    } else {
      await db.attendance.create({
        user_id: parseInt(user_id), date,
        check_in_time: check_in_time || null,
        check_out_time: check_out_time || null,
        check_in_lat: null, check_in_lng: null,
        check_out_lat: null, check_out_lng: null,
        status: status || 'present',
        notes: notes || null
      });
    }
    res.json({ message: 'تم تحديث سجل الحضور يدوياً بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث السجل' });
  }
});

module.exports = router;
