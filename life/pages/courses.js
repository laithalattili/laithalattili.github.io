// Courses Page
PAGES.courses = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading courses...</div>';

  let courses = [], courseLogs = [];
  try {
    courses = await DB.query('courses', { order: 'title.asc' });
    courseLogs = await DB.query('course_log', { order: 'date.desc' });
  } catch(e) {
    container.innerHTML = `<div class="card" style="color:var(--error)">Failed to load courses: ${e.message}</div>`;
    return;
  }

  // Build episode count per course
  const episodeCounts = {};
  const lastEpisode = {};
  courseLogs.forEach(l => {
    if (!episodeCounts[l.course_id]) episodeCounts[l.course_id] = 0;
    episodeCounts[l.course_id] = Math.max(episodeCounts[l.course_id], l.episode);
    if (!lastEpisode[l.course_id]) lastEpisode[l.course_id] = l;
  });

  const sources = [...new Set(courses.map(c => c.source).filter(Boolean))].sort();
  const categories = [...new Set(courses.map(c => c.category).filter(Boolean))].sort();

  let activeStatus = 'all';
  let activeSource = 'all';
  let searchQuery = '';

  const progressPct = (c) => {
    if (!c.total_episodes) return null;
    const done = episodeCounts[c.id] || 0;
    return Math.min(100, Math.round((done / c.total_episodes) * 100));
  };

  const render = () => {
    let list = [...courses];
    if (activeStatus !== 'all') list = list.filter(c => c.status === activeStatus);
    if (activeSource !== 'all') list = list.filter(c => c.source === activeSource);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        (c.title||'').toLowerCase().includes(q) ||
        (c.source||'').toLowerCase().includes(q) ||
        (c.category||'').toLowerCase().includes(q)
      );
    }
    document.getElementById('course-count').textContent = `${list.length} course${list.length!==1?'s':''}`;
    document.getElementById('course-list').innerHTML = list.length
      ? list.map(c => renderCourseItem(c)).join('')
      : '<div class="empty"><div class="empty-text">No courses match your filters</div></div>';

    document.querySelectorAll('.btn-log-episode').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.logEpisode(btn.dataset.id, app, courses); })
    );
    document.querySelectorAll('.btn-edit-course').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.editCourse(btn.dataset.id, app, courses); })
    );
  };

  const renderCourseItem = (c) => {
    const pct = progressPct(c);
    const done = episodeCounts[c.id] || 0;
    const statusColors = { 'to-watch': 'gray', 'in-progress': '', completed: 'green' };
    const progressBar = pct !== null ? `
      <div style="margin-top:0.4rem;">
        <div style="background:var(--bg3);border-radius:2px;height:3px;overflow:hidden;">
          <div style="background:var(--accent);height:100%;width:${pct}%;transition:width 0.3s;"></div>
        </div>
        <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:0.2rem;">${done}/${c.total_episodes} episodes · ${pct}%</div>
      </div>
    ` : done > 0 ? `<div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);margin-top:0.3rem;">${done} episodes logged</div>` : '';

    return `
      <div class="book-item">
        <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.4rem;min-width:48px;width:48px;">🎓</div>
        <div class="book-info">
          <div class="book-title">${c.title}</div>
          <div class="book-author">${c.source||''}${c.category ? ' · '+c.category : ''}</div>
          ${progressBar}
        </div>
        <div class="book-right">
          <span class="tag ${statusColors[c.status]||''}">${c.status}</span>
          <button class="btn btn-secondary btn-sm btn-log-episode" data-id="${c.id}">+ Ep</button>
          <button class="btn btn-secondary btn-sm btn-edit-course" data-id="${c.id}">Edit</button>
        </div>
      </div>
    `;
  };

  const statuses = ['all','to-watch','in-progress','completed'];

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.2rem;">
      <div class="page-title">Courses</div>
      <div style="display:flex;gap:0.5rem;">
        <button class="btn btn-secondary btn-sm" id="btn-add-course">+ Course</button>
        <button class="btn btn-secondary btn-sm" id="btn-course-log">Log</button>
      </div>
    </div>
    <div class="page-subtitle" id="course-count">${courses.length} courses</div>

    <div class="search-bar">
      <span class="search-icon">⌕</span>
      <input type="text" id="course-search" placeholder="Search titles, sources, categories...">
    </div>

    <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.4rem;">Status</div>
    <div class="filter-pills" id="course-status-pills">
      ${statuses.map(s => `
        <button class="pill ${s==='all'?'active':''}" data-status="${s}">
          ${s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}
          (${s==='all'?courses.length:courses.filter(c=>c.status===s).length})
        </button>
      `).join('')}
    </div>

    ${sources.length > 1 ? `
      <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.4rem;margin-top:0.25rem;">Source</div>
      <div class="filter-pills" id="source-pills">
        <button class="pill active" data-src="all">All</button>
        ${sources.map(s => `<button class="pill" data-src="${s}">${s}</button>`).join('')}
      </div>
    ` : ''}

    <div id="course-list" style="margin-top:0.5rem;"></div>
  `;

  render();

  document.getElementById('course-search').addEventListener('input', e => { searchQuery = e.target.value; render(); });

  document.getElementById('course-status-pills').addEventListener('click', e => {
    if (!e.target.dataset.status) return;
    activeStatus = e.target.dataset.status;
    document.querySelectorAll('#course-status-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.status === activeStatus));
    render();
  });

  document.getElementById('source-pills')?.addEventListener('click', e => {
    if (!e.target.dataset.src) return;
    activeSource = e.target.dataset.src;
    document.querySelectorAll('#source-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.src === activeSource));
    render();
  });

  document.getElementById('btn-add-course').addEventListener('click', () => PAGES.addCourse(app));
  document.getElementById('btn-course-log').addEventListener('click', () => PAGES.courseLogPage(app));
};

// ── Log Episode ───────────────────────────────────────────────
PAGES.logEpisode = (courseId, app, courses) => {
  const c = courses.find(x => x.id === courseId);
  if (!c) return;
  const today = new Date().toISOString().split('T')[0];
  app.showModal(`
    <div class="modal-title">Log Episode</div>
    <div style="font-size:0.9rem;color:var(--text2);margin-bottom:1rem;">${c.title}</div>
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
    const notes = document.getElementById('ep-notes').value.trim();
    if (!episode || !date) { app.notify('Episode and date required', 'error'); return; }
    try {
      await DB.insert('course_log', { course_id: courseId, episode, date, notes: notes || null });
      // Update status to in-progress if to-watch
      if (c.status === 'to-watch') {
        await DB.update('courses', courseId, { status: 'in-progress', updated_at: new Date().toISOString() });
      }
      // If total_episodes reached, mark complete
      if (c.total_episodes && episode >= c.total_episodes) {
        await DB.update('courses', courseId, { status: 'completed', updated_at: new Date().toISOString() });
        app.notify('Course completed!', 'success');
      } else {
        app.notify('Episode logged', 'success');
      }
      app.closeModal();
      PAGES.courses(document.getElementById('main-content'), app);
    } catch(e) { app.notify('Error: ' + e.message, 'error'); }
  });
};

// ── Add Course ────────────────────────────────────────────────
PAGES.addCourse = (app) => {
  app.showModal(`
    <div class="modal-title">Add Course</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Title *</label>
        <input id="ac-title" placeholder="Course or series title">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Source</label>
        <input id="ac-source" placeholder="e.g. MasterClass, Yale, YouTube">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Category</label>
        <input id="ac-cat" placeholder="e.g. Cinema, History">
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
      <button class="btn btn-primary" id="btn-save-course">Add Course</button>
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
    </div>
  `);
  document.getElementById('btn-save-course').addEventListener('click', async () => {
    const title = document.getElementById('ac-title').value.trim();
    if (!title) { app.notify('Title required', 'error'); return; }
    try {
      await DB.insert('courses', {
        title,
        source: document.getElementById('ac-source').value.trim() || null,
        category: document.getElementById('ac-cat').value.trim() || null,
        total_episodes: parseInt(document.getElementById('ac-eps').value) || null,
        status: document.getElementById('ac-status').value,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      app.closeModal();
      app.notify('Course added', 'success');
      PAGES.courses(document.getElementById('main-content'), app);
    } catch(e) { app.notify('Error: ' + e.message, 'error'); }
  });
};

// ── Edit Course ───────────────────────────────────────────────
PAGES.editCourse = (courseId, app, courses) => {
  const c = courses.find(x => x.id === courseId);
  if (!c) return;
  app.showModal(`
    <div class="modal-title">Edit Course</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Title</label>
        <input id="ec-title" value="${(c.title||'').replace(/"/g,'&quot;')}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Source</label>
        <input id="ec-source" value="${(c.source||'').replace(/"/g,'&quot;')}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Category</label>
        <input id="ec-cat" value="${(c.category||'').replace(/"/g,'&quot;')}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Total Episodes</label>
        <input id="ec-eps" type="number" value="${c.total_episodes||''}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Status</label>
        <select id="ec-status">
          ${['to-watch','in-progress','completed'].map(s =>
            `<option value="${s}" ${c.status===s?'selected':''}>${s}</option>`
          ).join('')}
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
    const data = {
      title: document.getElementById('ec-title').value.trim(),
      source: document.getElementById('ec-source').value.trim() || null,
      category: document.getElementById('ec-cat').value.trim() || null,
      total_episodes: parseInt(document.getElementById('ec-eps').value) || null,
      status: document.getElementById('ec-status').value,
      updated_at: new Date().toISOString()
    };
    if (!data.title) { app.notify('Title required', 'error'); return; }
    try {
      await DB.update('courses', courseId, data);
      app.closeModal();
      app.notify('Course updated', 'success');
      PAGES.courses(document.getElementById('main-content'), app);
    } catch(e) { app.notify('Error: ' + e.message, 'error'); }
  });
  document.getElementById('btn-delete-course').addEventListener('click', async () => {
    if (!confirm(`Delete "${c.title}"?`)) return;
    try {
      await DB.delete('courses', courseId);
      app.closeModal();
      app.notify('Course deleted', 'success');
      PAGES.courses(document.getElementById('main-content'), app);
    } catch(e) { app.notify('Error: ' + e.message, 'error'); }
  });
};

// ── Course Log Page ───────────────────────────────────────────
PAGES.courseLogPage = async (app) => {
  const container = document.getElementById('main-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading log...</div>';
  let logs = [], courses = [];
  try {
    logs = await DB.query('course_log', { order: 'date.desc' });
    courses = await DB.query('courses', { order: 'title.asc' });
  } catch(e) { container.innerHTML = `<div class="card" style="color:var(--error)">${e.message}</div>`; return; }

  const courseMap = {};
  courses.forEach(c => courseMap[c.id] = c);

  const byYear = {};
  logs.forEach(l => {
    const yr = l.date ? l.date.substring(0,4) : 'Unknown';
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(l);
  });
  const years = Object.keys(byYear).sort().reverse();

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
      <button class="icon-btn" onclick="PAGES.courses(document.getElementById('main-content'), APP)">←</button>
      <div class="page-title" style="margin-bottom:0;">Course Log</div>
    </div>
    <div class="page-subtitle">${logs.length} episodes watched</div>
    ${years.map(yr => `
      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;margin:1rem 0 0.4rem;">${yr} · ${byYear[yr].length} episode${byYear[yr].length!==1?'s':''}</div>
      ${byYear[yr].map(l => {
        const c = courseMap[l.course_id] || {};
        return `<div class="book-item" style="cursor:default;">
          <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.2rem;min-width:48px;width:48px;">🎓</div>
          <div class="book-info">
            <div class="book-title">${c.title||'Unknown course'}</div>
            <div class="book-author">Episode ${l.episode}${c.source?' · '+c.source:''}</div>
          </div>
          <div class="book-right">
            <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${l.date}</span>
          </div>
        </div>`;
      }).join('')}
    `).join('')}
  `;
};
