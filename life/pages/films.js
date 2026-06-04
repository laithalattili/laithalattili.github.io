// Films Page
PAGES.films = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading films...</div>';

  let films = [];
  let watchLog = [];
  let lists = [];
  try {
    films = await DB.query('films', { order: 'title.asc' });
    watchLog = await DB.query('watch_log', { order: 'date.desc' });
    lists = await DB.query('user_lists', { filter: { type: 'films' }, order: 'name.asc' });
  } catch(e) {
    container.innerHTML = `<div class="card" style="color:var(--error)">Failed to load films: ${e.message}</div>`;
    return;
  }

  // Build watch count map
  const watchCounts = {};
  watchLog.forEach(l => { watchCounts[l.film_id] = (watchCounts[l.film_id] || 0) + 1; });
  const lastWatched = {};
  watchLog.forEach(l => { if (!lastWatched[l.film_id]) lastWatched[l.film_id] = l.date; });

  const directors = [...new Set(films.map(f => f.director).filter(Boolean))].sort();
  const countries = [...new Set(films.map(f => f.country).filter(Boolean))].sort();
  const decades = [...new Set(films.map(f => f.year ? Math.floor(f.year/10)*10 : null).filter(Boolean))].sort();

  let activeStatus = 'all';
  let activeDirector = 'all';
  let searchQuery = '';
  let durationUnit = 'mins'; // 'mins' or 'hrs'

  const formatDuration = (mins) => {
    if (!mins) return '';
    if (durationUnit === 'hrs') {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
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
        (f.country||'').toLowerCase().includes(q) ||
        (f.writer||'').toLowerCase().includes(q)
      );
    }

    document.getElementById('film-count').textContent = `${list.length} film${list.length !== 1 ? 's' : ''}`;
    document.getElementById('film-list').innerHTML = list.length
      ? list.map(f => renderFilmItem(f, watchCounts[f.id] || 0, lastWatched[f.id])).join('')
      : '<div class="empty"><div class="empty-text">No films match your filters</div></div>';

    document.querySelectorAll('.btn-edit-film').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.editFilm(btn.dataset.id, app, films); })
    );
    document.querySelectorAll('.btn-log-watch').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.logWatch(btn.dataset.id, app, films); })
    );
    document.querySelectorAll('.film-item').forEach(item =>
      item.addEventListener('click', () => PAGES.filmDetail(item.dataset.id, app, films, watchLog))
    );
  };

  const renderFilmItem = (f, watchCount, lastWatchDate) => {
    const statusColors = { 'to-watch': 'gray', watched: 'green', owned: '' };
    const dur = f.runtime_mins ? `<span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${formatDuration(f.runtime_mins)}</span>` : '';
    const watchedBadge = watchCount > 0
      ? `<span style="font-family:var(--mono);font-size:0.6rem;color:var(--accent);">${watchCount}× watched</span>`
      : '';
    return `
      <div class="book-item film-item" data-id="${f.id}" style="cursor:pointer;">
        <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.4rem;position:relative;min-width:48px;width:48px;">
          🎬
          ${f.is_favorite ? '<div style="position:absolute;top:1px;right:1px;font-size:0.65rem;color:var(--accent);">★</div>' : ''}
        </div>
        <div class="book-info">
          <div class="book-title">${f.is_favorite ? '<span style="color:var(--accent);margin-right:0.25rem;">★</span>' : ''}${f.title}</div>
          <div class="book-author">${f.director || ''}${f.year ? ` · ${f.year}` : ''}${f.country ? ` · ${f.country}` : ''}</div>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.3rem;align-items:center;">
            ${dur}${watchedBadge}
          </div>
        </div>
        <div class="book-right">
          <span class="tag ${statusColors[f.status] || ''}">${f.status}</span>
          <button class="btn btn-secondary btn-sm btn-log-watch" data-id="${f.id}">Log</button>
          <button class="btn btn-secondary btn-sm btn-edit-film" data-id="${f.id}">Edit</button>
        </div>
      </div>
    `;
  };

  const statuses = ['all', 'to-watch', 'watched', 'owned'];

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.2rem;">
      <div class="page-title">Films</div>
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <button class="btn btn-secondary btn-sm" id="btn-duration-toggle" title="Toggle duration unit">${durationUnit === 'mins' ? 'min' : 'hrs'}</button>
        <button class="btn btn-secondary btn-sm" id="btn-add-film">+ Film</button>
        <button class="btn btn-secondary btn-sm" id="btn-watch-log">Log</button>
        <button class="btn btn-secondary btn-sm" id="btn-lists">Lists</button>
      </div>
    </div>
    <div class="page-subtitle" id="film-count">${films.length} films</div>

    <div class="search-bar">
      <span class="search-icon">⌕</span>
      <input type="text" id="film-search" placeholder="Search titles, directors, countries...">
    </div>

    <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.4rem;">Status</div>
    <div class="filter-pills" id="status-pills">
      <button class="pill active" data-status="favorites">★ Favourites (${films.filter(f=>f.is_favorite).length})</button>
      ${statuses.map(s => `
        <button class="pill ${s==='all'?'active':''}" data-status="${s}">
          ${s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}
          (${s==='all'?films.length:films.filter(f=>f.status===s).length})
        </button>
      `).join('')}
    </div>

    ${directors.length ? `
      <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.4rem;margin-top:0.25rem;">Director</div>
      <div class="filter-pills" id="director-pills" style="max-height:3.2rem;overflow:hidden;" id="director-pills">
        <button class="pill active" data-dir="all">All</button>
        ${directors.map(d => `<button class="pill" data-dir="${d}">${d}</button>`).join('')}
      </div>
    ` : ''}

    <div id="film-list" style="margin-top:0.5rem;"></div>
  `;

  render();

  document.getElementById('film-search').addEventListener('input', e => { searchQuery = e.target.value; render(); });

  document.getElementById('status-pills').addEventListener('click', e => {
    if (!e.target.dataset.status) return;
    activeStatus = e.target.dataset.status;
    document.querySelectorAll('#status-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.status === activeStatus));
    render();
  });

  document.getElementById('director-pills')?.addEventListener('click', e => {
    if (!e.target.dataset.dir) return;
    activeDirector = e.target.dataset.dir;
    document.querySelectorAll('#director-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.dir === activeDirector));
    render();
  });

  document.getElementById('btn-duration-toggle').addEventListener('click', e => {
    durationUnit = durationUnit === 'mins' ? 'hrs' : 'mins';
    e.target.textContent = durationUnit === 'mins' ? 'min' : 'hrs';
    render();
  });

  document.getElementById('btn-add-film').addEventListener('click', () => PAGES.addFilm(app));
  document.getElementById('btn-watch-log').addEventListener('click', () => PAGES.watchLogPage(app));
  document.getElementById('btn-lists').addEventListener('click', () => PAGES.listsPage(app, 'films'));
};

// ── Film Detail ───────────────────────────────────────────────
PAGES.filmDetail = (filmId, app, films, watchLog) => {
  const f = films.find(x => x.id === filmId);
  if (!f) return;
  const logs = watchLog.filter(l => l.film_id === filmId).sort((a,b) => b.date.localeCompare(a.date));
  const formatDur = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins/60), m = mins%60;
    return `${mins}min${h > 0 ? ` (${h}h${m>0?' '+m+'m':''})` : ''}`;
  };
  app.showModal(`
    <div class="modal-title">${f.title}</div>
    <div style="display:grid;gap:0.5rem;margin-bottom:1rem;">
      ${f.director ? `<div><span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);text-transform:uppercase;">Director</span><div>${f.director}</div></div>` : ''}
      ${f.writer ? `<div><span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);text-transform:uppercase;">Writer</span><div>${f.writer}</div></div>` : ''}
      ${f.dp ? `<div><span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);text-transform:uppercase;">DP</span><div>${f.dp}</div></div>` : ''}
      <div style="display:flex;gap:1rem;">
        ${f.year ? `<div><span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);text-transform:uppercase;">Year</span><div>${f.year}</div></div>` : ''}
        ${f.country ? `<div><span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);text-transform:uppercase;">Country</span><div>${f.country}</div></div>` : ''}
        ${f.runtime_mins ? `<div><span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);text-transform:uppercase;">Duration</span><div>${formatDur(f.runtime_mins)}</div></div>` : ''}
      </div>
    </div>
    ${logs.length ? `
      <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.4rem;">Watch History (${logs.length}×)</div>
      <div style="display:flex;flex-direction:column;gap:0.3rem;">
        ${logs.map(l => `<div style="display:flex;justify-content:space-between;font-size:0.82rem;padding:0.3rem 0;border-bottom:1px solid var(--border);">
          <span>${l.date}</span>
          ${l.session === 2 ? '<span style="color:var(--text3);font-size:0.7rem;">Part 2</span>' : ''}
          ${l.notes ? `<span style="color:var(--text3);font-size:0.75rem;">${l.notes}</span>` : ''}
        </div>`).join('')}
      </div>
    ` : '<div style="color:var(--text3);font-size:0.82rem;">Not yet watched</div>'}
  `);
};

// ── Log Watch ─────────────────────────────────────────────────
PAGES.logWatch = (filmId, app, films) => {
  const f = films.find(x => x.id === filmId);
  if (!f) return;
  const today = new Date().toISOString().split('T')[0];
  app.showModal(`
    <div class="modal-title">Log Watch</div>
    <div style="font-size:0.9rem;color:var(--text2);margin-bottom:1rem;">${f.title}</div>
    <div class="form-group">
      <label>Date</label>
      <input type="date" id="watch-date" value="${today}">
    </div>
    <div class="form-group">
      <label>Session</label>
      <select id="watch-session">
        <option value="1">Full film / Part 1</option>
        <option value="2">Part 2 (continuation)</option>
      </select>
    </div>
    <div class="form-group">
      <label>Notes (optional)</label>
      <input type="text" id="watch-notes" placeholder="Quick impression...">
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-primary" id="btn-save-watch">Save</button>
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
    </div>
  `);
  document.getElementById('btn-save-watch').addEventListener('click', async () => {
    const date = document.getElementById('watch-date').value;
    const session = parseInt(document.getElementById('watch-session').value);
    const notes = document.getElementById('watch-notes').value.trim();
    if (!date) { app.notify('Select a date', 'error'); return; }
    try {
      await DB.insert('watch_log', { film_id: filmId, date, session, notes: notes || null });
      // If film is to-watch, update to watched
      if (f.status === 'to-watch') {
        await DB.update('films', filmId, { status: 'watched', updated_at: new Date().toISOString() });
      }
      app.closeModal();
      app.notify('Watch logged', 'success');
      PAGES.films(container_ref, app);
    } catch(e) { app.notify('Error: ' + e.message, 'error'); }
  });
};
// store container ref for reload
let container_ref;
const _origFilms = PAGES.films;
PAGES.films = async (container, app) => { container_ref = container; return _origFilms(container, app); };

// ── Add Film ──────────────────────────────────────────────────
PAGES.addFilm = (app) => {
  app.showModal(`
    <div class="modal-title">Add Film</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Title *</label>
        <input id="af-title" placeholder="Film title">
      </div>
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Director</label>
        <input id="af-director" placeholder="Director name">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Year</label>
        <input id="af-year" type="number" placeholder="e.g. 1979">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Duration (minutes)</label>
        <input id="af-runtime" type="number" placeholder="e.g. 120">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Country</label>
        <input id="af-country" placeholder="e.g. France">
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
        <label>DP / Cinematographer</label>
        <input id="af-dp" placeholder="DP name">
      </div>
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;display:flex;align-items:center;gap:0.5rem;">
        <input type="checkbox" id="af-fav" style="width:auto;">
        <label for="af-fav" style="margin-bottom:0;">Mark as Favourite ★</label>
      </div>
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-primary" id="btn-save-film">Add Film</button>
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
    </div>
  `);
  document.getElementById('btn-save-film').addEventListener('click', async () => {
    const title = document.getElementById('af-title').value.trim();
    if (!title) { app.notify('Title required', 'error'); return; }
    const data = {
      title,
      director: document.getElementById('af-director').value.trim() || null,
      year: parseInt(document.getElementById('af-year').value) || null,
      runtime_mins: parseInt(document.getElementById('af-runtime').value) || null,
      country: document.getElementById('af-country').value.trim() || null,
      status: document.getElementById('af-status').value,
      writer: document.getElementById('af-writer').value.trim() || null,
      dp: document.getElementById('af-dp').value.trim() || null,
      is_favorite: document.getElementById('af-fav').checked,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      await DB.insert('films', data);
      app.closeModal();
      app.notify('Film added', 'success');
      PAGES.films(container_ref, app);
    } catch(e) { app.notify('Error: ' + e.message, 'error'); }
  });
};

// ── Edit Film ─────────────────────────────────────────────────
PAGES.editFilm = (filmId, app, films) => {
  const f = films.find(x => x.id === filmId);
  if (!f) return;
  app.showModal(`
    <div class="modal-title">Edit Film</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Title</label>
        <input id="ef-title" value="${(f.title||'').replace(/"/g,'&quot;')}">
      </div>
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Director</label>
        <input id="ef-director" value="${(f.director||'').replace(/"/g,'&quot;')}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Year</label>
        <input id="ef-year" type="number" value="${f.year||''}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Duration (minutes)</label>
        <input id="ef-runtime" type="number" value="${f.runtime_mins||''}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Country</label>
        <input id="ef-country" value="${(f.country||'').replace(/"/g,'&quot;')}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Status</label>
        <select id="ef-status">
          ${['to-watch','watched','owned'].map(s =>
            `<option value="${s}" ${f.status===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Writer</label>
        <input id="ef-writer" value="${(f.writer||'').replace(/"/g,'&quot;')}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>DP</label>
        <input id="ef-dp" value="${(f.dp||'').replace(/"/g,'&quot;')}">
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
    const data = {
      title: document.getElementById('ef-title').value.trim(),
      director: document.getElementById('ef-director').value.trim() || null,
      year: parseInt(document.getElementById('ef-year').value) || null,
      runtime_mins: parseInt(document.getElementById('ef-runtime').value) || null,
      country: document.getElementById('ef-country').value.trim() || null,
      status: document.getElementById('ef-status').value,
      writer: document.getElementById('ef-writer').value.trim() || null,
      dp: document.getElementById('ef-dp').value.trim() || null,
      is_favorite: document.getElementById('ef-fav').checked,
      updated_at: new Date().toISOString()
    };
    if (!data.title) { app.notify('Title required', 'error'); return; }
    try {
      await DB.update('films', filmId, data);
      app.closeModal();
      app.notify('Film updated', 'success');
      PAGES.films(container_ref, app);
    } catch(e) { app.notify('Error: ' + e.message, 'error'); }
  });
  document.getElementById('btn-delete-film').addEventListener('click', async () => {
    if (!confirm(`Delete "${f.title}"? This also removes its watch log.`)) return;
    try {
      await DB.delete('films', filmId);
      app.closeModal();
      app.notify('Film deleted', 'success');
      PAGES.films(container_ref, app);
    } catch(e) { app.notify('Error: ' + e.message, 'error'); }
  });
};

// ── Watch Log Page ────────────────────────────────────────────
PAGES.watchLogPage = async (app) => {
  const container = document.getElementById('main-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading log...</div>';
  let logs = [], films = [];
  try {
    logs = await DB.query('watch_log', { order: 'date.desc' });
    films = await DB.query('films', { order: 'title.asc' });
  } catch(e) { container.innerHTML = `<div class="card" style="color:var(--error)">${e.message}</div>`; return; }

  const filmMap = {};
  films.forEach(f => filmMap[f.id] = f);

  // Group by year
  const byYear = {};
  logs.forEach(l => {
    const yr = l.date ? l.date.substring(0,4) : 'Unknown';
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(l);
  });
  const years = Object.keys(byYear).sort().reverse();

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
      <button class="icon-btn" onclick="PAGES.films(document.getElementById('main-content'), APP)">←</button>
      <div class="page-title" style="margin-bottom:0;">Watch Log</div>
    </div>
    <div class="page-subtitle">${logs.length} viewings</div>
    ${years.map(yr => `
      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;margin:1rem 0 0.4rem;">${yr} · ${byYear[yr].length} film${byYear[yr].length!==1?'s':''}</div>
      ${byYear[yr].map(l => {
        const f = filmMap[l.film_id] || {};
        return `<div class="book-item" style="cursor:default;">
          <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.2rem;min-width:48px;width:48px;">🎬</div>
          <div class="book-info">
            <div class="book-title">${f.title || 'Unknown film'}</div>
            <div class="book-author">${f.director||''}${f.year ? ' · '+f.year : ''}</div>
          </div>
          <div class="book-right">
            <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${l.date}</span>
            ${l.session===2 ? '<span class="tag gray" style="font-size:0.55rem;">Part 2</span>' : ''}
          </div>
        </div>`;
      }).join('')}
    `).join('')}
  `;
};
