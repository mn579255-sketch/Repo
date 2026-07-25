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
  if (lateMinutes > 0) {
    const lateRatio = Math.min(lateMinutes / totalWorkMinutes, 1);
    score -= lateRatio * 40;
  }
  if (earlyLeaveMinutes > 0) {
    const earlyRatio = Math.min(earlyLeaveMinutes / totalWorkMinutes, 1);
    score -= earlyRatio * 30;
  }
  return Math.max(0, Math.round(score * 100) / 100);
}

router.get('/location', (req, res) => {
  const db = getDb();
  try {
    const location = db.prepare('SELECT * FROM company_location ORDER BY id DESC LIMIT 1').get();
    res.json(location || null);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الموقع' });
  }
});

router.post('/checkin', (req, res) => {
  const db = getDb();
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'الموقع الجغرافي مطلوب' });
    }

    const location = db.prepare('SELECT * FROM company_location ORDER BY id DESC LIMIT 1').get();
    if (!location) {
      return res.status(400).json({ error: 'لم يتم تعيين موقع الشركة بعد - يرجى مراجعة الأدمن' });
    }

    const distance = calculateDistance(latitude, longitude, location.latitude, location.longitude);
    if (distance > location.radius) {
      return res.status(400).json({
        error: 'أنت خارج نطاق الموقع المحدد',
        distance: Math.round(distance),
        radius: location.radius
      });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const nowISO = now.toISOString();
    const currentTime = now.toTimeString().slice(0, 5);

    const settings = db.prepare('SELECT * FROM work_settings WHERE id = 1').get();
    const workStart = settings ? settings.work_start_hour : '09:00';

    let status = 'present';
    if (currentTime > workStart) {
      status = 'late';
    }

    const existing = db.prepare('SELECT id, check_in_time FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);

    if (existing && existing.check_in_time) {
      return res.status(400).json({ error: 'تم تسجيل حضورك اليوم بالفعل', checkInTime: existing.check_in_time });
    }

    if (existing) {
      db.prepare('UPDATE attendance SET check_in_time = ?, check_in_lat = ?, check_in_lng = ?, status = ? WHERE id = ?').run(
        nowISO, latitude, longitude, status, existing.id
      );
    } else {
      db.prepare('INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, status) VALUES (?, ?, ?, ?, ?, ?)').run(
        req.user.id, today, nowISO, latitude, longitude, status
      );
    }

    const lateMinutes = status === 'late' ? calculateLateMinutes(workStart, currentTime) : 0;

    if (lateMinutes > 0) {
      const totalWorkMinutes = calculateWorkMinutes(settings.work_start_hour, settings.work_end_hour);
      const evalScore = calculateEvaluation(lateMinutes, 0, totalWorkMinutes);

      const existingEval = db.prepare('SELECT id FROM daily_evaluations WHERE user_id = ? AND date = ?').get(req.user.id, today);
      if (existingEval) {
        db.prepare('UPDATE daily_evaluations SET evaluation_score = ?, total_late_minutes = ? WHERE id = ?').run(
          evalScore, lateMinutes, existingEval.id
        );
      } else {
        db.prepare('INSERT INTO daily_evaluations (user_id, date, evaluation_score, total_late_minutes) VALUES (?, ?, ?, ?)').run(
          req.user.id, today, evalScore, lateMinutes
        );
      }
    }

    const statusText = status === 'late' ? 'متأخر' : 'حاضر';
    res.json({
      message: `تم تسجيل حضورك بنجاح - الحالة: ${statusText}`,
      status,
      time: nowISO,
      distance: Math.round(distance),
      lateMinutes
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تسجيل الحضور: ' + err.message });
  }
});

router.post('/checkout', (req, res) => {
  const db = getDb();
  try {
    const { latitude, longitude } = req.body;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const nowISO = now.toISOString();
    const currentTime = now.toTimeString().slice(0, 5);

    const existing = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);
    if (!existing || !existing.check_in_time) {
      return res.status(400).json({ error: 'لم تسجل حضورك اليوم بعد' });
    }
    if (existing.check_out_time) {
      return res.status(400).json({ error: 'تم تسجيل انصرافك بالفعل اليوم', checkOutTime: existing.check_out_time });
    }

    db.prepare('UPDATE attendance SET check_out_time = ?, check_out_lat = ?, check_out_lng = ? WHERE id = ?').run(
      nowISO, latitude || null, longitude || null, existing.id
    );

    const settings = db.prepare('SELECT * FROM work_settings WHERE id = 1').get();
    const workEnd = settings ? settings.work_end_hour : '17:00';
    const earlyLeaveMinutes = currentTime < workEnd ? calculateEarlyLeaveMinutes(currentTime, workEnd) : 0;

    if (earlyLeaveMinutes > 0) {
      const totalWorkMinutes = calculateWorkMinutes(settings.work_start_hour, settings.work_end_hour);
      const lateMinutes = existing.status === 'late' ? calculateLateMinutes(settings.work_start_hour, new Date(existing.check_in_time).toTimeString().slice(0, 5)) : 0;
      const evalScore = calculateEvaluation(lateMinutes, earlyLeaveMinutes, totalWorkMinutes);

      const existingEval = db.prepare('SELECT id FROM daily_evaluations WHERE user_id = ? AND date = ?').get(req.user.id, today);
      if (existingEval) {
        db.prepare('UPDATE daily_evaluations SET evaluation_score = ?, early_leave_minutes = ? WHERE id = ?').run(
          evalScore, earlyLeaveMinutes, existingEval.id
        );
      } else {
        db.prepare('INSERT INTO daily_evaluations (user_id, date, evaluation_score, early_leave_minutes) VALUES (?, ?, ?, ?)').run(
          req.user.id, today, evalScore, earlyLeaveMinutes
        );
      }
    }

    res.json({
      message: 'تم تسجيل انصرافك بنجاح',
      time: nowISO,
      earlyLeaveMinutes
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تسجيل الانصراف: ' + err.message });
  }
});

router.get('/my-attendance', (req, res) => {
  const db = getDb();
  try {
    const { month, year } = req.query;
    let query = 'SELECT * FROM attendance WHERE user_id = ?';
    const params = [req.user.id];

    if (month && year) {
      const paddedMonth = month.toString().padStart(2, '0');
      query += ' AND date LIKE ?';
      params.push(`%-${paddedMonth}-${year}%`);
    }

    query += ' ORDER BY date DESC';
    const attendance = db.prepare(query).all(...params);
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب سجلات الحضور' });
  }
});

router.get('/my-evaluations', (req, res) => {
  const db = getDb();
  try {
    const { month, year } = req.query;
    let query = 'SELECT * FROM daily_evaluations WHERE user_id = ?';
    const params = [req.user.id];

    if (month && year) {
      const paddedMonth = month.toString().padStart(2, '0');
      query += ' AND date LIKE ?';
      params.push(`%-${paddedMonth}-${year}%`);
    }

    query += ' ORDER BY date DESC';
    const evaluations = db.prepare(query).all(...params);

    const summary = db.prepare(`
      SELECT 
        COALESCE(AVG(evaluation_score), 100) as avg_score,
        COALESCE(SUM(total_late_minutes), 0) as total_late_minutes,
        COALESCE(SUM(early_leave_minutes), 0) as total_early_leave,
        COUNT(*) as total_days
      FROM daily_evaluations
      WHERE user_id = ?
    `).get(req.user.id);

    const attendanceSummary = db.prepare(`
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days
      FROM attendance
      WHERE user_id = ?
    `).get(req.user.id);

    res.json({ evaluations, summary: { ...summary, ...attendanceSummary } });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب التقييمات' });
  }
});

router.get('/today-status', (req, res) => {
  const db = getDb();
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendance = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);
    res.json(attendance || { checkedIn: false, date: today });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب حالة اليوم' });
  }
});

module.exports = router;
