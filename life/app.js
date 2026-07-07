// Pages namespace - must be declared before page scripts load
const PAGES = {};

// Laith Life Manager - App Core
const APP = {
  currentPage: 'reading',
  defaultPage: 'today',
  schedule: [],
  routine: null,
  reviewRoutine: null,
  calendarRules: [],
  readingLog: [],
  yearQueue: [],
  phases: [],

  async init() {
    this.defaultPage = localStorage.getItem('llm_default_page') || 'reading';
    // Test Supabase connection before proceeding
    const pinScreen = document.getElementById('pin-screen');
    pinScreen.innerHTML = `
      <div style="font-family: 'Georgia', serif; font-size: 1.4rem; color: #8b4513; margin-bottom: 0.5rem;">Laith Life Manager</div>
      <div style="font-family: monospace; font-size: 0.75rem; color: #9a9088; letter-spacing: 0.1em;">Connecting...</div>
    `;
    let connected = false;
    let connectError = '';
    try {
      connected = await DB.ping();
    } catch (e) {
      connectError = e.message || 'Unknown error';
    }

    if (!connected) {
      pinScreen.innerHTML = `
        <div style="font-family: 'Georgia', serif; font-size: 1.4rem; color: #8b4513; margin-bottom: 1rem;">Laith Life Manager</div>
        <div style="font-family: monospace; font-size: 0.8rem; color: #b03020; text-align: center; max-width: 320px; line-height: 1.8;">
          Cannot connect to database.<br>${connectError ? 'Error: ' + connectError + '<br>' : ''}
          Check your internet connection and try reloading.
        </div>
        <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.6rem 1.5rem; background: #8b4513; color: white; border: none; border-radius: 4px; font-family: monospace; cursor: pointer; letter-spacing: 0.06em;">
          Retry
        </button>
      `;
      return;
    }
    await this.checkPin();
  },

  // ── PIN System ─────────────────────────────────────────
  async checkPin() {
    const storedPin = await DB.getSetting('pin_hash');
    const lastUnlock = localStorage.getItem('llm_last_unlock');
    const now = Date.now();
    const weekMs = CONFIG.app.pinLockAfterDays * 24 * 60 * 60 * 1000;

    if (!storedPin) {
      this.showSetPin();
      return;
    }

    if (!lastUnlock || (now - parseInt(lastUnlock)) > weekMs) {
      this.showPinScreen(storedPin);
      return;
    }

    this.unlock();
  },

  showSetPin() {
    const screen = document.getElementById('pin-screen');
    screen.innerHTML = `
      <div class="pin-title">Laith Life Manager</div>
      <div class="pin-subtitle">Set your PIN to begin</div>
      <div class="pin-dots" id="pin-dots">
        ${[0,1,2,3].map(() => '<div class="pin-dot"></div>').join('')}
      </div>
      <div class="pin-keypad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
          `<button class="pin-key${k === '⌫' ? ' del' : ''}" data-key="${k}">${k}</button>`
        ).join('')}
      </div>
      <div class="pin-error" id="pin-error"></div>
    `;
    let entry = '';
    let firstPin = '';
    let phase = 'enter'; // 'enter' or 'confirm'

    const updateDots = () => {
      document.querySelectorAll('.pin-dot').forEach((d, i) => {
        d.classList.toggle('filled', i < entry.length);
      });
    };

    const setSubtitle = (text) => {
      document.querySelector('.pin-subtitle').textContent = text;
    };

    screen.addEventListener('click', async (e) => {
      const key = e.target.dataset.key;
      if (key === undefined) return;
      if (key === '⌫') { entry = entry.slice(0, -1); updateDots(); return; }
      if (key === '') return;
      if (entry.length >= 4) return;
      entry += key;
      updateDots();

      if (entry.length === 4) {
        if (phase === 'enter') {
          firstPin = entry;
          entry = '';
          phase = 'confirm';
          setSubtitle('Confirm your PIN');
          updateDots();
        } else {
          if (entry === firstPin) {
            const hash = btoa(entry);
            await DB.setSetting('pin_hash', hash);
            localStorage.setItem('llm_last_unlock', Date.now().toString());
            this.unlock();
          } else {
            document.getElementById('pin-error').textContent = 'PINs do not match. Try again.';
            entry = ''; firstPin = ''; phase = 'enter';
            setSubtitle('Set your PIN to begin');
            updateDots();
          }
        }
      }
    });
  },

  showPinScreen(storedHash) {
    const screen = document.getElementById('pin-screen');
    screen.innerHTML = `
      <div class="pin-title">Laith Life Manager</div>
      <div class="pin-subtitle">Enter your PIN</div>
      <div class="pin-dots" id="pin-dots">
        ${[0,1,2,3].map(() => '<div class="pin-dot"></div>').join('')}
      </div>
      <div class="pin-keypad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
          `<button class="pin-key${k === '⌫' ? ' del' : ''}" data-key="${k}">${k}</button>`
        ).join('')}
      </div>
      <div class="pin-error" id="pin-error"></div>
    `;

    let entry = '';
    const updateDots = () => {
      document.querySelectorAll('.pin-dot').forEach((d, i) => {
        d.classList.toggle('filled', i < entry.length);
      });
    };

    screen.addEventListener('click', (e) => {
      const key = e.target.dataset.key;
      if (key === undefined) return;
      if (key === '⌫') { entry = entry.slice(0, -1); updateDots(); return; }
      if (key === '') return;
      if (entry.length >= 4) return;
      entry += key;
      updateDots();

      if (entry.length === 4) {
        if (btoa(entry) === storedHash) {
          localStorage.setItem('llm_last_unlock', Date.now().toString());
          this.unlock();
        } else {
          document.getElementById('pin-error').textContent = 'Incorrect PIN';
          entry = '';
          updateDots();
          setTimeout(() => {
            const err = document.getElementById('pin-error');
            if (err) err.textContent = '';
          }, 2000);
        }
      }
    });
  },

  unlock() {
    document.getElementById('pin-screen').style.display = 'none';
    const app = document.getElementById('app');
    app.classList.add('visible');
    this.loadApp();
  },

  lock() {
    localStorage.removeItem('llm_last_unlock');
    document.getElementById('pin-screen').style.display = 'flex';
    document.getElementById('app').classList.remove('visible');
    document.getElementById('pin-screen').innerHTML = '';
    this.checkPin();
  },

  // ── App Load ───────────────────────────────────────────
  async loadApp() {
    this.renderShell();
    await this.loadData();
    this.navigate(this.defaultPage);
  },

  renderShell() {
    document.getElementById('app').innerHTML = `
      <header>
        <div class="header-left">
          <span class="app-logo">Laith <span>Life Manager</span></span>
        </div>
        <div class="header-right">
          <button class="icon-btn" id="btn-star" title="Set as default page">☆</button>
          <button class="icon-btn" id="btn-settings" title="Settings">⚙</button>
          <button class="icon-btn" id="btn-lock" title="Lock app">⏻</button>
        </div>
      </header>
      <div id="info-bar" style="display:none;"></div>
      <nav id="main-nav">
        <div class="nav-item" data-page="reading">Reading</div>
        <div class="nav-item" data-page="books">Books</div>
        <div class="nav-item" data-page="films">Films</div>
        <div class="nav-item" data-page="courses">Courses</div>
        <div class="nav-item" data-page="lists">Lists</div>
        <div class="nav-item" data-page="settings">Settings</div>
      </nav>
      <main id="main-content">
        <div class="loading"><div class="spinner"></div>Loading...</div>
      </main>

      <!-- bottom nav is in index.html -->
    `;

    document.getElementById('btn-lock').addEventListener('click', () => this.lock());
    document.getElementById('btn-settings').addEventListener('click', () => this.navigate('settings'));
    document.getElementById('btn-star').addEventListener('click', () => this.setDefaultPage());

    document.getElementById('main-nav').addEventListener('click', (e) => {
      const page = e.target.closest('[data-page]')?.dataset.page;
      if (page) this.navigate(page);
    });

    this.initInfoBar();
    this.initTheme();
    // bottom nav wired in index.html
  },

  async initTheme() {
    // Instant apply from localStorage, then confirm from Supabase
    const local = localStorage.getItem('llm_theme');
    if (local && local !== 'default') {
      document.documentElement.setAttribute('data-theme', local);
    }
    try {
      const saved = await DB.getSetting('theme');
      if (saved && saved !== 'default') {
        document.documentElement.setAttribute('data-theme', saved);
        localStorage.setItem('llm_theme', saved);
      } else if (saved === 'default') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('llm_theme', 'default');
      }
    } catch(e) { /* theme is cosmetic, fail silently */ }
  },

  applyTheme(theme) {
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('llm_theme', theme);
    DB.setSetting('theme', theme);
  },

  async initInfoBar() {
    const bar = document.getElementById('info-bar');
    if (!bar) return;
    // Check localStorage first for instant display, then verify with Supabase
    const localShow = localStorage.getItem('llm_show_info_bar');
    if (localShow === 'true') {
      bar.style.display = 'flex';
      await this.updateInfoBarFull();
    }
    const showBar = await DB.getSetting('show_info_bar');
    if (showBar === 'true') {
      localStorage.setItem('llm_show_info_bar', 'true');
      bar.style.display = 'flex';
      document.body.classList.add('info-bar-visible');
      // Calculate nav top = header(52) + info bar height
      const barH = bar.offsetHeight || 52;
      document.documentElement.style.setProperty('--nav-top', (52 + barH) + 'px');
      await this.updateInfoBarFull();
      if (!this._infoBarInterval) {
        this._infoBarInterval = setInterval(() => this.updateInfoBar(bar, this._infoBarBirthday), 1000);
      }
    } else {
      localStorage.setItem('llm_show_info_bar', 'false');
      bar.style.display = 'none';
      document.body.classList.remove('info-bar-visible');
      document.documentElement.style.setProperty('--nav-top', '52px');
    }
  },

  async updateInfoBarFull() {
    const bar = document.getElementById('info-bar');
    if (!bar || bar.style.display === 'none') return;
    const birthday = await DB.getSetting('birthday') || '1993-12-30';
    const zonesRaw = await DB.getSetting('timezones') || JSON.stringify([
      { label: 'JO', tz: 'Asia/Amman', primary: true },
      { label: 'CN', tz: 'Asia/Shanghai', primary: false }
    ]);
    let zones = [];
    try { zones = JSON.parse(zonesRaw); } catch(e) { zones = []; }
    this._infoBarZones = zones;
    this._infoBarBirthday = birthday;
    this.updateInfoBar(bar, birthday);
  },

  updateInfoBar(bar, birthday) {
    const now = new Date();
    const zones = this._infoBarZones || [
      { label: 'JO', tz: 'Asia/Amman', primary: true },
      { label: 'CN', tz: 'Asia/Shanghai', primary: false }
    ];
    const bday = new Date(birthday || '1993-12-30');
    const age = Math.floor((now - bday) / (365.25 * 24 * 60 * 60 * 1000));
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    const clockHTML = zones.map(z => {
      const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: z.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(now);
      return z.primary
        ? `<div class="info-bar-clock primary"><span class="info-bar-label">${z.label}</span><span class="info-bar-time-primary">${time}</span></div>`
        : `<div class="info-bar-clock secondary"><span class="info-bar-label">${z.label}</span><span class="info-bar-time-secondary">${time}</span></div>`;
    }).join('<div class="info-bar-sep">·</div>');

    bar.innerHTML = `
      ${clockHTML}
      <div class="info-bar-sep">·</div>
      <div class="info-bar-clock secondary"><span class="info-bar-label">Date</span><span class="info-bar-time-secondary">${dateStr}</span></div>
      <div class="info-bar-sep">·</div>
      <div class="info-bar-clock secondary"><span class="info-bar-label">Age</span><span class="info-bar-time-secondary">${age}</span></div>
    `;
  },

  async loadData() {
    try {
      const year = new Date().getFullYear();
      [this.routine, this.reviewRoutine, this.calendarRules, this.yearQueue, this.readingLog] = await Promise.all([
        DB.getDefaultRoutine(),
        DB.getReviewRoutine(),
        DB.getCalendarRules(),
        DB.getYearlyQueue(year),
        DB.getReadingLog()
      ]);

      const queueIds = this.yearQueue.map(q => q.id);
      this.phases = await DB.getBookPhases(queueIds);

      // Debug: log what we're working with
      console.log('[LLM] Queue:', this.yearQueue.length, 'items');
      console.log('[LLM] Routine:', JSON.stringify(this.routine));
      if (this.yearQueue[0]) {
        const q = this.yearQueue[0];
        console.log('[LLM] First queue item:', JSON.stringify({
          id: q.id, position: q.position,
          current_page: q.current_page, start_page: q.start_page,
          pinned_start_date: q.pinned_start_date,
          book_title: q.book?.title, book_pages: q.book?.pages
        }));
      }

      this.schedule = SCHEDULER.buildYearSchedule(
        this.yearQueue,
        this.phases,
        this.routine,
        this.reviewRoutine,
        this.calendarRules,
        new Date().getFullYear()
      );

      // Sync books.status to match actual schedule — fixes stale "reading" labels
      this._syncBookStatuses().catch(() => {});
      // Auto-assign main book if none set
      this._ensureMainBook().catch(() => {});

      console.log('[LLM] Schedule:', this.schedule.length, 'items');
      if (this.schedule[0]) {
        const s = this.schedule[0];
        console.log('[LLM] First schedule item:', JSON.stringify({
          title: s.title, pages: s.pages,
          readStart: s.readStart, readEnd: s.readEnd,
          currentPage: s.currentPage, planLength: s.plan?.length
        }));
      }
    } catch (e) {
      this.notify('Failed to load data: ' + e.message, 'error');
    }
  },

  async refreshData() {
    await this.loadData();
  },

  async _ensureMainBook() {
    // If no main book is set but books are currently reading, auto-assign first one
    const today = new Date().toISOString().split('T')[0];
    const readingItems = this.schedule.filter(s =>
      s.readStart <= today && s.readEnd >= today
    );
    if (readingItems.length === 0) return;
    const hasMain = readingItems.some(s => s.isMain);
    if (!hasMain) {
      // Set the first reading book as main
      await DB.update('yearly_queue', readingItems[0].queueId, { is_main: true });
    }
  },

  async _syncBookStatuses() {
    const today = SCHEDULER.formatDate(new Date());
    const updates = new Map(); // book.id -> correct status

    // Books with a schedule entry: derive status from dates
    for (const s of this.schedule) {
      const qItem = this.yearQueue.find(q => q.id === s.queueId);
      if (!qItem || !qItem.book) continue;
      const book = qItem.book;
      let correctStatus;
      if (s.reviewEnd < today)                                                    correctStatus = 'completed';
      else if (s.reviewStart <= today && s.reviewEnd >= today)                    correctStatus = 'review';
      else if (s.readStart <= today && s.readEnd >= today)                        correctStatus = 'reading';
      else                                                                        correctStatus = 'to-read';
      if (book.status !== correctStatus) updates.set(book.id, correctStatus);
    }

    // Books in the queue but skipped by scheduler (no pages set) — reset to to-read
    const scheduledQueueIds = new Set(this.schedule.map(s => s.queueId));
    for (const qItem of this.yearQueue) {
      if (!scheduledQueueIds.has(qItem.id) && qItem.book) {
        const book = qItem.book;
        if (book.status === 'reading' || book.status === 'review') {
          updates.set(book.id, 'to-read');
        }
      }
    }

    // Books with status=reading but not in this year's queue at all
    try {
      const allBooks = await DB.getBooks();
      const queueBookIds = new Set(this.yearQueue.map(q => q.book_id));
      for (const book of allBooks) {
        if ((book.status === 'reading' || book.status === 'review') && !queueBookIds.has(book.id)) {
          updates.set(book.id, 'to-read');
        }
      }
    } catch(e) {}

    const validStatuses = new Set(['to-read', 'reading', 'review', 'completed']);
    for (const [id, status] of updates) {
      if (validStatuses.has(status)) {
        DB.update('books', id, { status }).catch(() => {});
      }
    }
  },

  // ── Navigation ─────────────────────────────────────────
  navigate(page) {
    this.currentPage = page;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    // Highlight bottom nav
    document.querySelectorAll('#bottom-nav .bnav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    const starBtn = document.getElementById('btn-star');
    if (starBtn) {
      starBtn.textContent = page === this.defaultPage ? '★' : '☆';
      starBtn.classList.toggle('active', page === this.defaultPage);
    }

    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

    switch (page) {
      case 'reading':  PAGES.reading(main, this); break;
      case 'books':    PAGES.books(main, this); break;
      case 'films':    PAGES.films(main, this); break;
      case 'courses':  PAGES.courses(main, this); break;
      case 'lists':    PAGES.listsPage(main, this); break;
      case 'settings': PAGES.settings(main, this); break;
      case 'year':     PAGES.year(main, this); break;
      case 'library':  PAGES.library(main, this); break;
      case 'add-book': PAGES.addBook(main, this); break;
      case 'stats':    PAGES.stats(main, this); break;
      case 'notes':    PAGES.notes(main, this); break;
    }
  },

  setDefaultPage() {
    this.defaultPage = this.currentPage;
    localStorage.setItem('llm_default_page', this.currentPage);
    const starBtn = document.getElementById('btn-star');
    if (starBtn) { starBtn.textContent = '★'; starBtn.classList.add('active'); }
    this.notify('Default page set', 'success');
  },

  // ── Notifications ──────────────────────────────────────
  notify(msg, type = 'info', title = null) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const titles = { error: 'Error', success: 'Done', warning: 'Note', info: 'Info' };
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = `
      <div class="notif-title">${title || titles[type]}</div>
      <div class="notif-msg">${msg}</div>
    `;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
  },

  // ── Modal ──────────────────────────────────────────────
  showModal(content, onClose) {
    // Always remove existing modal first
    this.closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal">${content}</div>`;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { this.closeModal(); if (onClose) onClose(); }
    });
    document.body.appendChild(overlay);
    return overlay;
  },

  closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  }
};

