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
    const settings = await db.work_settings.get();
    const workStartParts = (settings.work_start_hour || '09:00').split(':');
    const workEndParts = (settings.work_end_hour || '17:00').split(':');
    const workStartMin = parseInt(workStartParts[0]) * 60 + parseInt(workStartParts[1]);
    const workEndMin = parseInt(workEndParts[0]) * 60 + parseInt(workEndParts[1]);
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = d.name; });

    const allRequests = await db.requests.getAll();
    function hasApprovedPermission(userId, date) {
      return allRequests.some(r => r.user_id === userId && r.status === 'approved' && date >= r.date_from && date <= (r.date_to || r.date_from));
    }

    const report = [];
    for (const emp of employees) {
      const attendance = await db.attendance.getByUserMonth(emp.id, m, y);
      const salary = emp.salary || 0;
      const hourlyRate = salary / (30 * 8);
      const perMinuteRate = hourlyRate / 60;

      let totalLateMinutes = 0;
      let totalEarlyLeave = 0;
      let totalOvertimeHours = 0;
      let lateDays = 0;
      let earlyDays = 0;
      let presentDays = 0;

      for (const att of attendance) {
        if (hasApprovedPermission(emp.id, att.date)) continue;
        if (att.status === 'late') {
          lateDays++;
          if (att.check_in_time) {
            const ci = new Date(att.check_in_time);
            const ciMin = ci.getHours() * 60 + ci.getMinutes();
            totalLateMinutes += Math.max(0, ciMin - workStartMin);
          }
        }
        if (att.status === 'present') presentDays++;
        if (att.check_out_time) {
          const co = new Date(att.check_out_time);
          const coMin = co.getHours() * 60 + co.getMinutes();
          const earlyMin = Math.max(0, workEndMin - coMin);
          if (earlyMin > 0) { totalEarlyLeave += earlyMin; earlyDays++; }
          const overtimeMin = Math.max(0, coMin - workEndMin);
          if (overtimeMin > 0) totalOvertimeHours += overtimeMin / 60;
        }
      }
          if (earlyMin > 0) {
            totalEarlyLeave += earlyMin;
            earlyDays++;
          }
          const overtimeMin = calculateOvertimeFromTimes(att.check_out_time, '17:00');
          if (overtimeMin > 0) totalOvertimeHours += overtimeMin / 60;
        }
      }

      const totalDeductionMinutes = totalLateMinutes + totalEarlyLeave;
      const deductionAmount = totalDeductionMinutes * perMinuteRate * 2;
      const overtimePay = totalOvertimeHours * hourlyRate * 1.5;
      const netSalary = Math.max(0, salary - deductionAmount + overtimePay);

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
        overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
        overtime_pay: Math.round(overtimePay * 100) / 100,
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

function calculateOvertimeFromTimes(checkOutTime, workEnd) {
  try {
    const co = new Date(checkOutTime);
    const endParts = workEnd.split(':');
    const coMinutes = co.getHours() * 60 + co.getMinutes();
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return Math.max(0, coMinutes - endMinutes);
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

// Department head assignment
router.put('/departments/:id/head', async (req, res) => {
  const db = getDb();
  try {
    const { head_id } = req.body;
    await db.departments.update(req.params.id, { head_id: head_id || null });
    res.json({ message: 'تم تعيين مدير القسم بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تعيين مدير القسم: ' + err.message });
  }
});

// Get all requests
router.get('/requests', async (req, res) => {
  const db = getDb();
  try {
    const requests = await db.requests.getAll();
    const users = await db.users.getAll();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const departments = await db.departments.getAll();
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = d.name; });
    const enriched = requests.map(r => ({
      ...r,
      employee_name: userMap[r.user_id] ? userMap[r.user_id].name : 'غير معروف',
      employee_department: deptMap[userMap[r.user_id]?.department_id] || 'غير محدد',
      reviewer_name: r.reviewed_by && userMap[r.reviewed_by] ? userMap[r.reviewed_by].name : null,
      admin_reviewer_name: r.admin_reviewed_by && userMap[r.admin_reviewed_by] ? userMap[r.admin_reviewed_by].name : null
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الطلبات' });
  }
});

// Admin approve/reject request
router.put('/requests/:id', async (req, res) => {
  const db = getDb();
  try {
    const { status, review_notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });
    const request = await db.requests.get(parseInt(req.params.id));
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    if (request.type === 'early_leave') {
      if (status === 'approved') {
        if (request.reviewed_by === null) {
          return res.status(400).json({ error: 'الطلب لم يُوافق عليه من مدير القسم بعد' });
        }
        const now = new Date();
        const today = request.checkout_date || now.toISOString().split('T')[0];
        const checkoutTime = request.checkout_time || now.toISOString();

        await db.attendance.update(request.user_id, today, {
          check_out_time: checkoutTime,
          check_out_lat: request.checkout_lat || null,
          check_out_lng: request.checkout_lng || null,
          notes: request.reason || 'انصراف مبكر معتمد'
        });

        const settings = await db.work_settings.get();
        const workEnd = settings.work_end_hour || '17:00';
        const coTime = new Date(checkoutTime);
        const coMin = coTime.getHours() * 60 + coTime.getMinutes();
        const endMin = parseInt(workEnd.split(':')[0]) * 60 + parseInt(workEnd.split(':')[1]);
        const earlyMinutes = Math.max(0, endMin - coMin);

        const existing = await db.attendance.get(request.user_id, today);
        const lateMinutes = existing && existing.status === 'late' && existing.check_in_time
          ? Math.max(0, (new Date(existing.check_in_time).getHours() * 60 + new Date(existing.check_in_time).getMinutes()) - (parseInt(settings.work_start_hour.split(':')[0]) * 60 + parseInt(settings.work_start_hour.split(':')[1])))
          : 0;
        const totalWorkMinutes = parseInt(settings.work_end_hour.split(':')[0]) * 60 + parseInt(settings.work_end_hour.split(':')[1]) - (parseInt(settings.work_start_hour.split(':')[0]) * 60 + parseInt(settings.work_start_hour.split(':')[1]));
        const evalScore = calculateEarlyLeaveEvaluation(lateMinutes, earlyMinutes, totalWorkMinutes);
        await db.daily_evaluations.upsert(request.user_id, today, {
          evaluation_score: evalScore, total_late_minutes: lateMinutes, early_leave_minutes: earlyMinutes,
          overtime_hours: 0, notes: request.reason
        });

        await db.requests.update(parseInt(req.params.id), { status: 'approved', admin_reviewed_by: req.user.id, review_notes: review_notes || null });
        return res.json({ message: 'تمت الموافقة على الانصراف المبكر وتسجيل الانصراف', request: request });
      } else {
        await db.requests.update(parseInt(req.params.id), { status: 'rejected', admin_reviewed_by: req.user.id, review_notes: review_notes || null });
        return res.json({ message: 'تم رفض طلب الانصراف المبكر', request: request });
      }
    }

    const updated = await db.requests.update(parseInt(req.params.id), { status, reviewed_by: req.user.id, review_notes: review_notes || null });
    res.json({ message: status === 'approved' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب', request: updated });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث الطلب: ' + err.message });
  }
});

// Admin filtered attendance
router.get('/attendance/filtered', async (req, res) => {
  const db = getDb();
  try {
    const { month, year, user_id, department_id } = req.query;
    let records;
    if (month && year) {
      records = await db.attendance.getAllByMonth(parseInt(month), parseInt(year));
    } else {
      records = await db.attendance.getAll();
    }
    if (user_id) records = records.filter(r => r.user_id === parseInt(user_id));

    const users = await db.users.getEmployees();
    const departments = await db.departments.getAll();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = d.name; });

    if (department_id) {
      const deptUserIds = users.filter(u => u.department_id === parseInt(department_id)).map(u => u.id);
      records = records.filter(r => deptUserIds.includes(r.user_id));
    }

    const enriched = records.map(r => ({
      ...r,
      employee_name: userMap[r.user_id] ? userMap[r.user_id].name : 'غير معروف',
      employee_phone: userMap[r.user_id] ? userMap[r.user_id].phone : '',
      employee_email: userMap[r.user_id] ? userMap[r.user_id].email : '',
      employee_department_id: userMap[r.user_id] ? userMap[r.user_id].department_id : null,
      employee_department: deptMap[userMap[r.user_id]?.department_id] || 'غير محدد'
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الحضور' });
  }
});

function calculateEarlyLeaveEvaluation(lateMinutes, earlyLeaveMinutes, totalWorkMinutes) {
  let score = 100;
  if (lateMinutes > 0) score -= Math.min(lateMinutes / totalWorkMinutes, 1) * 40;
  if (earlyLeaveMinutes > 0) score -= Math.min(earlyLeaveMinutes / totalWorkMinutes, 1) * 30;
  return Math.max(0, Math.round(score * 100) / 100);
}

// Employee status today (present, on leave, permission, mission)
router.get('/employee-status', async (req, res) => {
  const db = getDb();
  try {
    const today = new Date().toISOString().split('T')[0];
    const employees = await db.users.getEmployees();
    const departments = await db.departments.getAll();
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = d.name; });

    const attendance = await db.attendance.getAllByDate(today);
    const attMap = {};
    attendance.forEach(a => { attMap[a.user_id] = a; });

    const allRequests = await db.requests.getAll();
    const todayApproved = allRequests.filter(r => r.status === 'approved' && today >= r.date_from && today <= (r.date_to || r.date_from));
    const reqMap = {};
    todayApproved.forEach(r => { reqMap[r.user_id] = r; });

    const result = employees.map(emp => {
      const att = attMap[emp.id];
      const req = reqMap[emp.id];
      let status = 'absent';
      let statusText = 'غائب';
      if (att && att.check_in_time) {
        if (att.check_out_time) { status = 'left'; statusText = 'انصرف'; }
        else if (att.status === 'late') { status = 'late'; statusText = 'متأخر'; }
        else { status = 'present'; statusText = 'حاضر'; }
      } else if (req) {
        if (req.type === 'leave') { status = 'leave'; statusText = 'إجازة'; }
        else if (req.type === 'permission') { status = 'permission'; statusText = 'إذن'; }
        else if (req.type === 'mission') { status = 'mission'; statusText = 'مأمورية'; }
      }
      return {
        id: emp.id, name: emp.name, department_id: emp.department_id,
        department_name: deptMap[emp.department_id] || 'غير محدد',
        status, statusText
      };
    });

    const deptStats = {};
    departments.forEach(d => { deptMap[d.id] = d.name; deptStats[d.name] = { present: 0, late: 0, absent: 0, leave: 0, permission: 0, mission: 0, left: 0, total: 0 }; });
    result.forEach(r => {
      if (!deptStats[r.department_name]) deptStats[r.department_name] = { present: 0, late: 0, absent: 0, leave: 0, permission: 0, mission: 0, left: 0, total: 0 };
      deptStats[r.department_name][r.status] = (deptStats[r.department_name][r.status] || 0) + 1;
      deptStats[r.department_name].total++;
    });

    res.json({ employees: result, departmentStats: deptStats, total: employees.length, present: result.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'left').length });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب حالة الموظفين' });
  }
});

// Admin edit any employee (allow editing name, email, phone, salary, department_id, role)
router.put('/employees/:id/edit', async (req, res) => {
  const db = getDb();
  try {
    const id = parseInt(req.params.id);
    const user = await db.users.get(id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    const { name, email, phone, salary, department_id } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (salary !== undefined) updates.salary = salary;
    if (department_id !== undefined) updates.department_id = department_id || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'لم يتم إدخال بيانات' });
    await db.users.update(id, updates);
    res.json({ message: 'تم تحديث البيانات بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التحديث: ' + err.message });
  }
});

module.exports = router;
