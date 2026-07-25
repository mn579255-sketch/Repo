const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jztgixbnewjribtqvujb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dGdpeGJuZXdqcmlidHF2dWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NDc1MTIsImV4cCI6MjEwMDUyMzUxMn0.q3_iLMpBgAH_TG25Doy435UVL8qKcoStFXSwAXX4m38';

let supabase;

function initDatabase() {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('تم الاتصال بـ Supabase بنجاح');
}

function getDb() {
  if (!supabase) initDatabase();
  return {
    users: {
      async get(id) {
        const { data } = await supabase.from('users').select('*').eq('id', id).single();
        return data;
      },
      async getByLogin(login) {
        const { data } = await supabase.from('users').select('*').or(`email.eq.${login},name.eq.${login},phone.eq.${login}`).maybeSingle();
        return data;
      },
      async getByEmail(email) {
        const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
        return data;
      },
      async getByPhone(phone) {
        const { data } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
        return data;
      },
      async getAll() {
        const { data } = await supabase.from('users').select('*');
        return data || [];
      },
      async getEmployees() {
        const { data } = await supabase.from('users').select('*').eq('role', 'employee');
        return data || [];
      },
      async create(userData) {
        const { data, error } = await supabase.from('users').insert(userData).select().single();
        if (error) throw error;
        return data;
      },
      async remove(id) {
        await supabase.from('users').delete().eq('id', id);
      }
    },
    company_location: {
      async get() {
        const { data } = await supabase.from('company_location').select('*').order('id', { ascending: false }).limit(1).maybeSingle();
        return data;
      },
      async set(locData) {
        const existing = await this.get();
        if (existing) {
          await supabase.from('company_location').update({ ...locData, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('company_location').insert({ ...locData, set_by: locData.set_by, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }
      }
    },
    work_settings: {
      async get() {
        const { data } = await supabase.from('work_settings').select('*').eq('id', 1).maybeSingle();
        return data || { work_start_hour: '09:00', work_end_hour: '17:00' };
      },
      async update(settings) {
        await supabase.from('work_settings').update({ ...settings, updated_at: new Date().toISOString() }).eq('id', 1);
      }
    },
    attendance: {
      async get(userId, date) {
        const { data } = await supabase.from('attendance').select('*').eq('user_id', userId).eq('date', date).maybeSingle();
        return data;
      },
      async getByUser(userId) {
        const { data } = await supabase.from('attendance').select('*').eq('user_id', userId).order('date', { ascending: false });
        return data || [];
      },
      async getByUserMonth(userId, month, year) {
        const padded = String(month).padStart(2, '0');
        const { data } = await supabase.from('attendance').select('*').eq('user_id', userId).like('date', `%-${padded}-${year}%`).order('date', { ascending: false });
        return data || [];
      },
      async getAll() {
        const { data } = await supabase.from('attendance').select('*').order('date', { ascending: false });
        return data || [];
      },
      async getAllByMonth(month, year) {
        const padded = String(month).padStart(2, '0');
        const { data } = await supabase.from('attendance').select('*').like('date', `%-${padded}-${year}%`).order('date', { ascending: false });
        return data || [];
      },
      async getAllByDate(date) {
        const { data } = await supabase.from('attendance').select('*').eq('date', date);
        return data || [];
      },
      async create(attData) {
        const { data, error } = await supabase.from('attendance').insert(attData).select().single();
        if (error) throw error;
        return data;
      },
      async upsert(userId, date, data) {
        const existing = await this.get(userId, date);
        if (existing) {
          const { data: updated } = await supabase.from('attendance').update(data).eq('user_id', userId).eq('date', date).select().single();
          return updated;
        } else {
          return await this.create({ user_id: userId, date, ...data });
        }
      },
      async update(userId, date, data) {
        await supabase.from('attendance').update(data).eq('user_id', userId).eq('date', date);
      },
      async getUserStats(userId) {
        const records = await this.getByUser(userId);
        return {
          total_days: records.length,
          present_days: records.filter(r => r.status === 'present').length,
          late_days: records.filter(r => r.status === 'late').length,
          absent_days: records.filter(r => r.status === 'absent').length
        };
      },
      async removeByUser(userId) {
        await supabase.from('attendance').delete().eq('user_id', userId);
      }
    },
    daily_evaluations: {
      async get(userId, date) {
        const { data } = await supabase.from('daily_evaluations').select('*').eq('user_id', userId).eq('date', date).maybeSingle();
        return data;
      },
      async getByUser(userId) {
        const { data } = await supabase.from('daily_evaluations').select('*').eq('user_id', userId).order('date', { ascending: false });
        return data || [];
      },
      async getByUserMonth(userId, month, year) {
        const padded = String(month).padStart(2, '0');
        const { data } = await supabase.from('daily_evaluations').select('*').eq('user_id', userId).like('date', `%-${padded}-${year}%`).order('date', { ascending: false });
        return data || [];
      },
      async getSummary(userId) {
        const evals = await this.getByUser(userId);
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
      async upsert(userId, date, data) {
        const existing = await this.get(userId, date);
        if (existing) {
          const { data: updated } = await supabase.from('daily_evaluations').update(data).eq('user_id', userId).eq('date', date).select().single();
          return updated;
        } else {
          const { data: created } = await supabase.from('daily_evaluations').insert({ user_id: userId, date, ...data }).select().single();
          return created;
        }
      },
      async removeByUser(userId) {
        await supabase.from('daily_evaluations').delete().eq('user_id', userId);
      }
    }
  };
}

module.exports = { initDatabase, getDb };
