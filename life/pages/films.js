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

// ── Films Plan ────────────────────────────────────────────────
PAGES.filmsPlan = async (container, app) => {
  container.innerHTML = `
    <div style="text-align:center;padding:3rem 1rem;color:var(--text3);">
      <div style="font-size:2rem;margin-bottom:0.75rem;">🎬</div>
      <div style="font-family:var(--mono);font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.5rem;">Film Scheduling</div>
      <div style="font-size:0.85rem;line-height:1.6;">
        Plan which films to watch and when — evenings, weeks, months.<br>
        Coming in the next build.
      </div>
    </div>
  `;
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
