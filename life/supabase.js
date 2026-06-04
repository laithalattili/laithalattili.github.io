// Supabase client - REST API implementation
const DB = {
  url: CONFIG.supabase.url,
  key: CONFIG.supabase.key,

  headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Prefer': 'return=representation'
    };
  },

  async query(table, options = {}) {
    let url = `${this.url}/rest/v1/${table}`;
    const params = [];
    params.push(`select=${options.select || '*'}`);
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, val]) => {
        if (typeof val === 'boolean') params.push(`${key}=is.${val}`);
        else params.push(`${key}=eq.${encodeURIComponent(val)}`);
      });
    }
    if (options.order) params.push(`order=${options.order}`);
    if (options.limit) params.push(`limit=${options.limit}`);
    url += '?' + params.join('&');
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`${table}: ${await res.text()}`);
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${this.url}/rest/v1/${table}`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  },

  async update(table, id, data) {
    const res = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH', headers: this.headers(), body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  },

  async delete(table, id) {
    const res = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE', headers: this.headers()
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  },

  async deleteWhere(table, field, value) {
    const res = await fetch(`${this.url}/rest/v1/${table}?${field}=eq.${value}`, {
      method: 'DELETE', headers: this.headers()
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  },

  async upsert(table, data, onConflict = 'id') {
    const res = await fetch(`${this.url}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: 'POST',
      headers: { ...this.headers(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getSetting(key) {
    try {
      const rows = await this.query('app_settings', { filter: { key } });
      return rows[0]?.value ?? null;
    } catch (e) { return null; }
  },

  async setSetting(key, value) {
    return this.upsert('app_settings', { key, value, updated_at: new Date().toISOString() }, 'key');
  },

  async getBooks(status = null) {
    const options = { order: 'title.asc' };
    if (status) options.filter = { status };
    return this.query('books', options);
  },

  async getReadingLog(bookId = null) {
    const options = { order: 'date.desc' };
    if (bookId) options.filter = { book_id: bookId };
    return this.query('reading_log', options);
  },

  async getYearlyQueue(year) {
    try {
      const url = `${this.url}/rest/v1/yearly_queue?year=eq.${year}&order=position.asc&select=*,book:books(*)`;
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    } catch (e) { return []; }
  },

  async getDefaultRoutine() {
    try {
      const rows = await this.query('reading_routine', { filter: { is_default: true } });
      return rows[0] || { monday:15, tuesday:15, wednesday:15, thursday:15, friday:20, saturday:20, sunday:0 };
    } catch (e) {
      return { monday:15, tuesday:15, wednesday:15, thursday:15, friday:20, saturday:20, sunday:0 };
    }
  },

  async getReviewRoutine() {
    try {
      const rows = await this.query('review_routine', { limit: 1 });
      return rows[0] || { pages_per_day:40, monday:true, tuesday:true, wednesday:true, thursday:true, friday:true, saturday:true, sunday:false };
    } catch (e) {
      return { pages_per_day:40, monday:true, tuesday:true, wednesday:true, thursday:true, friday:true, saturday:true, sunday:false };
    }
  },

  async getCalendarRules() {
    try { return await this.query('calendar_rules', { order: 'start_date.asc' }); }
    catch (e) { return []; }
  },

  async getBookPhases(queueIds) {
    if (!queueIds || queueIds.length === 0) return [];
    try {
      // Use select with filter for each id
      const url = `${this.url}/rest/v1/book_phases?select=*&order=position.asc`;
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) throw new Error(await res.text());
      const all = await res.json();
      // Filter client-side to avoid malformed IN clause
      return all.filter(p => queueIds.includes(p.queue_id));
    } catch (e) {
      console.warn('getBookPhases failed:', e.message);
      return [];
    }
  },

  async ping() {
    try {
      const res = await fetch(`${this.url}/rest/v1/app_settings?limit=1`, {
        headers: this.headers()
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      return true;
    } catch (e) {
      console.error('Ping failed:', e.message);
      throw e;
    }
  }
};

