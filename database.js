const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

let db;

function getDbPath() {
  try {
    const testPath = path.join(__dirname, '_test_write');
    fs.writeFileSync(testPath, 'test');
    fs.unlinkSync(testPath);
    return path.join(__dirname, 'attendance.db.json');
  } catch {
    try {
      const tmpPath = '/tmp/attendance.db.json';
      return tmpPath;
    } catch {
      return path.join(__dirname, 'attendance.db.json');
    }
  }
}

function nextId(collection) {
  const items = db.get(collection).value();
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map(i => i.id)) + 1;
}

function initDatabase() {
  const dbPath = getDbPath();
  const adapter = new FileSync(dbPath);
  db = low(adapter);

  db.defaults({
    users: [],
    company_location: [],
    work_settings: [{ id: 1, work_start_hour: '09:00', work_end_hour: '17:00', updated_at: new Date().toISOString() }],
    attendance: [],
    daily_evaluations: []
  }).write();

  const hasAdmin = db.get('users').find({ role: 'admin' }).value();
  if (!hasAdmin) {
    const hashedPassword = bcrypt.hashSync('kareem.marwan', 10);
    db.get('users').push({
      id: 1,
      name: 'kareem marwan',
      phone: '01000000000',
      email: 'kareem.marwan',
      password: hashedPassword,
      role: 'admin',
      created_at: new Date().toISOString()
    }).write();
    console.log('تم إنشاء حساب الأدمن: kareem.marwan / kareem.marwan');
  }

  console.log('تم تهيئة قاعدة البيانات بنجاح');
}

function getDb() {
  if (!db) initDatabase();
  return {
    users: {
      get(id) { return db.get('users').find({ id }).value() || null; },
      getByEmail(email) { return db.get('users').find({ email }).value() || null; },
      getByName(name) { return db.get('users').find({ name }).value() || null; },
      getByPhone(phone) { return db.get('users').find({ phone }).value() || null; },
      getByLogin(login) {
        return db.get('users').find(u => u.email === login || u.name === login || u.phone === login).value() || null;
      },
      getAll() { return db.get('users').value() || []; },
      getEmployees() { return db.get('users').filter({ role: 'employee' }).value() || []; },
      create(data) {
        const id = nextId('users');
        const item = { ...data, id, created_at: new Date().toISOString() };
        db.get('users').push(item).write();
        return item;
      },
      remove(id) { db.get('users').remove({ id }).write(); },
      count(role) { return db.get('users').filter({ role }).size().value(); }
    },
    company_location: {
      get() { return db.get('company_location').last().value() || null; },
      set(data) {
        const existing = db.get('company_location').first().value();
        if (existing) {
          db.get('company_location').find({ id: existing.id }).assign({ ...data, updated_at: new Date().toISOString() }).write();
        } else {
          db.get('company_location').push({ id: 1, ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).write();
        }
      }
    },
    work_settings: {
      get() { return db.get('work_settings').find({ id: 1 }).value() || { work_start_hour: '09:00', work_end_hour: '17:00' }; },
      update(data) {
        db.get('work_settings').find({ id: 1 }).assign({ ...data, updated_at: new Date().toISOString() }).write();
      }
    },
    attendance: {
      get(user_id, date) { return db.get('attendance').find({ user_id, date }).value() || null; },
      getByUser(user_id) { return db.get('attendance').filter({ user_id }).sortBy('date').reverse().value() || []; },
      getByUserMonth(user_id, month, year) {
        const padded = String(month).padStart(2, '0');
        return db.get('attendance').filter(a => a.user_id === user_id && a.date && a.date.includes(`-${padded}-${year}`)).sortBy('date').reverse().value() || [];
      },
      getAll() { return db.get('attendance').sortBy('date').reverse().value() || []; },
      getAllByMonth(month, year) {
        const padded = String(month).padStart(2, '0');
        return db.get('attendance').filter(a => a.date && a.date.includes(`-${padded}-${year}`)).sortBy('date').reverse().value() || [];
      },
      getAllByDate(date) { return db.get('attendance').filter({ date }).value() || []; },
      create(data) {
        const id = nextId('attendance');
        const item = { ...data, id, created_at: new Date().toISOString() };
        db.get('attendance').push(item).write();
        return item;
      },
      update(userId, date, data) {
        const existing = db.get('attendance').find({ user_id: userId, date }).value();
        if (existing) {
          db.get('attendance').find({ user_id: userId, date }).assign(data).write();
          return existing;
        }
        return null;
      },
      updateById(id, data) {
        db.get('attendance').find({ id }).assign(data).write();
      },
      upsert(userId, date, data) {
        const existing = db.get('attendance').find({ user_id: userId, date }).value();
        if (existing) {
          db.get('attendance').find({ user_id: userId, date }).assign(data).write();
          return existing;
        }
        return this.create({ ...data, user_id: userId, date });
      },
      getUserStats(user_id) {
        const records = db.get('attendance').filter({ user_id }).value() || [];
        return {
          total_days: records.length,
          present_days: records.filter(r => r.status === 'present').length,
          late_days: records.filter(r => r.status === 'late').length,
          absent_days: records.filter(r => r.status === 'absent').length
        };
      },
      removeByUser(userId) { db.get('attendance').remove({ user_id: userId }).write(); }
    },
    daily_evaluations: {
      get(user_id, date) { return db.get('daily_evaluations').find({ user_id, date }).value() || null; },
      getByUser(user_id) { return db.get('daily_evaluations').filter({ user_id }).sortBy('date').reverse().value() || []; },
      getByUserMonth(user_id, month, year) {
        const padded = String(month).padStart(2, '0');
        return db.get('daily_evaluations').filter(e => e.user_id === user_id && e.date && e.date.includes(`-${padded}-${year}`)).sortBy('date').reverse().value() || [];
      },
      getSummary(user_id) {
        const evals = db.get('daily_evaluations').filter({ user_id }).value() || [];
        if (evals.length === 0) {
          return { avg_score: 100, total_late_minutes: 0, total_early_leave: 0, total_days: 0 };
        }
        return {
          avg_score: evals.reduce((a, e) => a + e.evaluation_score, 0) / evals.length,
          total_late_minutes: evals.reduce((a, e) => a + e.total_late_minutes, 0),
          total_early_leave: evals.reduce((a, e) => a + e.early_leave_minutes, 0),
          total_days: evals.length
        };
      },
      upsert(userId, date, data) {
        const existing = db.get('daily_evaluations').find({ user_id: userId, date }).value();
        if (existing) {
          db.get('daily_evaluations').find({ user_id: userId, date }).assign(data).write();
          return existing;
        }
        const id = nextId('daily_evaluations');
        const item = { id, user_id: userId, date, ...data, created_at: new Date().toISOString() };
        db.get('daily_evaluations').push(item).write();
        return item;
      },
      removeByUser(userId) { db.get('daily_evaluations').remove({ user_id: userId }).write(); }
    },
    raw: db
  };
}

module.exports = { initDatabase, getDb };
