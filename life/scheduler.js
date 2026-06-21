// Laith Life Manager - Scheduling Engine v4 (defensive)
const SCHEDULER = {

  DAYS: ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],

  formatDate(d) {
    if (typeof d === 'string') d = new Date(d + 'T12:00:00');
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  },

  formatDateDisplay(s) {
    if (!s) return '—';
    const d = new Date(s + 'T12:00:00');
    return d.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
  },

  formatDateShort(s) {
    if (!s) return '—';
    const d = new Date(s + 'T12:00:00');
    const thisYear = new Date().getFullYear();
    if (d.getFullYear() !== thisYear) {
      return d.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
    }
    return d.toLocaleDateString('en-GB', {day:'numeric', month:'short'});
  },

  addDays(s, n) {
    const d = new Date(s + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return this.formatDate(d);
  },

  getWeekBounds(offset = 0) {
    const today = new Date();
    const dow = today.getDay(); // 0=Sun
    const diff = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(today);
    mon.setDate(today.getDate() + diff + offset * 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: this.formatDate(mon), end: this.formatDate(sun) };
  },

  getPagesForDate(dateStr, routine, calRules) {
    const d = new Date(dateStr + 'T12:00:00');
    const dayName = this.DAYS[d.getDay()];
    for (const r of (calRules || [])) {
      if (dateStr >= r.start_date && dateStr <= r.end_date) {
        if (r.rule_type === 'no-reading') return 0;
        if (r.rule_type === 'max-pages') return Math.min(parseInt(routine[dayName])||0, r.max_pages_per_day||0);
      }
    }
    return parseInt(routine[dayName]) || 0;
  },

  getReviewPagesForDate(dateStr, rev, calRules) {
    const d = new Date(dateStr + 'T12:00:00');
    const dayName = this.DAYS[d.getDay()];
    if (!rev[dayName]) return 0;
    for (const r of (calRules || [])) {
      if (dateStr >= r.start_date && dateStr <= r.end_date) {
        if (r.rule_type === 'no-reading') return 0;
        if (r.rule_type === 'max-pages') return Math.min(parseInt(rev.pages_per_day)||40, r.max_pages_per_day||0);
      }
    }
    return parseInt(rev.pages_per_day) || 40;
  },

  _applyRules(dateStr, calRules, basePages, ignoreRoutineRest) {
    for (const r of (calRules || [])) {
      if (dateStr >= r.start_date && dateStr <= r.end_date) {
        if (r.rule_type === 'no-reading') return 0;
        if (r.rule_type === 'max-pages') return Math.min(basePages, r.max_pages_per_day || basePages);
      }
    }
    return basePages;
  },

  // Count available reading days in a range
  countReadingDays(startDate, endDate, routine, calRules, everyDay) {
    let count = 0, d = startDate;
    while (d <= endDate) {
      const dayName = this.DAYS[new Date(d + 'T12:00:00').getDay()];
      const base = everyDay ? 1 : (parseInt(routine[dayName]) || 0);
      let blocked = false;
      for (const r of (calRules || [])) {
        if (d >= r.start_date && d <= r.end_date && r.rule_type === 'no-reading') { blocked = true; break; }
      }
      if (base > 0 && !blocked) count++;
      d = this.addDays(d, 1);
    }
    return count;
  },

  // Build plan for one book — returns {plan, readStart, readEnd, reviewStart, reviewEnd}
  buildBookPlan(book, queueItem, phases, routine, rev, calRules, startDate) {
    const totalPages = parseInt(book.pages) || 200;
    const startPage = parseInt(queueItem.start_page) || 1;
    const currentPage = parseInt(queueItem.current_page) || startPage;
    const pagesLeft = Math.max(1, totalPages - Math.max(startPage, currentPage) + 1);

    const plan = [];
    let page = Math.max(startPage, Math.min(currentPage, totalPages));
    let date = startDate;
    const MAX = 800;

    // Determine effective phases
    const activePhases = (phases && phases.length > 0)
      ? phases
      : [{ phase_type: 'routine', duration_days: null }];

    // Pre-calculate finish_by daily pages
    const resolvedPhases = activePhases.map(ph => {
      if (ph.phase_type === 'finish_by' && ph.finish_by_date) {
        const avail = this.countReadingDays(date, ph.finish_by_date, routine, calRules, ph.every_day || false);
        const dpd = avail > 0 ? Math.ceil(pagesLeft / avail) : Math.ceil(pagesLeft / 7);
        return { ...ph, _resolvedDaily: dpd };
      }
      return ph;
    });

    let daysUsed = 0;

    for (let pi = 0; pi < resolvedPhases.length && page <= totalPages; pi++) {
      const ph = resolvedPhases[pi];
      const isLast = pi === resolvedPhases.length - 1;
      const phaseDays = ph.duration_days || (isLast ? MAX : 30);
      let phDaysUsed = 0;

      while (page <= totalPages && phDaysUsed < phaseDays && daysUsed < MAX) {
        let pp = 0;
        if (ph.phase_type === 'routine') {
          pp = this.getPagesForDate(date, routine, calRules);
        } else if (ph.phase_type === 'custom') {
          // Custom respects routine rest days unless every_day is set
          const dayName = this.DAYS[new Date(date + 'T12:00:00').getDay()];
          const isRestDay = !ph.every_day && (parseInt(routine[dayName]) || 0) === 0;
          pp = isRestDay ? 0 : this._applyRules(date, calRules, parseInt(ph.daily_pages) || 15, false);
        } else if (ph.phase_type === 'intensive') {
          pp = this._applyRules(date, calRules, parseInt(ph.daily_pages) || 20, true);
        } else if (ph.phase_type === 'finish_by') {
          const everyDay = ph.every_day || false;
          const dayName = this.DAYS[new Date(date + 'T12:00:00').getDay()];
          const isRestDay = !everyDay && (parseInt(routine[dayName]) || 0) === 0;
          pp = isRestDay ? 0 : this._applyRules(date, calRules, ph._resolvedDaily || 20, everyDay);
          // Stop this phase at finish_by_date
          if (ph.finish_by_date && date > ph.finish_by_date) break;
        }

        if (pp > 0) {
          const from = page;
          const to = Math.min(page + pp - 1, totalPages);
          plan.push({date, fromPage:from, toPage:to, pages:to-from+1, type:'reading', phaseName: ph.label||''});
          page = to + 1;
        } else {
          plan.push({date, fromPage:page, toPage:page, pages:0, type:'rest'});
        }
        date = this.addDays(date, 1);
        phDaysUsed++;
        daysUsed++;
      }
    }

    // Fallback: if nothing worked (all-zero routine), spread evenly over 60 days
    if (page <= totalPages) {
      const remaining = totalPages - page + 1;
      const perDay = Math.ceil(remaining / 60);
      for (let i = 0; i < 60 && page <= totalPages; i++) {
        const from = page;
        const to = Math.min(page + perDay - 1, totalPages);
        plan.push({date, fromPage:from, toPage:to, pages:to-from+1, type:'reading'});
        page = to + 1;
        date = this.addDays(date, 1);
      }
    }

    const readingDays = plan.filter(p => p.type==='reading' && p.pages>0);
    const readEnd = readingDays.length ? readingDays[readingDays.length-1].date : startDate;

    // Review
    const reviewStart = this.addDays(readEnd, 1);
    date = reviewStart;
    let rPage = 1; // Review always starts from page 1, regardless of where reading started
    let days = 0;
    while (rPage <= totalPages && days < 200) {
      let pp = this.getReviewPagesForDate(date, rev, calRules);
      if (pp > 0) {
        const from = rPage;
        const to = Math.min(rPage + pp - 1, totalPages);
        plan.push({date, fromPage:from, toPage:to, pages:to-from+1, type:'review'});
        rPage = to + 1;
      } else {
        plan.push({date, fromPage:rPage, toPage:rPage, pages:0, type:'review-rest'});
      }
      date = this.addDays(date, 1);
      days++;
    }

    const reviewDays = plan.filter(p => p.type==='review' && p.pages>0);
    const reviewEnd = reviewDays.length ? reviewDays[reviewDays.length-1].date : readEnd;

    return {plan, readStart:startDate, readEnd, reviewStart, reviewEnd};
  },

  buildYearSchedule(queue, phases, routine, rev, calRules, forYear) {
    const schedule = [];
    const today = this.formatDate(new Date());
    const currentYear = new Date().getFullYear();
    const targetYear = forYear || currentYear;
    const isFutureYear = targetYear > currentYear;
    const isPastYear = targetYear < currentYear;

    // cursor = start date for next book in sequence
    // Current year: first book starts today, each subsequent book starts after previous ends
    // Future/past year: first book starts Jan 1 of that year
    let cursor = (isFutureYear || isPastYear) ? `${targetYear}-01-01` : today;

    const sortedQueue = [...queue].sort((a, b) => (a.position||0) - (b.position||0));

    for (const item of sortedQueue) {
      const book = item.book;
      if (!book || !book.pages) continue;

      // Simple rule: pinned = use that date; otherwise = use cursor
      // Never start before today for current year
      let startDate;
      if (item.pinned_start_date) {
        startDate = item.pinned_start_date;
        if (!isFutureYear && !isPastYear && startDate < today) startDate = today;
      } else {
        startDate = cursor;
      }

      const itemPhases = (phases || [])
        .filter(p => p.queue_id === item.id)
        .sort((a, b) => a.position - b.position);

      const {plan, readStart, readEnd, reviewStart, reviewEnd} = this.buildBookPlan(
        book, item, itemPhases, routine, rev, calRules, startDate
      );

      const cp = parseInt(item.current_page) || parseInt(item.start_page) || 1;
      const sp = parseInt(item.start_page) || 1;
      const pct = book.pages > 1
        ? Math.min(100, Math.max(0, Math.round(((cp - sp) / (book.pages - sp)) * 100)))
        : 0;

      schedule.push({
        queueId: item.id,
        bookId: book.id,
        title: book.title,
        author: book.author,
        pages: book.pages,
        startPage: sp,
        currentPage: cp,
        pct,
        readStart, readEnd, reviewStart, reviewEnd,
        plan,
        pinnedStartDate: item.pinned_start_date,
        isMain: !!item.is_main
      });

      // Advance cursor: next book starts the day after this book's review ends
      if (!item.pinned_start_date) {
        const nextStart = this.addDays(reviewEnd, 1);
        cursor = nextStart;
      }
    }
    return schedule;
  },

  getPlanForDate(schedItem, dateStr) {
    return schedItem.plan ? schedItem.plan.find(p => p.date === dateStr) || null : null;
  },

  getTodayPlans(schedule, readingLog) {
    const today = this.formatDate(new Date());
    const plans = [];
    for (const s of schedule) {
      const entry = this.getPlanForDate(s, today);
      if (!entry || entry.pages === 0) continue;
      if (entry.type !== 'reading' && entry.type !== 'review') continue;
      const logged = readingLog.find(l =>
        l.date === today && l.book_id === s.bookId && l.is_review === (entry.type === 'review')
      );
      plans.push({
        type: entry.type, book: s,
        fromPage: entry.fromPage, toPage: entry.toPage,
        pagesPlanned: entry.pages,
        pagesRead: logged ? (logged.pages_read || 0) : 0,
        logged: !!logged, logId: logged ? logged.id : null
      });
    }
    return plans;
  },

  getWeekPlans(schedule, readingLog, weekStart) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = this.addDays(weekStart, i);
      const dayPlans = [];
      for (const s of schedule) {
        const entry = this.getPlanForDate(s, dateStr);
        if (!entry || entry.pages === 0) continue;
        if (entry.type !== 'reading' && entry.type !== 'review') continue;
        const logged = readingLog.find(l =>
          l.date === dateStr && l.book_id === s.bookId && l.is_review === (entry.type === 'review')
        );
        dayPlans.push({
          type: entry.type, book: s,
          fromPage: entry.fromPage, toPage: entry.toPage,
          pagesPlanned: entry.pages,
          pagesRead: logged ? (logged.pages_read || 0) : 0,
          logged: !!logged, logId: logged ? logged.id : null
        });
      }
      days.push({dateStr, dayPlans});
    }
    return days;
  },

  calculateStreak(readingLog) {
    const today = this.formatDate(new Date());
    const dates = new Set(readingLog.filter(l => !l.is_review && l.pages_read > 0).map(l => l.date));
    let streak = 0, check = today;
    while (dates.has(check) && streak < 400) {
      streak++;
      check = this.addDays(check, -1);
    }
    return streak;
  }
};
