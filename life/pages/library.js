// Library Page
PAGES.library = async (container, app, initialStatus = 'all', initialCategory = 'all') => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading library...</div>';

  const books = await DB.getBooks();
  const categories = [...new Set(books.flatMap(b => b.categories?.length ? b.categories : (b.category ? [b.category] : [])))].filter(Boolean).sort();
  const statuses = ['all', 'to-read', 'reading', 'completed', 'review'];

  let filtered = books;
  let activeStatus = initialStatus;
  let activeCategory = initialCategory;
  let searchQuery = '';

  const render = () => {
    let list = books;
    if (activeStatus === 'favorites') list = list.filter(b => b.is_favorite);
    else if (activeStatus !== 'all') list = list.filter(b => b.status === activeStatus);
    if (activeCategory !== 'all') list = list.filter(b => (b.categories || []).includes(activeCategory) || b.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        (b.category || '').toLowerCase().includes(q) ||
        (b.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    document.getElementById('book-list').innerHTML = list.length
      ? list.map(b => renderBookItem(b)).join('')
      : '<div class="empty"><div class="empty-text">No books match your filters</div></div>';

    document.getElementById('book-count').textContent = `${list.length} book${list.length !== 1 ? 's' : ''}`;

    // Bind edit/delete/plan
    document.querySelectorAll('.btn-edit-book').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        PAGES.editBook(btn.dataset.id, app, activeStatus, activeCategory);
      });
    });
    document.querySelectorAll('.btn-add-to-plan').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        PAGES.addBookToPlanFromLibrary(btn.dataset.id, app);
      });
    });
  };

  container.innerHTML = `
    <div class="page-title">Library</div>
    <div class="page-subtitle" id="book-count">${books.length} books</div>

    <div class="search-bar">
      <span class="search-icon">⌕</span>
      <input type="text" id="lib-search" placeholder="Search titles, authors, categories...">
    </div>

    <div style="font-family: var(--mono); font-size: 0.6rem; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.4rem;">Status</div>
    <div class="filter-pills" id="status-pills">
      <button class="pill ${activeStatus === 'favorites' ? 'active' : ''}" data-status="favorites">★ Favourites (${books.filter(b => b.is_favorite).length})</button>
      ${statuses.map(s => `
        <button class="pill ${s === activeStatus ? 'active' : ''}" data-status="${s}">
          ${s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          ${s !== 'all' ? `(${books.filter(b => b.status === s).length})` : `(${books.length})`}
        </button>
      `).join('')}
    </div>

    ${categories.length ? `
      <div style="font-family: var(--mono); font-size: 0.6rem; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.4rem; margin-top: 0.25rem;">Category</div>
      <div class="filter-pills" id="cat-pills">
        <button class="pill active" data-cat="all">All</button>
        ${categories.map(c => `<button class="pill" data-cat="${c}">${c}</button>`).join('')}
      </div>
    ` : ''}

    <div id="book-list">
      ${books.map(b => renderBookItem(b)).join('')}
    </div>
  `;

  document.getElementById('lib-search').addEventListener('input', e => {
    searchQuery = e.target.value;
    render();
  });

  document.getElementById('status-pills').addEventListener('click', e => {
    if (!e.target.dataset.status) return;
    activeStatus = e.target.dataset.status;
    document.querySelectorAll('#status-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.status === activeStatus));
    render();
  });

  document.getElementById('cat-pills')?.addEventListener('click', e => {
    if (!e.target.dataset.cat) return;
    activeCategory = e.target.dataset.cat;
    document.querySelectorAll('#cat-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.cat === activeCategory));
    render();
  });

  document.querySelectorAll('.btn-edit-book').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      PAGES.editBook(btn.dataset.id, app, activeStatus, activeCategory);
    });
  });

  document.querySelectorAll('.btn-add-to-plan').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      PAGES.addBookToPlanFromLibrary(btn.dataset.id, app);
    });
  });


};

function renderBookItem(b) {
  const statusColors = { 'to-read': 'gray', reading: '', completed: 'green', review: '' };
  const cats = b.categories?.length ? b.categories : (b.category ? [b.category] : []);
  const physicalBadge = b.owned_physical === true ? '<span class="tag gray" style="font-size:0.55rem;">📖 Physical</span>' : '';
  const digitalBadge = b.owned_digital === true ? '<span class="tag gray" style="font-size:0.55rem;">💻 Digital</span>' : '';
  return `
    <div class="book-item">
      <div class="book-cover" style="position:relative;cursor:pointer;" onclick="PAGES._openBookNotes('${b.id}')">
        ${b.cover_url ? `<img src="${b.cover_url}" alt="" loading="lazy">` : ''}
        ${b.is_favorite ? '<div style="position:absolute;top:1px;right:1px;font-size:0.65rem;">★</div>' : ''}
      </div>
      <div class="book-info">
        <div class="book-title" style="cursor:pointer;" onclick="PAGES._openBookNotes('${b.id}')">${b.is_favorite ? '<span style="color:var(--accent);margin-right:0.25rem;">★</span>' : ''}${b.title}</div>
        <div class="book-author">${b.author || ''}${b.publication_year ? ` · ${b.publication_year}` : ''}</div>
        <div class="book-tags" style="margin-top: 0.3rem; gap: 0.25rem; flex-wrap: wrap;">
          ${cats.map(c => `<span class="tag gray">${c}</span>`).join('')}
          ${b.original_language && b.original_language !== 'English' ? `<span class="tag gray">${b.original_language}</span>` : ''}
          ${physicalBadge}${digitalBadge}
        </div>
      </div>
      <div class="book-right">
        <span class="tag ${statusColors[b.status] || ''}">${b.status}</span>
        <div class="book-pages">${b.pages ? b.pages + 'p' : ''}</div>
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
