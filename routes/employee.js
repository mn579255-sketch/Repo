const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateLateMinutes(workStart, currentTime) {
  try {
    const startParts = workStart.split(':');
    const currentParts = currentTime.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const currentMinutes = parseInt(currentParts[0]) * 60 + parseInt(currentParts[1]);
    return Math.max(0, currentMinutes - startMinutes);
  } catch { return 0; }
}

function calculateEarlyLeaveMinutes(currentTime, workEnd) {
  try {
    const currentParts = currentTime.split(':');
    const endParts = workEnd.split(':');
    const currentMinutes = parseInt(currentParts[0]) * 60 + parseInt(currentParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return Math.max(0, endMinutes - currentMinutes);
  } catch { return 0; }
}

function calculateOvertimeMinutes(currentTime, workEnd) {
  try {
    const currentParts = currentTime.split(':');
    const endParts = workEnd.split(':');
    const currentMinutes = parseInt(currentParts[0]) * 60 + parseInt(currentParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return Math.max(0, currentMinutes - endMinutes);
  } catch { return 0; }
}

function calculateWorkMinutes(workStart, workEnd) {
  try {
    const startParts = workStart.split(':');
    const endParts = workEnd.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return Math.max(1, endMinutes - startMinutes);
  } catch { return 480; }
}

function calculateEvaluation(lateMinutes, earlyLeaveMinutes, totalWorkMinutes) {
  let score = 100;
  if (lateMinutes > 0) score -= Math.min(lateMinutes / totalWorkMinutes, 1) * 40;
  if (earlyLeaveMinutes > 0) score -= Math.min(earlyLeaveMinutes / totalWorkMinutes, 1) * 30;
  return Math.max(0, Math.round(score * 100) / 100);
}

router.put('/profile', async (req, res) => {
  const db = getDb();
  try {
    const { department_id, salary } = req.body;
    const updates = {};
    if (department_id !== undefined) updates.department_id = department_id || null;
    if (salary !== undefined) updates.salary = parseFloat(salary) || 0;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'لم يتم إدخال أي بيانات' });
    await db.users.update(req.user.id, updates);
    const user = await db.users.get(req.user.id);
    res.json({
      message: 'تم تحديث بياناتك بنجاح',
      user: { id: user.id, name: user.name, department_id: user.department_id, salary: user.salary }
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث البيانات: ' + err.message });
  }
});

router.get('/departments', async (req, res) => {
  const db = getDb();
  try {
    const departments = await db.departments.getAll();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الأقسام' });
  }
});

router.get('/location', async (req, res) => {
  const db = getDb();
  try {
    const location = await db.company_location.get();
    res.json(location || null);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الموقع' });
  }
});

router.post('/checkin', async (req, res) => {
  const db = getDb();
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'الموقع الجغرافي مطلوب' });

    const location = await db.company_location.get();
    if (!location) return res.status(400).json({ error: 'لم يتم تعيين موقع الشركة بعد - يرجى مراجعة الأدمن' });

    const distance = calculateDistance(latitude, longitude, location.latitude, location.longitude);
    if (distance > location.radius) {
      return res.status(400).json({ error: 'أنت خارج نطاق الموقع المحدد', distance: Math.round(distance), radius: location.radius });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const nowISO = now.toISOString();
    const currentTime = now.toTimeString().slice(0, 5);

    const settings = await db.work_settings.get();
    const workStart = settings.work_start_hour || '09:00';

    let status = 'present';
    if (currentTime > workStart) status = 'late';

    const existing = await db.attendance.get(req.user.id, today);
    if (existing && existing.check_in_time) {
      return res.status(400).json({ error: 'تم تسجيل حضورك اليوم بالفعل', checkInTime: existing.check_in_time });
    }

    await db.attendance.upsert(req.user.id, today, {
      check_in_time: nowISO, check_in_lat: latitude, check_in_lng: longitude, status,
      check_out_time: existing ? existing.check_out_time : null,
      check_out_lat: existing ? existing.check_out_lat : null,
      check_out_lng: existing ? existing.check_out_lng : null,
      notes: existing ? existing.notes : null
    });

    const lateMinutes = status === 'late' ? calculateLateMinutes(workStart, currentTime) : 0;
    if (lateMinutes > 0) {
      const totalWorkMinutes = calculateWorkMinutes(settings.work_start_hour, settings.work_end_hour);
      const evalScore = calculateEvaluation(lateMinutes, 0, totalWorkMinutes);
      await db.daily_evaluations.upsert(req.user.id, today, {
        evaluation_score: evalScore, total_late_minutes: lateMinutes, early_leave_minutes: 0, notes: null
      });
    }

    res.json({ message: `تم تسجيل حضورك بنجاح - الحالة: ${status === 'late' ? 'متأخر' : 'حاضر'}`, status, time: nowISO, distance: Math.round(distance), lateMinutes });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تسجيل الحضور: ' + err.message });
  }
});

router.post('/checkout', async (req, res) => {
  const db = getDb();
  try {
    const { latitude, longitude, reason } = req.body;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const nowISO = now.toISOString();
    const currentTime = now.toTimeString().slice(0, 5);

    const existing = await db.attendance.get(req.user.id, today);
    if (!existing || !existing.check_in_time) return res.status(400).json({ error: 'لم تسجل حضورك اليوم بعد' });
    if (existing.check_out_time) return res.status(400).json({ error: 'تم تسجيل انصرافك بالفعل اليوم', checkOutTime: existing.check_out_time });

    const settings = await db.work_settings.get();
    const workEnd = settings.work_end_hour || '17:00';
    const isEarly = currentTime < workEnd;

    if (isEarly) {
      const pending = await db.requests.getByUser(req.user.id);
      const hasPending = pending.find(r => r.status === 'pending');
      if (hasPending) return res.status(400).json({ error: 'لديك طلب معلق بالفعل' });

      await db.requests.create({
        user_id: req.user.id,
        type: 'early_leave',
        date_from: today,
        date_to: today,
        reason: reason || 'انصراف مبكر',
        checkout_date: today,
        checkout_time: nowISO,
        checkout_lat: latitude,
        checkout_lng: longitude
      });
      return res.json({ message: 'تم إرسال طلب الانصراف المبكر للموافقة', pending: true });
    }

    const overtimeMinutes = calculateOvertimeMinutes(currentTime, workEnd);
    await db.attendance.update(req.user.id, today, {
      check_out_time: nowISO, check_out_lat: latitude || null, check_out_lng: longitude || null,
      overtime_minutes: overtimeMinutes
    });

    const lateMinutes = existing.status === 'late' ? calculateLateMinutes(settings.work_start_hour, new Date(existing.check_in_time).toTimeString().slice(0, 5)) : 0;
    const totalWorkMinutes = calculateWorkMinutes(settings.work_start_hour, settings.work_end_hour);
    const evalScore = calculateEvaluation(lateMinutes, 0, totalWorkMinutes);
    await db.daily_evaluations.upsert(req.user.id, today, {
      evaluation_score: evalScore, total_late_minutes: lateMinutes, early_leave_minutes: 0,
      overtime_hours: Math.round(overtimeMinutes / 60 * 100) / 100, notes: null
    });

    res.json({ message: 'تم تسجيل انصرافك بنجاح', time: nowISO, overtimeMinutes });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تسجيل الانصراف: ' + err.message });
  }
});

router.get('/my-attendance', async (req, res) => {
  const db = getDb();
  try {
    const { month, year } = req.query;
    let records;
    if (month && year) {
      records = await db.attendance.getByUserMonth(req.user.id, parseInt(month), parseInt(year));
    } else {
      records = await db.attendance.getByUser(req.user.id);
    }
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب سجلات الحضور' });
  }
});

router.get('/my-evaluations', async (req, res) => {
  const db = getDb();
  try {
    const { month, year } = req.query;
    let evaluations;
    if (month && year) {
      evaluations = await db.daily_evaluations.getByUserMonth(req.user.id, parseInt(month), parseInt(year));
    } else {
      evaluations = await db.daily_evaluations.getByUser(req.user.id);
    }
    const summary = await db.daily_evaluations.getSummary(req.user.id);
    const attStats = await db.attendance.getUserStats(req.user.id);
    res.json({ evaluations, summary: { ...summary, ...attStats } });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب التقييمات' });
  }
});

router.get('/today-status', async (req, res) => {
  const db = getDb();
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendance = await db.attendance.get(req.user.id, today);
    res.json(attendance || { checkedIn: false, date: today });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب حالة اليوم' });
  }
});

router.get('/my-salary', async (req, res) => {
  const db = getDb();
  try {
    const user = await db.users.get(req.user.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const salary = user.salary || 0;
    const hourlyRate = salary / (30 * 8);
    const perMinuteRate = hourlyRate / 60;

    const settings = await db.work_settings.get();
    const workStartParts = (settings.work_start_hour || '09:00').split(':');
    const workEndParts = (settings.work_end_hour || '17:00').split(':');
    const startMin = parseInt(workStartParts[0]) * 60 + parseInt(workStartParts[1]);
    const endMin = parseInt(workEndParts[0]) * 60 + parseInt(workEndParts[1]);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const attendance = await db.attendance.getByUserMonth(req.user.id, month, year);

    const allRequests = await db.requests.getByUser(req.user.id);
    const approvedRequests = allRequests.filter(r => r.status === 'approved');
    function hasApprovedPermission(date) {
      return approvedRequests.some(r => date >= r.date_from && date <= (r.date_to || r.date_from));
    }

    let totalLateMinutes = 0;
    let totalEarlyLeave = 0;
    let totalOvertimeHours = 0;
    let lateDaysCount = 0;
    let earlyDaysCount = 0;
    let exemptDays = 0;
    for (const att of attendance) {
      if (hasApprovedPermission(att.date)) { exemptDays++; continue; }
      if (att.check_in_time && att.status === 'late') {
        const ci = new Date(att.check_in_time);
        const ciMin = ci.getHours() * 60 + ci.getMinutes();
        totalLateMinutes += Math.max(0, ciMin - startMin);
        lateDaysCount++;
      }
      if (att.check_out_time) {
        const co = new Date(att.check_out_time);
        const coMin = co.getHours() * 60 + co.getMinutes();
        const early = Math.max(0, endMin - coMin);
        if (early > 0) { totalEarlyLeave += early; earlyDaysCount++; }
        const overtime = Math.max(0, coMin - endMin);
        if (overtime > 0) totalOvertimeHours += overtime / 60;
      }
    }

    const totalDeductionMinutes = totalLateMinutes + totalEarlyLeave;
    const deductionAmount = totalDeductionMinutes * perMinuteRate * 2;
    const overtimePay = totalOvertimeHours * hourlyRate * 1.5;
    const netSalary = Math.max(0, salary - deductionAmount + overtimePay);

    res.json({
      salary,
      hourly_rate: Math.round(hourlyRate * 100) / 100,
      per_minute_rate: Math.round(perMinuteRate * 100) / 100,
      month, year,
      total_late_minutes: totalLateMinutes,
      total_early_leave_minutes: totalEarlyLeave,
      total_deduction_minutes: totalDeductionMinutes,
      deduction_amount: Math.round(deductionAmount * 100) / 100,
      overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
      overtime_pay: Math.round(overtimePay * 100) / 100,
      exempt_days: exemptDays,
      net_salary: Math.round(netSalary * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الراتب' });
  }
});

// Submit a request (leave, permission, mission)
router.post('/requests', async (req, res) => {
  const db = getDb();
  try {
    const { type, date_from, date_to, reason } = req.body;
    if (!type || !date_from) return res.status(400).json({ error: 'نوع الطلب وتاريخ البداية مطلوبين' });
    if (!['leave', 'permission', 'mission', 'early_leave'].includes(type)) return res.status(400).json({ error: 'نوع طلب غير صحيح' });
    
    // Check if user has a pending request
    const existing = await db.requests.getByUser(req.user.id);
    const pending = existing.find(r => r.status === 'pending');
    if (pending) return res.status(400).json({ error: 'لديك طلب معلق بالفعل' });
    
    const request = await db.requests.create({
      user_id: req.user.id, type, date_from, date_to: date_to || date_from, reason: reason || null
    });
    res.json({ message: 'تم إرسال الطلب بنجاح', request });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إرسال الطلب: ' + err.message });
  }
});

// Get my requests
router.get('/my-requests', async (req, res) => {
  const db = getDb();
  try {
    const requests = await db.requests.getByUser(req.user.id);
    const users = await db.users.getAll();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const enriched = requests.map(r => ({
      ...r,
      reviewer_name: r.reviewed_by && userMap[r.reviewed_by] ? userMap[r.reviewed_by].name : null
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الطلبات' });
  }
});

// Get my department info
router.get('/my-department', async (req, res) => {
  const db = getDb();
  try {
    const user = await db.users.get(req.user.id);
    if (!user || !user.department_id) return res.json(null);
    const dept = await db.departments.get(user.department_id);
    res.json(dept);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات القسم' });
  }
});

// Check if employee has approved permission/leave for a date
router.get('/approved-permission', async (req, res) => {
  const db = getDb();
  try {
    const today = new Date().toISOString().split('T')[0];
    const requests = await db.requests.getByUser(req.user.id);
    const approved = requests.filter(r => r.status === 'approved' && today >= r.date_from && today <= (r.date_to || r.date_from));
    res.json({ hasApproved: approved.length > 0, requests: approved });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التحقق من الطلبات' });
  }
});

// Get work settings (for employee to know work end time)
router.get('/work-settings', async (req, res) => {
  const db = getDb();
  try {
    const settings = await db.work_settings.get();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

module.exports = router;
