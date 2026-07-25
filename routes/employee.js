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
    score -= Math.min(lateMinutes / totalWorkMinutes, 1) * 40;
  }
  if (earlyLeaveMinutes > 0) {
    score -= Math.min(earlyLeaveMinutes / totalWorkMinutes, 1) * 30;
  }
  return Math.max(0, Math.round(score * 100) / 100);
}

router.get('/location', (req, res) => {
  const db = getDb();
  try {
    const location = db.company_location.get();
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

    const location = db.company_location.get();
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

    const settings = db.work_settings.get();
    const workStart = settings.work_start_hour || '09:00';

    let status = 'present';
    if (currentTime > workStart) {
      status = 'late';
    }

    const existing = db.attendance.get(req.user.id, today);

    if (existing && existing.check_in_time) {
      return res.status(400).json({ error: 'تم تسجيل حضورك اليوم بالفعل', checkInTime: existing.check_in_time });
    }

    db.attendance.upsert(req.user.id, today, {
      check_in_time: nowISO,
      check_in_lat: latitude,
      check_in_lng: longitude,
      status: status,
      check_out_time: existing ? existing.check_out_time : null,
      check_out_lat: existing ? existing.check_out_lat : null,
      check_out_lng: existing ? existing.check_out_lng : null,
      notes: existing ? existing.notes : null
    });

    const lateMinutes = status === 'late' ? calculateLateMinutes(workStart, currentTime) : 0;

    if (lateMinutes > 0) {
      const totalWorkMinutes = calculateWorkMinutes(settings.work_start_hour, settings.work_end_hour);
      const evalScore = calculateEvaluation(lateMinutes, 0, totalWorkMinutes);
      db.daily_evaluations.upsert(req.user.id, today, {
        evaluation_score: evalScore,
        total_late_minutes: lateMinutes,
        early_leave_minutes: 0,
        notes: null
      });
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

    const existing = db.attendance.get(req.user.id, today);
    if (!existing || !existing.check_in_time) {
      return res.status(400).json({ error: 'لم تسجل حضورك اليوم بعد' });
    }
    if (existing.check_out_time) {
      return res.status(400).json({ error: 'تم تسجيل انصرافك بالفعل اليوم', checkOutTime: existing.check_out_time });
    }

    db.attendance.update(req.user.id, today, {
      check_out_time: nowISO,
      check_out_lat: latitude || null,
      check_out_lng: longitude || null
    });

    const settings = db.work_settings.get();
    const workEnd = settings.work_end_hour || '17:00';
    const earlyLeaveMinutes = currentTime < workEnd ? calculateEarlyLeaveMinutes(currentTime, workEnd) : 0;

    if (earlyLeaveMinutes > 0) {
      const totalWorkMinutes = calculateWorkMinutes(settings.work_start_hour, settings.work_end_hour);
      const lateMinutes = existing.status === 'late' ? calculateLateMinutes(settings.work_start_hour, new Date(existing.check_in_time).toTimeString().slice(0, 5)) : 0;
      const evalScore = calculateEvaluation(lateMinutes, earlyLeaveMinutes, totalWorkMinutes);
      db.daily_evaluations.upsert(req.user.id, today, {
        evaluation_score: evalScore,
        total_late_minutes: lateMinutes,
        early_leave_minutes: earlyLeaveMinutes,
        notes: null
      });
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
    let records;
    if (month && year) {
      records = db.attendance.getByUserMonth(req.user.id, parseInt(month), parseInt(year));
    } else {
      records = db.attendance.getByUser(req.user.id);
    }
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب سجلات الحضور' });
  }
});

router.get('/my-evaluations', (req, res) => {
  const db = getDb();
  try {
    const { month, year } = req.query;
    let evaluations;
    if (month && year) {
      evaluations = db.daily_evaluations.getByUserMonth(req.user.id, parseInt(month), parseInt(year));
    } else {
      evaluations = db.daily_evaluations.getByUser(req.user.id);
    }

    const summary = db.daily_evaluations.getSummary(req.user.id);
    const attStats = db.attendance.getUserStats(req.user.id);

    res.json({ evaluations, summary: { ...summary, ...attStats } });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب التقييمات' });
  }
});

router.get('/today-status', (req, res) => {
  const db = getDb();
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendance = db.attendance.get(req.user.id, today);
    res.json(attendance || { checkedIn: false, date: today });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب حالة اليوم' });
  }
});

module.exports = router;
