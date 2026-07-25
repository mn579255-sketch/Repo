const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

router.get('/requests', async (req, res) => {
  const db = getDb();
  try {
    const user = await db.users.get(req.user.id);
    if (!user || !user.department_id) return res.json([]);
    const requests = await db.requests.getByDepartmentHead(user.department_id);
    const users = await db.users.getAll();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const departments = await db.departments.getAll();
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = d.name; });
    const enriched = requests.map(r => ({
      ...r,
      employee_name: userMap[r.user_id] ? userMap[r.user_id].name : 'غير معروف',
      employee_phone: userMap[r.user_id] ? userMap[r.user_id].phone : '',
      employee_email: userMap[r.user_id] ? userMap[r.user_id].email : '',
      employee_department: deptMap[userMap[r.user_id]?.department_id] || 'غير محدد',
      reviewer_name: r.reviewed_by && userMap[r.reviewed_by] ? userMap[r.reviewed_by].name : null,
      admin_reviewer_name: r.admin_reviewed_by && userMap[r.admin_reviewed_by] ? userMap[r.admin_reviewed_by].name : null
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الطلبات: ' + err.message });
  }
});

router.put('/requests/:id', async (req, res) => {
  const db = getDb();
  try {
    const { status, review_notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });
    const request = await db.requests.get(parseInt(req.params.id));
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    const user = await db.users.get(req.user.id);
    const requestUser = await db.users.get(request.user_id);
    if (!user || !requestUser || user.department_id !== requestUser.department_id) {
      return res.status(403).json({ error: 'غير مصرح: هذا الطلب ليس في قسمك' });
    }

    if (request.type === 'early_leave') {
      const updates = { reviewed_by: req.user.id, review_notes: review_notes || null };
      if (status === 'approved') {
        updates.admin_status = 'pending';
      } else {
        updates.status = 'rejected';
      }
      const updated = await db.requests.update(parseInt(req.params.id), updates);
      return res.json({ message: status === 'approved' ? 'تمت موافقة المدير - في انتظار موافقة الإدارة' : 'تم رفض الطلب', request: updated });
    }

    const updated = await db.requests.update(parseInt(req.params.id), { status, reviewed_by: req.user.id, review_notes: review_notes || null });
    res.json({ message: status === 'approved' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب', request: updated });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث الطلب: ' + err.message });
  }
});

router.get('/stats', async (req, res) => {
  const db = getDb();
  try {
    const user = await db.users.get(req.user.id);
    if (!user || !user.department_id) return res.json({ pending: 0, approved: 0, rejected: 0, total_employees: 0 });
    const requests = await db.requests.getByDepartmentHead(user.department_id);
    const employees = await db.users.getEmployees();
    const deptEmployees = employees.filter(e => e.department_id === user.department_id);
    res.json({
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      total_employees: deptEmployees.length
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
});

module.exports = router;
