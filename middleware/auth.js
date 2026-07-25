const jwt = require('jsonwebtoken');
const SECRET = 'attendance_system_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'الجلسة منتهية - يرجى تسجيل الدخول مرة أخرى' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح - الأدمن فقط' });
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, SECRET };
