// Year Plan Page — multi-year, collapsible, past/present/future
PAGES.year = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  await app.refreshData();

  const currentYear = new Date().getFullYear();
  const today = SCHEDULER.formatDate(new Date());

  // Get all years that have queue entries
  let allQueues = {};
  try {
    const url = `${DB.url}/rest/v1/yearly_queue?select=*,book:books(*)&order=year.asc,position.asc`;
    const res = await fetch(url, { headers: DB.headers() });
    const rows = await res.json();
    rows.forEach(item => {
      if (!allQueues[item.year]) allQueues[item.year] = [];
      allQueues[item.year].push(item);
    });
  } catch(e) {
    allQueues[currentYear] = app.yearQueue;
  }

  // Also find years from completed books notes (historical data)
  try {
    const allBooks = await DB.getBooks();
    allBooks.filter(b => b.status === 'completed' && b.notes).forEach(b => {
      const match = (b.notes||'').match(/Read (\d{4})/);
      if (!match) return;
      const year = parseInt(match[1]);
      if (!allQueues[year]) allQueues[year] = [];
      if (!allQueues[year].find(q => (q.book_id || q.book?.id) === b.id)) {
        allQueues[year].push({ id: 'legacy-'+b.id, book: b, book_id: b.id, year, position: 999 });
      }
    });
  } catch(e) {}

  // Load extra (empty) years added by user
  try {
    const extraYears = JSON.parse(await DB.getSetting('extra_years') || '[]');
    extraYears.forEach(y => { if (!allQueues[y]) allQueues[y] = []; });
  } catch(e) {}

  // Ensure current year exists
  if (!allQueues[currentYear]) allQueues[currentYear] = [];

  const years = Object.keys(allQueues).map(Number).sort((a,b) => a-b);
  if (!years.includes(currentYear)) years.push(currentYear);

  // Get phases for all queue items
  const allQueueIds = Object.values(allQueues).flat().map(q => q.id);
  const allPhases = await DB.getBookPhases(allQueueIds);

  // Build schedule per year
  const schedulesByYear = {};
  years.forEach(year => {
    schedulesByYear[year] = SCHEDULER.buildYearSchedule(
      allQueues[year] || [],
      allPhases,
      app.routine,
      app.reviewRoutine,
      app.calendarRules,
      year
    );
  });

  // Current year stats
  const curSched = schedulesByYear[currentYear] || [];
  const curQueueBookIds = new Set((allQueues[currentYear] || []).map(q => q.book_id).filter(Boolean));
  const pagesReadThisYear = app.readingLog
    .filter(l => l.date >= `${currentYear}-01-01` && l.date <= `${currentYear}-12-31` && !l.is_review && curQueueBookIds.has(l.book_id))
    .reduce((s,l) => s + (l.pages_read||0), 0);
  const totalPages = curSched.reduce((s,b) => s + (b.pages||0), 0);
  const daysElapsed = Math.floor((new Date() - new Date(`${currentYear}-01-01`)) / 86400000);
  const expectedPct = Math.round((daysElapsed / 365) * 100);
  const actualPct = totalPages > 0 ? Math.round((pagesReadThisYear / totalPages) * 100) : 0;
  const onTrack = actualPct >= expectedPct - 5;
  const completed = curSched.filter(s => s.reviewEnd < today).length;

  // Collapse state
  const collapseKey = 'llm_year_collapse';
  let collapsed = JSON.parse(localStorage.getItem(collapseKey) || '{}');

  const renderYearSection = (year, schedule, isPast, isFuture) => {
    const isCollapsed = collapsed[year] !== false && (isPast || isFuture);
    const yearTotal = schedule.reduce((s,b) => s+(b.pages||0), 0);
    const yearCompleted = schedule.filter(s => s.reviewEnd < today).length;

    return `
      <div class="year-section ${isPast ? 'year-past' : isFuture ? 'year-future' : 'year-current'}"
           data-year="${year}" style="margin-bottom: 1rem;">

        <!-- Year header -->
        <div class="year-header" data-year="${year}" style="
          display:flex; align-items:center; justify-content:space-between;
          padding: 0.75rem 1rem;
          background: ${isPast ? 'var(--bg3)' : isFuture ? 'var(--bg2)' : 'var(--bg2)'};
          border: 1px solid ${isPast ? 'var(--border)' : isFuture ? 'var(--border)' : 'var(--accent)'};
          border-radius: var(--radius2);
          cursor: pointer;
          opacity: ${isPast ? '0.65' : '1'};
        ">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span style="font-family:var(--mono);font-size:0.72rem;letter-spacing:0.08em;
              color:${isPast ? 'var(--text3)' : isFuture ? 'var(--text2)' : 'var(--accent)'};">
              ${isPast ? '✓ ' : isFuture ? '→ ' : '▶ '}${year}
            </span>
            <span style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);">
              ${schedule.length} book${schedule.length !== 1 ? 's' : ''} · ${yearTotal.toLocaleString()}p
              ${isPast ? ` · ${yearCompleted} completed` : ''}
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            ${!isPast ? `<button class="btn btn-secondary btn-sm add-to-year-btn" data-year="${year}" onclick="event.stopPropagation()">+ Add</button>` : ''}
            <span style="font-family:var(--mono);font-size:0.75rem;color:var(--text3);">${isCollapsed ? '▼' : '▲'}</span>
          </div>
        </div>

        <!-- Year content -->
        <div class="year-content" data-year="${year}" style="display:${isCollapsed ? 'none' : 'block'};">
          ${year === currentYear ? renderCurrentYearStats(pagesReadThisYear, totalPages, actualPct, expectedPct, onTrack, completed, schedule.length) : renderYearProgressBar(year, schedule, app)}

          <div class="card" style="margin-top:0.5rem;">
            ${schedule.length === 0 ? `
              <div class="empty">
                <div class="empty-text">No books planned for ${year}</div>
              </div>
            ` : schedule.map((s, i) => renderBookRow(s, i, schedule, today, isPast, year, isFuture)).join('')}
          </div>
        </div>
      </div>
    `;
  };

  const renderCurrentYearStats = (pagesRead, total, actual, expected, onTrack, completed, planned) => `
    <div style="display:flex;align-items:flex-start;flex-wrap:wrap;gap:0.75rem;margin-top:0.5rem;padding:1.1rem 1.25rem;
      background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius2);border-left:3px solid var(--accent);">
      <div style="font-family:var(--mono);font-size:2.5rem;font-weight:500;color:var(--accent);letter-spacing:-0.04em;line-height:1;flex-shrink:0;">${pagesRead.toLocaleString()}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:var(--mono);font-size:0.68rem;color:var(--text2);letter-spacing:0.04em;">pages read this year</div>
        <div style="font-family:var(--mono);font-size:0.6rem;color:${onTrack ? 'var(--green)' : 'var(--red)'};margin-top:0.15rem;white-space:normal;word-break:break-word;">
          ${onTrack ? '▲ on track' : '▼ behind'} · ${actual}% of plan · ${expected}% of year elapsed
        </div>
      </div>
      <div style="flex-shrink:0;text-align:right;">
        <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">${completed}/${planned} complete</div>
      </div>
    </div>
  `;

  const renderBookRow = (s, i, schedule, today, isPast, year, isFuture = false) => {
    // For past years, treat all books as done regardless of book.status
    const isReading = !isPast && s.readStart <= today && s.readEnd >= today;
    const isReview = !isPast && s.reviewStart <= today && s.reviewEnd >= today;
    const isDone = isPast || s.reviewEnd < today;
    const isMain = !!s.isMain;
    const isActive = isReading || isReview;
    const bookLogs = app.readingLog.filter(l => l.book_id === s.bookId && !l.is_review);
    const pagesRead = bookLogs.reduce((sum,l) => sum+(l.pages_read||0), 0);
    const pct = s.pages ? Math.min(100, Math.round((pagesRead/s.pages)*100)) : 0;

    // Color coding for book state
    let blockStyle = '';
    if (isPast) {
      // Past year books: clearly greyed out
      blockStyle = 'opacity:0.55;padding:0.5rem 0;';
    } else if (isDone) {
      blockStyle = 'background:rgba(46,125,82,0.06);border-radius:var(--radius2);padding:0.75rem;margin-bottom:0.25rem;';
    } else if (isReading || isReview) {
      blockStyle = 'background:rgba(196,98,45,0.06);border-left:3px solid var(--accent);border-radius:0 var(--radius2) var(--radius2) 0;padding:0.75rem;padding-left:1rem;margin-bottom:0.25rem;';
    }

    return `
      <div class="year-book ${isPast ? 'year-book-past' : ''}" data-queue-id="${s.queueId}" data-pos="${i}"
        style="${blockStyle}">
        <div style="display:flex;flex-direction:column;gap:0.2rem;padding-top:0.15rem;flex-shrink:0;align-items:center;width:2rem;">
          <div class="year-book-pos" style="color:${isReading||isReview ? 'var(--accent)' : isDone ? 'var(--green-light)' : 'var(--text3)'};">
            ${isDone ? '✓' : isReading||isReview ? '▶' : i+1}
          </div>
          ${!isDone && schedule.length > 1 ? `
            <button onclick="event.stopPropagation();PAGES.moveBook('${s.queueId}',-1,${year})"
              style="background:none;border:none;cursor:pointer;padding:4px 6px;font-size:0.75rem;line-height:1;color:var(--text3);display:block;${i===0?'opacity:0.2;pointer-events:none':''}">▲</button>
            <button onclick="event.stopPropagation();PAGES.moveBook('${s.queueId}',1,${year})"
              style="background:none;border:none;cursor:pointer;padding:4px 6px;font-size:0.75rem;line-height:1;color:var(--text3);display:block;${i===schedule.length-1?'opacity:0.2;pointer-events:none':''}">▼</button>
          ` : ''}
        </div>
        <div class="year-book-bar" style="flex:1;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;">
            <div style="min-width:0;" data-action="mark-complete" data-queue-id="${s.queueId}" data-book-id="${s.bookId}" data-pages="${s.pages||0}">
              ${isActive && isMain ? `<div style="font-size:0.58rem;font-family:var(--mono);letter-spacing:0.07em;text-transform:uppercase;color:var(--accent);margin-bottom:0.2rem;">★ Main Book</div>` : ''}
              ${isActive && !isMain ? `<div style="font-size:0.58rem;font-family:var(--mono);letter-spacing:0.07em;text-transform:uppercase;color:var(--text3);margin-bottom:0.15rem;cursor:pointer;" data-action="set-main" data-queue-id="${s.queueId}">○ Set as Main</div>` : ''}
              <div class="card-title" style="font-size:0.9rem;${isDone ? 'text-decoration:line-through;color:var(--text3);' : ''}">${s.title}</div>
              <div class="card-meta">${s.author} · ${s.pages||'?'}p</div>
            </div>
            <div style="display:flex;gap:0.3rem;flex-shrink:0;align-items:center;">
              ${isReading ? '<div class="tag">Reading</div>' : ''}
              ${isReview ? '<div class="tag gray">Review</div>' : ''}
              ${isDone ? '<div class="tag green">Done</div>' : ''}
              ${!isDone ? `<button class="icon-btn" style="font-size:0.65rem;color:var(--green);" data-action="mark-complete" data-queue-id="${s.queueId}" data-book-id="${s.bookId}" data-pages="${s.pages||0}" title="Mark as complete">✓</button>` : ''}
              ${!isDone ? `<button class="icon-btn" style="font-size:0.65rem;color:var(--text3);" data-action="reset-book" data-queue-id="${s.queueId}" title="Reset start date to follow queue">↺</button>` : ''}
              <button class="icon-btn" style="font-size:0.65rem;color:var(--text3);" data-action="schedule" data-queue-id="${s.queueId}">📅</button>
              <button class="icon-btn" style="font-size:0.65rem;color:var(--text3);" data-action="remove" data-queue-id="${s.queueId}">✕</button>
            </div>
          </div>

          <!-- Progress bar -->
          <div style="margin-top:0.5rem;">
            <div class="progress-bar" style="height:2px;margin-bottom:0.3rem;">
              <div class="progress-fill" style="width:${pct}%;${isDone?'background:var(--green);':''}"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:0.6rem;color:var(--text3);">
              <span>${pct}% · ${pagesRead}p read</span>
              <span>${isDone ? 'Complete' : isReading ? `Finish ${SCHEDULER.formatDateShort(s.readEnd)}` : isFuture || !isReview ? `Start ${SCHEDULER.formatDateShort(s.readStart)}` : ''}</span>
            </div>
          </div>

          <!-- Date rows -->
          <div style="margin-top:0.5rem;display:flex;gap:1rem;flex-wrap:wrap;">
            <div style="display:flex;flex-direction:column;gap:0.05rem;">
              <span style="font-family:var(--mono);font-size:0.52rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3);">Reading</span>
              <span style="font-family:var(--mono);font-size:0.68rem;color:var(--text2);">${SCHEDULER.formatDateShort(s.readStart)} → ${SCHEDULER.formatDateShort(s.readEnd)}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.05rem;">
              <span style="font-family:var(--mono);font-size:0.52rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3);">Review</span>
              <span style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);">${SCHEDULER.formatDateShort(s.reviewStart)} → ${SCHEDULER.formatDateShort(s.reviewEnd)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Render full page
  const pastYears = years.filter(y => y < currentYear);
  const futureYears = years.filter(y => y > currentYear);

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.25rem;">
      <div class="page-title">Reading Plan</div>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <button class="btn btn-secondary btn-sm" id="btn-collapse-all">Collapse All</button>
        <button class="btn btn-secondary btn-sm" id="btn-add-year">+ Year</button>
      </div>
    </div>
    <div class="page-subtitle">All years · ${years.length} year${years.length!==1?'s':''}</div>

    <!-- Past years — collapsed into one group -->
    ${pastYears.length ? `
      <div style="margin-bottom:1rem;">
        <div id="btn-toggle-past" style="display:flex;align-items:center;justify-content:space-between;
          padding:0.65rem 1rem;background:var(--bg3);border:1px solid var(--border);
          border-radius:var(--radius2);cursor:pointer;opacity:0.7;margin-bottom:0.5rem;"
          onclick="PAGES._togglePastYears()">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);letter-spacing:0.08em;">
              ◂ Past · ${pastYears.length} year${pastYears.length!==1?'s':''}
            </span>
            <span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">
              ${pastYears.reduce((s,y) => s+(schedulesByYear[y]||[]).length, 0)} books
            </span>
          </div>
          <span id="past-chevron" style="font-family:var(--mono);font-size:0.7rem;color:var(--text3);">▼</span>
        </div>
        <div id="past-years-content" style="display:none;">
          ${pastYears.map(y => renderYearSection(y, schedulesByYear[y]||[], true, false)).join('')}
        </div>
      </div>
      <div style="height:1px;background:var(--border);margin:0.5rem 0 1rem;"></div>
    ` : ''}

    <!-- Current year — always visible -->
    <div style="font-family:var(--mono);font-size:0.6rem;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">
      ▶ ${currentYear} · Current
    </div>
    ${renderYearSection(currentYear, schedulesByYear[currentYear]||[], false, false)}

    <!-- Future years — collapsed into one group -->
    ${futureYears.length ? `
      <div style="height:1px;background:var(--border);margin:1rem 0 0.5rem;"></div>
      <div style="margin-top:0.5rem;">
        <div id="btn-toggle-future" style="display:flex;align-items:center;justify-content:space-between;
          padding:0.65rem 1rem;background:var(--bg2);border:1px solid var(--border);
          border-radius:var(--radius2);cursor:pointer;margin-bottom:0.5rem;"
          onclick="PAGES._toggleFutureYears()">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span style="font-family:var(--mono);font-size:0.68rem;color:var(--text2);letter-spacing:0.08em;">
              ▸ Future · ${futureYears.length} year${futureYears.length!==1?'s':''}
            </span>
            <span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">
              ${futureYears.reduce((s,y) => s+(schedulesByYear[y]||[]).length, 0)} books planned
            </span>
          </div>
          <span id="future-chevron" style="font-family:var(--mono);font-size:0.7rem;color:var(--text3);">▼</span>
        </div>
        <div id="future-years-content" style="display:none;">
          ${futureYears.map(y => renderYearSection(y, schedulesByYear[y]||[], false, true)).join('')}
        </div>
      </div>
    ` : ''}
  `;

  // Collapse toggle
  document.querySelectorAll('.year-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const year = parseInt(header.dataset.year);
      const content = document.querySelector(`.year-content[data-year="${year}"]`);
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? 'block' : 'none';
      collapsed[year] = !isHidden;
      localStorage.setItem(collapseKey, JSON.stringify(collapsed));
      header.querySelector('span:last-child').textContent = isHidden ? '▲' : '▼';
    });
  });

  // Collapse all
  document.getElementById('btn-collapse-all').addEventListener('click', () => {
    const allContents = document.querySelectorAll('.year-content');
    const anyOpen = [...allContents].some(c => c.style.display !== 'none');
    allContents.forEach(c => {
      const year = c.dataset.year;
      c.style.display = anyOpen ? 'none' : 'block';
      collapsed[year] = anyOpen;
      const header = document.querySelector(`.year-header[data-year="${year}"] span:last-child`);
      if (header) header.textContent = anyOpen ? '▼' : '▲';
    });
    localStorage.setItem(collapseKey, JSON.stringify(collapsed));
    document.getElementById('btn-collapse-all').textContent = anyOpen ? 'Expand All' : 'Collapse All';
  });

  // Add year
  document.getElementById('btn-add-year').addEventListener('click', () => {
    const maxYear = Math.max(...years, currentYear);
    app.showModal(`
      <div class="modal-title">Add Year</div>
      <div class="form-group">
        <label>Year</label>
        <input type="number" id="new-year-input" value="${maxYear + 1}" min="${currentYear}">
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-confirm-add-year">Add</button>
      </div>
    `);
    setTimeout(() => {
      document.getElementById('btn-confirm-add-year')?.addEventListener('click', async () => {
        const year = parseInt(document.getElementById('new-year-input').value);
        if (!year || year < currentYear) { app.notify('Enter a valid future year', 'error'); return; }
        // Store the new year in app settings so it persists
        const existingYears = JSON.parse(await DB.getSetting('extra_years') || '[]');
        if (!existingYears.includes(year)) {
          existingYears.push(year);
          await DB.setSetting('extra_years', JSON.stringify(existingYears));
        }
        app.closeModal();
        app.notify(`${year} added`, 'success');
        PAGES.year(document.getElementById('main-content'), app);
      });
    }, 50);
  });

  // Add to year buttons
  document.querySelectorAll('.add-to-year-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const year = parseInt(btn.dataset.year);
      PAGES.showAddToYear(app, year);
    });
  });

  // Single delegated handler for all main-content clicks (actions + move arrows)
  // Use a named handler stored on the element so re-renders don't stack up listeners
  const mainContent = document.getElementById('main-content');
  if (mainContent._yearHandler) mainContent.removeEventListener('click', mainContent._yearHandler);
  let _actionPending = false;
  mainContent._yearHandler = (e) => {
    // Action buttons (schedule, remove, mark-complete, reset-book)
    // Arrows use direct onclick — no delegation needed
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (_actionPending) return;
    _actionPending = true;
    setTimeout(() => { _actionPending = false; }, 600);
    const action = btn.dataset.action;
    const queueId = btn.dataset.queueId;
    if (action === 'schedule') PAGES.openBookSchedule(queueId, app);
    if (action === 'reset-book') PAGES.resetBookToSequential(queueId, app);
    if (action === 'remove') PAGES.removeFromYear(queueId, app);
    if (action === 'mark-complete') PAGES.markBookComplete(btn.dataset.bookId, queueId, parseInt(btn.dataset.pages)||0, app);
    if (action === 'set-main') PAGES.setMainBook(queueId, app);
  };
  mainContent.addEventListener('click', mainContent._yearHandler);
};

PAGES._togglePastYears = () => {
  const el = document.getElementById('past-years-content');
  const ch = document.getElementById('past-chevron');
  if (!el) return;
  const hidden = el.style.display === 'none';
  el.style.display = hidden ? 'block' : 'none';
  if (ch) ch.textContent = hidden ? '▲' : '▼';
};

PAGES._toggleFutureYears = () => {
  const el = document.getElementById('future-years-content');
  const ch = document.getElementById('future-chevron');
  if (!el) return;
  const hidden = el.style.display === 'none';
  el.style.display = hidden ? 'block' : 'none';
  if (ch) ch.textContent = hidden ? '▲' : '▼';
};

PAGES.showAddToYear = async (app, year) => {
  year = year || new Date().getFullYear();
  const books = await DB.getBooks();

  // Filter out books already in this year's queue
  // Only exclude books that are genuinely scheduled (have pages and are in queue)
  // Books in queue with no pages are stuck — still allow re-adding them
  const existingRes = await fetch(
    `${DB.url}/rest/v1/yearly_queue?year=eq.${year}&select=book_id`,
    { headers: DB.headers() }
  );
  const existingRows = await existingRes.json().catch(() => []);
  const alreadyInYearIds = new Set((existingRows || []).map(r => r.book_id));
  // A book is "genuinely in queue" only if it has pages (otherwise it's stuck and needs re-adding)
  const toRead = books.filter(b => {
    if (!alreadyInYearIds.has(b.id)) return true;   // not in queue at all → show
    if (!b.pages) return true;                        // in queue but no pages → still show (stuck)
    return false;                                      // properly in queue → hide
  });

  if (books.length === 0) {
    app.notify('No books in library. Add books first.', 'warning');
    return;
  }

  app.showModal(`
    <div class="modal-title">Add to ${year}</div>
    <div class="form-group">
      <input type="text" id="search-to-read" placeholder="Search by title or author...">
    </div>
    <div id="book-results" style="max-height:360px;overflow-y:auto;">
      ${renderPickList(toRead)}
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
    </div>
  `);

  setTimeout(() => {
    document.getElementById('search-to-read')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      const filtered = q ? toRead.filter(b =>
        b.title.toLowerCase().includes(q) || (b.author||'').toLowerCase().includes(q)
      ) : toRead;
      document.getElementById('book-results').innerHTML = renderPickList(filtered);
      bindPick(filtered, year, app);
    });
    bindPick(toRead, year, app);
  }, 50);
};

function renderPickList(books) {
  if (!books.length) return `<div style="color:var(--text3);font-size:0.85rem;padding:1rem 0;">No books to add (all already in this year's plan)</div>`;
  return books.map(b => `
    <div class="book-item">
      <div class="book-cover">${b.cover_url ? `<img src="${b.cover_url}" alt="">` : ''}</div>
      <div class="book-info">
        <div class="book-title" style="font-size:0.88rem;">${b.title}</div>
        <div class="book-author">${b.author || ''}${b.pages ? ` · ${b.pages}p` : ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.35rem;flex-shrink:0;">
        <button class="btn btn-primary btn-sm add-pick-btn" data-book-id="${b.id}">Add</button>
      </div>
    </div>
  `).join('');
}

function bindPick(books, year, app) {
  document.querySelectorAll('.add-pick-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const url = `${DB.url}/rest/v1/yearly_queue?year=eq.${year}&order=position.desc&limit=1`;
        const res = await fetch(url, { headers: DB.headers() });
        const rows = await res.json();
        const maxPos = rows[0]?.position || 0;
        const bookToAdd = books.find(b => b.id === btn.dataset.bookId);
        await DB.insert('yearly_queue', {
          book_id: btn.dataset.bookId, year, position: maxPos + 1,
          current_page: 1, start_page: 1
        });
        // Don't force status='reading' here — _syncBookStatuses will set the correct status
        // based on the actual schedule after refreshData
        const currentYear = new Date().getFullYear();
        if (year === currentYear && bookToAdd?.status === 'completed') {
          // increment read_count for re-reads
          try {
            await DB.update('books', btn.dataset.bookId, {
              read_count: (bookToAdd.read_count || 1) + 1
            });
          } catch(e) {}
        }
        app.closeModal();
        app.notify('Book added ✓', 'success');
        await app.refreshData();
        PAGES.year(document.getElementById('main-content'), app);
      } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
    });
  });
}

PAGES.moveBook = async (queueId, direction, year) => {
  const app = APP;
  try {
    const queue = await DB.getYearlyQueue(year || new Date().getFullYear());
    const sorted = [...queue].sort((a, b) => (a.position || 0) - (b.position || 0));

    // Normalise positions to 1,2,3... — fixes gaps and duplicates (e.g. multiple position=999)
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].position !== i + 1) {
        await DB.update('yearly_queue', sorted[i].id, { position: i + 1 });
        sorted[i].position = i + 1;
      }
    }

    const idx = sorted.findIndex(q => q.id === queueId);
    if (idx === -1) { app.notify('Book not found in queue', 'error'); return; }
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const idxPos = sorted[idx].position;
    const swapPos = sorted[swapIdx].position;
    await DB.update('yearly_queue', sorted[idx].id, { position: swapPos });
    await DB.update('yearly_queue', sorted[swapIdx].id, { position: idxPos });

    await app.refreshData();
    PAGES.year(document.getElementById('main-content'), app);
  } catch(e) { app.notify('Failed to move: ' + e.message, 'error'); }
};

PAGES.removeFromYear = async (queueId, app) => {
  // Use app.showModal instead of confirm to avoid multiple-fire issue
  app.showModal(`
    <div class="modal-title">Remove from Year Plan?</div>
    <div style="font-size:0.85rem;color:var(--text2);margin-bottom:1.5rem;">
      The book will be removed from this year's plan. Reading logs are kept.
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
      <button class="btn btn-danger" id="btn-confirm-remove">Remove</button>
    </div>
  `);
  setTimeout(() => {
    document.getElementById('btn-confirm-remove')?.addEventListener('click', async () => {
      app.closeModal();
      try {
        await PAGES._promoteMainBookIfNeeded(queueId, app);
        await DB.delete('yearly_queue', queueId);
        app.notify('Removed', 'success');
        await app.refreshData();
        PAGES.year(document.getElementById('main-content'), app);
      } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
    });
  }, 50);
};

// Helper: render progress bar for non-current years
function renderYearProgressBar(year, schedule, app) {
  if (!schedule.length) return '';
  const totalPages = schedule.reduce((s,b) => s+(b.pages||0), 0);
  const today = SCHEDULER.formatDate(new Date());
  const done = schedule.filter(s => s.reviewEnd < today).length;
  const pct = schedule.length > 0 ? Math.round((done/schedule.length)*100) : 0;
  return `
    <div style="margin-top:0.5rem;padding:0.875rem 1rem;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius2);">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:0.62rem;color:var(--text3);margin-bottom:0.4rem;">
        <span>${done} of ${schedule.length} books complete</span>
        <span>${totalPages.toLocaleString()}p total · ${pct}%</span>
      </div>
      <div class="progress-bar" style="height:3px;">
        <div class="progress-fill" style="width:${pct}%;"></div>
      </div>
    </div>
  `;
}

// Mark book as fully complete
PAGES.markBookComplete = async (bookId, queueId, totalPages, app) => {
  app.showModal(`
    <div class="modal-title">Mark as Complete</div>
    <div style="font-size:0.85rem;color:var(--text2);margin-bottom:1.5rem;">
      This will mark the book as completed and log all pages as read today. You can set a specific completion date below.
    </div>
    <div class="form-group">
      <label>Completion date</label>
      <input type="date" id="complete-date" value="${SCHEDULER.formatDate(new Date())}">
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="btn-confirm-complete">Mark Complete</button>
    </div>
  `);
  setTimeout(() => {
    document.getElementById('btn-confirm-complete')?.addEventListener('click', async () => {
      const date = document.getElementById('complete-date').value;
      try {
        // Update book status
        await DB.update('books', bookId, { status: 'completed' });
        // Log pages if we have a total
        if (totalPages > 0) {
          await DB.insert('reading_log', {
            book_id: bookId, date,
            pages_planned: totalPages, pages_read: totalPages,
            is_review: false, notes: 'Marked as complete'
          });
        }
        // Update queue item
        await DB.update('yearly_queue', queueId, {
          started_date: date,
          completed_date: date
        });
        app.closeModal();
        app.notify('Marked as complete ✓', 'success');
        await app.refreshData();
        PAGES.year(document.getElementById('main-content'), app);
      } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
    });
  }, 50);
};

PAGES.resetBookToSequential = async (queueId, app) => {
  // Find this book in the current schedule to show its current start date
  const schedItem = app.schedule.find(s => s.queueId === queueId);
  const currentStart = schedItem ? schedItem.readStart : '?';

  app.showModal(`
    <div class="modal-title">Reset Start Date</div>
    <div style="font-size:0.85rem;color:var(--text2);margin-bottom:0.75rem;">
      Clear any pinned date and move this book to the <strong>end of the queue</strong>.
      It will start automatically after all other books finish, following your reading routine.
    </div>
    ${currentStart !== '?' ? `<div style="font-family:var(--mono);font-size:0.7rem;color:var(--text3);margin-bottom:1.25rem;">Current scheduled start: ${currentStart}</div>` : ''}
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="btn-confirm-reset">Reset to Queue End</button>
    </div>
  `);
  setTimeout(() => {
    document.getElementById('btn-confirm-reset')?.addEventListener('click', async () => {
      try {
        const year = new Date().getFullYear();
        const queue = await DB.getYearlyQueue(year);
        // Normalise positions first
        const sorted = [...queue].sort((a,b) => (a.position||0)-(b.position||0));
        for (let i = 0; i < sorted.length; i++) {
          if (sorted[i].position !== i+1) {
            await DB.update('yearly_queue', sorted[i].id, { position: i+1 });
          }
        }
        const maxPos = sorted.length;
        await DB.update('yearly_queue', queueId, {
          pinned_start_date: null,
          started_date: null,
          current_page: 1,
          start_page: 1,
          position: maxPos + 1
        });
        app.closeModal();
        app.notify('Start date reset — book moved to end of queue ✓', 'success');
        await app.refreshData();
        PAGES.year(document.getElementById('main-content'), app);
      } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
    });
  }, 50);
};

// ── Main Book Management ─────────────────────────────────

PAGES.setMainBook = async (queueId, app) => {
  try {
    const year = new Date().getFullYear();
    const queue = await DB.getYearlyQueue(year);
    // Clear is_main on all, set on this one
    for (const q of queue) {
      const shouldBeMain = q.id === queueId;
      if (!!q.is_main !== shouldBeMain) {
        await DB.update('yearly_queue', q.id, { is_main: shouldBeMain });
      }
    }
    app.notify('Main book updated ✓', 'success');
    await app.refreshData();
    PAGES.year(document.getElementById('main-content'), app);
  } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
};

PAGES._promoteMainBookIfNeeded = async (removedQueueId, app) => {
  // Called when a book is removed from the year plan.
  // If the removed book was the main book, promote the next reading book.
  const year = new Date().getFullYear();
  const queue = await DB.getYearlyQueue(year);
  const removedItem = queue.find(q => q.id === removedQueueId);
  if (!removedItem?.is_main) return; // not main — nothing to do

  // Find next reading book (has schedule, readStart <= today <= readEnd)
  const today = new Date().toISOString().split('T')[0];
  const schedule = app.schedule || [];
  const nextReading = schedule.find(s =>
    s.queueId !== removedQueueId &&
    s.readStart <= today && s.readEnd >= today
  );
  if (nextReading) {
    await DB.update('yearly_queue', nextReading.queueId, { is_main: true });
    app.notify('Main book updated to: ' + nextReading.title, 'success');
  }
};
