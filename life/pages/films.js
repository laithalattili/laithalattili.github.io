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
    films    = await DB.query('films',     { order: 'title.asc' });
    watchLog = await DB.query('watch_log', { order: 'date.desc' });
  } catch(e) {
    container.innerHTML = `<div style="color:var(--error)">${e.message}</div>`;
    return;
  }

  const watchCounts = {};
  watchLog.forEach(l => { watchCounts[l.film_id] = (watchCounts[l.film_id] || 0) + 1; });

  let filters = { search:'', status:'all', owned:'all', favorite:false, director:'all', decade:'all', country:'all', pg:'all', durMin:'', durMax:'', shelf:'' };
  let sortBy = 'title', sortDir = 'asc', durationUnit = 'mins';

  const decades  = [...new Set(films.map(f => f.year ? Math.floor(f.year/10)*10 : null).filter(Boolean))].sort();
  const countries = [...new Set(films.map(f => f.country).filter(Boolean))].sort();
  const directors = [...new Set(films.map(f => f.director).filter(Boolean))].sort();
  const pgRatings = [...new Set(films.map(f => f.pg_rating).filter(Boolean))].sort();

  const formatDur = (mins) => {
    if (!mins) return '';
    if (durationUnit === 'hrs') { const h=Math.floor(mins/60),m=mins%60; return m?`${h}h ${m}m`:`${h}h`; }
    return `${mins}min`;
  };

  const applyFilters = () => {
    let list = [...films];
    if (filters.favorite)            list = list.filter(f => f.is_favorite);
    if (filters.status !== 'all')    list = list.filter(f => f.status === filters.status);
    if (filters.owned === 'owned')   list = list.filter(f => f.is_owned);
    if (filters.owned === 'not-owned') list = list.filter(f => !f.is_owned);
    if (filters.director !== 'all')  list = list.filter(f => f.director === filters.director);
    if (filters.decade !== 'all')    list = list.filter(f => f.year && Math.floor(f.year/10)*10 === parseInt(filters.decade));
    if (filters.country !== 'all')   list = list.filter(f => f.country === filters.country);
    if (filters.pg !== 'all')        list = list.filter(f => f.pg_rating === filters.pg);
    if (filters.shelf) list = list.filter(f => (f.shelf||'').toLowerCase().includes(filters.shelf.toLowerCase()));
    if (filters.durMin) list = list.filter(f => f.runtime_mins && f.runtime_mins >= parseInt(filters.durMin));
    if (filters.durMax) list = list.filter(f => f.runtime_mins && f.runtime_mins <= parseInt(filters.durMax));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(f =>
        (f.title||'').toLowerCase().includes(q) ||
        (f.director||'').toLowerCase().includes(q) ||
        (f.writer||'').toLowerCase().includes(q) ||
        (f.dp||'').toLowerCase().includes(q) ||
        (f.country||'').toLowerCase().includes(q) ||
        (f.year?.toString()||'').includes(q)
      );
    }
    const sortLabels = { title:'title', year:'year', director:'director', runtime:'runtime_mins', country:'country' };
    const key = sortLabels[sortBy] || 'title';
    list.sort((a,b) => {
      const av = a[key]||( typeof a[key]==='number'?0:''), bv = b[key]||(typeof b[key]==='number'?0:'');
      const cmp = typeof av==='string' ? av.localeCompare(bv) : av-bv;
      return sortDir==='asc' ? cmp : -cmp;
    });
    return list;
  };

  const activeFilterCount = () => {
    let n = ['favorite','status','owned','director','decade','country','pg']
      .filter(k => filters[k] && filters[k] !== 'all' && filters[k] !== false).length;
    if (filters.durMin || filters.durMax) n++;
    if (filters.shelf) n++;
    return n;
  };

  const sortLabelMap = { title:'Title', year:'Year', director:'Director', runtime:'Duration', country:'Country' };

  const renderShell = () => {
    const afc = activeFilterCount();
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
        <span id="film-count" style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);">— films</span>
        <div style="display:flex;gap:0.4rem;align-items:center;">
          <button class="btn btn-secondary btn-sm" id="btn-dur-toggle">${durationUnit}</button>
          <button class="btn btn-secondary btn-sm" id="btn-filter-toggle">Filter${afc>0?` <span style="background:var(--accent);color:white;border-radius:99px;padding:0 4px;font-size:0.55rem;margin-left:2px;">${afc}</span>`:''}</button>
          <button class="btn btn-secondary btn-sm" id="btn-add-film">+ Add</button>

        </div>
      </div>

      <div class="search-bar">
        <span class="search-icon">⌕</span>
        <input type="text" id="film-search" placeholder="Title, director, writer, DP, country, year..." value="${filters.search}">
      </div>

      <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.75rem;flex-wrap:wrap;">
        <span style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;">Sort</span>
        ${Object.entries(sortLabelMap).map(([k,v]) => `
          <button class="pill sort-pill ${sortBy===k?'active':''}" data-sort="${k}">${v}${sortBy===k?(sortDir==='asc'?' ↑':' ↓'):''}</button>
        `).join('')}
      </div>

      <div id="filter-panel" style="display:none;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;margin-bottom:0.75rem;">
        <div style="display:flex;flex-wrap:wrap;gap:1rem;">
          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Status</div>
            ${['all','watched','to-watch'].map(s => `
              <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;cursor:pointer;margin-bottom:0.2rem;">
                <input type="radio" name="f-status" value="${s}" ${filters.status===s?'checked':''} style="width:auto;">
                ${s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}
              </label>`).join('')}
          </div>
          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Ownership</div>
            ${[['all','All'],['owned','DVD owned'],['not-owned','Not owned']].map(([v,l]) => `
              <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;cursor:pointer;margin-bottom:0.2rem;">
                <input type="radio" name="f-owned" value="${v}" ${filters.owned===v?'checked':''} style="width:auto;">${l}
              </label>`).join('')}
          </div>
          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Decade</div>
            <select id="f-decade" style="font-size:0.78rem;padding:0.25rem;">
              <option value="all">All</option>
              ${decades.map(d => `<option value="${d}" ${filters.decade==d?'selected':''}>${d}s</option>`).join('')}
            </select>
          </div>
          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Country</div>
            <select id="f-country" style="font-size:0.78rem;padding:0.25rem;">
              <option value="all">All</option>
              ${countries.map(c => `<option value="${c}" ${filters.country===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">PG Rating</div>
            <select id="f-pg" style="font-size:0.78rem;padding:0.25rem;">
              <option value="all">All</option>
              ${pgRatings.map(p => `<option value="${p}" ${filters.pg===p?'selected':''}>${p}</option>`).join('')}
            </select>
          </div>
          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Duration (min)</div>
            <div style="display:flex;align-items:center;gap:0.3rem;">
              <input type="number" id="f-dur-min" placeholder="min" value="${filters.durMin}" style="width:52px;font-size:0.78rem;padding:0.25rem;text-align:center;">
              <span style="color:var(--text3);font-size:0.75rem;">–</span>
              <input type="number" id="f-dur-max" placeholder="max" value="${filters.durMax}" style="width:52px;font-size:0.78rem;padding:0.25rem;text-align:center;">
            </div>
          </div>
          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Shelf</div>
            <input type="text" id="f-shelf" placeholder="e.g. A, B2" value="${filters.shelf}" style="width:70px;font-size:0.78rem;padding:0.25rem;">
          </div>
          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Other</div>
            <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;cursor:pointer;">
              <input type="checkbox" id="f-fav" ${filters.favorite?'checked':''} style="width:auto;">Favourites only
            </label>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:0.5rem;">
          <button class="btn btn-secondary btn-sm" id="btn-clear-filters">Clear all</button>
        </div>
      </div>

      <div style="margin-bottom:0.5rem;">
        <button class="btn btn-secondary btn-sm" id="btn-by-director" style="font-family:var(--mono);font-size:0.62rem;">
          By Director${filters.director!=='all'?' · '+filters.director:''}
        </button>
        ${filters.director!=='all'?`<button class="btn btn-secondary btn-sm" id="btn-clear-dir" style="font-size:0.6rem;margin-left:0.3rem;color:var(--error);">×</button>`:''}
      </div>

      <div id="film-list"></div>
    `;
    bindControls();
    renderList();
  };

  const renderList = () => {
    const list = applyFilters();
    const afc = activeFilterCount();
    const countEl = document.getElementById('film-count');
    if (countEl) countEl.textContent = `${list.length} film${list.length!==1?'s':''}`;
    const listEl = document.getElementById('film-list');
    if (!listEl) return;
    listEl.innerHTML = list.length
      ? list.map(f => renderFilmCard(f)).join('')
      : '<div class="empty"><div class="empty-text">No films match</div></div>';
    bindFilmCards();
  };

  const renderFilmCard = (f) => {
    const count = watchCounts[f.id] || 0;
    const dur = f.runtime_mins ? `<span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">${formatDur(f.runtime_mins)}</span>` : '';
    const rewatched = count > 1 ? `<span style="font-family:var(--mono);font-size:0.6rem;color:var(--accent);">${count}×</span>` : '';
    const ownedBadge = f.is_owned ? '<span style="font-family:var(--mono);font-size:0.52rem;color:var(--text3);border:1px solid var(--border);border-radius:3px;padding:0 3px;">DVD</span>' : '';
    const shelfBadge = f.shelf ? `<span style="font-family:var(--mono);font-size:0.52rem;color:var(--accent);border:1px solid var(--accent);border-radius:3px;padding:0 3px;">📦 ${f.shelf}</span>` : '';
    const pg = f.pg_rating ? `<span style="font-family:var(--mono);font-size:0.55rem;color:var(--text3);">${f.pg_rating}</span>` : '';
    const statusColor = f.status==='watched'?'green':f.status==='to-watch'?'gray':'';
    return `
      <div class="book-item film-card" data-id="${f.id}" style="cursor:pointer;">
        <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.3rem;min-width:48px;width:48px;position:relative;">
          🎬${f.is_favorite?'<div style="position:absolute;top:1px;right:2px;font-size:0.6rem;color:var(--accent);">★</div>':''}
        </div>
        <div class="book-info">
          <div class="book-title">${f.is_favorite?'<span style="color:var(--accent);margin-right:0.2rem;">★</span>':''}${f.title}</div>
          <div class="book-author">${f.director||''}${f.year?' · '+f.year:''}${f.country?' · '+f.country:''}</div>
          <div style="display:flex;gap:0.3rem;align-items:center;flex-wrap:wrap;margin-top:0.2rem;">${dur}${pg}${ownedBadge}${shelfBadge}${rewatched}</div>
        </div>
        <div class="book-right">
          <span class="tag ${statusColor}">${f.status}</span>
          <button class="btn btn-secondary btn-sm btn-log-watch" data-id="${f.id}">Log</button>
          <button class="btn btn-secondary btn-sm btn-edit-film" data-id="${f.id}">Edit</button>
        </div>
      </div>
    `;
  };

  const bindFilmCards = () => {
    document.querySelectorAll('.btn-log-watch').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.logWatchModal(btn.dataset.id, app, films, () => renderList()); })
    );
    document.querySelectorAll('.btn-edit-film').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.editFilmModal(btn.dataset.id, app, films, () => { films = films.map(f => f.id===btn.dataset.id?{...f}:f); renderList(); }); })
    );
    document.querySelectorAll('.film-card').forEach(card =>
      card.addEventListener('click', e => { if (e.target.closest('button')) return; PAGES.filmDetail(card.dataset.id, app, films, watchLog); })
    );
  };

  const bindControls = () => {
    document.getElementById('film-search').addEventListener('input', e => { filters.search = e.target.value; renderList(); });
    document.querySelectorAll('.sort-pill').forEach(btn =>
      btn.addEventListener('click', () => {
        if (sortBy===btn.dataset.sort) sortDir = sortDir==='asc'?'desc':'asc';
        else { sortBy=btn.dataset.sort; sortDir='asc'; }
        renderShell();
      })
    );
    document.getElementById('btn-filter-toggle').addEventListener('click', () => {
      const p = document.getElementById('filter-panel');
      p.style.display = p.style.display==='none'?'block':'none';
    });
    document.querySelectorAll('[name="f-status"]').forEach(r => r.addEventListener('change', () => { filters.status=r.value; renderList(); }));
    document.querySelectorAll('[name="f-owned"]').forEach(r => r.addEventListener('change', () => { filters.owned=r.value; renderList(); }));
    document.getElementById('f-decade').addEventListener('change', e => { filters.decade=e.target.value; renderList(); });
    document.getElementById('f-country').addEventListener('change', e => { filters.country=e.target.value; renderList(); });
    document.getElementById('f-pg').addEventListener('change', e => { filters.pg=e.target.value; renderList(); });
    document.getElementById('f-fav').addEventListener('change', e => { filters.favorite=e.target.checked; renderList(); });
    document.getElementById('f-shelf').addEventListener('input', e => { filters.shelf = e.target.value; renderList(); });
    document.getElementById('f-dur-min').addEventListener('input', e => { filters.durMin = e.target.value; renderList(); });
    document.getElementById('f-dur-max').addEventListener('input', e => { filters.durMax = e.target.value; renderList(); });
    document.getElementById('btn-clear-filters').addEventListener('click', () => {
      filters = { search:'', status:'all', owned:'all', favorite:false, director:'all', decade:'all', country:'all', pg:'all', durMin:'', durMax:'', shelf:'' };
      renderShell();
    });
    document.getElementById('btn-dur-toggle').addEventListener('click', e => {
      durationUnit = durationUnit==='mins'?'hrs':'mins';
      e.target.textContent = durationUnit;
      renderList();
    });
    document.getElementById('btn-add-film').addEventListener('click', () =>
      PAGES.addFilmModal(app, () => PAGES.filmsLibrary(container, app))
    );

    document.getElementById('btn-by-director').addEventListener('click', () =>
      PAGES.directorBrowser(container, app, directors, (dir) => { filters.director=dir; renderShell(); })
    );
    document.getElementById('btn-clear-dir')?.addEventListener('click', () => { filters.director='all'; renderShell(); });
  };

  renderShell();
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
        const planId = btn.dataset.id;
        const filmId = btn.dataset.film;
        const film = filmMap[filmId];

        // Get the plan item date before marking done
        const planItem = plan.find(p => p.id === planId);
        const watchDate = planItem?.planned_date || today;

        await DB.update('film_plan', planId, { done: true });

        if (film) {
          // Insert watch_log using direct fetch to avoid encoding issues
          const sbUrl = CONFIG.supabase.url;
          const sbKey = CONFIG.supabase.key;
          const sbHeaders = {
            'apikey': sbKey,
            'Authorization': `Bearer ${sbKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          };

          const wlRes = await fetch(`${sbUrl}/rest/v1/watch_log`, {
            method: 'POST',
            headers: sbHeaders,
            body: JSON.stringify({ film_id: filmId, date: watchDate, session: 1 })
          });
          if (!wlRes.ok) console.warn('watch_log insert failed:', wlRes.status);

          // Update film status to watched
          await DB.update('films', filmId, { status: 'watched', updated_at: new Date().toISOString() });

          // Remove from omni_schedule_feed (film is now watched, no longer upcoming)
          await fetch(
            `${sbUrl}/rest/v1/omni_schedule_feed?source_id=eq.${filmId}&type=eq.film`,
            { method: 'DELETE', headers: sbHeaders }
          );
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
        // Find plan item to get film_id before deleting
        const planItems = await DB.query('film_plan', {});
        const planItem = planItems.find(p => p.id === btn.dataset.id);
        await DB.delete('film_plan', btn.dataset.id);
        // Remove from omni_schedule_feed
        if (planItem?.film_id) {
          const sbUrl = CONFIG.supabase.url;
          const sbKey = CONFIG.supabase.key;
          await fetch(
            `${sbUrl}/rest/v1/omni_schedule_feed?source_id=eq.${planItem.film_id}&type=eq.film`,
            { method: 'DELETE', headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` } }
          );
        }
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



// ── Film Detail ───────────────────────────────────────────────
PAGES.filmDetail = (filmId, app, films, watchLog) => {
  const f = films.find(x => x.id === filmId);
  if (!f) return;
  const logs = (watchLog||[]).filter(l => l.film_id === filmId).sort((a,b) => b.date.localeCompare(a.date));

  const formatDur = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins/60), m = mins%60;
    return `${mins}min${h>0?' ('+h+'h'+(m>0?' '+m+'m':'')+')':''}`;
  };

  const row = (label, val) => val ? `
    <div style="padding:0.4rem 0;border-bottom:1px solid var(--border);display:flex;gap:1rem;">
      <span style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;min-width:70px;padding-top:0.1rem;">${label}</span>
      <span style="font-size:0.85rem;color:var(--text2);flex:1;">${val}</span>
    </div>` : '';

  app.showModal(`
    <div class="modal-title">${f.title}</div>
    <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.75rem;">
      ${f.status==='watched'?'<span class="tag green">watched</span>':'<span class="tag gray">to-watch</span>'}
      ${f.is_owned?'<span class="tag">DVD owned</span>':''}
      ${f.is_favorite?'<span style="color:var(--accent);">★ Favourite</span>':''}
    </div>
    <div style="margin-bottom:1rem;">
      ${row('Director', f.director)}
      ${row('Writer', f.writer)}
      ${row('DP', f.dp)}
      ${row('Year', f.year)}
      ${row('Country', f.country)}
      ${row('Duration', f.runtime_mins ? formatDur(f.runtime_mins) : null)}
      ${row('PG Rating', f.pg_rating)}
      ${row('Shelf', f.shelf)}
    </div>
    ${logs.length ? `
      <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.4rem;">
        Watch History (${logs.length}×)
      </div>
      ${logs.map(l => `
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;padding:0.3rem 0;border-bottom:1px solid var(--border);">
          <span>${l.date}</span>
          ${l.session===2?'<span style="color:var(--text3);font-size:0.7rem;">Part 2</span>':''}
          ${l.notes?`<span style="color:var(--text3);font-size:0.75rem;">${l.notes}</span>`:''}
        </div>
      `).join('')}
    ` : '<div style="color:var(--text3);font-size:0.82rem;">Not yet watched</div>'}
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-secondary btn-sm" onclick="APP.closeModal()">Close</button>
    </div>
  `);
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

  const watchCount = {};
  logs.forEach(l => { watchCount[l.film_id] = (watchCount[l.film_id]||0) + 1; });

  const byYear = {};
  logs.forEach(l => {
    const yr = l.date ? l.date.substring(0,4) : '—';
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(l);
  });
  const years = Object.keys(byYear).sort().reverse();

  // Persist collapse state
  const collapseKey = 'llm_films_log_collapse';
  let collapseState = {};
  try { collapseState = JSON.parse(localStorage.getItem(collapseKey)||'{}'); } catch(e) {}

  const saveCollapse = () => localStorage.setItem(collapseKey, JSON.stringify(collapseState));

  const allExpanded = () => years.every(yr => !collapseState[yr]);
  const allCollapsed = () => years.every(yr => collapseState[yr]);

  const renderLog = () => {
    const allExp = allExpanded();
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
        <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${logs.length} viewings · ${years.length} years</span>
        <button class="btn btn-secondary btn-sm" id="btn-toggle-all" style="font-family:var(--mono);font-size:0.6rem;">
          ${allExp ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      ${years.length === 0 ? '<div class="empty"><div class="empty-text">No films logged yet</div></div>' : ''}
      ${years.map(yr => {
        const collapsed = !!collapseState[yr];
        return `
          <div style="margin-bottom:0.25rem;">
            <div class="year-header-log" data-year="${yr}" style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;cursor:pointer;border-bottom:1px solid var(--border);">
              <span style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;">
                ${yr} · ${byYear[yr].length} viewing${byYear[yr].length!==1?'s':''}
              </span>
              <span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">${collapsed?'▶':'▼'}</span>
            </div>
            <div class="year-log-entries" data-year="${yr}" style="display:${collapsed?'none':'block'};">
              ${byYear[yr].map(l => {
                const f = filmMap[l.film_id] || {};
                const count = watchCount[l.film_id] || 1;
                return `
                  <div class="book-item log-entry" data-film-id="${l.film_id}" data-log-id="${l.id}" style="cursor:pointer;">
                    <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.2rem;min-width:48px;width:48px;">🎬</div>
                    <div class="book-info">
                      <div class="book-title">${f.title||'Unknown film'}</div>
                      <div class="book-author">${f.director||''}${f.year?' · '+f.year:''}</div>
                    </div>
                    <div class="book-right" style="gap:0.3rem;">
                      <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${l.date}</span>
                      ${l.session===2?'<span class="tag gray" style="font-size:0.55rem;">Pt.2</span>':''}
                      ${count>1?`<span style="font-family:var(--mono);font-size:0.6rem;color:var(--accent);">${count}×</span>`:''}
                      <button class="btn btn-secondary btn-sm btn-del-log" data-id="${l.id}" data-film-id="${l.film_id}" style="color:var(--error);font-size:0.65rem;">×</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    `;

    // Toggle all
    document.getElementById('btn-toggle-all')?.addEventListener('click', () => {
      const shouldCollapse = allExpanded();
      years.forEach(yr => { collapseState[yr] = shouldCollapse; });
      saveCollapse();
      renderLog();
    });

    // Toggle individual year
    document.querySelectorAll('.year-header-log').forEach(header =>
      header.addEventListener('click', () => {
        const yr = header.dataset.year;
        collapseState[yr] = !collapseState[yr];
        saveCollapse();
        const entries = container.querySelector(`.year-log-entries[data-year="${yr}"]`);
        const arrow = header.querySelector('span:last-child');
        if (entries) entries.style.display = collapseState[yr] ? 'none' : 'block';
        if (arrow) arrow.textContent = collapseState[yr] ? '▶' : '▼';
        // Update toggle-all button text
        const btn = document.getElementById('btn-toggle-all');
        if (btn) btn.textContent = allExpanded() ? 'Collapse all' : 'Expand all';
      })
    );

    // Click entry to open film detail
    document.querySelectorAll('.log-entry').forEach(entry =>
      entry.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const f = filmMap[entry.dataset.filmId];
        if (f) PAGES.filmDetail(f.id, app, films, logs);
      })
    );

    // Delete log entry
    document.querySelectorAll('.btn-del-log').forEach(btn =>
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('Remove this watch entry?')) return;
        try {
          await DB.delete('watch_log', btn.dataset.id);
          const idx = logs.findIndex(l => l.id === btn.dataset.id);
          if (idx > -1) {
            const filmId = logs[idx].film_id;
            const logDate = logs[idx].date;
            logs.splice(idx, 1);
            watchCount[filmId] = logs.filter(l => l.film_id === filmId).length;
            const yr = btn.closest('.year-log-entries')?.dataset.year;
            if (yr && byYear[yr]) byYear[yr] = byYear[yr].filter(l => l.id !== btn.dataset.id);
            if (watchCount[filmId] === 0) {
              await DB.update('films', filmId, { status: 'to-watch', updated_at: new Date().toISOString() });
            }
            // Reset any plan items for this film on this date back to not-done
            try {
              const planItems = await DB.query('film_plan', { filter: { film_id: filmId, done: true } });
              for (const p of planItems) {
                if (p.planned_date === logDate) {
                  await DB.update('film_plan', p.id, { done: false });
                }
              }
            } catch(e) { /* film_plan reset optional */ }
          }
          app.notify('Entry removed', 'success');
          renderLog();
        } catch(err) { app.notify('Error: '+err.message, 'error'); }
      })
    );
  };

  renderLog();
};

// ── Film Detail ───────────────────────────────────────────────
PAGES.filmDetail = (filmId, app, films, watchLog) => {
  const f = films.find(x => x.id === filmId);
  if (!f) return;
  const logs = (watchLog||[]).filter(l => l.film_id === filmId).sort((a,b) => b.date.localeCompare(a.date));

  const formatDur = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins/60), m = mins%60;
    return `${mins}min${h>0?' ('+h+'h'+(m>0?' '+m+'m':'')+')':''}`;
  };

  const row = (label, val) => val ? `
    <div style="padding:0.4rem 0;border-bottom:1px solid var(--border);display:flex;gap:1rem;">
      <span style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;min-width:70px;padding-top:0.1rem;">${label}</span>
      <span style="font-size:0.85rem;color:var(--text2);flex:1;">${val}</span>
    </div>` : '';

  app.showModal(`
    <div class="modal-title">${f.title}</div>
    <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.75rem;">
      ${f.status==='watched'?'<span class="tag green">watched</span>':'<span class="tag gray">to-watch</span>'}
      ${f.is_owned?'<span class="tag">DVD owned</span>':''}
      ${f.is_favorite?'<span style="color:var(--accent);">★ Favourite</span>':''}
    </div>
    <div style="margin-bottom:1rem;">
      ${row('Director', f.director)}
      ${row('Writer', f.writer)}
      ${row('DP', f.dp)}
      ${row('Year', f.year)}
      ${row('Country', f.country)}
      ${row('Duration', f.runtime_mins ? formatDur(f.runtime_mins) : null)}
      ${row('PG Rating', f.pg_rating)}
      ${row('Shelf', f.shelf)}
    </div>
    ${logs.length ? `
      <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.4rem;">
        Watch History (${logs.length}×)
      </div>
      ${logs.map(l => `
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;padding:0.3rem 0;border-bottom:1px solid var(--border);">
          <span>${l.date}</span>
          ${l.session===2?'<span style="color:var(--text3);font-size:0.7rem;">Part 2</span>':''}
          ${l.notes?`<span style="color:var(--text3);font-size:0.75rem;">${l.notes}</span>`:''}
        </div>
      `).join('')}
    ` : '<div style="color:var(--text3);font-size:0.82rem;">Not yet watched</div>'}
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-secondary btn-sm" onclick="APP.closeModal()">Close</button>
    </div>
  `);
};

// ── Films Log ─────────────────────────────────────────────────
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

// ── Add Film Modal (with TMDB search) ────────────────────────
PAGES.addFilmModal = (app, onDone) => {
  const renderForm = (prefill = {}) => {
    app.showModal(`
      <div class="modal-title">Add Film</div>

      <!-- TMDB Search -->
      <div style="background:var(--bg3);border-radius:var(--radius);padding:0.6rem;margin-bottom:0.75rem;">
        <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.4rem;">Search online to auto-fill metadata (OMDb)</div>
        <div style="display:flex;gap:0.4rem;">
          <input id="tmdb-search" placeholder="Search TMDB..." style="flex:1;" value="${prefill.title||''}">
          <button class="btn btn-secondary btn-sm" id="btn-tmdb-search">Search</button>
        </div>
        <div id="tmdb-results" style="margin-top:0.4rem;max-height:120px;overflow-y:auto;"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
        <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
          <label>Title *</label>
          <input id="af-title" placeholder="Film title" value="${prefill.title||''}">
        </div>
        <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
          <label>Director</label>
          <input id="af-dir" placeholder="Director" value="${prefill.director||''}">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Year</label>
          <input id="af-year" type="number" placeholder="1979" value="${prefill.year||''}">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Duration (min)</label>
          <input id="af-runtime" type="number" placeholder="120" value="${prefill.runtime_mins||''}">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Country</label>
          <input id="af-country" placeholder="France" value="${prefill.country||''}">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Status</label>
          <select id="af-status">
            <option value="to-watch">To Watch</option>
            <option value="watched">Watched</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Writer</label>
          <input id="af-writer" placeholder="Writer" value="${prefill.writer||''}">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>DP</label>
          <input id="af-dp" placeholder="Cinematographer" value="${prefill.dp||''}">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>PG Rating</label>
          <input id="af-pg" placeholder="e.g. R, PG-13" value="${prefill.pg_rating||''}">
        </div>
        <div class="form-group" style="margin-bottom:0;grid-column:1/-1;display:flex;gap:1rem;">
          <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.82rem;cursor:pointer;margin-bottom:0;">
            <input type="checkbox" id="af-fav" style="width:auto;"> Favourite ★
          </label>
          <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.82rem;cursor:pointer;margin-bottom:0;">
            <input type="checkbox" id="af-owned" style="width:auto;"> Owned (DVD)
          </label>
        </div>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1rem;">
        <button class="btn btn-primary" id="btn-save-film">Add</button>
        <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
      </div>
    `);

    // OMDb search (free API - get key at omdbapi.com)
    const doSearch = async () => {
      const q = document.getElementById('tmdb-search').value.trim();
      if (!q) return;
      const storedKey = await DB.getSetting('omdb_api_key');
      const key = storedKey || 'c0c229d0';
      if (!key) {
        document.getElementById('tmdb-results').innerHTML = '<div style="font-size:0.75rem;color:var(--error);">Add your OMDb API key in Settings first</div>';
        return;
      }
      document.getElementById('tmdb-results').innerHTML = '<div style="font-size:0.75rem;color:var(--text3);">Searching...</div>';
      try {
        const res = await fetch(`https://www.omdbapi.com/?apikey=${key}&s=${encodeURIComponent(q)}&type=movie`);
        const data = await res.json();
        if (data.Response === 'False') { document.getElementById('tmdb-results').innerHTML = '<div style="font-size:0.75rem;color:var(--text3);">No results</div>'; return; }
        const results = (data.Search||[]).slice(0,6);
        document.getElementById('tmdb-results').innerHTML = results.map(r => `
          <div class="omdb-result" data-id="${r.imdbID}" style="padding:0.35rem 0.5rem;cursor:pointer;font-size:0.82rem;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
            <span>${r.Title} (${r.Year})</span>
            <span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">Select →</span>
          </div>
        `).join('');
        document.querySelectorAll('.omdb-result').forEach(el => {
          el.addEventListener('mouseenter', () => el.style.background = 'var(--bg4)');
          el.addEventListener('mouseleave', () => el.style.background = '');
          el.addEventListener('click', async () => {
            document.getElementById('tmdb-results').innerHTML = '<div style="font-size:0.75rem;color:var(--text3);">Loading details...</div>';
            try {
              const res2 = await fetch(`https://www.omdbapi.com/?apikey=${key}&i=${el.dataset.id}&plot=short`);
              const m = await res2.json();
              document.getElementById('af-title').value   = m.Title || '';
              document.getElementById('af-dir').value     = m.Director !== 'N/A' ? m.Director : '';
              document.getElementById('af-year').value    = parseInt(m.Year) || '';
              document.getElementById('af-runtime').value = m.Runtime ? parseInt(m.Runtime) : '';
              document.getElementById('af-country').value = m.Country !== 'N/A' ? m.Country.split(',')[0].trim() : '';
              document.getElementById('af-writer').value  = m.Writer !== 'N/A' ? m.Writer : '';
              document.getElementById('af-pg').value      = m.Rated !== 'N/A' ? m.Rated : '';
              document.getElementById('tmdb-results').innerHTML = '<div style="font-size:0.75rem;color:var(--accent);">✓ Filled from OMDb</div>';
            } catch(e) { document.getElementById('tmdb-results').innerHTML = '<div style="font-size:0.75rem;color:var(--error);">Failed to load details</div>'; }
          });
        });
      } catch(e) { document.getElementById('tmdb-results').innerHTML = '<div style="font-size:0.75rem;color:var(--error);">Search failed</div>'; }
    };

    document.getElementById('btn-tmdb-search').addEventListener('click', doSearch);
    document.getElementById('tmdb-search').addEventListener('keydown', e => { if (e.key==='Enter') doSearch(); });

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
          pg_rating: document.getElementById('af-pg').value.trim() || null,
          is_favorite: document.getElementById('af-fav').checked,
          is_owned: document.getElementById('af-owned').checked,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        app.closeModal();
        app.notify('Film added','success');
        if (onDone) onDone();
      } catch(e) { app.notify('Error: '+e.message,'error'); }
    });
  };

  renderForm();
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
      <div class="form-group" style="margin-bottom:0;">
        <label>Shelf (optional)</label>
        <input id="ef-shelf" placeholder="e.g. A, B2, 3" value="${v(f.shelf)}">
      </div>
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;display:flex;gap:1rem;">
        <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.82rem;cursor:pointer;margin-bottom:0;">
          <input type="checkbox" id="ef-fav" style="width:auto;" ${f.is_favorite?'checked':''}> Favourite ★
        </label>
        <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.82rem;cursor:pointer;margin-bottom:0;">
          <input type="checkbox" id="ef-owned" style="width:auto;" ${f.is_owned?'checked':''}> Owned (DVD)
        </label>
      </div>
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-primary" id="btn-update-film">Save</button>
      ${f.status==='watched'?'<button class="btn btn-secondary btn-sm" id="btn-unwatch-film" style="color:var(--text3);">Unwatch</button>':'<button class="btn btn-secondary btn-sm" id="btn-quick-log" style="color:var(--accent);">+ Log Watch</button>'}
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
        is_owned: document.getElementById('ef-owned').checked,
        shelf: document.getElementById('ef-shelf').value.trim() || null,
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

  document.getElementById('btn-unwatch-film')?.addEventListener('click', async () => {
    app.closeModal();
    PAGES.unwatchFilm(filmId, f.title, app, onDone);
  });
  document.getElementById('btn-quick-log')?.addEventListener('click', async () => {
    app.closeModal();
    PAGES.logWatchModal(filmId, app, films, onDone);
  });
};

// ── Unwatch Film ──────────────────────────────────────────────
PAGES.unwatchFilm = async (filmId, filmTitle, app, onDone) => {
  let logs = [];
  try {
    // Use direct fetch to avoid UUID encoding issues in DB.query filter
    const sbUrl = CONFIG.supabase.url;
    const sbKey = CONFIG.supabase.key;
    const res = await fetch(
      `${sbUrl}/rest/v1/watch_log?film_id=eq.${filmId}&order=date.desc`,
      { headers: {
        'apikey': sbKey,
        'Authorization': `Bearer ${sbKey}`,
        'Content-Type': 'application/json'
      }}
    );
    if (!res.ok) throw new Error(await res.text());
    logs = await res.json();
    console.log('watch logs for', filmId, ':', logs.length);
  } catch(e) { app.notify('Error: '+e.message,'error'); return; }

  if (logs.length === 0) {
    app.notify('No watch entries to remove','info');
    return;
  }

  app.showModal(`
    <div class="modal-title">Watch History</div>
    <div style="font-size:0.88rem;color:var(--text2);margin-bottom:1rem;">${filmTitle}</div>
    <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);margin-bottom:0.5rem;">Tap × to remove an entry</div>
    <div id="unwatch-list">
      ${logs.map(l => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border);">
          <span style="font-size:0.85rem;">${l.date}${l.session===2?' · Part 2':''}</span>
          <button class="btn btn-secondary btn-sm btn-del-watch" data-id="${l.id}" style="color:var(--error);">×</button>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-secondary" style="margin-top:1rem;width:100%;" onclick="APP.closeModal()">Done</button>
  `);

  document.querySelectorAll('.btn-del-watch').forEach(btn =>
    btn.addEventListener('click', async () => {
      try {
        await DB.delete('watch_log', btn.dataset.id);
        // Remove from UI
        btn.closest('div[style]').remove();
        // If no more logs, update film status back to to-watch
        const remaining = document.querySelectorAll('.btn-del-watch').length;
        if (remaining === 0) {
          await DB.update('films', filmId, { status: 'to-watch', updated_at: new Date().toISOString() });
          app.notify('All watches removed — film reset to to-watch','success');
          app.closeModal();
        } else {
          app.notify('Entry removed','success');
        }
        if (onDone) onDone();
      } catch(e) { app.notify('Error: '+e.message,'error'); }
    })
  );
};

// ── Director Browser ──────────────────────────────────────────
PAGES.directorBrowser = (container, app, directors, onSelect) => {
  app.showModal(`
    <div class="modal-title">Browse by Director</div>
    <div class="search-bar" style="margin-bottom:0.5rem;">
      <span class="search-icon">⌕</span>
      <input type="text" id="dir-search" placeholder="Search directors...">
    </div>
    <div id="dir-list" style="max-height:55vh;overflow-y:auto;">
      ${renderDirList(directors)}
    </div>
  `);

  function renderDirList(list) {
    return list.map(d => `
      <div class="book-item dir-item" data-dir="${d}" style="cursor:pointer;padding:0.5rem 0;">
        <div class="book-info"><div style="font-size:0.88rem;">${d}</div></div>
        <span style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">→</span>
      </div>
    `).join('') || '<div style="padding:1rem;text-align:center;color:var(--text3);">No directors found</div>';
  }

  document.getElementById('dir-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = directors.filter(d => d.toLowerCase().includes(q));
    document.getElementById('dir-list').innerHTML = renderDirList(filtered);
    bindDirItems();
  });

  const bindDirItems = () => {
    document.querySelectorAll('.dir-item').forEach(item =>
      item.addEventListener('click', () => {
        app.closeModal();
        onSelect(item.dataset.dir);
      })
    );
  };
  bindDirItems();
};
