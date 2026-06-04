// Lists Page — user-defined named lists for books, films, courses
PAGES.listsPage = async (app, defaultType = 'films') => {
  const container = document.getElementById('main-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading lists...</div>';

  let lists = [], items = [], films = [], books = [], courses = [];
  try {
    lists = await DB.query('user_lists', { order: 'name.asc' });
    items = await DB.query('list_items', { order: 'position.asc' });
    films = await DB.query('films', { order: 'title.asc' });
    books = await DB.query('books', { order: 'title.asc' });
    courses = await DB.query('courses', { order: 'title.asc' });
  } catch(e) {
    container.innerHTML = `<div class="card" style="color:var(--error)">${e.message}</div>`;
    return;
  }

  const filmMap = {}, bookMap = {}, courseMap = {};
  films.forEach(f => filmMap[f.id] = f);
  books.forEach(b => bookMap[b.id] = b);
  courses.forEach(c => courseMap[c.id] = c);

  let activeType = defaultType;
  let selectedListId = null;

  const filteredLists = () => lists.filter(l => l.type === activeType || l.type === 'mixed');

  const getItemsForList = (listId) => {
    return items.filter(i => i.list_id === listId).map(i => {
      if (i.item_type === 'film') return { ...i, item: filmMap[i.item_id] };
      if (i.item_type === 'book') return { ...i, item: bookMap[i.item_id] };
      if (i.item_type === 'course') return { ...i, item: courseMap[i.item_id] };
      return i;
    }).filter(i => i.item);
  };

  const renderItemRow = (li) => {
    const it = li.item;
    const icon = li.item_type === 'film' ? '🎬' : li.item_type === 'course' ? '🎓' : '📖';
    const sub = li.item_type === 'film'
      ? [it.director, it.year].filter(Boolean).join(' · ')
      : li.item_type === 'book'
      ? [it.author, it.pages ? it.pages+'p' : ''].filter(Boolean).join(' · ')
      : [it.source, it.category].filter(Boolean).join(' · ');
    return `
      <div class="book-item" style="cursor:default;">
        <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.2rem;min-width:48px;width:48px;">${icon}</div>
        <div class="book-info">
          <div class="book-title">${it.title}</div>
          ${sub ? `<div class="book-author">${sub}</div>` : ''}
        </div>
        <div class="book-right">
          <button class="btn btn-secondary btn-sm btn-remove-item" data-id="${li.id}" style="color:var(--error);">×</button>
        </div>
      </div>
    `;
  };

  const renderListDetail = (list) => {
    const listItems = getItemsForList(list.id);
    return `
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">
        <button class="icon-btn" id="btn-back-lists">←</button>
        <div style="font-size:1.1rem;font-weight:600;">${list.icon||''} ${list.name}</div>
        <div style="margin-left:auto;display:flex;gap:0.4rem;">
          <button class="btn btn-secondary btn-sm" id="btn-add-to-list">+ Add</button>
          <button class="btn btn-secondary btn-sm btn-rename-list" data-id="${list.id}" style="font-size:0.7rem;">Rename</button>
          <button class="btn btn-secondary btn-sm btn-delete-list" data-id="${list.id}" style="font-size:0.7rem;color:var(--error);">Delete</button>
        </div>
      </div>
      <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);margin-bottom:0.5rem;">${listItems.length} item${listItems.length!==1?'s':''}</div>
      <div id="list-items-view">
        ${listItems.length
          ? listItems.map(li => renderItemRow(li)).join('')
          : '<div class="empty"><div class="empty-text">No items in this list yet</div></div>'}
      </div>
    `;
  };

  const renderMain = () => {
    const fl = filteredLists();
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
        <div class="page-title">Lists</div>
        <button class="btn btn-secondary btn-sm" id="btn-new-list">+ New List</button>
      </div>

      <div class="filter-pills" id="type-pills" style="margin-bottom:1rem;">
        ${['books','films','courses'].map(t => `
          <button class="pill ${t===activeType?'active':''}" data-type="${t}">
            ${t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        `).join('')}
      </div>

      ${fl.length === 0
        ? '<div class="empty"><div class="empty-text">No lists yet. Create one above.</div></div>'
        : fl.map(l => {
            const count = items.filter(i => i.list_id === l.id).length;
            return `
              <div class="book-item list-row" data-id="${l.id}" style="cursor:pointer;">
                <div class="book-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.4rem;min-width:48px;width:48px;">${l.icon||'◈'}</div>
                <div class="book-info">
                  <div class="book-title">${l.name}</div>
                  <div class="book-author">${l.type} · ${count} item${count!==1?'s':''}</div>
                </div>
                <div class="book-right">
                  <span style="font-family:var(--mono);font-size:0.7rem;color:var(--text3);">→</span>
                </div>
              </div>
            `;
          }).join('')
      }
    `;
  };

  const showMain = () => {
    selectedListId = null;
    container.innerHTML = renderMain();
    bindMain();
  };

  const bindMain = () => {
    document.getElementById('type-pills').addEventListener('click', e => {
      if (!e.target.dataset.type) return;
      activeType = e.target.dataset.type;
      showMain();
    });

    document.querySelectorAll('.list-row').forEach(row =>
      row.addEventListener('click', () => {
        selectedListId = row.dataset.id;
        const list = lists.find(l => l.id === selectedListId);
        container.innerHTML = renderListDetail(list);
        bindDetail(list);
      })
    );

    document.getElementById('btn-new-list').addEventListener('click', () => {
      app.showModal(`
        <div class="modal-title">New List</div>
        <div class="form-group">
          <label>List Name *</label>
          <input id="nl-name" placeholder="e.g. Bergman, Criterion, Watch with parents">
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="nl-type">
            <option value="films" ${activeType==='films'?'selected':''}>Films</option>
            <option value="books" ${activeType==='books'?'selected':''}>Books</option>
            <option value="courses" ${activeType==='courses'?'selected':''}>Courses</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div class="form-group">
          <label>Icon (emoji)</label>
          <input id="nl-icon" placeholder="e.g. ★ 🎬 📖" maxlength="4" value="◈">
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:1rem;">
          <button class="btn btn-primary" id="btn-create-list">Create</button>
          <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
        </div>
      `);
      document.getElementById('btn-create-list').addEventListener('click', async () => {
        const name = document.getElementById('nl-name').value.trim();
        if (!name) { app.notify('Name required','error'); return; }
        try {
          const newList = await DB.insert('user_lists', {
            name,
            type: document.getElementById('nl-type').value,
            icon: document.getElementById('nl-icon').value.trim() || '◈',
            created_at: new Date().toISOString()
          });
          app.closeModal();
          app.notify('List created','success');
          // Refresh
          lists = await DB.query('user_lists', { order: 'name.asc' });
          items = await DB.query('list_items', { order: 'position.asc' });
          showMain();
        } catch(e) { app.notify('Error: '+e.message,'error'); }
      });
    });
  };

  const bindDetail = (list) => {
    document.getElementById('btn-back-lists').addEventListener('click', showMain);

    document.getElementById('btn-add-to-list').addEventListener('click', () => {
      const existing = new Set(items.filter(i => i.list_id === list.id).map(i => i.item_id));
      const pool = list.type === 'films' ? films
        : list.type === 'books' ? books
        : list.type === 'courses' ? courses
        : [...films, ...books, ...courses];
      const available = pool.filter(x => !existing.has(x.id));

      app.showModal(`
        <div class="modal-title">Add to "${list.name}"</div>
        <div class="search-bar" style="margin-bottom:0.5rem;">
          <span class="search-icon">⌕</span>
          <input type="text" id="add-item-search" placeholder="Search...">
        </div>
        <div id="add-item-list" style="max-height:50vh;overflow-y:auto;">
          ${renderAddItemList(available, list.type)}
        </div>
      `);

      document.getElementById('add-item-search').addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        const filtered = available.filter(x => (x.title||'').toLowerCase().includes(q) || (x.director||x.author||'').toLowerCase().includes(q));
        document.getElementById('add-item-list').innerHTML = renderAddItemList(filtered, list.type);
        bindAddItemButtons(list, available);
      });
      bindAddItemButtons(list, available);
    });

    const bindAddItemButtons = (list, pool) => {
      document.querySelectorAll('.btn-pick-item').forEach(btn =>
        btn.addEventListener('click', async () => {
          const itemId = btn.dataset.id;
          const itemType = btn.dataset.type;
          const maxPos = Math.max(0, ...items.filter(i=>i.list_id===list.id).map(i=>i.position));
          try {
            await DB.insert('list_items', {
              list_id: list.id, item_id: itemId, item_type: itemType,
              position: maxPos + 1, added_at: new Date().toISOString()
            });
            items = await DB.query('list_items', { order: 'position.asc' });
            app.closeModal();
            app.notify('Added to list','success');
            container.innerHTML = renderListDetail(list);
            bindDetail(list);
          } catch(e) { app.notify('Error: '+e.message,'error'); }
        })
      );
    };

    document.querySelectorAll('.btn-remove-item').forEach(btn =>
      btn.addEventListener('click', async () => {
        try {
          await DB.delete('list_items', btn.dataset.id);
          items = await DB.query('list_items', { order: 'position.asc' });
          container.innerHTML = renderListDetail(list);
          bindDetail(list);
        } catch(e) { app.notify('Error: '+e.message,'error'); }
      })
    );

    document.querySelector('.btn-rename-list')?.addEventListener('click', () => {
      app.showModal(`
        <div class="modal-title">Rename List</div>
        <div class="form-group">
          <label>Name</label>
          <input id="rl-name" value="${list.name}">
        </div>
        <div class="form-group">
          <label>Icon</label>
          <input id="rl-icon" value="${list.icon||'◈'}" maxlength="4">
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:1rem;">
          <button class="btn btn-primary" id="btn-save-rename">Save</button>
          <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
        </div>
      `);
      document.getElementById('btn-save-rename').addEventListener('click', async () => {
        const name = document.getElementById('rl-name').value.trim();
        if (!name) { app.notify('Name required','error'); return; }
        try {
          await DB.update('user_lists', list.id, { name, icon: document.getElementById('rl-icon').value.trim() || '◈' });
          list.name = name;
          app.closeModal();
          lists = await DB.query('user_lists', { order: 'name.asc' });
          container.innerHTML = renderListDetail(list);
          bindDetail(list);
        } catch(e) { app.notify('Error: '+e.message,'error'); }
      });
    });

    document.querySelector('.btn-delete-list')?.addEventListener('click', async () => {
      if (!confirm(`Delete list "${list.name}"? Items in the list are not deleted.`)) return;
      try {
        await DB.delete('user_lists', list.id);
        lists = await DB.query('user_lists', { order: 'name.asc' });
        items = await DB.query('list_items', { order: 'position.asc' });
        app.notify('List deleted','success');
        showMain();
      } catch(e) { app.notify('Error: '+e.message,'error'); }
    });
  };

  const renderAddItemList = (pool, type) => {
    if (!pool.length) return '<div style="padding:1rem;text-align:center;color:var(--text3);">Nothing available to add</div>';
    return pool.slice(0,50).map(x => {
      const itemType = x.director !== undefined ? 'film' : x.author !== undefined ? 'book' : 'course';
      const icon = itemType === 'film' ? '🎬' : itemType === 'book' ? '📖' : '🎓';
      const sub = itemType === 'film' ? x.director : itemType === 'book' ? x.author : x.source;
      return `
        <div class="book-item" style="cursor:default;padding:0.5rem 0;">
          <div style="font-size:1.1rem;min-width:32px;text-align:center;">${icon}</div>
          <div class="book-info">
            <div style="font-size:0.85rem;font-weight:500;">${x.title}</div>
            ${sub ? `<div style="font-size:0.75rem;color:var(--text3);">${sub}</div>` : ''}
          </div>
          <button class="btn btn-secondary btn-sm btn-pick-item" data-id="${x.id}" data-type="${itemType}">Add</button>
        </div>
      `;
    }).join('') + (pool.length > 50 ? `<div style="text-align:center;color:var(--text3);font-size:0.75rem;padding:0.5rem;">Search to narrow down ${pool.length} items</div>` : '');
  };

  // Initial render
  showMain();
};
