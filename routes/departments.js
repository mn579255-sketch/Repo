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
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم القسم مطلوب' });
    const dept = await db.departments.create({ name, description: description || null });
    res.json({ message: 'تم إضافة القسم بنجاح', department: dept });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إضافة القسم: ' + err.message });
  }
});

router.put('/:id', async (req, res) => {
  const db = getDb();
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم القسم مطلوب' });
    await db.departments.update(id, { name, description: description || null });
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
