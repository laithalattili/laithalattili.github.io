// Book Notes Page
// Uses Quill.js for rich text editing (loaded from CDN)

PAGES.notes = async (container, app) => {
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading notes...</div>';

  // Load all books and their notes
  const books = await DB.getBooks();
  const booksWithNotes = books.filter(b => b.status !== 'to-read' || true); // all books can have notes

  // Fetch all notes
  let allNotes = {};
  try {
    const url = `${DB.url}/rest/v1/book_notes?select=*`;
    const res = await fetch(url, { headers: DB.headers() });
    const rows = await res.json();
    rows.forEach(n => { allNotes[n.book_id] = n; });
  } catch(e) {}

  let selectedBookId = null;
  let quill = null;
  let searchQuery = '';

  const renderBookList = (query = '') => {
    const q = query.toLowerCase();
    return books
      .filter(b => {
        if (!q) return true;
        const note = allNotes[b.id];
        const noteText = note ? (note.content || '').replace(/<[^>]+>/g, '').toLowerCase() : '';
        return b.title.toLowerCase().includes(q) ||
               (b.author||'').toLowerCase().includes(q) ||
               noteText.includes(q);
      })
      .map(b => {
        const note = allNotes[b.id];
        const hasNote = note && note.content && note.content.trim() !== '<p><br></p>' && note.content.trim() !== '';
        const preview = hasNote
          ? note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
          : '';
        return `
          <div class="note-book-item ${b.id === selectedBookId ? 'active' : ''}"
               data-book-id="${b.id}"
               style="padding:0.75rem;cursor:pointer;border-bottom:1px solid var(--border);
                 background:${b.id === selectedBookId ? 'var(--accent-dim)' : 'transparent'};
                 border-left:${b.id === selectedBookId ? '3px solid var(--accent)' : '3px solid transparent'};">
            <div style="font-size:0.88rem;font-weight:${b.id === selectedBookId ? '500' : '400'};color:${b.id === selectedBookId ? 'var(--accent)' : 'var(--text)'};">
              ${b.is_favorite ? '<span style="color:var(--accent);margin-right:0.2rem;">★</span>' : ''}${b.title.length > 40 ? b.title.slice(0,40)+'…' : b.title}
            </div>
            <div style="font-size:0.7rem;color:var(--text3);margin-top:0.1rem;">${b.author||''}</div>
            ${hasNote ? `
              <div style="font-size:0.7rem;color:var(--text2);margin-top:0.25rem;font-style:italic;opacity:0.8;">${preview}${preview.length === 80 ? '…' : ''}</div>
            ` : `
              <div style="font-size:0.65rem;color:var(--text3);margin-top:0.2rem;font-family:var(--mono);">no notes yet</div>
            `}
          </div>
        `;
      }).join('');
  };

  const isMobile = window.innerWidth <= 768;

  container.innerHTML = `
    <div class="page-title" style="${isMobile ? 'display:none;' : ''}">Book Notes</div>
    <div class="page-subtitle" style="${isMobile ? 'display:none;' : ''}">Rich notes for every book · searchable</div>

    ${isMobile ? `
    <!-- Mobile: single panel with back button -->
    <div id="notes-list-panel" class="notes-mobile-list">
      <div style="margin-bottom:0.75rem;">
        <input type="text" id="notes-search" placeholder="Search books or notes...">
      </div>
      <div id="notes-book-list">
        ${renderBookList()}
      </div>
    </div>
    <div id="notes-editor-panel" class="notes-mobile-editor">
      <div id="notes-editor-area" style="flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius2);">
      </div>
    </div>
    ` : `
    <!-- Desktop: two column -->
    <div style="display:grid;grid-template-columns:280px 1fr;gap:1rem;min-height:600px;">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius2);overflow:hidden;display:flex;flex-direction:column;">
        <div style="padding:0.75rem;border-bottom:1px solid var(--border);">
          <input type="text" id="notes-search" placeholder="Search books or notes..." style="font-size:0.82rem;">
        </div>
        <div id="notes-book-list" style="overflow-y:auto;flex:1;">
          ${renderBookList()}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        <div id="notes-editor-area" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius2);flex:1;min-height:500px;display:flex;flex-direction:column;">
          <div style="padding:2rem;text-align:center;color:var(--text3);margin-top:3rem;">
            <div style="font-size:1.5rem;opacity:0.3;margin-bottom:0.75rem;">◈</div>
            <div style="font-size:0.9rem;">Select a book to view or edit its notes</div>
          </div>
        </div>
      </div>
    </div>
    `}
  `;

  // Search
  document.getElementById('notes-search').addEventListener('input', e => {
    searchQuery = e.target.value;
    document.getElementById('notes-book-list').innerHTML = renderBookList(searchQuery);
    bindBookList();
  });

  const openBook = async (bookId) => {
    selectedBookId = bookId;
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    // Mobile: switch to editor panel
    if (isMobile) {
      document.getElementById('notes-list-panel')?.classList.add('hidden');
      const editorPanel = document.getElementById('notes-editor-panel');
      if (editorPanel) { editorPanel.classList.add('active'); }
    }

    // Update list selection
    document.getElementById('notes-book-list').innerHTML = renderBookList(searchQuery);
    bindBookList();

    const existingNote = allNotes[bookId];
    const editorArea = document.getElementById('notes-editor-area');

    editorArea.innerHTML = `
      <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          ${isMobile ? '<button id="btn-notes-back" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:var(--text2);padding:0;">←</button>' : ''}
          <div>
            <div style="font-size:0.95rem;font-weight:500;">${book.title}</div>
            <div style="font-size:0.72rem;color:var(--text2);">${book.author||''}</div>
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <button class="btn btn-secondary btn-sm" id="btn-import-docx">Import .docx</button>
          <input type="file" id="docx-file-input" accept=".docx" style="display:none;">
          <button class="btn btn-primary btn-sm" id="btn-save-note">Save</button>
        </div>
      </div>
      <div id="quill-toolbar" style="border-bottom:1px solid var(--border);padding:0.4rem 0.75rem;">
        <button class="ql-bold">B</button>
        <button class="ql-italic">I</button>
        <button class="ql-underline">U</button>
        <span style="margin:0 0.3rem;color:var(--border2);">|</span>
        <button class="ql-list" value="ordered">1.</button>
        <button class="ql-list" value="bullet">•</button>
        <span style="margin:0 0.3rem;color:var(--border2);">|</span>
        <select class="ql-header">
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
          <option selected></option>
        </select>
        <span style="margin:0 0.3rem;color:var(--border2);">|</span>
        <select class="ql-color">
          <option value="red">Red</option>
          <option value="#c4622d">Amber</option>
          <option value="#2e7d52">Green</option>
          <option value="#2d5fa3">Blue</option>
          <option selected></option>
        </select>
        <span style="margin:0 0.3rem;color:var(--border2);">|</span>
        <select class="ql-background" title="Highlight">
          <option value="#fff3b0">Yellow</option>
          <option value="#d4f0c0">Green</option>
          <option value="#c0d8f0">Blue</option>
          <option value="#ffd0d0">Red</option>
          <option selected></option>
        </select>
      </div>
      <div id="quill-editor" style="flex:1;font-family:var(--sans);font-size:0.88rem;min-height:400px;"></div>
    `;

    // Load Quill if not already loaded
    if (!window.Quill) {
      await new Promise(resolve => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.quilljs.com/1.3.7/quill.snow.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://cdn.quilljs.com/1.3.7/quill.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    // Override Quill's default styles to match our theme
    const style = document.createElement('style');
    style.textContent = `
      .ql-container { border: none !important; font-family: var(--sans) !important; }
      .ql-toolbar { font-family: var(--mono) !important; background: var(--bg3) !important; }
      .ql-editor { padding: 1.25rem !important; min-height: 400px; color: var(--text) !important; background: var(--bg2) !important; }
      .ql-editor.ql-blank::before { color: var(--text3) !important; font-style: italic; }
      .ql-toolbar button { color: var(--text2) !important; font-family: var(--mono); font-size: 0.75rem; padding: 2px 6px !important; }
      .ql-toolbar button:hover { color: var(--accent) !important; }
      .ql-toolbar .ql-stroke { stroke: var(--text2) !important; }
      .ql-toolbar .ql-fill { fill: var(--text2) !important; }
    `;
    document.head.appendChild(style);

    quill = new Quill('#quill-editor', {
      modules: {
        toolbar: {
          container: '#quill-toolbar',
        }
      },
      theme: 'snow',
      placeholder: 'Write your notes, paste from Word, or import a .docx file...'
    });

    if (existingNote?.content) {
      quill.root.innerHTML = existingNote.content;
    }

    // Save
    document.getElementById('btn-save-note').addEventListener('click', async () => {
      const content = quill.root.innerHTML;
      try {
        if (existingNote) {
          await DB.update('book_notes', existingNote.id, { content, updated_at: new Date().toISOString() });
          allNotes[bookId] = { ...existingNote, content };
        } else {
          const result = await DB.insert('book_notes', { book_id: bookId, content });
          allNotes[bookId] = result[0] || { book_id: bookId, content };
        }
        app.notify('Notes saved ✓', 'success');
        document.getElementById('notes-book-list').innerHTML = renderBookList(searchQuery);
        bindBookList();
      } catch(e) { app.notify('Failed: ' + e.message, 'error'); }
    });

    // Import .docx
    document.getElementById('btn-notes-back')?.addEventListener('click', () => {
      document.getElementById('notes-list-panel')?.classList.remove('hidden');
      document.getElementById('notes-editor-panel')?.classList.remove('active');
      selectedBookId = null;
    });

    document.getElementById('btn-import-docx').addEventListener('click', () => {
      document.getElementById('docx-file-input').click();
    });

    document.getElementById('docx-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Load mammoth if not loaded
      if (!window.mammoth) {
        await new Promise(resolve => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
          s.onload = resolve;
          document.head.appendChild(s);
        });
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (result.value) {
          quill.root.innerHTML = result.value;
          app.notify('Document imported ✓', 'success');
        }
      } catch(err) {
        app.notify('Import failed: ' + err.message, 'error');
      }
      e.target.value = '';
    });
  };

  const bindBookList = () => {
    document.querySelectorAll('.note-book-item').forEach(item => {
      item.addEventListener('click', () => openBook(item.dataset.bookId));
    });
  };

  bindBookList();
};
