// Past Years / Stats Page
PAGES.stats = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  const currentYear = new Date().getFullYear();

  // Fetch all queue data for past years
  let allQueues = {};
  try {
    const url = `${DB.url}/rest/v1/yearly_queue?select=*,book:books(*)&order=year.asc,position.asc`;
    const res = await fetch(url, { headers: DB.headers() });
    const rows = await res.json();
    rows.forEach(item => {
      // Include all years including current (shows completed books)
      if (!allQueues[item.year]) allQueues[item.year] = [];
      allQueues[item.year].push(item);
    });
  } catch(e) {}

  // Also pull completed books from notes for older data
  const allBooks = await DB.getBooks();
  allBooks.filter(b => b.status === 'completed' && b.notes).forEach(b => {
    const match = (b.notes||'').match(/Read (\d{4})/);
    if (!match) return;
    const year = parseInt(match[1]);
    if (year > currentYear) return;
    if (!allQueues[year]) allQueues[year] = [];
    if (!allQueues[year].find(q => (q.book_id || q.book?.id) === b.id)) {
      allQueues[year].push({ book: b, book_id: b.id, year });
    }
  });

  // Show all years except current (current year is in Year Plan)
  const years = Object.keys(allQueues).map(Number).filter(y => y <= currentYear).sort((a,b) => b-a);
  const allLogs = await DB.getReadingLog();

  if (!years.length) {
    container.innerHTML = `
      <div class="page-title">Past Years</div>
      <div class="page-subtitle">Your reading history</div>
      <div class="empty">
        <div class="empty-icon">◈</div>
        <div class="empty-text">No past years recorded yet</div>
        <div style="font-size:0.8rem;color:var(--text3);margin-top:0.5rem;">Books you complete will appear here</div>
      </div>
    `;
    return;
  }

  const collapseKey = 'llm_stats_collapse';
  let collapsed = JSON.parse(localStorage.getItem(collapseKey) || '{}');

  const renderYear = (year) => {
    const items = allQueues[year] || [];
    const bookIds = new Set(items.map(q => q.book_id || q.book?.id).filter(Boolean));
    const yearLogs = allLogs.filter(l =>
      l.date >= `${year}-01-01` && l.date <= `${year}-12-31` && !l.is_review && bookIds.has(l.book_id)
    );
    const pagesRead = yearLogs.reduce((s,l) => s+(l.pages_read||0), 0);
    const isCollapsed = collapsed[year] !== false;

    const cats = {};
    items.forEach(q => {
      const book = q.book || q;
      const bookCats = book.categories?.length ? book.categories : (book.category ? [book.category] : []);
      bookCats.forEach(c => { cats[c] = (cats[c]||0)+1; });
    });

    return `
      <div style="margin-bottom:0.875rem;">
        <div class="year-header-stats" data-year="${year}"
          style="display:flex;align-items:center;justify-content:space-between;
            padding:0.75rem 1rem;background:var(--bg2);border:1px solid var(--border);
            border-radius:var(--radius2);cursor:pointer;opacity:0.72;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span style="font-family:var(--mono);font-size:0.72rem;color:var(--text3);letter-spacing:0.08em;">✓ ${year}</span>
            <span style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);">
              ${items.length} book${items.length!==1?'s':''} · ${pagesRead.toLocaleString()}p
            </span>
          </div>
          <span class="stats-chevron" data-year="${year}" style="font-family:var(--mono);font-size:0.7rem;color:var(--text3);">${isCollapsed ? '▼' : '▲'}</span>
        </div>

        <div class="stats-year-content" data-year="${year}" style="display:${isCollapsed ? 'none' : 'block'};">
          ${Object.keys(cats).length ? `
            <div class="card" style="margin-top:0.4rem;margin-bottom:0.4rem;">
              <div class="card-meta" style="margin-bottom:0.6rem;">By Category</div>
              ${Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,n]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
                  <span>${c}</span>
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <div style="width:60px;height:2px;background:var(--bg4);border-radius:1px;">
                      <div style="width:${Math.round((n/items.length)*100)}%;height:100%;background:var(--accent);border-radius:1px;"></div>
                    </div>
                    <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${n}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="card" style="margin-top:0.4rem;">
            ${items.map(q => {
              const book = q.book || q;
              const bookId = book.id || q.book_id;
              const bookLogs = allLogs.filter(l =>
                l.book_id === bookId && l.date >= `${year}-01-01` && l.date <= `${year}-12-31` && !l.is_review
              );
              const firstLog = bookLogs.length ? bookLogs.reduce((a,c) => a.date < c.date ? a : c) : null;
              const lastLog  = bookLogs.length ? bookLogs.reduce((a,c) => a.date > c.date ? a : c) : null;
              return `
                <div class="book-item" style="opacity:0.75;">
                  <div class="book-cover">${book.cover_url ? `<img src="${book.cover_url}" alt="">` : ''}</div>
                  <div class="book-info">
                    <div class="book-title" style="text-decoration:line-through;color:var(--text2);font-size:0.88rem;">
                      ${book.is_favorite ? '<span style="color:var(--accent);">★ </span>' : ''}${book.title}
                    </div>
                    <div class="book-author">${book.author||''}</div>
                    ${firstLog && lastLog ? `
                      <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);margin-top:0.2rem;">
                        ${SCHEDULER.formatDateShort(firstLog.date)} → ${SCHEDULER.formatDateShort(lastLog.date)}
                      </div>
                    ` : ''}
                  </div>
                  <div class="book-right">
                    ${book.pages ? `<div class="book-pages">${book.pages}p</div>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.25rem;">
      <div class="page-title">Past Years</div>
      <button class="btn btn-secondary btn-sm" id="btn-toggle-all-stats">Expand All</button>
    </div>
    <div class="page-subtitle">${years.length} year${years.length!==1?'s':''} of reading</div>
    ${years.map(y => renderYear(y)).join('')}
  `;

  // Toggle individual years
  document.querySelectorAll('.year-header-stats').forEach(header => {
    header.addEventListener('click', () => {
      const year = parseInt(header.dataset.year);
      const content = document.querySelector(`.stats-year-content[data-year="${year}"]`);
      const chevron = document.querySelector(`.stats-chevron[data-year="${year}"]`);
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? 'block' : 'none';
      collapsed[year] = !isHidden;
      if (chevron) chevron.textContent = isHidden ? '▲' : '▼';
      localStorage.setItem(collapseKey, JSON.stringify(collapsed));
    });
  });

  // Toggle all
  document.getElementById('btn-toggle-all-stats')?.addEventListener('click', () => {
    const anyOpen = [...document.querySelectorAll('.stats-year-content')].some(c => c.style.display !== 'none');
    document.querySelectorAll('.stats-year-content').forEach(c => {
      const year = c.dataset.year;
      c.style.display = anyOpen ? 'none' : 'block';
      collapsed[year] = anyOpen;
      const chevron = document.querySelector(`.stats-chevron[data-year="${year}"]`);
      if (chevron) chevron.textContent = anyOpen ? '▼' : '▲';
    });
    localStorage.setItem(collapseKey, JSON.stringify(collapsed));
    document.getElementById('btn-toggle-all-stats').textContent = anyOpen ? 'Expand All' : 'Collapse All';
  });
};
