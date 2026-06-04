// Week Page - with navigation, clickable days, past/future logging
PAGES.week = async (container, app, weekOffset = 0) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  await app.refreshData();

  const { start, end } = SCHEDULER.getWeekBounds(weekOffset);
  const today = SCHEDULER.formatDate(new Date());
  const isCurrentWeek = weekOffset === 0;

  const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDays = SCHEDULER.getWeekPlans(app.schedule, app.readingLog, start);

  const totalPlanned = weekDays.reduce((s, d) => s + d.dayPlans.reduce((ss, p) => ss + p.pagesPlanned, 0), 0);
  const totalRead = weekDays.reduce((s, d) => s + d.dayPlans.reduce((ss, p) => ss + p.pagesRead, 0), 0);
  const weekPct = totalPlanned > 0 ? Math.round((totalRead / totalPlanned) * 100) : 0;

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
      <div class="page-title" style="margin-bottom: 0;">Week</div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <button class="icon-btn" id="btn-prev-week" title="Previous week">◀</button>
        <span style="font-family: var(--mono); font-size: 0.68rem; color: var(--text3);">${isCurrentWeek ? 'This Week' : weekOffset < 0 ? `${Math.abs(weekOffset)}w ago` : `In ${weekOffset}w`}</span>
        <button class="icon-btn" id="btn-next-week" title="Next week">▶</button>
      </div>
    </div>
    <div class="page-subtitle">${SCHEDULER.formatDateShort(start)} — ${SCHEDULER.formatDateShort(end)}</div>

    <!-- 7-day grid -->
    <div class="week-grid" style="margin-bottom: 1.25rem;">
      ${weekDays.map((day, i) => {
        const isToday = day.dateStr === today;
        const isPast = day.dateStr < today;
        const hasPlan = day.dayPlans.length > 0;
        const dayTotal = day.dayPlans.reduce((s, p) => s + p.pagesPlanned, 0);
        const dayRead = day.dayPlans.reduce((s, p) => s + p.pagesRead, 0);
        const allLogged = hasPlan && day.dayPlans.every(p => p.logged && p.pagesRead >= p.pagesPlanned && p.pagesPlanned > 0);
        const dayPct = dayTotal > 0 ? Math.min(100, Math.round((dayRead / dayTotal) * 100)) : 0;

        return `
          ${(() => {
            const isPartial = hasPlan && dayRead > 0 && dayRead < dayTotal;
            const isMissed = hasPlan && isPast && !isToday && dayRead === 0;
            const stateClass = !hasPlan ? 'no-reading' :
              allLogged ? 'done' :
              isPartial ? 'partial' :
              isMissed ? 'missed' :
              'has-reading';
            return `
          <div class="week-day ${isToday ? 'today ' : ''}${stateClass}"
               style="cursor: pointer; position: relative;"
               data-date="${day.dateStr}">
            <div class="week-day-name">${DAYS_SHORT[i]}</div>
            <div style="font-family: var(--mono); font-size: 0.6rem; color: var(--text3); margin-bottom: 0.15rem;">
              ${new Date(day.dateStr + 'T00:00:00').getDate()}
            </div>
            <div class="week-day-pages" style="${isMissed ? 'color:var(--red);' : allLogged ? 'color:var(--green-light);' : ''}">
              ${hasPlan ? dayTotal : '—'}
            </div>
            ${hasPlan ? `
              <div style="font-size: 0.6rem; margin-top: 0.2rem; font-family: var(--mono);
                color: ${allLogged ? 'var(--green-light)' : isPartial ? 'var(--accent)' : isMissed ? 'var(--red)' : 'transparent'};">
                ${allLogged ? '✓' : isPartial ? `${dayPct}%` : isMissed ? '!' : '·'}
              </div>
              <div style="height: 3px; background: var(--bg4); border-radius: 2px; margin-top: 0.25rem; overflow: hidden;">
                <div style="height: 100%; width: ${allLogged ? 100 : dayPct}%;
                  background: ${allLogged ? 'var(--green)' : isPartial ? 'var(--red)' : 'transparent'};
                  border-radius: 2px;"></div>
              </div>
            ` : ''}
          </div>`;
          })()}
        `;
      }).join('')}
    </div>

    <!-- Weekly summary -->
    <div class="card" style="margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <div>
          <div class="card-meta">Weekly Progress</div>
          <div style="font-family: var(--mono); font-size: 1.1rem; color: var(--text); margin-top: 0.2rem;">
            ${totalRead} <span style="color: var(--text3);">/ ${totalPlanned} pages</span>
          </div>
        </div>
        <div class="tag ${weekPct >= 100 ? 'green' : weekPct >= 60 ? '' : 'red'}">${weekPct}%</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${weekPct}%;"></div>
      </div>
    </div>

    <!-- Day by day detail -->
    <div class="card">
      <div class="card-meta" style="margin-bottom: 1rem;">Day by Day</div>
      ${weekDays.map((day, i) => {
        const isToday = day.dateStr === today;
        const isPast = day.dateStr < today;
        const isFuture = day.dateStr > today;
        const hasPlan = day.dayPlans.length > 0;
        const totalPlanned = day.dayPlans.reduce((s,p) => s+p.pagesPlanned, 0);
        const totalRead = day.dayPlans.reduce((s,p) => s+p.pagesRead, 0);
        const pct = totalPlanned > 0 ? Math.min(100, Math.round((totalRead/totalPlanned)*100)) : 0;
        const isComplete = hasPlan && totalPlanned > 0 && totalRead >= totalPlanned && day.dayPlans.every(p => p.logged);
        const isPartial = hasPlan && totalRead > 0 && totalRead < totalPlanned;
        const isMissed = hasPlan && isPast && !isToday && totalRead === 0;

        // Border color based on state
        const borderColor = isComplete ? 'var(--green)' :
          isPartial ? 'var(--accent)' :
          isMissed ? 'var(--red)' :
          isToday ? 'var(--accent)' : 'transparent';

        return `
          <div class="book-item day-row" data-date="${day.dateStr}"
            style="cursor:pointer;border-left:3px solid ${borderColor};padding-left:0.75rem;
              background:${isComplete ? 'rgba(46,125,82,0.05)' : isPartial ? 'rgba(196,98,45,0.05)' : isMissed ? 'rgba(184,50,50,0.05)' : !hasPlan ? 'repeating-linear-gradient(45deg,var(--bg3),var(--bg3) 3px,var(--bg4) 3px,var(--bg4) 6px)' : 'transparent'};
              border-radius:0 var(--radius) var(--radius) 0;margin-left:-0.25rem;">
            <div class="book-info">
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.2rem;">
                <div class="book-title" style="font-size:0.85rem;font-weight:${isToday?'600':'400'};">
                  ${DAYS_SHORT[i]}, ${SCHEDULER.formatDateShort(day.dateStr)}
                </div>
                ${isToday ? '<span class="tag" style="font-size:0.55rem;">Today</span>' : ''}
                ${isComplete ? '<span style="font-family:var(--mono);font-size:0.65rem;color:var(--green);">✓ complete</span>' : ''}
                ${isMissed ? '<span style="font-family:var(--mono);font-size:0.65rem;color:var(--red);">missed</span>' : ''}
                ${isPartial ? `<span style="font-family:var(--mono);font-size:0.65rem;color:var(--accent);">${pct}%</span>` : ''}
              </div>
              ${hasPlan ? day.dayPlans.map(p => `
                <div style="font-size:0.73rem;color:var(--text2);margin-top:0.1rem;">
                  ${p.book.title.length > 32 ? p.book.title.slice(0,32)+'…' : p.book.title}
                  <span style="color:var(--text3);font-family:var(--mono);font-size:0.65rem;">
                    · pp.${p.fromPage}–${p.toPage}
                    ${p.pagesRead > 0 && p.pagesRead < p.pagesPlanned ? ` (read ${p.pagesRead}p)` : ''}
                    ${p.type === 'review' ? ' review' : ''}
                  </span>
                </div>
              `).join('') : '<div style="font-size:0.73rem;color:var(--text3);">Rest</div>'}

              ${isPartial ? `
                <div class="progress-bar" style="height:2px;margin-top:0.5rem;margin-bottom:0;">
                  <div class="progress-fill" style="width:${pct}%;"></div>
                </div>
              ` : ''}
            </div>
            <div class="book-right" style="align-self:center;">
              ${hasPlan ? `<div class="book-pages" style="color:${isComplete?'var(--green)':isMissed?'var(--red)':'var(--text2)'};">${totalPlanned}p</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Event delegation for all day clicks - use capture to avoid duplicates
  // Debounce flag to prevent multiple showDayDetail calls
  let _detailOpen = false;
  const weekClickHandler = (e) => {
    const dayEl = e.target.closest('[data-date]');
    if (!dayEl) return;
    if (e.target.closest('button')) return;
    if (_detailOpen) return;
    const dateStr = dayEl.dataset.date;
    if (!dateStr) return;
    _detailOpen = true;
    setTimeout(() => { _detailOpen = false; }, 500);
    PAGES.showDayDetail(dateStr, app, weekOffset);
  };
  const mc = document.getElementById('main-content');
  mc._weekHandler && mc.removeEventListener('click', mc._weekHandler);
  mc._weekHandler = weekClickHandler;
  mc.addEventListener('click', weekClickHandler);

  document.getElementById('btn-prev-week').addEventListener('click', () => {
    PAGES.week(document.getElementById('main-content'), app, weekOffset - 1);
  });
  document.getElementById('btn-next-week').addEventListener('click', () => {
    PAGES.week(document.getElementById('main-content'), app, weekOffset + 1);
  });
};


PAGES.showDayDetail = (dateStr, app, weekOffset = 0) => {
  const today = SCHEDULER.formatDate(new Date());
  const isPast = dateStr < today;
  const isFuture = dateStr > today;
  const displayDate = SCHEDULER.formatDateDisplay(dateStr);

  // Build plans for this day
  const dayPlans = [];
  for (const s of app.schedule) {
    const entry = SCHEDULER.getPlanForDate(s, dateStr);
    if (!entry || entry.pages === 0) continue;
    if (entry.type !== 'reading' && entry.type !== 'review') continue;
    const logged = app.readingLog.find(l =>
      l.date === dateStr && l.book_id === s.bookId && l.is_review === (entry.type === 'review')
    );
    dayPlans.push({
      type: entry.type, book: s,
      fromPage: entry.fromPage, toPage: entry.toPage,
      pagesPlanned: entry.pages,
      pagesRead: logged ? (logged.pages_read || 0) : 0,
      currentPageLogged: logged ? (logged.current_page_after || null) : null,
      logged: !!logged, logId: logged ? logged.id : null
    });
  }

  // No plan — free-form log
  if (dayPlans.length === 0) {
    app.showModal(`
      <div class="modal-title">${displayDate}</div>
      <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);margin-bottom:1rem;letter-spacing:0.06em;">
        ${isFuture ? 'FUTURE · log in advance' : 'REST DAY · log anyway'}
      </div>
      <div class="form-group">
        <label>Book</label>
        <select id="free-book-select">
          ${app.schedule.map(s => `<option value="${s.bookId}">${s.title}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Pages read</label>
        <input type="number" id="free-pages" min="1" placeholder="e.g. 20">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="free-notes" rows="2"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-free">Save</button>
      </div>
    `);
    setTimeout(() => {
      document.getElementById('btn-save-free')?.addEventListener('click', async () => {
        const bookId = document.getElementById('free-book-select')?.value;
        const pages = parseInt(document.getElementById('free-pages')?.value);
        const notes = document.getElementById('free-notes')?.value || '';
        if (!bookId || isNaN(pages) || pages < 1) { app.notify('Enter a valid page count', 'error'); return; }
        try {
          await DB.insert('reading_log', { book_id: bookId, date: dateStr, pages_planned: 0, pages_read: pages, is_review: false, notes });
          app.closeModal();
          app.notify('Logged ✓', 'success');
          await app.refreshData();
          PAGES.week(document.getElementById('main-content'), app, weekOffset);
        } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
      });
    }, 50);
    return;
  }

  app.showModal(`
    <div class="modal-title">${displayDate}</div>
    ${isPast ? '<div style="font-family:var(--mono);font-size:0.63rem;color:var(--accent);margin-bottom:1rem;letter-spacing:0.06em;">PAST DAY</div>' : ''}
    ${isFuture ? '<div style="font-family:var(--mono);font-size:0.63rem;color:var(--text3);margin-bottom:1rem;letter-spacing:0.06em;">FUTURE DAY</div>' : ''}

    <!-- Log whole week in one go -->
    ${dayPlans.length > 0 && dayPlans[0].type === 'reading' ? `
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:0.875rem;margin-bottom:1.25rem;">
      <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.4rem;">Log week in one go</div>
      <div style="font-size:0.78rem;color:var(--text2);margin-bottom:0.6rem;">Enter the page you reached — all days this week up to today will be marked.</div>
      <div style="display:flex;gap:0.6rem;align-items:flex-end;">
        <div style="flex:1;"><label>I reached page</label><input type="number" id="log-week-page" min="1" placeholder="e.g. 148" style="margin-top:0.3rem;"></div>
        <button class="btn btn-primary btn-sm" id="btn-log-week">Apply</button>
      </div>
    </div>
    ` : ''}

    ${dayPlans.map((plan, idx) => `
      <div class="plan-block" data-idx="${idx}" style="margin-bottom:1.25rem;padding-bottom:1.25rem;border-bottom:1px solid var(--border);">
        <div style="font-weight:500;font-size:0.92rem;margin-bottom:0.15rem;">${plan.book.title}</div>
        <div style="font-size:0.7rem;color:var(--text2);margin-bottom:0.875rem;font-family:var(--mono);">
          ${plan.type === 'review' ? 'Review' : 'Reading'} · planned pp.${plan.fromPage}–${plan.toPage} · ${plan.pagesPlanned}p
        </div>

        <button class="btn btn-primary btn-sm quick-done-btn" data-idx="${idx}"
          data-pages="${plan.pagesPlanned}" data-frompage="${plan.fromPage}" data-endpage="${plan.toPage}"
          style="width:100%;margin-bottom:0.6rem;justify-content:center;">
          ✓ Done — pp.${plan.fromPage}–${plan.toPage}
        </button>
        <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-align:center;margin-bottom:0.6rem;letter-spacing:0.08em;">OR ENTER DIFFERENT PAGES</div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;">
          <div class="form-group" style="margin-bottom:0;">
            <label>Started on</label>
            <input type="number" class="inp-start" data-idx="${idx}" min="1" max="9999" value="${plan.fromPage}" placeholder="${plan.fromPage}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Ended on</label>
            <input type="number" class="inp-end" data-idx="${idx}" min="1" max="9999" value="${plan.currentPageLogged || ''}" placeholder="${plan.toPage}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Pages read</label>
            <input type="number" class="inp-pages" data-idx="${idx}" min="0" max="9999" value="${plan.pagesRead || ''}" placeholder="${plan.pagesPlanned}">
          </div>
        </div>
        <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:0.3rem;">Any two fields auto-fill the third</div>
        <div class="form-group" style="margin-top:0.6rem;margin-bottom:0;">
          <label>Notes</label>
          <textarea class="inp-notes" data-idx="${idx}" rows="2" placeholder="Thoughts..."></textarea>
        </div>
      </div>
    `).join('')}

    <div class="modal-actions" style="justify-content:space-between;">
      <div>${dayPlans.some(p => p.logged) ? '<button class="btn btn-danger btn-sm" id="btn-delete-day-log">Delete Log</button>' : ''}</div>
      <div style="display:flex;gap:0.6rem;">
        <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-day-log">Save</button>
      </div>
    </div>
  `);

  // Single timeout - modal is appended synchronously so DOM is ready
  setTimeout(() => {
    // ── Three-way auto-calculation ────────────────────────
    dayPlans.forEach((plan, idx) => {
      const startEl = document.querySelector(`.inp-start[data-idx="${idx}"]`);
      const endEl   = document.querySelector(`.inp-end[data-idx="${idx}"]`);
      const pagesEl = document.querySelector(`.inp-pages[data-idx="${idx}"]`);
      if (!startEl || !endEl || !pagesEl) return;

      // Track last two edited fields
      let edited = [];
      const mark = (name) => { edited = [name, ...edited.filter(x => x !== name)].slice(0, 2); };

      const calc = () => {
        const sp = parseInt(startEl.value);
        const ep = parseInt(endEl.value);
        const pp = parseInt(pagesEl.value);
        const hasS = !isNaN(sp) && sp > 0;
        const hasE = !isNaN(ep) && ep > 0;
        const hasP = !isNaN(pp) && pp > 0;

        const last = edited[0];
        const prev = edited[1];

        if (last === 'start' || prev === 'start') {
          if (hasS && hasE) { pagesEl.value = ep - sp + 1; return; }
          if (hasS && hasP) { endEl.value = sp + pp - 1; return; }
        }
        if (last === 'end' || prev === 'end') {
          if (hasE && hasS) { pagesEl.value = ep - sp + 1; return; }
          if (hasE && hasP) { startEl.value = ep - pp + 1; return; }
        }
        if (last === 'pages' || prev === 'pages') {
          if (hasP && hasS) { endEl.value = sp + pp - 1; return; }
          if (hasP && hasE) { startEl.value = ep - pp + 1; return; }
        }
      };

      ['input','change'].forEach(ev => {
        startEl.addEventListener(ev, () => { mark('start'); calc(); });
        endEl.addEventListener(ev,   () => { mark('end');   calc(); });
        pagesEl.addEventListener(ev, () => { mark('pages'); calc(); });
      });
    });

    // ── Quick done buttons ────────────────────────────────
    document.querySelectorAll('.quick-done-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const pages = parseInt(btn.dataset.pages);
        const fromPage = parseInt(btn.dataset.frompage);
        const endPage = parseInt(btn.dataset.endpage);
        const plan = dayPlans[idx];
        try {
          const entry = { book_id: plan.book.bookId, date: dateStr, pages_planned: plan.pagesPlanned, pages_read: pages, is_review: plan.type === 'review', notes: '', current_page_after: endPage };
          if (plan.logId) await DB.update('reading_log', plan.logId, entry);
          else await DB.insert('reading_log', entry);
          app.closeModal();
          app.notify('Logged ✓', 'success');
          await app.refreshData();
          PAGES.week(document.getElementById('main-content'), app, weekOffset);
        } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
      });
    });

    // ── Log week in one go ────────────────────────────────
    document.getElementById('btn-log-week')?.addEventListener('click', async () => {
      const targetPage = parseInt(document.getElementById('log-week-page').value);
      if (!targetPage || targetPage < 1) { app.notify('Enter a valid page number', 'error'); return; }
      const bookId = dayPlans[0]?.book?.bookId;
      if (!bookId) return;
      const schedItem = app.schedule.find(s => s.bookId === bookId);
      if (!schedItem) return;
      try {
        const { start: wkStart, end: wkEnd } = SCHEDULER.getWeekBounds(weekOffset);
        let d = wkStart;
        while (d <= wkEnd) {
          const entry = SCHEDULER.getPlanForDate(schedItem, d);
          if (entry && entry.type === 'reading' && entry.pages > 0) {
            const overlapEnd = Math.min(entry.toPage, targetPage);
            if (overlapEnd >= entry.fromPage) {
              const pagesRead = overlapEnd - entry.fromPage + 1;
              const existing = app.readingLog.find(l => l.date === d && l.book_id === bookId && !l.is_review);
              const logEntry = { book_id: bookId, date: d, pages_planned: entry.pages, pages_read: pagesRead, is_review: false, notes: 'Week log', current_page_after: overlapEnd };
              if (existing) await DB.update('reading_log', existing.id, logEntry);
              else await DB.insert('reading_log', logEntry);
            }
          }
          d = SCHEDULER.addDays(d, 1);
        }
        app.closeModal();
        app.notify('Week logged ✓', 'success');
        await app.refreshData();
        PAGES.week(document.getElementById('main-content'), app, weekOffset);
      } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
    });

    // ── Save ─────────────────────────────────────────────
    document.getElementById('btn-save-day-log')?.addEventListener('click', async () => {
      try {
        for (let idx = 0; idx < dayPlans.length; idx++) {
          const plan = dayPlans[idx];
          const startPage = parseInt(document.querySelector(`.inp-start[data-idx="${idx}"]`)?.value) || plan.fromPage;
          const endPage   = parseInt(document.querySelector(`.inp-end[data-idx="${idx}"]`)?.value)   || null;
          const pages     = parseInt(document.querySelector(`.inp-pages[data-idx="${idx}"]`)?.value) || 0;
          const notes     = document.querySelector(`.inp-notes[data-idx="${idx}"]`)?.value || '';
          if (pages < 0) continue;

          // Retroactive coverage if startPage is earlier than planned or endPage covers multiple days
          const schedItem = app.schedule.find(s => s.bookId === plan.book.bookId);
          if (schedItem && endPage) {
            const { start: wkStart, end: wkEnd } = SCHEDULER.getWeekBounds(weekOffset);
            // Loop through entire week (not just up to dateStr) to cover future days too
            let d = wkStart;
            while (d <= wkEnd) {
              const dayEntry = SCHEDULER.getPlanForDate(schedItem, d);
              if (dayEntry && dayEntry.type === 'reading' && dayEntry.pages > 0) {
                const overlapStart = Math.max(dayEntry.fromPage, startPage);
                const overlapEnd   = Math.min(dayEntry.toPage, endPage);
                if (overlapEnd >= overlapStart) {
                  const dayPages = overlapEnd - overlapStart + 1;
                  const existing = app.readingLog.find(l => l.date === d && l.book_id === plan.book.bookId && !l.is_review);
                  const logEntry = {
                    book_id: plan.book.bookId, date: d,
                    pages_planned: dayEntry.pages, pages_read: dayPages,
                    is_review: false,
                    notes: d === dateStr ? notes : 'Covered by range log',
                    current_page_after: overlapEnd
                  };
                  if (d === dateStr && plan.logId) await DB.update('reading_log', plan.logId, logEntry);
                  else if (existing) await DB.update('reading_log', existing.id, logEntry);
                  else await DB.insert('reading_log', logEntry);
                }
              }
              d = SCHEDULER.addDays(d, 1);
            }
          } else {
            // Simple single-day log
            const logEntry = {
              book_id: plan.book.bookId, date: dateStr,
              pages_planned: plan.pagesPlanned, pages_read: pages,
              is_review: plan.type === 'review', notes,
              current_page_after: endPage || (pages > 0 ? startPage + pages - 1 : null)
            };
            if (plan.logId) await DB.update('reading_log', plan.logId, logEntry);
            else await DB.insert('reading_log', logEntry);
          }
        }
        app.closeModal();
        app.notify('Saved ✓', 'success');
        await app.refreshData();
        PAGES.week(document.getElementById('main-content'), app, weekOffset);
      } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
    });

    // ── Delete log ────────────────────────────────────────
    document.getElementById('btn-delete-day-log')?.addEventListener('click', async () => {
      if (!confirm('Delete reading log for this day?')) return;
      try {
        for (const plan of dayPlans) {
          if (plan.logId) await DB.delete('reading_log', plan.logId);
        }
        app.closeModal();
        app.notify('Log deleted', 'success');
        await app.refreshData();
        PAGES.week(document.getElementById('main-content'), app, weekOffset);
      } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
    });

  }, 50);
};

