// Courses Module — Library · Plan · Log
PAGES.courses = async (container, app, initialTab = 'library') => {
  let activeTab = initialTab;

  const renderShell = () => {
    container.innerHTML = `
      <div class="module-tabs">
        <button class="module-tab ${activeTab==='library'?'active':''}" data-tab="library">Library</button>
        <button class="module-tab ${activeTab==='plan'?'active':''}" data-tab="plan">Plan</button>
        <button class="module-tab ${activeTab==='log'?'active':''}" data-tab="log">Log</button>
      </div>
      <div id="module-content"></div>
    `;
    document.querySelector('.module-tabs').addEventListener('click', e => {
      const tab = e.target.dataset.tab;
      if (!tab || tab === activeTab) return;
      activeTab = tab;
      document.querySelectorAll('.module-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
      loadTab(tab);
    });
    loadTab(activeTab);
  };

  const loadTab = (tab) => {
    const inner = document.getElementById('module-content');
    if (!inner) return;
    if (tab === 'library') PAGES.coursesLibrary(inner, app);
    else if (tab === 'plan') PAGES.coursesPlan(inner, app);
    else if (tab === 'log') PAGES.coursesLog(inner, app);
  };

  renderShell();
};

// ── Courses Library ───────────────────────────────────────────
PAGES.coursesLibrary = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  let courses = [], logs = [];
  try {
    courses = await DB.query('courses', { order: 'title.asc' });
    logs = await DB.query('course_log', { order: 'date.desc' });
  } catch(e) { container.innerHTML = `<div style="color:var(--error)">${e.message}</div>`; return; }

  const episodeDone = {};
  logs.forEach(l => { episodeDone[l.course_id] = Math.max(episodeDone[l.course_id]||0, l.episode); });

  const sources = [...new Set(courses.map(c => c.source).filter(Boolean))].sort();
  let activeStatus = 'all', activeSource = 'all', searchQuery = '';

  const render = () => {
    let list = [...courses];
    if (activeStatus !== 'all') list = list.filter(c => c.status === activeStatus);
    if (activeSource !== 'all') list = list.filter(c => c.source === activeSource);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => (c.title||'').toLowerCase().includes(q) || (c.source||'').toLowerCase().includes(q) || (c.category||'').toLowerCase().includes(q));
    }
    document.getElementById('course-count').textContent = `${list.length} course${list.length!==1?'s':''}`;
    document.getElementById('course-list').innerHTML = list.length
      ? list.map(c => renderCourseCard(c)).join('')
      : '<div class="empty"><div class="empty-text">No courses match</div></div>';

    document.querySelectorAll('.btn-log-ep').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.logEpisodeModal(btn.dataset.id, app, courses, () => PAGES.coursesLibrary(container, app)); })
    );
    document.querySelectorAll('.btn-edit-course').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.editCourseModal(btn.dataset.id, app, courses, () => PAGES.coursesLibrary(container, app)); })
    );
  };

  const renderCourseCard = (c) => {
    const done = episodeDone[c.id] || 0;
    const pct = c.total_episodes ? Math.min(100, Math.round(done/c.total_episodes*100)) : null;
    const statusColors = { 'to-watch': 'gray', 'in-progress': '', completed: 'green' };
    const progress = pct !== null ? `
      <div style="margin-top:0.35rem;">
        <div style="background:var(--bg3);border-radius:2px;height:3px;overflow:hidden;">
          <div style="background:var(--accent);height:100%;width:${pct}%;"></div>
        </div>
        <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:0.15rem;">${done}/${c.total_episodes} · ${pct}%</div>
      </div>
    ` : done > 0 ? `<div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);margin-top:0.25rem;">${done} ep logged</div>` : '';

    return `
      <div class="book-item">
        <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.3rem;min-width:48px;width:48px;">🎓</div>
        <div class="book-info">
          <div class="book-title">${c.title}</div>
          <div class="book-author">${c.source||''}${c.category?' · '+c.category:''}</div>
          ${progress}
        </div>
        <div class="book-right">
          <span class="tag ${statusColors[c.status]||''}">${c.status}</span>
          <button class="btn btn-secondary btn-sm btn-log-ep" data-id="${c.id}">+ Ep</button>
          <button class="btn btn-secondary btn-sm btn-edit-course" data-id="${c.id}">Edit</button>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
      <span id="course-count" style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);">${courses.length} courses</span>
      <button class="btn btn-secondary btn-sm" id="btn-add-course">+ Add</button>
    </div>
    <div class="search-bar">
      <span class="search-icon">⌕</span>
      <input type="text" id="course-search" placeholder="Title, source, category...">
    </div>
    <div class="filter-pills" id="cs-status-pills">
      ${['all','to-watch','in-progress','completed'].map(s => `
        <button class="pill ${s==='all'?'active':''}" data-status="${s}">
          ${s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)} (${s==='all'?courses.length:courses.filter(c=>c.status===s).length})
        </button>
      `).join('')}
    </div>
    ${sources.length > 1 ? `
      <div class="filter-pills" id="cs-source-pills">
        <button class="pill active" data-src="all">All sources</button>
        ${sources.map(s=>`<button class="pill" data-src="${s}">${s}</button>`).join('')}
      </div>
    ` : ''}
    <div id="course-list"></div>
  `;

  render();
  document.getElementById('course-search').addEventListener('input', e => { searchQuery = e.target.value; render(); });
  document.getElementById('cs-status-pills').addEventListener('click', e => {
    if (!e.target.dataset.status) return;
    activeStatus = e.target.dataset.status;
    document.querySelectorAll('#cs-status-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.status === activeStatus));
    render();
  });
  document.getElementById('cs-source-pills')?.addEventListener('click', e => {
    if (!e.target.dataset.src) return;
    activeSource = e.target.dataset.src;
    document.querySelectorAll('#cs-source-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.src === activeSource));
    render();
  });
  document.getElementById('btn-add-course').addEventListener('click', () =>
    PAGES.addCourseModal(app, () => PAGES.coursesLibrary(container, app))
  );
};

// ── Courses Plan Tab ──────────────────────────────────────────
PAGES.coursesPlan = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

  let plan = [], courses = [], logs = [];
  try {
    plan    = await DB.query('course_plan', { order: 'planned_date.asc' });
    courses = await DB.query('courses',     { order: 'title.asc' });
    logs    = await DB.query('course_log',  { order: 'date.desc' });
  } catch(e) {
    container.innerHTML = `<div style="color:var(--error)">${e.message}</div>`;
    return;
  }

  const courseMap = {};
  courses.forEach(c => courseMap[c.id] = c);

  // Last episode done per course
  const lastDone = {};
  logs.forEach(l => { lastDone[l.course_id] = Math.max(lastDone[l.course_id]||0, l.episode); });

  const today = new Date().toISOString().split('T')[0];
  const upcoming = plan.filter(p => p.planned_date >= today && !p.done);
  const overdue  = plan.filter(p => p.planned_date < today && !p.done);
  const done     = plan.filter(p => p.done);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
  };

  const getWeekKey = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay() || 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - day + 1);
    return mon.toISOString().split('T')[0];
  };

  const formatWeek = (weekStart) => {
    const d = new Date(weekStart);
    const end = new Date(d); end.setDate(d.getDate() + 6);
    return `${d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} — ${end.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`;
  };

  const byWeek = {};
  upcoming.forEach(p => {
    const wk = getWeekKey(p.planned_date);
    if (!byWeek[wk]) byWeek[wk] = [];
    byWeek[wk].push(p);
  });

  const renderPlanItem = (p, showMark = true) => {
    const c = courseMap[p.course_id] || {};
    const isOverdue = !p.done && p.planned_date < today;
    const epLabel = p.episode ? `Ep ${p.episode}` : 'Episode';
    const progress = c.total_episodes && p.episode
      ? `<span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">${p.episode}/${c.total_episodes}</span>`
      : '';
    return `
      <div class="book-item" style="${p.done?'opacity:0.5':''}">
        <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.1rem;min-width:48px;width:48px;">🎓</div>
        <div class="book-info">
          <div class="book-title">${c.title||'Unknown course'}</div>
          <div class="book-author">${formatDate(p.planned_date)} · ${epLabel}${c.source?' · '+c.source:''}</div>
          <div style="display:flex;gap:0.4rem;align-items:center;margin-top:0.2rem;">
            ${progress}
            ${isOverdue?'<span style="font-family:var(--mono);font-size:0.58rem;color:var(--error);">overdue</span>':''}
            ${p.notes?`<span style="font-size:0.72rem;color:var(--text3);">${p.notes}</span>`:''}
          </div>
        </div>
        <div class="book-right" style="gap:0.3rem;">
          ${showMark && !p.done ? `<button class="btn btn-secondary btn-sm btn-mark-ep-done" data-id="${p.id}" data-course="${p.course_id}" data-ep="${p.episode||1}" title="Mark done">✓</button>` : ''}
          <button class="btn btn-secondary btn-sm btn-delete-cp" data-id="${p.id}" style="color:var(--error);">×</button>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
      <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${upcoming.length} upcoming · ${done.length} done</span>
      <button class="btn btn-secondary btn-sm" id="btn-schedule-ep">+ Schedule</button>
    </div>

    ${overdue.length ? `
      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--error);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.4rem;">Overdue (${overdue.length})</div>
      ${overdue.map(p => renderPlanItem(p)).join('')}
      <div style="height:0.75rem;"></div>
    ` : ''}

    ${upcoming.length === 0 && overdue.length === 0 ? `
      <div class="empty">
        <div style="font-size:2rem;margin-bottom:0.5rem;">🎓</div>
        <div class="empty-text">No episodes scheduled</div>
        <div style="font-size:0.82rem;color:var(--text3);margin-top:0.25rem;">Tap + Schedule to plan a session</div>
      </div>
    ` : ''}

    ${Object.keys(byWeek).sort().map(wk => `
      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;margin:0.75rem 0 0.4rem;">
        ${formatWeek(wk)}
      </div>
      ${byWeek[wk].map(p => renderPlanItem(p)).join('')}
    `).join('')}

    ${done.length ? `
      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;margin:1.5rem 0 0.4rem;cursor:pointer;" id="toggle-done-courses">
        ▶ Done (${done.length})
      </div>
      <div id="done-courses-list" style="display:none;">
        ${done.map(p => renderPlanItem(p, false)).join('')}
      </div>
    ` : ''}
  `;

  document.getElementById('toggle-done-courses')?.addEventListener('click', e => {
    const list = document.getElementById('done-courses-list');
    const visible = list.style.display !== 'none';
    list.style.display = visible ? 'none' : 'block';
    e.target.textContent = e.target.textContent.replace(visible?'▼':'▶', visible?'▶':'▼');
  });

  // Mark episode done
  document.querySelectorAll('.btn-mark-ep-done').forEach(btn =>
    btn.addEventListener('click', async () => {
      const courseId = btn.dataset.course;
      const episode  = parseInt(btn.dataset.ep);
      try {
        await DB.update('course_plan', btn.dataset.id, { done: true });
        await DB.insert('course_log', { course_id: courseId, episode, date: today });
        const c = courseMap[courseId];
        if (c) {
          if (c.status === 'to-watch') await DB.update('courses', courseId, { status: 'in-progress', updated_at: new Date().toISOString() });
          if (c.total_episodes && episode >= c.total_episodes) {
            await DB.update('courses', courseId, { status: 'completed', updated_at: new Date().toISOString() });
            app.notify('Course completed!', 'success');
          } else { app.notify('Episode done', 'success'); }
        }
        PAGES.coursesPlan(container, app);
      } catch(e) { app.notify('Error: '+e.message,'error'); }
    })
  );

  // Delete plan item
  document.querySelectorAll('.btn-delete-cp').forEach(btn =>
    btn.addEventListener('click', async () => {
      try {
        await DB.delete('course_plan', btn.dataset.id);
        PAGES.coursesPlan(container, app);
      } catch(e) { app.notify('Error: '+e.message,'error'); }
    })
  );

  // Schedule an episode
  document.getElementById('btn-schedule-ep').addEventListener('click', () => {
    const active = courses.filter(c => c.status !== 'completed');
    const nextSession = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })();

    app.showModal(`
      <div class="modal-title">Schedule Episode</div>
      <div class="form-group">
        <label>Course *</label>
        <select id="sc-course" style="font-size:0.82rem;">
          ${active.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Episode Number</label>
        <input type="number" id="sc-ep" min="1" value="1" placeholder="Leave blank for next episode">
      </div>
      <div class="form-group">
        <label>Date *</label>
        <input type="date" id="sc-date" value="${nextSession}">
      </div>
      <div class="form-group">
        <label>Notes (optional)</label>
        <input type="text" id="sc-notes" placeholder="e.g. before breakfast">
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1rem;">
        <button class="btn btn-primary" id="btn-save-cp">Schedule</button>
        <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
      </div>
    `);

    // Auto-fill next episode when course selected
    const fillNextEp = () => {
      const courseId = document.getElementById('sc-course').value;
      const next = (lastDone[courseId] || 0) + 1;
      document.getElementById('sc-ep').value = next;
    };
    fillNextEp();
    document.getElementById('sc-course').addEventListener('change', fillNextEp);

    document.getElementById('btn-save-cp').addEventListener('click', async () => {
      const courseId = document.getElementById('sc-course').value;
      const date     = document.getElementById('sc-date').value;
      const episode  = parseInt(document.getElementById('sc-ep').value) || null;
      if (!courseId || !date) { app.notify('Select a course and date','error'); return; }
      try {
        await DB.insert('course_plan', {
          course_id:    courseId,
          planned_date: date,
          episode,
          notes:        document.getElementById('sc-notes').value.trim() || null,
          done:         false,
          created_at:   new Date().toISOString()
        });

        // Write to omni_schedule_feed
        const c = courseMap[courseId];
        try {
          await DB.insert('omni_schedule_feed', {
            date:       date,
            type:       'course',
            title:      c ? `${c.title}${episode?' — Ep '+episode:''}` : 'Course episode',
            source_app: 'life',
            source_id:  courseId,
            meta:       JSON.stringify({ episode }),
            created_at: new Date().toISOString()
          });
        } catch(e) { /* omni feed optional */ }

        app.closeModal();
        app.notify('Episode scheduled','success');
        PAGES.coursesPlan(container, app);
      } catch(e) { app.notify('Error: '+e.message,'error'); }
    });
  });
};


// ── Courses Log ───────────────────────────────────────────────
PAGES.coursesLog = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  let logs = [], courses = [];
  try {
    logs = await DB.query('course_log', { order: 'date.desc' });
    courses = await DB.query('courses', { order: 'title.asc' });
  } catch(e) { container.innerHTML = `<div style="color:var(--error)">${e.message}</div>`; return; }

  const courseMap = {};
  courses.forEach(c => courseMap[c.id] = c);

  const byYear = {};
  logs.forEach(l => {
    const yr = l.date ? l.date.substring(0,4) : '—';
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(l);
  });
  const years = Object.keys(byYear).sort().reverse();

  container.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:0.75rem;">
      <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${logs.length} episodes</span>
    </div>
    ${years.length === 0 ? '<div class="empty"><div class="empty-text">No episodes logged yet</div></div>' : ''}
    ${years.map(yr => `
      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;margin:1rem 0 0.4rem;">
        ${yr} · ${byYear[yr].length} episode${byYear[yr].length!==1?'s':''}
      </div>
      ${byYear[yr].map(l => {
        const c = courseMap[l.course_id] || {};
        return `
          <div class="book-item" style="cursor:default;">
            <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.2rem;min-width:48px;width:48px;">🎓</div>
            <div class="book-info">
              <div class="book-title">${c.title||'Unknown'}</div>
              <div class="book-author">Ep ${l.episode}${c.source?' · '+c.source:''}</div>
            </div>
            <div class="book-right">
              <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${l.date}</span>
            </div>
          </div>
        `;
      }).join('')}
    `).join('')}
  `;
};

// ── Log Episode Modal ─────────────────────────────────────────
PAGES.logEpisodeModal = (courseId, app, courses, onDone) => {
  const c = courses.find(x => x.id === courseId);
  if (!c) return;
  const today = new Date().toISOString().split('T')[0];
  app.showModal(`
    <div class="modal-title">Log Episode</div>
    <div style="font-size:0.88rem;color:var(--text2);margin-bottom:1rem;">${c.title}</div>
    <div class="form-group">
      <label>Episode Number</label>
      <input type="number" id="ep-num" min="1" value="1">
    </div>
    <div class="form-group">
      <label>Date</label>
      <input type="date" id="ep-date" value="${today}">
    </div>
    <div class="form-group">
      <label>Notes (optional)</label>
      <input type="text" id="ep-notes" placeholder="Brief note...">
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-primary" id="btn-save-ep">Save</button>
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
    </div>
  `);
  document.getElementById('btn-save-ep').addEventListener('click', async () => {
    const episode = parseInt(document.getElementById('ep-num').value);
    const date = document.getElementById('ep-date').value;
    if (!episode || !date) { app.notify('Episode and date required','error'); return; }
    try {
      await DB.insert('course_log', { course_id: courseId, episode, date, notes: document.getElementById('ep-notes').value.trim()||null });
      if (c.status === 'to-watch') await DB.update('courses', courseId, { status: 'in-progress', updated_at: new Date().toISOString() });
      if (c.total_episodes && episode >= c.total_episodes) {
        await DB.update('courses', courseId, { status: 'completed', updated_at: new Date().toISOString() });
        app.notify('Course completed!','success');
      } else { app.notify('Episode logged','success'); }
      app.closeModal();
      if (onDone) onDone();
    } catch(e) { app.notify('Error: '+e.message,'error'); }
  });
};

// ── Add Course Modal ──────────────────────────────────────────
PAGES.addCourseModal = (app, onDone) => {
  app.showModal(`
    <div class="modal-title">Add Course</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Title *</label>
        <input id="ac-title" placeholder="Course or series title">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Source</label>
        <input id="ac-source" placeholder="MasterClass, Yale...">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Category</label>
        <input id="ac-cat" placeholder="Cinema, History...">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Total Episodes</label>
        <input id="ac-eps" type="number" placeholder="Leave blank if unknown">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Status</label>
        <select id="ac-status">
          <option value="to-watch">To Watch</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-primary" id="btn-save-course">Add</button>
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
    </div>
  `);
  document.getElementById('btn-save-course').addEventListener('click', async () => {
    const title = document.getElementById('ac-title').value.trim();
    if (!title) { app.notify('Title required','error'); return; }
    try {
      await DB.insert('courses', {
        title, source: document.getElementById('ac-source').value.trim()||null,
        category: document.getElementById('ac-cat').value.trim()||null,
        total_episodes: parseInt(document.getElementById('ac-eps').value)||null,
        status: document.getElementById('ac-status').value,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      });
      app.closeModal(); app.notify('Course added','success');
      if (onDone) onDone();
    } catch(e) { app.notify('Error: '+e.message,'error'); }
  });
};

// ── Edit Course Modal ─────────────────────────────────────────
PAGES.editCourseModal = (courseId, app, courses, onDone) => {
  const c = courses.find(x => x.id === courseId);
  if (!c) return;
  const v = s => (s||'').replace(/"/g,'&quot;');
  app.showModal(`
    <div class="modal-title">Edit Course</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Title</label>
        <input id="ec-title" value="${v(c.title)}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Source</label>
        <input id="ec-source" value="${v(c.source)}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Category</label>
        <input id="ec-cat" value="${v(c.category)}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Total Episodes</label>
        <input id="ec-eps" type="number" value="${c.total_episodes||''}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Status</label>
        <select id="ec-status">
          ${['to-watch','in-progress','completed'].map(s=>`<option value="${s}" ${c.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-primary" id="btn-update-course">Save</button>
      <button class="btn btn-secondary btn-sm" id="btn-delete-course" style="margin-left:auto;color:var(--error);">Delete</button>
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
    </div>
  `);
  document.getElementById('btn-update-course').addEventListener('click', async () => {
    const title = document.getElementById('ec-title').value.trim();
    if (!title) { app.notify('Title required','error'); return; }
    try {
      await DB.update('courses', courseId, {
        title, source: document.getElementById('ec-source').value.trim()||null,
        category: document.getElementById('ec-cat').value.trim()||null,
        total_episodes: parseInt(document.getElementById('ec-eps').value)||null,
        status: document.getElementById('ec-status').value,
        updated_at: new Date().toISOString()
      });
      app.closeModal(); app.notify('Updated','success');
      if (onDone) onDone();
    } catch(e) { app.notify('Error: '+e.message,'error'); }
  });
  document.getElementById('btn-delete-course').addEventListener('click', async () => {
    if (!confirm(`Delete "${c.title}"?`)) return;
    try {
      await DB.delete('courses', courseId);
      app.closeModal(); app.notify('Deleted','success');
      if (onDone) onDone();
    } catch(e) { app.notify('Error: '+e.message,'error'); }
  });
};
