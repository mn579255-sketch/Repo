const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

initDatabase();
console.log('Supabase connected');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const employeeRoutes = require('./routes/employee');
const departmentRoutes = require('./routes/departments');
const { authenticateToken, requireAdmin } = require('./middleware/auth');

app.use('/api/auth', authRoutes);
app.use('/api/admin/departments', authenticateToken, requireAdmin, departmentRoutes);
app.use('/api/admin', authenticateToken, requireAdmin, adminRoutes);
app.use('/api/employee', authenticateToken, employeeRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  نظام شركة ابداع للتطوير العقاري`);
  console.log(`  الحضور والانصراف يعمل على:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`  حساب الأدمن: kareem.marwan / kareem.marwan`);
  console.log(`========================================\n`);
});
