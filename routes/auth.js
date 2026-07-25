const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const db = getDb();
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    const existingByPhone = await db.users.getByPhone(phone);
    const existingByEmail = await db.users.getByEmail(email);
    if (existingByPhone || existingByEmail) {
      return res.status(400).json({ error: 'رقم الموبايل أو الإيميل مسجل بالفعل' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.users.create({
      name, phone, email, password: hashedPassword, role: 'employee'
    });
    const token = jwt.sign(
      { id: user.id, name, role: 'employee', email },
      SECRET,
      { expiresIn: '24h' }
    );
    res.json({ message: 'تم التسجيل بنجاح', token, user: { id: user.id, name, role: 'employee', email } });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التسجيل: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  const db = getDb();
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبين' });
    }
    const user = await db.users.getByLogin(email);
    if (!user) {
      return res.status(401).json({ error: 'المستخدم غير مسجل' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }
      const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role, email: user.email },
        SECRET,
        { expiresIn: '24h' }
      );
      res.json({
        message: 'تم تسجيل الدخول بنجاح',
        token,
        user: { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone, department_id: user.department_id, salary: user.salary, birth_date: user.birth_date, hire_date: user.hire_date, profile_photo: user.profile_photo }
      });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تسجيل الدخول: ' + err.message });
  }
});

router.get('/me', async (req, res) => {
  const db = getDb();
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'غير مصرح' });

    const decoded = jwt.verify(token, SECRET);
    const user = await db.users.get(decoded.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, department_id: user.department_id, salary: user.salary, birth_date: user.birth_date, hire_date: user.hire_date, profile_photo: user.profile_photo, created_at: user.created_at });
  } catch (err) {
    res.status(403).json({ error: 'جلسة منتهية' });
  }
});

module.exports = router;
