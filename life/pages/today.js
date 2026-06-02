// Today Page v2 - uses new scheduler with page ranges
PAGES.today = async (container, app) => {
  await app.refreshData();
  const today = SCHEDULER.formatDate(new Date());
  const todayDisplay = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const activePlans = SCHEDULER.getTodayPlans(app.schedule, app.readingLog);
  const totalPlanned = activePlans.reduce((s, p) => s + p.pagesPlanned, 0);
  const totalRead = activePlans.reduce((s, p) => s + p.pagesRead, 0);
  const totalPct = totalPlanned > 0 ? Math.min(100, Math.round((totalRead / totalPlanned) * 100)) : 0;
  const allDone = activePlans.length > 0 && activePlans.every(p => p.pagesRead >= p.pagesPlanned && p.pagesPlanned > 0);

  // Gamification stats
  const year = new Date().getFullYear();
  // Only count pages for books currently in this year's queue
  const yearBookIds = new Set(app.yearQueue.map(q => q.book_id || q.book?.id).filter(Boolean));
  const yearLogs = app.readingLog.filter(l =>
    l.date >= `${year}-01-01` && !l.is_review && yearBookIds.has(l.book_id)
  );
  const pagesThisYear = yearLogs.reduce((s, l) => s + (l.pages_read || 0), 0);
  const readingDays = new Set(yearLogs.map(l => l.date)).size;
  const streak = SCHEDULER.calculateStreak(app.readingLog);

  if (activePlans.length === 0) {
    const next = app.schedule.find(s => s.readStart > today);
    container.innerHTML = `
      <div class="page-title">Today</div>
      <div class="page-subtitle">${todayDisplay}</div>
      <div class="card" style="text-align: center; padding: 3rem 1rem; margin-bottom: 1rem;">
        <div style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.3;">◈</div>
        <div style="font-family: var(--serif); font-size: 1.1rem; font-style: italic; color: var(--text2);">No reading scheduled today</div>
        ${next ? `<div style="font-family: var(--mono); font-size: 0.68rem; color: var(--text3); margin-top: 0.75rem;">Next: <span style="color: var(--accent);">${next.title}</span> · ${SCHEDULER.formatDateDisplay(next.readStart)}</div>` : ''}
      </div>
      ${renderYearStats(pagesThisYear, readingDays, streak)}
    `;
    return;
  }

  container.innerHTML = `
    <div class="page-title">Today</div>
    <div class="page-subtitle">${todayDisplay}</div>

    ${activePlans.length > 1 ? `
      <div class="card" style="margin-bottom: 1rem;">
        <div class="today-label">Combined Daily Target</div>
        <div class="pages-target">
          <div class="pages-number" style="color: ${allDone ? 'var(--green-light)' : 'var(--accent)'};">${totalRead}</div>
          <div class="pages-label">of ${totalPlanned}<br>pages today</div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${totalPct}%;"></div>
        </div>
        <div class="progress-labels">
          <span>${activePlans.length} books active</span>
          <span>${totalPct}%</span>
        </div>
      </div>
    ` : ''}

    ${activePlans.map((plan, idx) => {
      const pct = plan.pagesPlanned > 0 ? Math.min(100, Math.round((plan.pagesRead / plan.pagesPlanned) * 100)) : 0;
      const done = plan.pagesRead >= plan.pagesPlanned && plan.pagesPlanned > 0;
      const bookLogs = app.readingLog.filter(l => l.book_id === plan.book.bookId && !l.is_review);
      const totalBookRead = bookLogs.reduce((s, l) => s + (l.pages_read || 0), 0);
      const bookPct = plan.book.pages ? Math.min(100, Math.round((totalBookRead / plan.book.pages) * 100)) : 0;

      return `
        <div class="today-card" style="margin-bottom: 1rem; ${done ? 'border-color: var(--green);' : ''}">
          <div class="today-label">${plan.type === 'review' ? 'Review' : 'Reading'}${activePlans.length > 1 ? ` · ${idx + 1} of ${activePlans.length}` : ''}</div>
          <div class="today-book-title">${plan.book.title}</div>
          <div class="today-book-author">${plan.book.author}</div>

          <!-- Page range display -->
          <div style="display: flex; gap: 1rem; margin: 1rem 0; align-items: center;">
            <div style="text-align: center;">
              <div style="font-family: var(--mono); font-size: 1.8rem; color: var(--accent); line-height: 1;">${plan.fromPage}</div>
              <div style="font-family: var(--mono); font-size: 0.6rem; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em;">from</div>
            </div>
            <div style="color: var(--text3); font-family: var(--mono); font-size: 1.2rem;">→</div>
            <div style="text-align: center;">
              <div style="font-family: var(--mono); font-size: 1.8rem; color: var(--accent); line-height: 1;">${plan.toPage}</div>
              <div style="font-family: var(--mono); font-size: 0.6rem; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em;">to</div>
            </div>
            <div style="color: var(--text3); font-family: var(--mono); padding: 0 0.5rem;">·</div>
            <div style="text-align: center;">
              <div style="font-family: var(--mono); font-size: 1.8rem; line-height: 1;">${plan.pagesPlanned}</div>
              <div style="font-family: var(--mono); font-size: 0.6rem; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em;">pages</div>
            </div>
          </div>

          <div class="progress-bar">
            <div class="progress-fill" style="width: ${pct}%; ${done ? 'background: var(--green);' : ''}"></div>
          </div>
          <div class="progress-labels">
            <span>${plan.pagesRead} read · book ${bookPct}% done</span>
            <span>${pct}%</span>
          </div>

          ${done ? `<div style="color: var(--green-light); font-family: var(--mono); font-size: 0.7rem; margin: 0.5rem 0;">✓ Done for today</div>` : ''}

          <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.75rem;">
            <button class="btn btn-primary btn-sm log-btn" data-idx="${idx}">${done ? 'Update' : 'Log Pages'}</button>

          </div>
        </div>
      `;
    }).join('')}

    ${renderYearStats(pagesThisYear, readingDays, streak)}
    ${renderUpcoming(app, today)}
  `;

  document.querySelectorAll('.log-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = activePlans[parseInt(btn.dataset.idx)];
      PAGES.showDayDetail(today, app, 0);
    });
  });


};

function renderYearStats(pagesThisYear, readingDays, streak) {
  return `
    <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;">
      <div class="stat-card" style="flex: 1; min-width: 90px; padding: 1rem;">
        <div class="stat-number" style="font-size: 1.3rem;">${pagesThisYear.toLocaleString()}</div>
        <div class="stat-label">Pages This Year</div>
      </div>
      <div class="stat-card" style="flex: 1; min-width: 90px; padding: 1rem;">
        <div class="stat-number" style="font-size: 1.3rem;">${readingDays}</div>
        <div class="stat-label">Reading Days</div>
      </div>
      <div class="stat-card" style="flex: 1; min-width: 90px; padding: 1rem;">
        <div class="stat-number" style="font-size: 1.3rem; color: ${streak >= 7 ? 'var(--accent)' : streak >= 3 ? 'var(--text)' : 'var(--text3)'};">${streak}${streak >= 7 ? ' 🔥' : ''}</div>
        <div class="stat-label">Day Streak</div>
      </div>
    </div>
  `;
}

function renderUpcoming(app, today) {
  const upcoming = app.schedule.filter(s => s.readStart > today).slice(0, 3);
  if (!upcoming.length) return '';
  return `
    <div class="card">
      <div class="card-meta" style="margin-bottom: 1rem;">Coming Up</div>
      ${upcoming.map(s => `
        <div class="book-item">
          <div class="book-info">
            <div class="book-title">${s.title}</div>
            <div class="book-author" style="font-size: 0.72rem;">${s.author}</div>
          </div>
          <div class="book-right">
            <div class="book-pages">${s.pages}p</div>
            <div style="font-family: var(--mono); font-size: 0.62rem; color: var(--text3);">${SCHEDULER.formatDateDisplay(s.readStart)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

PAGES.adjustPageRange = (queueId, app) => {
  const schedItem = app.schedule.find(s => s.queueId === queueId);
  const fromPage = schedItem?.currentPage || 1;
  app.showModal(`
    <div class="modal-title">Adjust Page Range</div>
    <div style="font-size: 0.85rem; color: var(--text2); margin-bottom: 1.5rem;">
      Set your actual current page. The schedule will recalculate from here.
    </div>
    <div class="form-group">
      <label>I am currently on page</label>
      <input type="number" id="adj-current-page" value="${fromPage}" min="1">
    </div>
    <div class="form-group">
      <label>Skip pages (e.g. picture pages, index) — optional</label>
      <input type="number" id="adj-skip-pages" value="0" min="0" placeholder="0">
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="btn-save-adjust">Recalculate</button>
    </div>
  `);

  document.getElementById('btn-save-adjust').addEventListener('click', async () => {
    const currentPage = parseInt(document.getElementById('adj-current-page').value);
    const skipPages = parseInt(document.getElementById('adj-skip-pages').value) || 0;
    if (isNaN(currentPage) || currentPage < 1) { app.notify('Enter a valid page number', 'error'); return; }

    try {
      await DB.update('yearly_queue', queueId, {
        current_page: currentPage,
        skipped_pages: skipPages
      });
      app.closeModal();
      app.notify('Schedule recalculated ✓', 'success');
      await app.refreshData();
      PAGES.today(document.getElementById('main-content'), app);
    } catch (e) {
      app.notify('Failed: ' + e.message, 'error');
    }
  });
};

PAGES.showBookProgress = (bookId, app) => {
  const s = app.schedule.find(b => b.bookId === bookId);
  if (!s) return;
  const logs = app.readingLog.filter(l => l.book_id === bookId && !l.is_review);
  const totalRead = logs.reduce((sum, l) => sum + (l.pages_read || 0), 0);
  const pct = s.pages ? Math.min(100, Math.round(((s.currentPage - s.startPage) / Math.max(1, s.pages - s.startPage)) * 100)) : 0;

  app.showModal(`
    <div class="modal-title" style="font-family: var(--serif); font-size: 1.1rem;">${s.title}</div>
    <div style="color: var(--text2); font-size: 0.82rem; margin-bottom: 1.5rem;">${s.author}</div>
    <div class="stats-grid" style="margin-bottom: 1rem;">
      <div class="stat-card"><div class="stat-number" style="font-size: 1.3rem;">${s.currentPage}</div><div class="stat-label">Current Page</div></div>
      <div class="stat-card"><div class="stat-number" style="font-size: 1.3rem;">${s.pages}</div><div class="stat-label">Total Pages</div></div>
      <div class="stat-card"><div class="stat-number" style="font-size: 1.3rem;">${pct}%</div><div class="stat-label">Complete</div></div>
    </div>
    <div class="progress-bar" style="height: 6px; margin-bottom: 1rem;">
      <div class="progress-fill" style="width: ${pct}%;"></div>
    </div>
    <div style="font-family: var(--mono); font-size: 0.68rem; color: var(--text3); line-height: 1.8;">
      Finish reading: ${SCHEDULER.formatDateDisplay(s.readEnd)}<br>
      Finish review: ${SCHEDULER.formatDateDisplay(s.reviewEnd)}<br>
      Pages logged: ${totalRead} total
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="APP.closeModal()">Close</button>
    </div>
  `);
};
