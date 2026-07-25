const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

router.get('/', async (req, res) => {
  const db = getDb();
  try {
    const departments = await db.departments.getAll();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الأقسام' });
  }
});

router.post('/', async (req, res) => {
  const db = getDb();
  try {
    const { name, description, work_start_hour, work_end_hour, work_days_per_week } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم القسم مطلوب' });
    const dept = await db.departments.create({
      name, description: description || null,
      work_start_hour: work_start_hour || '09:00',
      work_end_hour: work_end_hour || '17:00',
      work_days_per_week: work_days_per_week || 5
    });
    res.json({ message: 'تم إضافة القسم بنجاح', department: dept });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إضافة القسم: ' + err.message });
  }
});

router.put('/:id', async (req, res) => {
  const db = getDb();
  try {
    const id = parseInt(req.params.id);
    const { name, description, work_start_hour, work_end_hour, work_days_per_week } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم القسم مطلوب' });
    const updates = { name, description: description || null };
    if (work_start_hour !== undefined) updates.work_start_hour = work_start_hour;
    if (work_end_hour !== undefined) updates.work_end_hour = work_end_hour;
    if (work_days_per_week !== undefined) updates.work_days_per_week = parseInt(work_days_per_week) || 5;
    await db.departments.update(id, updates);
    res.json({ message: 'تم تحديث القسم بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث القسم: ' + err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const db = getDb();
  try {
    const id = parseInt(req.params.id);
    await db.departments.remove(id);
    res.json({ message: 'تم حذف القسم بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف القسم: ' + err.message });
  }
});

module.exports = router;
