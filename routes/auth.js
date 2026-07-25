const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const db = getDb();
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    const existingUser = db.prepare('SELECT id FROM users WHERE phone = ? OR email = ?').get(phone, email);
    if (existingUser) {
      return res.status(400).json({ error: 'رقم الموبايل أو الإيميل مسجل بالفعل' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (name, phone, email, password, role) VALUES (?, ?, ?, ?, ?)').run(
      name, phone, email, hashedPassword, 'employee'
    );
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
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

router.post('/login', (req, res) => {
  const db = getDb();
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبين' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ? OR name = ? OR phone = ?').get(email, email, email);
    if (!user) {
      return res.status(401).json({ error: 'البريد الإلكتروني غير مسجل' });
    }
    if (!bcrypt.compareSync(password, user.password)) {
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
      user: { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone }
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تسجيل الدخول: ' + err.message });
  }
});

router.get('/me', (req, res) => {
  const db = getDb();
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'غير مصرح' });

    const decoded = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT id, name, phone, email, role, created_at FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(user);
  } catch (err) {
    res.status(403).json({ error: 'جلسة منتهية' });
  }
});

module.exports = router;
