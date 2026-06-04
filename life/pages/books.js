// Books Module — Library · Plan · Log
PAGES.books = async (container, app, initialTab = 'library') => {
  // Render the shell with tabs, then load the active tab content
  const renderShell = (activeTab) => {
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
    if (tab === 'library') {
      PAGES.library(inner, app);
    } else if (tab === 'plan') {
      PAGES.year(inner, app);
    } else if (tab === 'log') {
      PAGES.booksLog(inner, app);
    }
  };

  renderShell(initialTab);
};

// Books Log — reading history grouped by year
PAGES.booksLog = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading log...</div>';
  let log = [], books = [];
  try {
    log = await DB.query('reading_log', { order: 'date.desc' });
    books = await DB.getBooks();
  } catch(e) {
    container.innerHTML = `<div style="color:var(--error)">${e.message}</div>`;
    return;
  }

  const bookMap = {};
  books.forEach(b => bookMap[b.id] = b);

  // Group completed books by year from reading_history
  let history = [];
  try {
    history = await DB.query('reading_history', { order: 'completed_date.desc' });
  } catch(e) {}

  // Also get pages read per year from log
  const byYear = {};
  log.forEach(l => {
    const yr = l.date ? l.date.substring(0,4) : 'Unknown';
    if (!byYear[yr]) byYear[yr] = { pages: 0, logs: [] };
    byYear[yr].pages += (l.pages_read || 0);
    byYear[yr].logs.push(l);
  });
  const years = Object.keys(byYear).sort().reverse();

  container.innerHTML = `
    <div style="margin-bottom:1rem;">
      ${years.map(yr => `
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;margin:1rem 0 0.4rem;">
          ${yr} · ${byYear[yr].pages.toLocaleString()} pages
        </div>
        ${[...new Set(byYear[yr].logs.map(l => l.book_id))].map(bookId => {
          const b = bookMap[bookId];
          if (!b) return '';
          const bookLogs = byYear[yr].logs.filter(l => l.book_id === bookId);
          const pagesRead = bookLogs.reduce((s,l) => s + (l.pages_read||0), 0);
          return `
            <div class="book-item" style="cursor:default;">
              <div class="book-cover" style="position:relative;">
                ${b.cover_url ? `<img src="${b.cover_url}" alt="" loading="lazy">` : ''}
              </div>
              <div class="book-info">
                <div class="book-title">${b.title}</div>
                <div class="book-author">${b.author||''}</div>
              </div>
              <div class="book-right">
                <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${pagesRead}p</span>
                <span class="tag ${b.status==='completed'?'green':'gray'}">${b.status}</span>
              </div>
            </div>
          `;
        }).join('')}
      `).join('')}
    </div>
  `;
};
