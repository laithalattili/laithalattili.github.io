// Book Schedule Modal — phases, start/end dates, everyday toggle

PAGES.openBookSchedule = async (queueId, app) => {
  const queueItem = app.yearQueue.find(q => q.id === queueId);
  if (!queueItem) return;
  const book = queueItem.book;
  const existingPhases = app.phases.filter(p => p.queue_id === queueId).sort((a,b) => a.position - b.position);

  // Local state for editing
  let phases = existingPhases.length > 0
    ? existingPhases.map(p => ({ ...p }))
    : [{ id: null, queue_id: queueId, position: 1, label: 'Normal', phase_type: 'routine', daily_pages: null, every_day: false, finish_by_date: null, duration_days: null }];

  const renderPhaseRow = (ph, idx, total) => `
    <div class="phase-row" data-idx="${idx}" style="background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; margin-bottom: 0.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${total > 1 ? `
            <button class="icon-btn phase-up" data-idx="${idx}" style="font-size: 0.65rem; width: 22px; height: 22px; ${idx === 0 ? 'opacity:0.2;pointer-events:none' : ''}">▲</button>
            <button class="icon-btn phase-down" data-idx="${idx}" style="font-size: 0.65rem; width: 22px; height: 22px; ${idx === total-1 ? 'opacity:0.2;pointer-events:none' : ''}">▼</button>
          ` : ''}
          <span style="font-family: var(--mono); font-size: 0.68rem; color: var(--text3); letter-spacing: 0.06em; text-transform: uppercase;">Phase ${idx + 1}</span>
        </div>
        ${total > 1 ? `<button class="icon-btn phase-delete" data-idx="${idx}" style="font-size: 0.7rem; color: var(--text3);">✕</button>` : ''}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 0.6rem;">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Phase name</label>
          <input class="phase-label" data-idx="${idx}" value="${ph.label || 'Normal'}" placeholder="e.g. Normal, Intensive">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>Type</label>
          <select class="phase-type" data-idx="${idx}">
            <option value="routine" ${ph.phase_type === 'routine' ? 'selected' : ''}>Follow routine</option>
            <option value="custom" ${ph.phase_type === 'custom' ? 'selected' : ''}>Custom pages/day</option>
            <option value="intensive" ${ph.phase_type === 'intensive' ? 'selected' : ''}>Intensive (every day)</option>
            <option value="finish_by" ${ph.phase_type === 'finish_by' ? 'selected' : ''}>Finish by date</option>
          </select>
        </div>
      </div>

      <div class="phase-extras-${idx}" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
        ${ph.phase_type === 'routine' ? `
          <div class="form-group" style="margin-bottom: 0; grid-column: 1/-1;">
            <label>Number of reading days in this phase — leave blank for "until book ends"</label>
            <input class="phase-duration" data-idx="${idx}" type="number" min="1" value="${ph.duration_days || ''}" placeholder="e.g. 14">
          </div>
        ` : ph.phase_type === 'custom' ? `
          <div class="form-group" style="margin-bottom: 0;">
            <label>Pages per day</label>
            <input class="phase-daily" data-idx="${idx}" type="number" min="1" value="${ph.daily_pages || ''}" placeholder="e.g. 25">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>Duration (days)</label>
            <input class="phase-duration" data-idx="${idx}" type="number" min="1" value="${ph.duration_days || ''}" placeholder="e.g. 14">
          </div>
        ` : ph.phase_type === 'intensive' ? `
          <div class="form-group" style="margin-bottom: 0;">
            <label>Pages per day</label>
            <input class="phase-daily" data-idx="${idx}" type="number" min="1" value="${ph.daily_pages || ''}" placeholder="e.g. 40">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>Duration (days)</label>
            <input class="phase-duration" data-idx="${idx}" type="number" min="1" value="${ph.duration_days || ''}" placeholder="e.g. 10">
          </div>
        ` : ph.phase_type === 'finish_by' ? `
          <div class="form-group" style="margin-bottom: 0;">
            <label>Finish by date</label>
            <input class="phase-finish-by" data-idx="${idx}" type="date" value="${ph.finish_by_date || ''}">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; text-transform: none; letter-spacing: 0; font-size: 0.82rem; color: var(--text2);">
              <input type="checkbox" class="phase-everyday" data-idx="${idx}" ${ph.every_day ? 'checked' : ''} style="width: auto;">
              Read every day (no rest days)
            </label>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  const renderModal = () => {
    // Calculate default start date from schedule
  const schedItem = app.schedule.find(s => s.queueId === queueId);
  const defaultStart = queueItem.pinned_start_date || schedItem?.readStart || SCHEDULER.formatDate(new Date());
  const existingPin = queueItem.pinned_start_date || '';
    return `
      <div class="modal-title" style="font-family: var(--serif);">${book?.title || 'Book'}</div>
      <div style="font-size: 0.8rem; color: var(--text2); margin-bottom: 1.5rem;">${book?.author || ''} · ${book?.pages || '?'} pages</div>

      <div style="font-family: var(--mono); font-size: 0.68rem; color: var(--text3); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.75rem;">Start Date</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1.5rem;">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Pin start date (optional)</label>
          <input type="date" id="sched-start-date" value="${existingPin || defaultStart}" placeholder="${defaultStart}">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>Start on page</label>
          <input type="number" id="sched-start-page" min="1" value="${queueItem.start_page || 1}" placeholder="1">
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <div style="font-family: var(--mono); font-size: 0.68rem; color: var(--text3); letter-spacing: 0.08em; text-transform: uppercase;">Reading Phases</div>
        <button class="btn btn-secondary btn-sm" id="btn-add-phase">+ Add Phase</button>
      </div>

      <div id="phases-container">
        ${phases.map((ph, idx) => renderPhaseRow(ph, idx, phases.length)).join('')}
      </div>

      <div style="background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.75rem; margin-bottom: 1.5rem; font-family: var(--mono); font-size: 0.68rem; color: var(--text3); line-height: 1.7;" id="sched-preview">
        Calculating...
      </div>

      <div class="modal-actions">
        <button class="btn btn-danger btn-sm" id="btn-clear-sched">Reset to default</button>
        <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-sched">Save Schedule</button>
      </div>
    `;
  };

  const rebuildPreview = () => {
    const startDate = document.getElementById('sched-start-date')?.value || SCHEDULER.formatDate(new Date());
    const startPage = parseInt(document.getElementById('sched-start-page')?.value) || 1;
    const pages = book?.pages || 200;
    const pagesLeft = pages - startPage + 1;

    // Quick estimate
    if (phases.length === 1 && phases[0].phase_type === 'routine') {
      const weeklyPages = Object.values(app.routine).reduce((s, v) => s + (parseInt(v) || 0), 0);
      if (weeklyPages > 0) {
        const weeksNeeded = Math.ceil(pagesLeft / weeklyPages);
        const finishDate = SCHEDULER.addDays(startDate, weeksNeeded * 7);
        document.getElementById('sched-preview').innerHTML =
          `At your routine pace · ${weeksNeeded} weeks · Finish ~${SCHEDULER.formatDateDisplay(finishDate)}`;
      }
    } else {
      let totalDays = 0;
      let remaining = pagesLeft;
      for (const ph of phases) {
        if (remaining <= 0) break;
        const dpd = parseInt(ph.daily_pages) || 15;
        const dur = parseInt(ph.duration_days) || Math.ceil(remaining / Math.max(1, dpd));
        const pagesInPhase = Math.min(remaining, dpd * dur);
        remaining -= pagesInPhase;
        totalDays += dur;
      }
      const finishDate = SCHEDULER.addDays(startDate, totalDays);
      document.getElementById('sched-preview').innerHTML =
        `${phases.length} phase${phases.length > 1 ? 's' : ''} · ~${totalDays} days · Finish ~${SCHEDULER.formatDateDisplay(finishDate)}`;
    }
  };

  const readFromDOM = () => {
    phases = phases.map((ph, idx) => ({
      ...ph,
      label: document.querySelector(`.phase-label[data-idx="${idx}"]`)?.value || ph.label,
      phase_type: document.querySelector(`.phase-type[data-idx="${idx}"]`)?.value || ph.phase_type,
      daily_pages: parseInt(document.querySelector(`.phase-daily[data-idx="${idx}"]`)?.value) || null,
      duration_days: parseInt(document.querySelector(`.phase-duration[data-idx="${idx}"]`)?.value) || null,
      finish_by_date: document.querySelector(`.phase-finish-by[data-idx="${idx}"]`)?.value || null,
      every_day: document.querySelector(`.phase-everyday[data-idx="${idx}"]`)?.checked || false
    }));
  };

  const rerender = () => {
    readFromDOM();
    document.getElementById('phases-container').innerHTML =
      phases.map((ph, idx) => renderPhaseRow(ph, idx, phases.length)).join('');
    bindPhaseEvents();
    rebuildPreview();
  };

  const bindPhaseEvents = () => {
    document.querySelectorAll('.phase-type').forEach(sel => {
      sel.addEventListener('change', rerender);
    });
    document.querySelectorAll('.phase-up').forEach(btn => {
      btn.addEventListener('click', () => {
        readFromDOM();
        const i = parseInt(btn.dataset.idx);
        if (i === 0) return;
        [phases[i-1], phases[i]] = [phases[i], phases[i-1]];
        document.getElementById('phases-container').innerHTML =
          phases.map((ph, idx) => renderPhaseRow(ph, idx, phases.length)).join('');
        bindPhaseEvents();
      });
    });
    document.querySelectorAll('.phase-down').forEach(btn => {
      btn.addEventListener('click', () => {
        readFromDOM();
        const i = parseInt(btn.dataset.idx);
        if (i >= phases.length - 1) return;
        [phases[i], phases[i+1]] = [phases[i+1], phases[i]];
        document.getElementById('phases-container').innerHTML =
          phases.map((ph, idx) => renderPhaseRow(ph, idx, phases.length)).join('');
        bindPhaseEvents();
      });
    });
    document.querySelectorAll('.phase-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        readFromDOM();
        const i = parseInt(btn.dataset.idx);
        phases.splice(i, 1);
        document.getElementById('phases-container').innerHTML =
          phases.map((ph, idx) => renderPhaseRow(ph, idx, phases.length)).join('');
        bindPhaseEvents();
        rebuildPreview();
      });
    });
    document.querySelectorAll('.phase-daily, .phase-duration, .phase-finish-by, .phase-label').forEach(inp => {
      inp.addEventListener('input', rebuildPreview);
    });
  };

  const overlay = app.showModal(renderModal());

  bindPhaseEvents();
  rebuildPreview();

  document.getElementById('btn-add-phase').addEventListener('click', () => {
    readFromDOM();
    phases.push({ id: null, queue_id: queueId, position: phases.length + 1, label: 'Phase ' + (phases.length + 1), phase_type: 'routine', daily_pages: null, every_day: false, finish_by_date: null, duration_days: null });
    document.getElementById('phases-container').innerHTML =
      phases.map((ph, idx) => renderPhaseRow(ph, idx, phases.length)).join('');
    bindPhaseEvents();
    rebuildPreview();
  });

  document.getElementById('btn-clear-sched').addEventListener('click', async () => {
    if (!confirm('Reset to default schedule (one phase, global routine)?')) return;
    try {
      // Delete all existing phases for this queue item
      const existing = app.phases.filter(p => p.queue_id === queueId);
      for (const p of existing) await DB.delete('book_phases', p.id);
      await DB.update('yearly_queue', queueId, { pinned_start_date: null, start_page: 1, current_page: 1 });
      app.closeModal();
      app.notify('Schedule reset to default', 'success');
      await app.refreshData();
      PAGES.year(document.getElementById('main-content'), app);
    } catch (e) { app.notify('Failed: ' + e.message, 'error'); }
  });

  document.getElementById('sched-start-date').addEventListener('change', () => {
    const newStart = document.getElementById('sched-start-date').value;
    if (!newStart) return;
    // Check for overlaps with other books
    const conflicts = app.schedule.filter(s =>
      s.queueId !== queueId &&
      newStart >= s.readStart && newStart <= s.reviewEnd
    );
    const preview = document.getElementById('sched-preview');
    if (conflicts.length > 0) {
      preview.innerHTML = `<span style="color: var(--accent);">⚠ Overlaps with: ${conflicts.map(s => s.title.split(':')[0]).join(', ')}</span><br>
        <span style="font-size: 0.9em;">Books can run in parallel — pages will be tracked separately per book.</span>`;
    }
  });

  document.getElementById('btn-save-sched').addEventListener('click', async () => {
    readFromDOM();
    const startDate = document.getElementById('sched-start-date').value || null;
    const startPage = parseInt(document.getElementById('sched-start-page').value) || 1;

    try {
      // Save queue item updates
      await DB.update('yearly_queue', queueId, {
        pinned_start_date: startDate || null,
        start_page: startPage,
        current_page: startPage
      });

      // Delete old phases and re-insert
      const existing = app.phases.filter(p => p.queue_id === queueId);
      for (const p of existing) await DB.delete('book_phases', p.id);

      // Only save phases if more than the default single routine phase
      const isDefault = phases.length === 1 && phases[0].phase_type === 'routine' && !phases[0].duration_days;
      if (!isDefault) {
        for (let i = 0; i < phases.length; i++) {
          const ph = phases[i];
          await DB.insert('book_phases', {
            queue_id: queueId,
            position: i + 1,
            label: ph.label || 'Phase ' + (i + 1),
            phase_type: ph.phase_type,
            daily_pages: ph.daily_pages || null,
            every_day: ph.every_day || false,
            finish_by_date: ph.finish_by_date || null,
            duration_days: ph.duration_days || null
          });
        }
      }

      app.closeModal();
      app.notify('Schedule saved ✓', 'success');
      await app.refreshData();

      // Write reading plan to omni_schedule_feed
      // Do this after refreshData so we have the latest queue/phases
      try {
        const sbUrl = CONFIG.supabase.url;
        const sbKey = CONFIG.supabase.key;
        const sbHeaders = {
          'apikey': sbKey,
          'Authorization': `Bearer ${sbKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        };

        const freshQueue = app.yearQueue.find(q => q.id === queueId);
        const freshBook = freshQueue?.book || book;

        console.log('[Omni] freshQueue:', freshQueue?.id, 'freshBook:', freshBook?.title, 'pages:', freshBook?.pages);

        if (!freshQueue || !freshBook) {
          console.warn('[Omni] Missing freshQueue or freshBook — skipping feed write');
        } else if (!freshBook.pages) {
          console.warn('[Omni] Book has no page count — cannot build plan for feed');
        } else {
          const freshPhases = app.phases
            .filter(p => p.queue_id === queueId)
            .sort((a,b) => a.position - b.position);
          const effectivePhases = freshPhases.length ? freshPhases : phases;

          // Read startDate from DOM — outer scope var may be const-shadowed
          const savedStartDate = document.getElementById('sched-start-date')?.value
            || freshQueue.pinned_start_date
            || SCHEDULER.formatDate(new Date());

          console.log('[Omni] Building plan: start=', savedStartDate, 'phases=', effectivePhases.length);

          // buildBookPlan(book, queueItem, phases, routine, rev, calRules, startDate)
          const planResult = SCHEDULER.buildBookPlan(
            freshBook,
            freshQueue,
            effectivePhases,
            app.routine || {},
            app.reviewRoutine || {},
            app.calRules || [],
            savedStartDate
          );

          console.log('[Omni] Plan result:', planResult ? `${planResult.plan?.length} days` : 'null');

          if (planResult && planResult.plan) {
            const { plan, reviewStart } = planResult;

            // Delete old feed entries for this book
            const delRes = await fetch(
              `${sbUrl}/rest/v1/omni_schedule_feed?source_id=eq.${freshBook.id}&type=eq.reading`,
              { method: 'DELETE', headers: sbHeaders }
            );
            console.log('[Omni] Delete old entries:', delRes.status);

            // Write each reading day
          // Scheduler uses 'pages' field, not 'pagesPlanned'
          const activeDays = plan.filter(d =>
            (d.type === 'reading' || d.type === 'review') && d.pages > 0
          );
          console.log('[Omni] Plan day types:', plan.map(d => d.type + ':' + d.pages).join(', '));
          console.log('[Omni] Writing', activeDays.length, 'active days');

          for (const day of activeDays) {
            const postRes = await fetch(`${sbUrl}/rest/v1/omni_schedule_feed`, {
              method: 'POST',
              headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
              body: JSON.stringify({
                date: day.date,
                type: day.type === 'review' ? 'reading-review' : 'reading',
                title: freshBook.title,
                source_app: 'life',
                source_id: freshBook.id,
                meta: JSON.stringify({
                  fromPage: day.fromPage,
                  toPage: day.toPage,
                  pagesPlanned: day.pages,
                  totalPages: freshBook.pages || null,
                  currentPage: freshQueue.current_page || freshQueue.start_page || 1,
                  reviewStart: reviewStart || null,
                  isReview: day.type === 'review'
                }),
                created_at: new Date().toISOString()
              })
            });
            if (!postRes.ok) console.warn('[Omni] POST failed:', postRes.status, await postRes.text());
          }
            console.log(`[Omni] Done — wrote ${readingDays.length} reading days for "${freshBook.title}"`);
          }
        }
      } catch (omniErr) {
        console.error('[Omni] omni_schedule_feed write failed:', omniErr.message, omniErr.stack);
      }

      PAGES.year(document.getElementById('main-content'), app);
    } catch (e) { app.notify('Failed: ' + e.message, 'error'); }
  });
};
