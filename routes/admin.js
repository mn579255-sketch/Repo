const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

router.get('/location', async (req, res) => {
  const db = getDb();
  try {
    const location = await db.company_location.get();
    if (!location) {
      return res.status(404).json({ error: 'لم يتم تعيين موقع الشركة بعد' });
    }
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الموقع' });
  }
});

router.post('/location', async (req, res) => {
  const db = getDb();
  try {
    const { latitude, longitude, radius } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'خط العرض وخط الطول مطلوبين' });
    }
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
    if (!work_start_hour || !work_end_hour) {
      return res.status(400).json({ error: 'ساعات العمل مطلوبة' });
    }
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
    const mapped = employees.map(u => ({
      id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role, created_at: u.created_at
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

    const attendance = (await db.attendance.getByUser(id)).slice(0, 30);
    const evaluations = (await db.daily_evaluations.getByUser(id)).slice(0, 30);

    res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, created_at: user.created_at, attendance, evaluations });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الموظف' });
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
    const stats = [];
    for (const emp of employees) {
      const attStats = await db.attendance.getUserStats(emp.id);
      const evalSummary = await db.daily_evaluations.getSummary(emp.id);
      stats.push({
        id: emp.id, name: emp.name, phone: emp.phone, email: emp.email,
        ...attStats,
        avg_evaluation: evalSummary.avg_score,
        total_late_minutes: evalSummary.total_late_minutes
      });
    }
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
});

router.post('/attendance/manual', async (req, res) => {
  const db = getDb();
  try {
    const { user_id, date, check_in_time, check_out_time, status, notes } = req.body;
    if (!user_id || !date) {
      return res.status(400).json({ error: 'معرف الموظف والتاريخ مطلوبين' });
    }

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
