const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'attendance.db');

let sqlDb = null;

function saveDb() {
  if (!sqlDb) return;
  const data = sqlDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

class PreparedLike {
  constructor(sqlDb, sql) {
    this.db = sqlDb;
    this.sql = sql;
  }
  run(...params) {
    this.db.run(this.sql, params.flat());
    saveDb();
    return { changes: this.db.getRowsModified() };
  }
  get(...params) {
    const stmt = this.db.prepare(this.sql);
    if (params.length && params[0] !== undefined) {
      stmt.bind(params.flat().map(p => p === null ? null : p));
    }
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  }
  all(...params) {
    const stmt = this.db.prepare(this.sql);
    if (params.length && params[0] !== undefined) {
      stmt.bind(params.flat().map(p => p === null ? null : p));
    }
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }
}

const wrapper = {
  prepare(sql) {
    return new PreparedLike(sqlDb, sql);
  },
  exec(sql) {
    sqlDb.run(sql);
    saveDb();
  },
  pragma(str) {
    try { sqlDb.run(`PRAGMA ${str}`); } catch(e) {}
  }
};

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  wrapper.pragma('journal_mode = WAL');
  wrapper.pragma('foreign_keys = ON');

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS company_location (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius INTEGER NOT NULL DEFAULT 100,
      set_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS work_settings (
      id INTEGER PRIMARY KEY,
      work_start_hour TEXT NOT NULL DEFAULT '09:00',
      work_end_hour TEXT NOT NULL DEFAULT '17:00',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      check_in_time DATETIME,
      check_in_lat REAL,
      check_in_lng REAL,
      check_out_time DATETIME,
      check_out_lat REAL,
      check_out_lng REAL,
      status TEXT DEFAULT 'present',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS daily_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      evaluation_score REAL DEFAULT 100,
      total_late_minutes INTEGER DEFAULT 0,
      early_leave_minutes INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const hasAdmin = wrapper.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
  if (!hasAdmin || hasAdmin.count === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    wrapper.prepare('INSERT INTO users (name, phone, email, password, role) VALUES (?, ?, ?, ?, ?)').run(
      'المدير', '01000000000', 'admin@company.com', hashedPassword, 'admin'
    );
    console.log('تم إنشاء حساب الأدمن الافتراضي: admin@company.com / admin123');
  }

  const hasSettings = wrapper.prepare('SELECT COUNT(*) as count FROM work_settings').get();
  if (!hasSettings || hasSettings.count === 0) {
    wrapper.prepare('INSERT INTO work_settings (id, work_start_hour, work_end_hour) VALUES (?, ?, ?)').run(1, '09:00', '17:00');
  }

  console.log('تم تهيئة قاعدة البيانات بنجاح');
  return wrapper;
}

module.exports = { initDatabase, getDb: () => wrapper };
