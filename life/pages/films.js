// Films Module — Library · Plan · Log
PAGES.films = async (container, app, initialTab = 'library') => {
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
    if (tab === 'library') PAGES.filmsLibrary(inner, app);
    else if (tab === 'plan') PAGES.filmsPlan(inner, app);
    else if (tab === 'log') PAGES.filmsLog(inner, app);
  };

  renderShell();
};

// ── Films Library ─────────────────────────────────────────────
PAGES.filmsLibrary = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

  let films = [], watchLog = [];
  try {
    films = await DB.query('films', { order: 'title.asc' });
    watchLog = await DB.query('watch_log', { order: 'date.desc' });
  } catch(e) {
    container.innerHTML = `<div style="color:var(--error)">${e.message}</div>`;
    return;
  }

  const watchCounts = {};
  watchLog.forEach(l => { watchCounts[l.film_id] = (watchCounts[l.film_id] || 0) + 1; });

  const directors = [...new Set(films.map(f => f.director).filter(Boolean))].sort();

  let activeStatus = 'all';
  let activeDirector = 'all';
  let searchQuery = '';
  let durationUnit = 'mins';

  const formatDur = (mins) => {
    if (!mins) return '';
    if (durationUnit === 'hrs') {
      const h = Math.floor(mins/60), m = mins%60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}min`;
  };

  const render = () => {
    let list = [...films];
    if (activeStatus === 'favorites') list = list.filter(f => f.is_favorite);
    else if (activeStatus !== 'all') list = list.filter(f => f.status === activeStatus);
    if (activeDirector !== 'all') list = list.filter(f => f.director === activeDirector);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        (f.title||'').toLowerCase().includes(q) ||
        (f.director||'').toLowerCase().includes(q) ||
        (f.country||'').toLowerCase().includes(q)
      );
    }
    document.getElementById('film-count').textContent = `${list.length} film${list.length!==1?'s':''}`;
    document.getElementById('film-list').innerHTML = list.length
      ? list.map(f => renderFilmCard(f)).join('')
      : '<div class="empty"><div class="empty-text">No films match</div></div>';

    document.querySelectorAll('.btn-log-watch').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.logWatchModal(btn.dataset.id, app, films, () => PAGES.filmsLibrary(container, app)); })
    );
    document.querySelectorAll('.btn-edit-film').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.editFilmModal(btn.dataset.id, app, films, () => PAGES.filmsLibrary(container, app)); })
    );
  };

  const renderFilmCard = (f) => {
    const statusColors = { 'to-watch': 'gray', watched: 'green', owned: '' };
    const count = watchCounts[f.id] || 0;
    const dur = f.runtime_mins ? `<span style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);">${formatDur(f.runtime_mins)}</span>` : '';
    const rewatched = count > 1 ? `<span style="font-family:var(--mono);font-size:0.6rem;color:var(--accent);">${count}×</span>` : '';
    return `
      <div class="book-item">
        <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.3rem;min-width:48px;width:48px;position:relative;">
          🎬
          ${f.is_favorite ? '<div style="position:absolute;top:1px;right:2px;font-size:0.6rem;color:var(--accent);">★</div>' : ''}
        </div>
        <div class="book-info">
          <div class="book-title">${f.is_favorite?'<span style="color:var(--accent);margin-right:0.2rem;">★</span>':''}${f.title}</div>
          <div class="book-author">${f.director||''}${f.year?' · '+f.year:''}${f.country?' · '+f.country:''}</div>
          <div style="display:flex;gap:0.4rem;align-items:center;margin-top:0.2rem;">${dur}${rewatched}</div>
        </div>
        <div class="book-right">
          <span class="tag ${statusColors[f.status]||''}">${f.status}</span>
          <button class="btn btn-secondary btn-sm btn-log-watch" data-id="${f.id}">Log</button>
          <button class="btn btn-secondary btn-sm btn-edit-film" data-id="${f.id}">Edit</button>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
      <div style="display:flex;gap:0.4rem;align-items:center;">
        <span id="film-count" style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);">${films.length} films</span>
      </div>
      <div style="display:flex;gap:0.4rem;">
        <button class="btn btn-secondary btn-sm" id="btn-dur-toggle">${durationUnit==='mins'?'min':'hrs'}</button>
        <button class="btn btn-secondary btn-sm" id="btn-add-film">+ Add</button>
        <button class="btn btn-secondary btn-sm" id="btn-film-lists">Lists</button>
      </div>
    </div>

    <div class="search-bar">
      <span class="search-icon">⌕</span>
      <input type="text" id="film-search" placeholder="Title, director, country...">
    </div>

    <div class="filter-pills" id="status-pills">
      <button class="pill active" data-status="favorites">★ Favs (${films.filter(f=>f.is_favorite).length})</button>
      ${['all','to-watch','watched','owned'].map(s => `
        <button class="pill ${s==='all'?'active':''}" data-status="${s}">
          ${s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)} (${s==='all'?films.length:films.filter(f=>f.status===s).length})
        </button>
      `).join('')}
    </div>

    <div class="filter-pills" id="director-pills">
      <button class="pill active" data-dir="all">All directors</button>
      ${directors.slice(0,20).map(d => `<button class="pill" data-dir="${d}">${d}</button>`).join('')}
    </div>

    <div id="film-list"></div>
  `;

  render();

  document.getElementById('film-search').addEventListener('input', e => { searchQuery = e.target.value; render(); });
  document.getElementById('status-pills').addEventListener('click', e => {
    if (!e.target.dataset.status) return;
    activeStatus = e.target.dataset.status;
    document.querySelectorAll('#status-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.status === activeStatus));
    render();
  });
  document.getElementById('director-pills').addEventListener('click', e => {
    if (!e.target.dataset.dir) return;
    activeDirector = e.target.dataset.dir;
    document.querySelectorAll('#director-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.dir === activeDirector));
    render();
  });
  document.getElementById('btn-dur-toggle').addEventListener('click', e => {
    durationUnit = durationUnit === 'mins' ? 'hrs' : 'mins';
    e.target.textContent = durationUnit === 'mins' ? 'min' : 'hrs';
    render();
  });
  document.getElementById('btn-add-film').addEventListener('click', () =>
    PAGES.addFilmModal(app, () => PAGES.filmsLibrary(container, app))
  );
  document.getElementById('btn-film-lists').addEventListener('click', () =>
    PAGES.listsPage(container, app, 'films')
  );
};

// ── Films Plan Tab ────────────────────────────────────────────
PAGES.filmsPlan = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

  let plan = [], films = [], watchLog = [];
  try {
    plan     = await DB.query('film_plan',  { order: 'planned_date.asc' });
    films    = await DB.query('films',      { order: 'title.asc' });
    watchLog = await DB.query('watch_log',  { order: 'date.desc' });
  } catch(e) {
    container.innerHTML = `<div style="color:var(--error)">${e.message}</div>`;
    return;
  }

  const filmMap = {};
  films.forEach(f => filmMap[f.id] = f);
  const watchedIds = new Set(watchLog.map(l => l.film_id));

  const today = new Date().toISOString().split('T')[0];

  // Group plan by week
  const getWeekKey = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay() || 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - day + 1);
    return mon.toISOString().split('T')[0];
  };

  const byWeek = {};
  plan.forEach(p => {
    const wk = getWeekKey(p.planned_date);
    if (!byWeek[wk]) byWeek[wk] = [];
    byWeek[wk].push(p);
  });

  const upcoming = plan.filter(p => p.planned_date >= today && !p.done);
  const overdue  = plan.filter(p => p.planned_date < today && !p.done);
  const done     = plan.filter(p => p.done);

  const formatWeek = (weekStart) => {
    const d = new Date(weekStart);
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    return `${d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} — ${end.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
  };

  const timeIcon = { morning:'🌅', afternoon:'🌤', evening:'🌙', any:'◈' };

  const renderPlanItem = (p, showMark = true) => {
    const f = filmMap[p.film_id] || {};
    const dur = f.runtime_mins ? `<span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">${f.runtime_mins}min</span>` : '';
    const overdue = !p.done && p.planned_date < today;
    return `
      <div class="book-item plan-item ${p.done?'opacity:0.5':''}" data-id="${p.id}" style="${p.done?'opacity:0.5':''}">
        <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.1rem;min-width:48px;width:48px;">
          ${timeIcon[p.time_of_day]||'🎬'}
        </div>
        <div class="book-info">
          <div class="book-title">${f.title||'Unknown film'}</div>
          <div class="book-author">${formatDate(p.planned_date)}${f.director?' · '+f.director:''}</div>
          <div style="display:flex;gap:0.4rem;align-items:center;margin-top:0.2rem;">
            ${dur}
            ${overdue?'<span style="font-family:var(--mono);font-size:0.58rem;color:var(--error);">overdue</span>':''}
            ${p.notes?`<span style="font-size:0.72rem;color:var(--text3);">${p.notes}</span>`:''}
          </div>
        </div>
        <div class="book-right" style="gap:0.3rem;">
          ${showMark && !p.done ? `<button class="btn btn-secondary btn-sm btn-mark-done" data-id="${p.id}" data-film="${p.film_id}" title="Mark watched">✓</button>` : ''}
          <button class="btn btn-secondary btn-sm btn-delete-plan" data-id="${p.id}" style="color:var(--error);">×</button>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
      <div>
        <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${upcoming.length} upcoming · ${done.length} watched</span>
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-schedule-film">+ Schedule</button>
    </div>

    ${overdue.length ? `
      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--error);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.4rem;">
        Overdue (${overdue.length})
      </div>
      ${overdue.map(p => renderPlanItem(p)).join('')}
      <div style="height:0.75rem;"></div>
    ` : ''}

    ${upcoming.length === 0 && overdue.length === 0 ? `
      <div class="empty">
        <div style="font-size:2rem;margin-bottom:0.5rem;">🎬</div>
        <div class="empty-text">No films scheduled yet</div>
        <div style="font-size:0.82rem;color:var(--text3);margin-top:0.25rem;">Tap + Schedule to plan an evening</div>
      </div>
    ` : ''}

    ${Object.keys(byWeek).filter(wk => byWeek[wk].some(p => p.planned_date >= today && !p.done)).sort().map(wk => `
      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;margin:0.75rem 0 0.4rem;">
        ${formatWeek(wk)}
      </div>
      ${byWeek[wk].filter(p => p.planned_date >= today && !p.done).map(p => renderPlanItem(p)).join('')}
    `).join('')}

    ${done.length ? `
      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;margin:1.5rem 0 0.4rem;cursor:pointer;" id="toggle-done-films">
        ▶ Done (${done.length})
      </div>
      <div id="done-films-list" style="display:none;">
        ${done.map(p => renderPlanItem(p, false)).join('')}
      </div>
    ` : ''}
  `;

  // Toggle done section
  document.getElementById('toggle-done-films')?.addEventListener('click', e => {
    const list = document.getElementById('done-films-list');
    const visible = list.style.display !== 'none';
    list.style.display = visible ? 'none' : 'block';
    e.target.textContent = e.target.textContent.replace(visible?'▼':'▶', visible?'▶':'▼');
  });

  // Mark as done
  document.querySelectorAll('.btn-mark-done').forEach(btn =>
    btn.addEventListener('click', async () => {
      try {
        await DB.update('film_plan', btn.dataset.id, { done: true });
        // Also log the watch
        const filmId = btn.dataset.film;
        const film = filmMap[filmId];
        if (film && !watchedIds.has(filmId)) {
          await DB.insert('watch_log', {
            film_id: filmId,
            date: today,
            session: 1
          });
          if (film.status === 'to-watch') {
            await DB.update('films', filmId, { status: 'watched', updated_at: new Date().toISOString() });
          }
        }
        app.notify('Marked as watched', 'success');
        PAGES.filmsPlan(container, app);
      } catch(e) { app.notify('Error: '+e.message, 'error'); }
    })
  );

  // Delete plan item
  document.querySelectorAll('.btn-delete-plan').forEach(btn =>
    btn.addEventListener('click', async () => {
      try {
        await DB.delete('film_plan', btn.dataset.id);
        PAGES.filmsPlan(container, app);
      } catch(e) { app.notify('Error: '+e.message, 'error'); }
    })
  );

  // Schedule a film
  document.getElementById('btn-schedule-film').addEventListener('click', () => {
    const toWatch = films.filter(f => f.status === 'to-watch' || f.status === 'owned');
    const nextFriday = (() => {
      const d = new Date();
      const day = d.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    })();

    app.showModal(`
      <div class="modal-title">Schedule a Film</div>
      <div class="form-group">
        <label>Film *</label>
        <div class="search-bar" style="margin-bottom:0.3rem;">
          <span class="search-icon">⌕</span>
          <input type="text" id="sf-search" placeholder="Search to-watch films...">
        </div>
        <select id="sf-film" size="5" style="height:auto;font-size:0.82rem;">
          ${toWatch.map(f => `<option value="${f.id}">${f.title}${f.year?' ('+f.year+')':''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Date *</label>
        <input type="date" id="sf-date" value="${nextFriday}">
      </div>
      <div class="form-group">
        <label>Time of day</label>
        <select id="sf-time">
          <option value="evening">Evening 🌙</option>
          <option value="afternoon">Afternoon 🌤</option>
          <option value="morning">Morning 🌅</option>
          <option value="any">Any time</option>
        </select>
      </div>
      <div class="form-group">
        <label>Notes (optional)</label>
        <input type="text" id="sf-notes" placeholder="e.g. watch with subtitles">
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1rem;">
        <button class="btn btn-primary" id="btn-save-plan">Schedule</button>
        <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
      </div>
    `);

    // Live search filter
    document.getElementById('sf-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      const filtered = toWatch.filter(f => (f.title||'').toLowerCase().includes(q) || (f.director||'').toLowerCase().includes(q));
      document.getElementById('sf-film').innerHTML = filtered
        .map(f => `<option value="${f.id}">${f.title}${f.year?' ('+f.year+')':''}</option>`)
        .join('');
    });

    document.getElementById('btn-save-plan').addEventListener('click', async () => {
      const filmId = document.getElementById('sf-film').value;
      const date   = document.getElementById('sf-date').value;
      if (!filmId || !date) { app.notify('Select a film and date','error'); return; }
      try {
        const entry = {
          film_id:      filmId,
          planned_date: date,
          time_of_day:  document.getElementById('sf-time').value,
          notes:        document.getElementById('sf-notes').value.trim() || null,
          done:         false,
          created_at:   new Date().toISOString()
        };
        await DB.insert('film_plan', entry);

        // Write to omni_schedule_feed
        const f = filmMap[filmId];
        try {
          await DB.insert('omni_schedule_feed', {
            date:       date,
            type:       'film',
            title:      f ? f.title : 'Film',
            source_app: 'life',
            source_id:  filmId,
            meta:       JSON.stringify({ time_of_day: entry.time_of_day, runtime_mins: f?.runtime_mins }),
            created_at: new Date().toISOString()
          });
        } catch(e) { /* omni feed optional */ }

        app.closeModal();
        app.notify('Film scheduled','success');
        PAGES.filmsPlan(container, app);
      } catch(e) { app.notify('Error: '+e.message,'error'); }
    });
  });
};


// ── Films Log ─────────────────────────────────────────────────
PAGES.filmsLog = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  let logs = [], films = [];
  try {
    logs = await DB.query('watch_log', { order: 'date.desc' });
    films = await DB.query('films', { order: 'title.asc' });
  } catch(e) { container.innerHTML = `<div style="color:var(--error)">${e.message}</div>`; return; }

  const filmMap = {};
  films.forEach(f => filmMap[f.id] = f);

  const byYear = {};
  logs.forEach(l => {
    const yr = l.date ? l.date.substring(0,4) : '—';
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(l);
  });
  const years = Object.keys(byYear).sort().reverse();

  container.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:0.75rem;">
      <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${logs.length} viewings</span>
    </div>
    ${years.length === 0 ? '<div class="empty"><div class="empty-text">No films logged yet</div></div>' : ''}
    ${years.map(yr => `
      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;margin:1rem 0 0.4rem;">
        ${yr} · ${byYear[yr].length} film${byYear[yr].length!==1?'s':''}
      </div>
      ${byYear[yr].map(l => {
        const f = filmMap[l.film_id] || {};
        return `
          <div class="book-item" style="cursor:default;">
            <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.2rem;min-width:48px;width:48px;">🎬</div>
            <div class="book-info">
              <div class="book-title">${f.title||'Unknown'}</div>
              <div class="book-author">${f.director||''}${f.year?' · '+f.year:''}</div>
            </div>
            <div class="book-right">
              <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${l.date}</span>
              ${l.session===2?'<span class="tag gray" style="font-size:0.55rem;">Pt.2</span>':''}
            </div>
          </div>
        `;
      }).join('')}
    `).join('')}
  `;
};

// ── Log Watch Modal ───────────────────────────────────────────
PAGES.logWatchModal = (filmId, app, films, onDone) => {
  const f = films.find(x => x.id === filmId);
  if (!f) return;
  const today = new Date().toISOString().split('T')[0];
  app.showModal(`
    <div class="modal-title">Log Watch</div>
    <div style="font-size:0.88rem;color:var(--text2);margin-bottom:1rem;">${f.title}</div>
    <div class="form-group">
      <label>Date</label>
      <input type="date" id="wd-date" value="${today}">
    </div>
    <div class="form-group">
      <label>Session</label>
      <select id="wd-session">
        <option value="1">Full film / Part 1</option>
        <option value="2">Part 2 (continuation)</option>
      </select>
    </div>
    <div class="form-group">
      <label>Notes (optional)</label>
      <input type="text" id="wd-notes" placeholder="Quick impression...">
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-primary" id="btn-save-watch">Save</button>
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
    </div>
  `);
  document.getElementById('btn-save-watch').addEventListener('click', async () => {
    const date = document.getElementById('wd-date').value;
    if (!date) { app.notify('Select a date','error'); return; }
    try {
      await DB.insert('watch_log', {
        film_id: filmId, date,
        session: parseInt(document.getElementById('wd-session').value),
        notes: document.getElementById('wd-notes').value.trim() || null
      });
      if (f.status === 'to-watch') {
        await DB.update('films', filmId, { status: 'watched', updated_at: new Date().toISOString() });
      }
      app.closeModal();
      app.notify('Logged','success');
      if (onDone) onDone();
    } catch(e) { app.notify('Error: '+e.message,'error'); }
  });
};

// ── Add Film Modal ────────────────────────────────────────────
PAGES.addFilmModal = (app, onDone) => {
  app.showModal(`
    <div class="modal-title">Add Film</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Title *</label>
        <input id="af-title" placeholder="Film title">
      </div>
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Director</label>
        <input id="af-dir" placeholder="Director">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Year</label>
        <input id="af-year" type="number" placeholder="1979">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Duration (min)</label>
        <input id="af-runtime" type="number" placeholder="120">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Country</label>
        <input id="af-country" placeholder="France">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Status</label>
        <select id="af-status">
          <option value="to-watch">To Watch</option>
          <option value="watched">Watched</option>
          <option value="owned">Owned</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Writer</label>
        <input id="af-writer" placeholder="Writer">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>DP</label>
        <input id="af-dp" placeholder="Cinematographer">
      </div>
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;display:flex;align-items:center;gap:0.5rem;">
        <input type="checkbox" id="af-fav" style="width:auto;">
        <label for="af-fav" style="margin-bottom:0;">Favourite ★</label>
      </div>
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-primary" id="btn-save-film">Add</button>
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
    </div>
  `);
  document.getElementById('btn-save-film').addEventListener('click', async () => {
    const title = document.getElementById('af-title').value.trim();
    if (!title) { app.notify('Title required','error'); return; }
    try {
      await DB.insert('films', {
        title,
        director: document.getElementById('af-dir').value.trim() || null,
        year: parseInt(document.getElementById('af-year').value) || null,
        runtime_mins: parseInt(document.getElementById('af-runtime').value) || null,
        country: document.getElementById('af-country').value.trim() || null,
        status: document.getElementById('af-status').value,
        writer: document.getElementById('af-writer').value.trim() || null,
        dp: document.getElementById('af-dp').value.trim() || null,
        is_favorite: document.getElementById('af-fav').checked,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      app.closeModal();
      app.notify('Film added','success');
      if (onDone) onDone();
    } catch(e) { app.notify('Error: '+e.message,'error'); }
  });
};

// ── Edit Film Modal ───────────────────────────────────────────
PAGES.editFilmModal = (filmId, app, films, onDone) => {
  const f = films.find(x => x.id === filmId);
  if (!f) return;
  const v = s => (s||'').replace(/"/g,'&quot;');
  app.showModal(`
    <div class="modal-title">Edit Film</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Title</label>
        <input id="ef-title" value="${v(f.title)}">
      </div>
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Director</label>
        <input id="ef-dir" value="${v(f.director)}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Year</label>
        <input id="ef-year" type="number" value="${f.year||''}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Duration (min)</label>
        <input id="ef-runtime" type="number" value="${f.runtime_mins||''}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Country</label>
        <input id="ef-country" value="${v(f.country)}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Status</label>
        <select id="ef-status">
          ${['to-watch','watched','owned'].map(s=>`<option value="${s}" ${f.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Writer</label>
        <input id="ef-writer" value="${v(f.writer)}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>DP</label>
        <input id="ef-dp" value="${v(f.dp)}">
      </div>
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;display:flex;align-items:center;gap:0.5rem;">
        <input type="checkbox" id="ef-fav" style="width:auto;" ${f.is_favorite?'checked':''}>
        <label for="ef-fav" style="margin-bottom:0;">Favourite ★</label>
      </div>
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-primary" id="btn-update-film">Save</button>
      <button class="btn btn-secondary btn-sm" id="btn-delete-film" style="margin-left:auto;color:var(--error);">Delete</button>
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
    </div>
  `);
  document.getElementById('btn-update-film').addEventListener('click', async () => {
    const title = document.getElementById('ef-title').value.trim();
    if (!title) { app.notify('Title required','error'); return; }
    try {
      await DB.update('films', filmId, {
        title, director: document.getElementById('ef-dir').value.trim()||null,
        year: parseInt(document.getElementById('ef-year').value)||null,
        runtime_mins: parseInt(document.getElementById('ef-runtime').value)||null,
        country: document.getElementById('ef-country').value.trim()||null,
        status: document.getElementById('ef-status').value,
        writer: document.getElementById('ef-writer').value.trim()||null,
        dp: document.getElementById('ef-dp').value.trim()||null,
        is_favorite: document.getElementById('ef-fav').checked,
        updated_at: new Date().toISOString()
      });
      app.closeModal(); app.notify('Updated','success');
      if (onDone) onDone();
    } catch(e) { app.notify('Error: '+e.message,'error'); }
  });
  document.getElementById('btn-delete-film').addEventListener('click', async () => {
    if (!confirm(`Delete "${f.title}"?`)) return;
    try {
      await DB.delete('films', filmId);
      app.closeModal(); app.notify('Deleted','success');
      if (onDone) onDone();
    } catch(e) { app.notify('Error: '+e.message,'error'); }
  });
};
