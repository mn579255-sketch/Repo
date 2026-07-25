const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

router.get('/location', (req, res) => {
  const db = getDb();
  try {
    const location = db.company_location.get();
    if (!location) {
      return res.status(404).json({ error: 'لم يتم تعيين موقع الشركة بعد' });
    }
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الموقع' });
  }
});

router.post('/location', (req, res) => {
  const db = getDb();
  try {
    const { latitude, longitude, radius } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'خط العرض وخط الطول مطلوبين' });
    }
    db.company_location.set({ latitude, longitude, radius: radius || 100, set_by: req.user.id });
    res.json({ message: 'تم تحديث موقع الشركة بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ الموقع' });
  }
});

router.get('/settings', (req, res) => {
  const db = getDb();
  try {
    const settings = db.work_settings.get();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

router.put('/settings', (req, res) => {
  const db = getDb();
  try {
    const { work_start_hour, work_end_hour } = req.body;
    if (!work_start_hour || !work_end_hour) {
      return res.status(400).json({ error: 'ساعات العمل مطلوبة' });
    }
    db.work_settings.update({ work_start_hour, work_end_hour });
    res.json({ message: 'تم تحديث ساعات العمل بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث الإعدادات' });
  }
});

router.get('/employees', (req, res) => {
  const db = getDb();
  try {
    const employees = db.users.getEmployees().map(u => ({
      id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role, created_at: u.created_at
    }));
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الموظفين' });
  }
});

router.get('/employees/:id', (req, res) => {
  const db = getDb();
  try {
    const id = parseInt(req.params.id);
    const user = db.users.get(id);
    if (!user || user.role !== 'employee') return res.status(404).json({ error: 'الموظف غير موجود' });

    const attendance = db.attendance.getByUser(id).slice(0, 30);
    const evaluations = db.daily_evaluations.getByUser(id).slice(0, 30);

    res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, created_at: user.created_at, attendance, evaluations });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الموظف' });
  }
});

router.delete('/employees/:id', (req, res) => {
  const db = getDb();
  try {
    const id = parseInt(req.params.id);
    const user = db.users.get(id);
    if (!user || user.role !== 'employee') return res.status(404).json({ error: 'الموظف غير موجود' });

    db.daily_evaluations.removeByUser(id);
    db.attendance.removeByUser(id);
    db.users.remove(id);

    res.json({ message: 'تم حذف الموظف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف الموظف' });
  }
});

router.get('/attendance/all', (req, res) => {
  const db = getDb();
  try {
    const { date, month, year } = req.query;
    let records;
    if (date) {
      records = db.attendance.getAllByDate(date);
    } else if (month && year) {
      records = db.attendance.getAllByMonth(parseInt(month), parseInt(year));
    } else {
      records = db.attendance.getAll();
    }

    const users = db.users.getAll();
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

router.get('/employees-stats', (req, res) => {
  const db = getDb();
  try {
    const employees = db.users.getEmployees();
    const stats = employees.map(emp => {
      const attStats = db.attendance.getUserStats(emp.id);
      const evalSummary = db.daily_evaluations.getSummary(emp.id);
      return {
        id: emp.id, name: emp.name, phone: emp.phone, email: emp.email,
        ...attStats,
        avg_evaluation: evalSummary.avg_score,
        total_late_minutes: evalSummary.total_late_minutes
      };
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
});

router.post('/attendance/manual', (req, res) => {
  const db = getDb();
  try {
    const { user_id, date, check_in_time, check_out_time, status, notes } = req.body;
    if (!user_id || !date) {
      return res.status(400).json({ error: 'معرف الموظف والتاريخ مطلوبين' });
    }

    const existing = db.attendance.get(parseInt(user_id), date);
    if (existing) {
      db.attendance.update(parseInt(user_id), date, {
        check_in_time: check_in_time || existing.check_in_time,
        check_out_time: check_out_time || existing.check_out_time,
        status: status || existing.status,
        notes: notes || existing.notes
      });
    } else {
      db.attendance.create({
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
