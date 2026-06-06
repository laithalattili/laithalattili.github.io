// Library Page
PAGES.library = async (container, app, initialStatus = 'all', initialCategory = 'all') => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading library...</div>';

  const books = await DB.getBooks();
  const categories = [...new Set(books.flatMap(b => b.categories?.length ? b.categories : (b.category ? [b.category] : [])))].filter(Boolean).sort();
  const statuses = ['all', 'to-read', 'reading', 'completed', 'review'];
  const years = [...new Set(books.map(b => b.publication_year).filter(Boolean))].sort().reverse();

  let filters = {
    search: '',
    status: initialStatus,
    category: initialCategory,
    favorite: false,
    owned: 'all',  // all / physical / digital
    yearFrom: '',
    yearTo: '',
  };
  let sortBy = 'title';
  let sortDir = 'asc';

  const activeFilterCount = () => {
    let n = 0;
    if (filters.favorite) n++;
    if (filters.status !== 'all') n++;
    if (filters.category !== 'all') n++;
    if (filters.owned !== 'all') n++;
    if (filters.yearFrom || filters.yearTo) n++;
    return n;
  };

  const applyFilters = () => {
    let list = [...books];
    if (filters.favorite) list = list.filter(b => b.is_favorite);
    if (filters.status !== 'all') list = list.filter(b => b.status === filters.status);
    if (filters.category !== 'all') list = list.filter(b => (b.categories||[]).includes(filters.category) || b.category === filters.category);
    if (filters.owned === 'physical') list = list.filter(b => b.owned_physical);
    if (filters.owned === 'digital') list = list.filter(b => b.owned_digital);
    if (filters.yearFrom) list = list.filter(b => b.publication_year && b.publication_year >= parseInt(filters.yearFrom));
    if (filters.yearTo) list = list.filter(b => b.publication_year && b.publication_year <= parseInt(filters.yearTo));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(b =>
        (b.title||'').toLowerCase().includes(q) ||
        (b.author||'').toLowerCase().includes(q) ||
        (b.categories||[]).some(c => c.toLowerCase().includes(q)) ||
        (b.category||'').toLowerCase().includes(q)
      );
    }
    const keyMap = { title:'title', author:'author', year:'publication_year', pages:'pages' };
    const key = keyMap[sortBy] || 'title';
    list.sort((a,b) => {
      const av = a[key]||( typeof a[key]==='number'?0:''), bv = b[key]||(typeof b[key]==='number'?0:'');
      const cmp = typeof av==='string' ? av.localeCompare(bv) : av-bv;
      return sortDir==='asc' ? cmp : -cmp;
    });
    return list;
  };

  const sortLabelMap = { title:'Title', author:'Author', year:'Year', pages:'Pages' };

  const renderShell = () => {
    const afc = activeFilterCount();
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
        <span id="book-count" style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);">${books.length} books</span>
        <div style="display:flex;gap:0.4rem;align-items:center;">
          <button class="btn btn-secondary btn-sm" id="btn-lib-filter">Filter${afc>0?` <span style="background:var(--accent);color:white;border-radius:99px;padding:0 4px;font-size:0.55rem;margin-left:2px;">${afc}</span>`:''}</button>
          <button class="btn btn-secondary btn-sm" id="btn-lib-add">+ Add</button>
        </div>
      </div>

      <div class="search-bar">
        <span class="search-icon">⌕</span>
        <input type="text" id="lib-search" placeholder="Title, author, category..." value="${filters.search}">
      </div>

      <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.75rem;flex-wrap:wrap;">
        <span style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;">Sort</span>
        ${Object.entries(sortLabelMap).map(([k,v]) => `
          <button class="pill sort-pill ${sortBy===k?'active':''}" data-sort="${k}">${v}${sortBy===k?(sortDir==='asc'?' ↑':' ↓'):''}</button>
        `).join('')}
      </div>

      <!-- Filter panel -->
      <div id="lib-filter-panel" style="display:none;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;margin-bottom:0.75rem;">
        <div style="display:flex;flex-wrap:wrap;gap:1rem;">

          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Status</div>
            ${['all','to-read','reading','completed','review'].map(s => `
              <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;cursor:pointer;margin-bottom:0.2rem;">
                <input type="radio" name="lib-status" value="${s}" ${filters.status===s?'checked':''} style="width:auto;">
                ${s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}
              </label>`).join('')}
          </div>

          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Category</div>
            <select id="lib-cat" style="font-size:0.78rem;padding:0.25rem;max-width:140px;">
              <option value="all">All categories</option>
              ${categories.map(c => `<option value="${c}" ${filters.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>

          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Format</div>
            ${[['all','All'],['physical','Physical'],['digital','Digital']].map(([v,l]) => `
              <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;cursor:pointer;margin-bottom:0.2rem;">
                <input type="radio" name="lib-owned" value="${v}" ${filters.owned===v?'checked':''} style="width:auto;">${l}
              </label>`).join('')}
          </div>

          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Year Published</div>
            <div style="display:flex;align-items:center;gap:0.3rem;">
              <input type="number" id="lib-year-from" placeholder="from" value="${filters.yearFrom}" style="width:60px;font-size:0.78rem;padding:0.25rem;text-align:center;">
              <span style="color:var(--text3);">–</span>
              <input type="number" id="lib-year-to" placeholder="to" value="${filters.yearTo}" style="width:60px;font-size:0.78rem;padding:0.25rem;text-align:center;">
            </div>
          </div>

          <div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);text-transform:uppercase;margin-bottom:0.3rem;">Other</div>
            <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;cursor:pointer;">
              <input type="checkbox" id="lib-fav" ${filters.favorite?'checked':''} style="width:auto;">Favourites only
            </label>
          </div>

        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:0.5rem;">
          <button class="btn btn-secondary btn-sm" id="btn-lib-clear">Clear all</button>
        </div>
      </div>

      <div id="book-list"></div>
    `;
    bindControls();
    renderList();
  };

  const renderList = () => {
    const list = applyFilters();
    const countEl = document.getElementById('book-count');
    if (countEl) countEl.textContent = `${list.length} book${list.length!==1?'s':''}`;
    const listEl = document.getElementById('book-list');
    if (!listEl) return;
    listEl.innerHTML = list.length
      ? list.map(b => renderBookItem(b)).join('')
      : '<div class="empty"><div class="empty-text">No books match your filters</div></div>';
    bindBookItems();
  };

  const bindBookItems = () => {
    document.querySelectorAll('.btn-edit-book').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.editBook(btn.dataset.id, app, filters.status, filters.category); })
    );
    document.querySelectorAll('.btn-add-to-plan').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); PAGES.addBookToPlanFromLibrary(btn.dataset.id, app); })
    );
    document.querySelectorAll('.book-title-link').forEach(el =>
      el.addEventListener('click', () => PAGES._openBookNotes(el.dataset.id))
    );
  };

  const bindControls = () => {
    document.getElementById('lib-search').addEventListener('input', e => { filters.search = e.target.value; renderList(); });

    document.querySelectorAll('.sort-pill').forEach(btn =>
      btn.addEventListener('click', () => {
        if (sortBy===btn.dataset.sort) sortDir = sortDir==='asc'?'desc':'asc';
        else { sortBy=btn.dataset.sort; sortDir='asc'; }
        renderShell();
      })
    );

    document.getElementById('btn-lib-filter').addEventListener('click', () => {
      const p = document.getElementById('lib-filter-panel');
      p.style.display = p.style.display==='none'?'block':'none';
    });

    document.querySelectorAll('[name="lib-status"]').forEach(r => r.addEventListener('change', () => { filters.status=r.value; renderList(); }));
    document.getElementById('lib-cat').addEventListener('change', e => { filters.category=e.target.value; renderList(); });
    document.querySelectorAll('[name="lib-owned"]').forEach(r => r.addEventListener('change', () => { filters.owned=r.value; renderList(); }));
    document.getElementById('lib-year-from').addEventListener('input', e => { filters.yearFrom=e.target.value; renderList(); });
    document.getElementById('lib-year-to').addEventListener('input', e => { filters.yearTo=e.target.value; renderList(); });
    document.getElementById('lib-fav').addEventListener('change', e => { filters.favorite=e.target.checked; renderList(); });

    document.getElementById('btn-lib-clear').addEventListener('click', () => {
      filters = { search:'', status:'all', category:'all', favorite:false, owned:'all', yearFrom:'', yearTo:'' };
      renderShell();
    });

    document.getElementById('btn-lib-add').addEventListener('click', () =>
      APP.navigate('add-book')
    );
  };

  renderShell();
};

function renderBookItem(b) {
  const statusColors = { 'to-read': 'gray', reading: '', completed: 'green', review: '' };
  const cats = b.categories?.length ? b.categories : (b.category ? [b.category] : []);
  const physicalBadge = b.owned_physical ? '<span style="font-family:var(--mono);font-size:0.52rem;color:var(--text3);border:1px solid var(--border);border-radius:3px;padding:0 3px;">📖</span>' : '';
  const digitalBadge  = b.owned_digital  ? '<span style="font-family:var(--mono);font-size:0.52rem;color:var(--text3);border:1px solid var(--border);border-radius:3px;padding:0 3px;">💻</span>' : '';
  const langBadge = b.original_language && b.original_language !== 'English'
    ? `<span style="font-family:var(--mono);font-size:0.52rem;color:var(--text3);">${b.original_language}</span>` : '';
  return `
    <div class="book-item">
      <div class="book-cover" style="position:relative;cursor:pointer;" onclick="PAGES._openBookNotes('${b.id}')">
        ${b.cover_url ? `<img src="${b.cover_url}" alt="" loading="lazy">` : ''}
        ${b.is_favorite ? '<div style="position:absolute;top:1px;right:1px;font-size:0.65rem;color:var(--accent);">★</div>' : ''}
      </div>
      <div class="book-info">
        <div class="book-title book-title-link" data-id="${b.id}" style="cursor:pointer;">
          ${b.is_favorite ? '<span style="color:var(--accent);margin-right:0.25rem;">★</span>' : ''}${b.title}
        </div>
        <div class="book-author">${b.author||''}${b.publication_year?' · '+b.publication_year:''}</div>
        <div style="display:flex;gap:0.25rem;flex-wrap:wrap;margin-top:0.3rem;align-items:center;">
          ${cats.slice(0,2).map(c => `<span class="tag gray" style="font-size:0.55rem;">${c}</span>`).join('')}
          ${langBadge}${physicalBadge}${digitalBadge}
        </div>
      </div>
      <div class="book-right">
        <span class="tag ${statusColors[b.status]||''}">${b.status}</span>
        <div class="book-pages">${b.pages?b.pages+'p':''}</div>
        <button class="btn btn-secondary btn-sm btn-edit-book" data-id="${b.id}">Edit</button>
        <button class="btn btn-secondary btn-sm btn-add-to-plan" data-id="${b.id}" data-status="${b.status}">+ Plan</button>
      </div>
    </div>
  `;
}

PAGES.editBook = async (bookId, app, currentStatus = 'all', currentCategory = 'all') => {
  const books = await DB.getBooks();
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  const allCats = [...new Set(books.flatMap(b => b.categories?.length ? b.categories : (b.category ? [b.category] : [])))].filter(Boolean).sort();
  let bookCats = book.categories?.length ? [...book.categories] : (book.category ? [book.category] : []);

  const renderCatTags = () => bookCats.map(c => `
    <span style="display:inline-flex;align-items:center;gap:0.3rem;background:var(--accent-dim);border:1px solid rgba(196,98,45,0.3);
      border-radius:3px;padding:0.2rem 0.5rem;font-family:var(--mono);font-size:0.65rem;color:var(--accent);margin:0.2rem;">
      ${c}
      <button type="button" onclick="PAGES._removeCat('${c}')" style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:0.8rem;padding:0;line-height:1;">×</button>
    </span>
  `).join('');

  const renderSuggestions = () => allCats.filter(c => !bookCats.includes(c)).map(c =>
    `<button type="button" class="pill" onclick="PAGES._addCat('${c}')" style="font-size:0.58rem;padding:0.18rem 0.5rem;">${c}</button>`
  ).join('');

  app.showModal(`
    <div class="modal-title">Edit Book</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Title</label>
        <input id="edit-title" value="${book.title || ''}">
      </div>
      <div class="form-group" style="margin-bottom:0;grid-column:1/-1;">
        <label>Author</label>
        <input id="edit-author" value="${book.author || ''}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Pages</label>
        <input id="edit-pages" type="number" value="${book.pages || ''}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Status</label>
        ${(book.status==='reading'||book.status==='review') ? `
          <div style="padding:0.5rem;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);font-size:0.82rem;color:var(--text2);">
            <span class="tag" style="margin-right:0.4rem;">${book.status}</span>
            <span style="font-size:0.65rem;color:var(--text3);">Auto-assigned by reading schedule</span>
          </div>
          <input type="hidden" id="edit-status" value="${book.status}">
        ` : `
          <select id="edit-status">
            ${['to-read','completed'].map(s =>
              '<option value="' + s + '" ' + (book.status===s?'selected':'') + '>' + s + '</option>'
            ).join('')}
          </select>
        `}
      </div>
    </div>

    <div class="form-group" style="margin-top:0.75rem;">
      <label>Categories</label>
      <div id="cat-tags" style="display:flex;flex-wrap:wrap;min-height:2rem;padding:0.3rem;
        background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:0.4rem;">
        ${renderCatTags()}
      </div>
      <div style="display:flex;gap:0.5rem;">
        <input id="cat-input" placeholder="Type a category and press Enter" autocomplete="off"
          style="flex:1;" list="cat-datalist">
        <datalist id="cat-datalist">${allCats.map(c => `<option value="${c}">`).join('')}</datalist>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-cat">Add</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-top:0.5rem;" id="cat-suggestions">
        ${renderSuggestions()}
      </div>
    </div>

    <div class="form-group">
      <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;text-transform:none;letter-spacing:0;font-size:0.88rem;color:var(--text2);">
        <input type="checkbox" id="edit-favorite" ${book.is_favorite ? 'checked' : ''} style="width:auto;">
        <span style="color:var(--accent);">★</span> Mark as favourite
      </label>
    </div>
    <div class="form-group">
      <label>Ownership</label>
      <div style="display:flex;gap:1.25rem;margin-top:0.2rem;">
        <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;text-transform:none;letter-spacing:0;font-size:0.85rem;color:var(--text2);">
          <input type="checkbox" id="edit-owned-physical" ${book.owned_physical ? 'checked' : ''} style="width:auto;"> Physical
        </label>
        <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;text-transform:none;letter-spacing:0;font-size:0.85rem;color:var(--text2);">
          <input type="checkbox" id="edit-owned-digital" ${book.owned_digital ? 'checked' : ''} style="width:auto;"> Digital
        </label>
      </div>
    </div>
    <div class="form-group">
      <label>Notes</label>
      <textarea id="edit-notes" rows="2">${book.notes || ''}</textarea>
    </div>
    <div class="modal-actions" style="justify-content:space-between;">
      <button class="btn btn-danger btn-sm" id="btn-delete-book">Delete</button>
      <div style="display:flex;gap:0.6rem;">
        <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-edit">Save</button>
      </div>
    </div>
  `);

  // Category helpers - exposed on PAGES for onclick
  PAGES._removeCat = (cat) => {
    bookCats = bookCats.filter(c => c !== cat);
    document.getElementById('cat-tags').innerHTML = renderCatTags();
    document.getElementById('cat-suggestions').innerHTML = renderSuggestions();
  };
  PAGES._addCat = (cat) => {
    if (!bookCats.includes(cat)) { bookCats.push(cat); }
    document.getElementById('cat-tags').innerHTML = renderCatTags();
    document.getElementById('cat-suggestions').innerHTML = renderSuggestions();
    document.getElementById('cat-input').value = '';
  };

  setTimeout(() => {
    const catInput = document.getElementById('cat-input');
    const addCatFn = () => {
      const val = catInput?.value.trim();
      if (val && !bookCats.includes(val)) { bookCats.push(val); }
      if (document.getElementById('cat-tags')) document.getElementById('cat-tags').innerHTML = renderCatTags();
      if (document.getElementById('cat-suggestions')) document.getElementById('cat-suggestions').innerHTML = renderSuggestions();
      if (catInput) catInput.value = '';
    };
    catInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCatFn(); }});
    document.getElementById('btn-add-cat')?.addEventListener('click', addCatFn);

    document.getElementById('btn-save-edit')?.addEventListener('click', async () => {
      const newStatus = document.getElementById('edit-status').value;
      const oldStatus = book.status;
      try {
        await DB.update('books', bookId, {
          title: document.getElementById('edit-title').value,
          author: document.getElementById('edit-author').value,
          pages: parseInt(document.getElementById('edit-pages').value) || null,
          categories: bookCats,
          category: bookCats[0] || null,
          status: newStatus,
          is_favorite: document.getElementById('edit-favorite')?.checked || false,
          owned_physical: document.getElementById('edit-owned-physical').checked,
          owned_digital: document.getElementById('edit-owned-digital').checked,
          notes: document.getElementById('edit-notes').value
        });

        // Handle status → year plan connection
        await PAGES._handleStatusChange(bookId, oldStatus, newStatus, app);

        app.closeModal();
        app.notify('Saved ✓', 'success');
        // Restore filter state
        await app.refreshData();
        PAGES.library(document.getElementById('main-content'), app, currentStatus, currentCategory);
      } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
    });

    document.getElementById('btn-delete-book')?.addEventListener('click', () => {
      PAGES.deleteBook(bookId, app);
    });
  }, 80);
};

// Handle status changes → year plan
PAGES._handleStatusChange = async (bookId, oldStatus, newStatus, app) => {
  const currentYear = new Date().getFullYear();
  if (newStatus === oldStatus) return;

  // reading/review status is system-managed — never set manually

  if (newStatus === 'completed') {
    // Ask which year
    await new Promise(resolve => {
      const years = [];
      for (let y = currentYear; y >= currentYear - 10; y--) years.push(y);
      app.showModal(`
        <div class="modal-title">Mark as Completed</div>
        <div style="font-size:0.85rem;color:var(--text2);margin-bottom:1.25rem;">Which year did you complete this book?</div>
        <div class="form-group">
          <label>Year completed</label>
          <select id="complete-year-select">
            ${years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="APP.closeModal()">Skip</button>
          <button class="btn btn-primary" id="btn-set-complete-year">Confirm</button>
        </div>
      `);
      setTimeout(() => {
        document.getElementById('btn-set-complete-year')?.addEventListener('click', async () => {
          const year = parseInt(document.getElementById('complete-year-select').value);
          // Add to that year's queue if not there
          const queue = await DB.getYearlyQueue(year);
          const alreadyIn = queue.find(q => q.book_id === bookId);
          if (!alreadyIn) {
            const maxPos = queue.reduce((m, q) => Math.max(m, q.position), 0);
            await DB.insert('yearly_queue', { book_id: bookId, year, position: maxPos + 1 });
          }
          // Update queue item with completion
          const item = queue.find(q => q.book_id === bookId);
          if (item) {
            await DB.update('yearly_queue', item.id, { completed_date: new Date().toISOString().split('T')[0] });
          }
          app.closeModal();
          resolve();
        });
        // Skip just resolves
        document.querySelector('.modal-overlay')?.addEventListener('click', e => {
          if (e.target.classList.contains('modal-overlay')) resolve();
        });
      }, 50);
    });
  }

  // Changing to to-read: don't auto-remove from queue (user manages via Year Plan)
};

PAGES.deleteBook = async (bookId, app) => {
  if (!confirm('Delete this book permanently?')) return;
  try {
    // If this book is the main book in the year plan, promote the next reading book
    const year = new Date().getFullYear();
    const queue = await DB.getYearlyQueue(year);
    const qItem = queue.find(q => q.book_id === bookId);
    if (qItem?.is_main) {
      await PAGES._promoteMainBookIfNeeded(qItem.id, app);
    }
    await DB.delete('books', bookId);
    app.closeModal();
    app.notify('Book deleted', 'success');
    PAGES.library(document.getElementById('main-content'), app);
  } catch (e) {
    app.notify('Failed to delete: ' + e.message, 'error');
  }
};

PAGES.addBookToPlanFromLibrary = async (bookId, app) => {
  const currentYear = new Date().getFullYear();
  // Get available years
  let years = [currentYear];
  try {
    const extra = JSON.parse(await DB.getSetting('extra_years') || '[]');
    const url = `${DB.url}/rest/v1/yearly_queue?select=year&order=year.asc`;
    const res = await fetch(url, { headers: DB.headers() });
    const rows = await res.json();
    const queueYears = [...new Set(rows.map(r => r.year))];
    years = [...new Set([...queueYears, ...extra, currentYear])].sort();
  } catch(e) {}

  app.showModal(`
    <div class="modal-title">Add to Year Plan</div>
    <div class="form-group">
      <label>Year</label>
      <select id="plan-year-select">
        ${years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="btn-confirm-add-plan">Add</button>
    </div>
  `);
  setTimeout(() => {
    document.getElementById('btn-confirm-add-plan')?.addEventListener('click', async () => {
      const year = parseInt(document.getElementById('plan-year-select').value);
      try {
        const url = `${DB.url}/rest/v1/yearly_queue?year=eq.${year}&order=position.desc&limit=1`;
        const res = await fetch(url, { headers: DB.headers() });
        const rows = await res.json();
        const maxPos = rows[0]?.position || 0;
        await DB.insert('yearly_queue', { book_id: bookId, year, position: maxPos + 1 });
        if ((await DB.getBooks()).find(b => b.id === bookId)?.status === 'to-read') {
          await DB.update('books', bookId, { status: 'reading' });
        }
        app.closeModal();
        app.notify(`Added to ${year} plan ✓`, 'success');
        await app.refreshData();
        PAGES.library(document.getElementById('main-content'), app);
      } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
    });
  }, 50);
};

PAGES._openBookNotes = (bookId) => {
  // Navigate to notes page and pre-select this book
  APP.navigate('notes');
  // After notes page loads, open the book
  setTimeout(() => {
    const item = document.querySelector(`.note-book-item[data-book-id="${bookId}"]`);
    if (item) item.click();
  }, 500);
};
