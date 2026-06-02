// Add Book Page
PAGES.addBook = (container, app) => {
  container.innerHTML = `
    <div class="page-title">Add a Book</div>
    <div class="page-subtitle">Search to auto-fill details, or enter manually</div>

    <div class="card">
      <div class="card-meta" style="margin-bottom: 1rem;">Search Open Library</div>
      <div style="display: flex; gap: 0.75rem;">
        <input type="text" id="ol-search" placeholder="Title or author name..." style="flex: 1;">
        <button class="btn btn-secondary" id="btn-ol-search">Search</button>
      </div>
      <div id="ol-results" style="margin-top: 1rem;"></div>
    </div>

    <div class="card" id="book-form-card" style="display: none;">
      <div class="card-meta" style="margin-bottom: 1.25rem;">Book Details</div>

      <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: flex-start;">
        <div id="cover-preview" style="width: 60px; height: 85px; background: var(--bg4); border: 1px solid var(--border); border-radius: 2px; flex-shrink: 0; overflow: hidden;">
        </div>
        <div style="flex: 1;">
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label>Title *</label>
            <input id="b-title" placeholder="Book title">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>Author *</label>
            <input id="b-author" placeholder="Author name">
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
        <div class="form-group">
          <label>Pages</label>
          <input id="b-pages" type="number" placeholder="e.g. 320">
        </div>
        <div class="form-group">
          <label>Year Published</label>
          <input id="b-year" type="number" placeholder="e.g. 1967">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
        <div class="form-group">
          <label>Category</label>
          <input id="b-category" placeholder="e.g. Marxism" list="category-list">
          <datalist id="category-list">
            <option value="Marxism">
            <option value="Political Economy">
            <option value="History">
            <option value="Philosophy">
            <option value="Cinema">
            <option value="Education">
            <option value="Psychology">
            <option value="Literature">
            <option value="Architecture">
            <option value="Imperialism">
            <option value="Arabic">
            <option value="Science">
            <option value="Biography">
          </datalist>
        </div>
        <div class="form-group">
          <label>Original Language</label>
          <input id="b-lang" placeholder="e.g. Arabic, French">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
        <div class="form-group">
          <label>Publisher</label>
          <input id="b-publisher" placeholder="e.g. Penguin">
        </div>
        <div class="form-group">
          <label>ISBN</label>
          <input id="b-isbn" placeholder="ISBN-13">
        </div>
      </div>

      <div class="form-group">
        <label>Tags (comma separated)</label>
        <input id="b-tags" placeholder="e.g. theory, critique, colonialism">
      </div>

      <div class="form-group">
        <label>Status</label>
        <select id="b-status">
          <option value="to-read">To Read</option>
          <option value="reading">Currently Reading</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div class="form-group">
        <label>Ownership</label>
        <div style="display:flex;gap:1.25rem;margin-top:0.2rem;">
          <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;text-transform:none;letter-spacing:0;font-size:0.85rem;color:var(--text2);">
            <input type="checkbox" id="b-owned-physical" style="width:auto;"> Physical copy
          </label>
          <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;text-transform:none;letter-spacing:0;font-size:0.85rem;color:var(--text2);">
            <input type="checkbox" id="b-owned-digital" style="width:auto;"> Digital copy
          </label>
        </div>
      </div>

      <div class="form-group">
        <label>Notes</label>
        <textarea id="b-notes" rows="2" placeholder="Any personal notes..."></textarea>
      </div>

      <input type="hidden" id="b-cover-url">
      <input type="hidden" id="b-description">

      <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;">
        <button class="btn btn-secondary" id="btn-cancel-form">Clear</button>
        <button class="btn btn-primary" id="btn-save-book">Add to Library</button>
      </div>
    </div>

    <div class="card">
      <div class="card-meta" style="margin-bottom: 0.75rem;">Or add manually</div>
      <button class="btn btn-secondary" id="btn-manual">Enter details manually</button>
    </div>
  `;

  document.getElementById('btn-manual').addEventListener('click', () => {
    document.getElementById('book-form-card').style.display = 'block';
    document.getElementById('btn-manual').closest('.card').style.display = 'none';
    document.getElementById('b-title').focus();
  });

  document.getElementById('btn-ol-search').addEventListener('click', () => searchOpenLibrary(app));
  document.getElementById('ol-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchOpenLibrary(app);
  });

  document.getElementById('btn-cancel-form').addEventListener('click', () => {
    clearForm();
    document.getElementById('book-form-card').style.display = 'none';
    document.getElementById('btn-manual')?.closest('.card') && (document.querySelector('.card:last-child').style.display = 'block');
  });

  document.getElementById('btn-save-book').addEventListener('click', () => saveBook(app));
};

async function searchOpenLibrary(app) {
  const q = document.getElementById('ol-search').value.trim();
  if (!q) return;

  const resultsDiv = document.getElementById('ol-results');
  resultsDiv.innerHTML = '<div class="loading" style="padding: 1rem 0;"><div class="spinner"></div>Searching...</div>';

  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,number_of_pages_median,first_publish_year,language,publisher,isbn,cover_i,subject&limit=8`);
    const data = await res.json();

    if (!data.docs?.length) {
      resultsDiv.innerHTML = '<div style="color: var(--text3); font-size: 0.85rem;">No results found. Try a different search.</div>';
      return;
    }

    resultsDiv.innerHTML = data.docs.map((book, i) => {
      const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg` : null;
      return `
        <div class="book-item ol-result" data-idx="${i}" style="cursor: pointer;">
          <div class="book-cover">
            ${coverUrl ? `<img src="${coverUrl}" alt="">` : ''}
          </div>
          <div class="book-info">
            <div class="book-title" style="font-size: 0.9rem;">${book.title}</div>
            <div class="book-author">${(book.author_name || []).join(', ')}${book.first_publish_year ? ` · ${book.first_publish_year}` : ''}</div>
            ${book.number_of_pages_median ? `<div class="book-pages" style="font-size: 0.72rem; color: var(--text3); margin-top: 0.2rem;">${book.number_of_pages_median} pages</div>` : ''}
          </div>
          <button class="btn btn-primary btn-sm" data-idx="${i}">Use This</button>
        </div>
      `;
    }).join('');

    // Store results for selection
    window._olResults = data.docs;

    resultsDiv.querySelectorAll('.btn-primary').forEach(btn => {
      btn.addEventListener('click', () => {
        const book = window._olResults[parseInt(btn.dataset.idx)];
        fillFormFromOL(book);
      });
    });

  } catch (e) {
    resultsDiv.innerHTML = `<div style="color: var(--red); font-size: 0.85rem;">Search failed. Check your connection.</div>`;
  }
}

function fillFormFromOL(book) {
  document.getElementById('b-title').value = book.title || '';
  document.getElementById('b-author').value = (book.author_name || []).join(', ');
  document.getElementById('b-pages').value = book.number_of_pages_median || '';
  document.getElementById('b-year').value = book.first_publish_year || '';
  document.getElementById('b-publisher').value = (book.publisher || [])[0] || '';
  document.getElementById('b-isbn').value = (book.isbn || [])[0] || '';

  // Language
  const langs = book.language || [];
  if (langs.includes('ara')) document.getElementById('b-lang').value = 'Arabic';
  else if (langs.includes('fre')) document.getElementById('b-lang').value = 'French';
  else if (langs.includes('ger')) document.getElementById('b-lang').value = 'German';
  else if (langs.includes('spa')) document.getElementById('b-lang').value = 'Spanish';

  // Cover
  const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null;
  document.getElementById('b-cover-url').value = coverUrl || '';
  const preview = document.getElementById('cover-preview');
  if (coverUrl) preview.innerHTML = `<img src="${coverUrl}" style="width:100%;height:100%;object-fit:cover;">`;

  // Tags from subjects
  if (book.subject) {
    const tags = book.subject.slice(0, 5).join(', ');
    document.getElementById('b-tags').value = tags;
  }

  document.getElementById('book-form-card').style.display = 'block';
  document.getElementById('book-form-card').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('ol-results').innerHTML = '<div style="color: var(--green-light); font-family: var(--mono); font-size: 0.72rem;">✓ Details filled from Open Library. Review and save.</div>';
}

function clearForm() {
  ['b-title','b-author','b-pages','b-year','b-category','b-lang','b-publisher','b-isbn','b-tags','b-notes','b-cover-url','b-description'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('cover-preview').innerHTML = '';
}

async function saveBook(app) {
  const title = document.getElementById('b-title').value.trim();
  const author = document.getElementById('b-author').value.trim();

  if (!title) { app.notify('Title is required', 'error'); return; }

  const tagsRaw = document.getElementById('b-tags').value;
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const book = {
    title,
    author,
    pages: parseInt(document.getElementById('b-pages').value) || null,
    publication_year: parseInt(document.getElementById('b-year').value) || null,
    categories: document.getElementById('b-category').value.split(',').map(s => s.trim()).filter(Boolean),
    category: document.getElementById('b-category').value.split(',').map(s => s.trim()).filter(Boolean)[0] || null,
    original_language: document.getElementById('b-lang').value.trim() || null,
    publisher: document.getElementById('b-publisher').value.trim() || null,
    isbn: document.getElementById('b-isbn').value.trim() || null,
    tags,
    status: document.getElementById('b-status').value,
    source: document.getElementById('b-source').value,
    owned_physical: document.getElementById('b-owned-physical')?.checked || false,
    owned_digital: document.getElementById('b-owned-digital')?.checked || false,
    notes: document.getElementById('b-notes').value.trim() || null,
    cover_url: document.getElementById('b-cover-url').value || null,
    description: document.getElementById('b-description').value || null
  };

  try {
    const btn = document.getElementById('btn-save-book');
    btn.textContent = 'Saving...';
    btn.disabled = true;
    await DB.insert('books', book);
    app.notify(`"${title}" added to your library`, 'success');
    clearForm();
    document.getElementById('book-form-card').style.display = 'none';
    document.getElementById('ol-search').value = '';
    document.getElementById('ol-results').innerHTML = '';
    btn.textContent = 'Add to Library';
    btn.disabled = false;
  } catch (e) {
    app.notify('Failed to save: ' + e.message, 'error');
    document.getElementById('btn-save-book').textContent = 'Add to Library';
    document.getElementById('btn-save-book').disabled = false;
  }
}
