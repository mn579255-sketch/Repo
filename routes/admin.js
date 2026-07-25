const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

router.get('/location', (req, res) => {
  const db = getDb();
  try {
    const location = db.prepare('SELECT * FROM company_location ORDER BY id DESC LIMIT 1').get();
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
    const existing = db.prepare('SELECT id FROM company_location LIMIT 1').get();
    if (existing) {
      db.prepare('UPDATE company_location SET latitude = ?, longitude = ?, radius = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        latitude, longitude, radius || 100, existing.id
      );
    } else {
      db.prepare('INSERT INTO company_location (latitude, longitude, radius, set_by) VALUES (?, ?, ?, ?)').run(
        latitude, longitude, radius || 100, req.user.id
      );
    }
    res.json({ message: 'تم تحديث موقع الشركة بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ الموقع' });
  }
});

router.get('/settings', (req, res) => {
  const db = getDb();
  try {
    const settings = db.prepare('SELECT * FROM work_settings WHERE id = 1').get();
    res.json(settings || { work_start_hour: '09:00', work_end_hour: '17:00' });
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
    db.prepare('UPDATE work_settings SET work_start_hour = ?, work_end_hour = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(
      work_start_hour, work_end_hour
    );
    res.json({ message: 'تم تحديث ساعات العمل بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث الإعدادات' });
  }
});

router.get('/employees', (req, res) => {
  const db = getDb();
  try {
    const employees = db.prepare('SELECT id, name, phone, email, role, created_at FROM users WHERE role = ?').all('employee');
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الموظفين' });
  }
});

router.get('/employees/:id', (req, res) => {
  const db = getDb();
  try {
    const employee = db.prepare('SELECT id, name, phone, email, role, created_at FROM users WHERE id = ? AND role = ?').get(req.params.id, 'employee');
    if (!employee) return res.status(404).json({ error: 'الموظف غير موجود' });

    const attendance = db.prepare('SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 30').all(req.params.id);
    const evaluations = db.prepare('SELECT * FROM daily_evaluations WHERE user_id = ? ORDER BY date DESC LIMIT 30').all(req.params.id);

    res.json({ ...employee, attendance, evaluations });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الموظف' });
  }
});

router.delete('/employees/:id', (req, res) => {
  const db = getDb();
  try {
    const employee = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(req.params.id, 'employee');
    if (!employee) return res.status(404).json({ error: 'الموظف غير موجود' });

    db.prepare('DELETE FROM daily_evaluations WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM attendance WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    res.json({ message: 'تم حذف الموظف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف الموظف' });
  }
});

router.get('/attendance/all', (req, res) => {
  const db = getDb();
  try {
    const { date, month, year } = req.query;
    let query = `
      SELECT a.*, u.name as employee_name, u.phone as employee_phone, u.email as employee_email
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }
    if (month && year) {
      query += ' AND printf("%02d", CAST(a.date AS INTEGER) % 100) = ?';
      const paddedMonth = month.toString().padStart(2, '0');
      const searchPattern = `%-` + paddedMonth + `-%`;
      query = `
        SELECT a.*, u.name as employee_name, u.phone as employee_phone, u.email as employee_email
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE a.date LIKE ?
      `;
      params.length = 0;
      params.push(`%-${paddedMonth}-${year}%`);
    }

    query += ' ORDER BY a.date DESC, a.check_in_time DESC';

    const attendance = db.prepare(query).all(...params);
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الحضور' });
  }
});

router.get('/employees-stats', (req, res) => {
  const db = getDb();
  try {
    const employees = db.prepare('SELECT id, name, phone, email FROM users WHERE role = ?').all('employee');
    const stats = employees.map(emp => {
      const attStats = db.prepare(`
        SELECT 
          COUNT(*) as total_days,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days
        FROM attendance WHERE user_id = ?
      `).get(emp.id);

      const evalStats = db.prepare(`
        SELECT 
          COALESCE(AVG(evaluation_score), 100) as avg_evaluation,
          COALESCE(SUM(total_late_minutes), 0) as total_late_minutes
        FROM daily_evaluations WHERE user_id = ?
      `).get(emp.id);

      return {
        ...emp,
        total_days: attStats.total_days || 0,
        present_days: attStats.present_days || 0,
        late_days: attStats.late_days || 0,
        absent_days: attStats.absent_days || 0,
        avg_evaluation: evalStats.avg_evaluation || 100,
        total_late_minutes: evalStats.total_late_minutes || 0
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

    const existing = db.prepare('SELECT id FROM attendance WHERE user_id = ? AND date = ?').get(user_id, date);
    if (existing) {
      db.prepare('UPDATE attendance SET check_in_time = ?, check_out_time = ?, status = ?, notes = ? WHERE user_id = ? AND date = ?').run(
        check_in_time || null, check_out_time || null, status || 'present', notes || null, user_id, date
      );
    } else {
      db.prepare('INSERT INTO attendance (user_id, date, check_in_time, check_out_time, status, notes) VALUES (?, ?, ?, ?, ?, ?)').run(
        user_id, date, check_in_time || null, check_out_time || null, status || 'present', notes || null
      );
    }

    res.json({ message: 'تم تحديث سجل الحضور يدوياً بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث السجل' });
  }
});

module.exports = router;
