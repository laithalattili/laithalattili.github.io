// Reading Page — consolidated Today + This Week
PAGES.reading = async (container, app, weekOffset = 0) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  await app.refreshData();

  const today = SCHEDULER.formatDate(new Date());
  const todayDisplay = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const { start, end } = SCHEDULER.getWeekBounds(weekOffset);
  const isCurrentWeek = weekOffset === 0;
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // Today's plans
  const todayPlans = isCurrentWeek ? SCHEDULER.getTodayPlans(app.schedule, app.readingLog) : [];
  const totalPlanned = todayPlans.reduce((s,p) => s + p.pagesPlanned, 0);
  const totalRead = todayPlans.reduce((s,p) => s + p.pagesRead, 0);
  const totalPct = totalPlanned > 0 ? Math.min(100, Math.round((totalRead/totalPlanned)*100)) : 0;
  const allDone = todayPlans.length > 0 && todayPlans.every(p => p.pagesRead >= p.pagesPlanned && p.pagesPlanned > 0);

  // Year stats
  const year = new Date().getFullYear();
  const yearBookIds = new Set(app.yearQueue.map(q => q.book_id || q.book?.id).filter(Boolean));
  const yearLogs = app.readingLog.filter(l => l.date >= `${year}-01-01` && !l.is_review && yearBookIds.has(l.book_id));
  const pagesThisYear = yearLogs.reduce((s,l) => s + (l.pages_read||0), 0);
  const streak = SCHEDULER.calculateStreak(app.readingLog);

  // Week days
  const weekDays = SCHEDULER.getWeekPlans(app.schedule, app.readingLog, start);

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.2rem;">
      <div class="page-title">Reading</div>
      <div style="display:flex;align-items:center;gap:0.4rem;">
        <button class="icon-btn" id="btn-prev-week" title="Previous week">◀</button>
        <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">
          ${isCurrentWeek ? 'This Week' : weekOffset < 0 ? `${Math.abs(weekOffset)}w ago` : `In ${weekOffset}w`}
        </span>
        <button class="icon-btn" id="btn-next-week" title="Next week">▶</button>
      </div>
    </div>
    <div class="page-subtitle">${SCHEDULER.formatDateShort(start)} — ${SCHEDULER.formatDateShort(end)}</div>

    ${isCurrentWeek ? `
    <!-- Today section -->
    <div style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">
      Today · ${todayDisplay}
    </div>

    ${todayPlans.length === 0 ? `
      <div class="card" style="text-align:center;padding:1.5rem;margin-bottom:1rem;">
        <div style="color:var(--text3);font-size:0.9rem;">
          ${(() => { const next = app.schedule.find(s => s.readStart > today); return next ? `Next: <span style="color:var(--accent);">${next.title}</span> · ${SCHEDULER.formatDateDisplay(next.readStart)}` : 'No reading scheduled — rest day'; })()}
        </div>
      </div>
    ` : `
      ${todayPlans.length > 1 ? `
        <div class="card" style="margin-bottom:0.75rem;border-color:${allDone ? 'var(--green)' : 'var(--border)'};">
          <div class="today-label">Combined Target</div>
          <div class="pages-target">
            <div class="pages-number" style="color:${allDone ? 'var(--green-light)' : 'var(--accent)'};">${totalRead}</div>
            <div class="pages-label">of ${totalPlanned}<br>pages today</div>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${totalPct}%;"></div></div>
          <div class="progress-labels"><span>${todayPlans.length} books</span><span>${totalPct}%</span></div>
        </div>
      ` : ''}

      ${todayPlans.map((plan, idx) => {
        const pct = plan.pagesPlanned > 0 ? Math.min(100, Math.round((plan.pagesRead/plan.pagesPlanned)*100)) : 0;
        const done = plan.pagesRead >= plan.pagesPlanned && plan.pagesPlanned > 0;
        const isReview = plan.type === 'review';
        return `
          <div class="today-card" style="margin-bottom:0.75rem;${done ? 'border-color:var(--green);' : isReview ? 'border-left:3px solid var(--blue);' : ''}">
            <div class="today-label" style="${isReview ? 'color:var(--blue);' : ''}">${isReview ? 'Review Session' : 'Reading'}${todayPlans.length > 1 ? ` · ${idx+1}/${todayPlans.length}` : ''}</div>
            <div class="today-book-title">${plan.book.title}</div>
            <div class="today-book-author">${plan.book.author}</div>
            <div style="display:flex;align-items:baseline;gap:1rem;margin:0.875rem 0;">
              <div style="text-align:center;">
                <div style="font-family:var(--mono);font-size:1.6rem;color:var(--accent);line-height:1;">${plan.fromPage}</div>
                <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;">from</div>
              </div>
              <div style="color:var(--text3);font-family:var(--mono);">→</div>
              <div style="text-align:center;">
                <div style="font-family:var(--mono);font-size:1.6rem;color:var(--accent);line-height:1;">${plan.toPage}</div>
                <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;">to</div>
              </div>
              <div style="color:var(--text3);font-family:var(--mono);">·</div>
              <div style="text-align:center;">
                <div style="font-family:var(--mono);font-size:1.6rem;line-height:1;">${plan.pagesPlanned}</div>
                <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;">pages</div>
              </div>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;${done ? 'background:var(--green);' : ''}"></div></div>
            <div class="progress-labels">
              <span style="color:var(--text3);font-size:0.62rem;">${plan.book.pct}% of book · Finish ${SCHEDULER.formatDateShort(plan.book.readEnd)} · Review ends ${SCHEDULER.formatDateShort(plan.book.reviewEnd)}</span>
              <span>${pct}%</span>
            </div>
            ${done ? `<div style="color:var(--green-light);font-family:var(--mono);font-size:0.68rem;margin-bottom:0.5rem;">✓ Done for today</div>` : ''}
            <button class="btn btn-primary btn-sm log-today-btn" data-idx="${idx}" style="margin-top:0.5rem;">${done ? 'Update' : 'Log Pages'}</button>
          </div>
        `;
      }).join('')}
    `}

    <!-- Year stats strip -->
    <div style="display:flex;gap:0.6rem;margin-bottom:1.25rem;">
      <div class="stat-card" style="flex:1;padding:0.875rem;">
        <div class="stat-number" style="font-size:1.3rem;">${pagesThisYear.toLocaleString()}</div>
        <div class="stat-label">Pages ${year}</div>
      </div>
      <div class="stat-card" style="flex:1;padding:0.875rem;">
        <div class="stat-number" style="font-size:1.3rem;color:${streak >= 7 ? 'var(--accent)' : 'var(--text)'};">${streak}${streak >= 7 ? ' 🔥' : ''}</div>
        <div class="stat-label">Streak</div>
      </div>
    </div>
    ` : ''}

    <!-- Week grid -->
    <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">Week Overview</div>
    <div class="week-grid" style="margin-bottom:1.25rem;">
      ${weekDays.map((day, i) => {
        const isToday = day.dateStr === today;
        const isPast = day.dateStr < today;
        const hasPlan = day.dayPlans.length > 0;
        const hasReview = day.dayPlans.some(p => p.type === 'review');
        const hasReading = day.dayPlans.some(p => p.type === 'reading');
        const dayTotal = day.dayPlans.reduce((s,p) => s+p.pagesPlanned, 0);
        const dayRead = day.dayPlans.reduce((s,p) => s+p.pagesRead, 0);
        const dayPct = dayTotal > 0 ? Math.min(100, Math.round((dayRead/dayTotal)*100)) : 0;
        const isComplete = hasPlan && dayTotal > 0 && day.dayPlans.every(p => p.logged && p.pagesRead >= p.pagesPlanned);
        const isPartial = hasPlan && dayRead > 0 && !isComplete;
        const isMissed = hasPlan && isPast && !isToday && dayRead === 0;
        const stateClass = !hasPlan ? 'no-reading' : isComplete ? 'done' : isPartial ? 'partial' : isMissed ? 'missed' : 'has-reading';
        const borderColor = hasReview && !hasReading ? 'var(--blue)' : '';

        return `
          <div class="week-day ${isToday ? 'today ' : ''}${stateClass}"
               style="cursor:pointer;${borderColor ? 'border-color:'+borderColor+';' : ''}"
               data-date="${day.dateStr}">
            <div class="week-day-name">${DAYS[i]}</div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-bottom:0.15rem;">${new Date(day.dateStr+'T12:00:00').getDate()}</div>
            <div class="week-day-pages" style="${isMissed ? 'color:var(--red);' : isComplete ? 'color:var(--green-light);' : hasReview && !hasReading ? 'color:var(--blue);' : ''}">
              ${hasPlan ? dayTotal : '—'}
            </div>
            ${hasPlan ? `
              <div style="font-size:0.58rem;margin-top:0.15rem;font-family:var(--mono);color:${isComplete ? 'var(--green-light)' : isPartial ? 'var(--accent)' : isMissed ? 'var(--red)' : 'transparent'};">
                ${isComplete ? '✓' : isPartial ? dayPct+'%' : isMissed ? '!' : '·'}
              </div>
              <div style="height:3px;background:var(--bg4);border-radius:2px;margin-top:0.2rem;overflow:hidden;">
                <div style="height:100%;width:${isComplete ? 100 : dayPct}%;background:${isComplete ? 'var(--green)' : isPartial ? 'var(--red)' : 'transparent'};border-radius:2px;"></div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>

    <!-- Week progress -->
    ${(() => {
      const wkPlanned = weekDays.reduce((s,d) => s+d.dayPlans.reduce((ss,p) => ss+p.pagesPlanned, 0), 0);
      const wkRead = weekDays.reduce((s,d) => s+d.dayPlans.reduce((ss,p) => ss+p.pagesRead, 0), 0);
      const wkPct = wkPlanned > 0 ? Math.round((wkRead/wkPlanned)*100) : 0;
      return `
        <div class="card" style="margin-bottom:1rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
            <div class="card-meta">Weekly Progress</div>
            <div style="font-family:var(--mono);font-size:0.85rem;">${wkRead} <span style="color:var(--text3);">/ ${wkPlanned}p</span></div>
            <div class="tag ${wkPct >= 100 ? 'green' : wkPct >= 60 ? '' : 'red'}">${wkPct}%</div>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${wkPct}%;"></div></div>
        </div>
      `;
    })()}

    <!-- Day by day list -->
    <div class="card">
      <div class="card-meta" style="margin-bottom:0.875rem;">Day by Day</div>
      ${weekDays.map((day, i) => {
        const isToday = day.dateStr === today;
        const isPast = day.dateStr < today;
        const hasPlan = day.dayPlans.length > 0;
        const totalPlanned = day.dayPlans.reduce((s,p) => s+p.pagesPlanned, 0);
        const totalRead = day.dayPlans.reduce((s,p) => s+p.pagesRead, 0);
        const pct = totalPlanned > 0 ? Math.min(100, Math.round((totalRead/totalPlanned)*100)) : 0;
        const isComplete = hasPlan && totalPlanned > 0 && totalRead >= totalPlanned && day.dayPlans.every(p => p.logged);
        const isPartial = hasPlan && totalRead > 0 && !isComplete;
        const isMissed = hasPlan && isPast && !isToday && totalRead === 0;
        const hasReview = day.dayPlans.some(p => p.type === 'review');

        return `
          <div class="book-item day-row" data-date="${day.dateStr}"
            style="cursor:pointer;
              border-left:3px solid ${isComplete ? 'var(--green)' : isPartial ? 'var(--accent)' : isMissed ? 'var(--red)' : hasPlan ? 'var(--border)' : 'transparent'};
              padding-left:0.75rem;
              background:${isComplete ? 'rgba(46,125,82,0.04)' : isPartial ? 'rgba(196,98,45,0.04)' : isMissed ? 'rgba(184,50,50,0.04)' : !hasPlan ? 'repeating-linear-gradient(45deg,var(--bg3),var(--bg3) 3px,var(--bg4) 3px,var(--bg4) 6px)' : 'transparent'};
              border-radius:0 var(--radius) var(--radius) 0;margin-left:-0.25rem;">
            <div class="book-info">
              <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.15rem;">
                <span style="font-size:0.85rem;font-weight:${isToday?'600':'400'};">${DAYS[i]}, ${SCHEDULER.formatDateShort(day.dateStr)}</span>
                ${isToday ? '<span class="tag" style="font-size:0.55rem;">Today</span>' : ''}
                ${isComplete ? '<span style="font-family:var(--mono);font-size:0.62rem;color:var(--green);">✓</span>' : ''}
                ${isMissed ? '<span style="font-family:var(--mono);font-size:0.62rem;color:var(--red);">missed</span>' : ''}
                ${isPartial ? `<span style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);">${pct}%</span>` : ''}
              </div>
              ${hasPlan ? day.dayPlans.map(p => `
                <div style="font-size:0.72rem;color:${p.type === 'review' ? 'var(--blue)' : 'var(--text2)'};margin-top:0.1rem;">
                  ${p.book.title.length > 32 ? p.book.title.slice(0,32)+'…' : p.book.title}
                  <span style="color:var(--text3);font-family:var(--mono);font-size:0.63rem;">
                    · pp.${p.fromPage}–${p.toPage} ${p.type === 'review' ? '(review)' : ''}
                    ${p.pagesRead > 0 && p.pagesRead < p.pagesPlanned ? `(${p.pagesRead}p read)` : ''}
                  </span>
                </div>
              `).join('') : '<div style="font-size:0.72rem;color:var(--text3);">Rest</div>'}
              ${isPartial ? `<div class="progress-bar" style="height:2px;margin-top:0.4rem;"><div class="progress-fill" style="width:${pct}%;"></div></div>` : ''}
            </div>
            <div class="book-right" style="align-self:center;">
              ${hasPlan ? `<div class="book-pages" style="color:${isComplete ? 'var(--green)' : isMissed ? 'var(--red)' : 'var(--text2)'};">${totalPlanned}p</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Navigation
  document.getElementById('btn-prev-week')?.addEventListener('click', () => PAGES.reading(document.getElementById('main-content'), app, weekOffset - 1));
  document.getElementById('btn-next-week')?.addEventListener('click', () => PAGES.reading(document.getElementById('main-content'), app, weekOffset + 1));

  // Today log buttons
  document.querySelectorAll('.log-today-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = todayPlans[parseInt(btn.dataset.idx)];
      PAGES.showDayDetail(today, app, weekOffset);
    });
  });

  // Day click
  let _clicking = false;
  const mc = document.getElementById('main-content');
  mc._readingHandler && mc.removeEventListener('click', mc._readingHandler);
  mc._readingHandler = (e) => {
    const dayEl = e.target.closest('[data-date]');
    if (!dayEl || e.target.closest('button')) return;
    if (_clicking) return;
    _clicking = true;
    setTimeout(() => { _clicking = false; }, 500);
    PAGES.showDayDetail(dayEl.dataset.date, app, weekOffset);
  };
  mc.addEventListener('click', mc._readingHandler);
};
