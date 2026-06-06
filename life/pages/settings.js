// Settings Page
PAGES.settings = async (container, app) => {
  const routine = app.routine || {};
  const reviewRoutine = app.reviewRoutine || {};
  const rules = app.calendarRules || [];
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  container.innerHTML = `
    <div class="page-title">Settings</div>
    <div class="page-subtitle">Routines, calendar rules & preferences</div>

    <!-- Reading Routine -->
    <div class="card">
      <div class="card-meta" style="margin-bottom: 1rem;">Weekly Reading Routine</div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
        ${days.map((d, i) => `
          <div style="text-align: center;">
            <div style="font-family: var(--mono); font-size: 0.65rem; color: var(--text3); margin-bottom: 0.4rem;">${dayLabels[i]}</div>
            <input type="number" id="r-${d}" value="${routine[d] || 0}" min="0" max="200"
              style="text-align: center; padding: 0.4rem 0.2rem;">
          </div>
        `).join('')}
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button class="btn btn-secondary btn-sm" onclick="PAGES.resetRoutine(app)">Reset</button>
        <button class="btn btn-primary btn-sm" id="btn-save-routine">Save Routine</button>
      </div>
    </div>

    <!-- Review Routine -->
    <div class="card">
      <div class="card-meta" style="margin-bottom: 1rem;">Post-Book Review Settings</div>
      <div class="form-group">
        <label>Pages per review day</label>
        <input type="number" id="rev-pages" value="${reviewRoutine.pages_per_day || 40}" min="5" max="200">
      </div>
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem;">Review days</label>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${days.map((d, i) => `
            <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; text-transform: none; letter-spacing: 0; font-size: 0.82rem; color: var(--text2);">
              <input type="checkbox" id="revd-${d}" ${reviewRoutine[d] ? 'checked' : ''} style="width: auto;">
              ${dayLabels[i]}
            </label>
          `).join('')}
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end;">
        <button class="btn btn-primary btn-sm" id="btn-save-review">Save Review Settings</button>
      </div>
    </div>

    <!-- Personal Settings -->
    <div class="card">
      <div class="card-meta" style="margin-bottom:1rem;">Personal & Display</div>
      <div class="form-group">
        <label>Birthday</label>
        <input type="date" id="pref-birthday" value="1993-12-30">
      </div>
      <div class="form-group">
        <label>TMDB API Key</label>
        <input type="text" id="pref-tmdb" placeholder="Get free key at themoviedb.org/settings/api">
        <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);margin-top:0.25rem;">Used to search and auto-fill film metadata when adding films</div>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:0.5rem;">
        <input type="checkbox" id="pref-show-bar" style="width:auto;">
        <label for="pref-show-bar" style="margin-bottom:0;">Show clocks & date bar (desktop)</label>
      </div>
      <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);margin-bottom:1rem;">
        Shows Jordanian time, Chinese time, today's date, and your age in a bar above the nav.
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button class="btn btn-primary btn-sm" id="btn-save-personal">Save</button>
      </div>
    </div>

    <!-- Calendar Rules -->
    <div class="card">
      <div class="card-header">
        <div class="card-meta">Calendar Rules</div>
        <button class="btn btn-secondary btn-sm" id="btn-add-rule">+ Add Rule</button>
      </div>
      <div id="rules-list">
        ${rules.length === 0
          ? '<div style="color: var(--text3); font-size: 0.85rem; font-style: italic;">No calendar rules set. Add holidays or restricted periods.</div>'
          : rules.map(r => renderRule(r)).join('')
        }
      </div>
    </div>

    <!-- PIN -->
    <div class="card">
      <div class="card-meta" style="margin-bottom: 1rem;">Security</div>
      <button class="btn btn-secondary btn-sm" id="btn-change-pin">Change PIN</button>
    </div>

    <!-- Export -->
    <div class="card">
      <div class="card-meta" style="margin-bottom: 1rem;">Export</div>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" onclick="PAGES.exportYearPlan(app)">Year Plan (Excel)</button>
        <button class="btn btn-secondary btn-sm" onclick="PAGES.exportLibrary(app)">Full Library (Excel)</button>
        <button class="btn btn-secondary btn-sm" onclick="PAGES.exportStats(app)">Stats (PDF)</button>
      </div>
    </div>
  `;

  // Save reading routine
  document.getElementById('btn-save-routine').addEventListener('click', async () => {
    const data = {};
    days.forEach(d => { data[d] = parseInt(document.getElementById(`r-${d}`).value) || 0; });
    try {
      if (app.routine?.id) {
        await DB.update('reading_routine', app.routine.id, data);
      } else {
        await DB.insert('reading_routine', { ...data, is_default: true, name: 'Default' });
      }
      app.notify('Routine saved', 'success');
      await app.refreshData();
    } catch (e) {
      app.notify('Failed: ' + e.message, 'error');
    }
  });

  // Save review routine
  document.getElementById('btn-save-review').addEventListener('click', async () => {
    const data = { pages_per_day: parseInt(document.getElementById('rev-pages').value) || 40 };
    days.forEach(d => { data[d] = document.getElementById(`revd-${d}`).checked; });
    try {
      if (app.reviewRoutine?.id) {
        await DB.update('review_routine', app.reviewRoutine.id, data);
      } else {
        await DB.insert('review_routine', data);
      }
      app.notify('Review settings saved', 'success');
      await app.refreshData();
    } catch (e) {
      app.notify('Failed: ' + e.message, 'error');
    }
  });

  // Add rule
  document.getElementById('btn-add-rule').addEventListener('click', () => {
    showRuleModal(null, app);
  });

  // Change PIN
  document.getElementById('btn-change-pin').addEventListener('click', async () => {
    await DB.setSetting('pin_hash', null);
    localStorage.removeItem('llm_last_unlock');
    app.lock();
  });

  // Bind delete rule buttons
  bindRuleButtons(app);

  // Load personal settings
  const savedBirthday = await DB.getSetting('birthday');
  const showBar = await DB.getSetting('show_info_bar');
  const tmdbKey = await DB.getSetting('tmdb_api_key');
  if (savedBirthday) document.getElementById('pref-birthday').value = savedBirthday;
  if (showBar === 'true') document.getElementById('pref-show-bar').checked = true;
  if (tmdbKey) document.getElementById('pref-tmdb').value = tmdbKey;

  // Save personal settings
  document.getElementById('btn-save-personal').addEventListener('click', async () => {
    const birthday = document.getElementById('pref-birthday').value;
    const showBarVal = document.getElementById('pref-show-bar').checked;
    const tmdbKey = document.getElementById('pref-tmdb').value.trim();
    await DB.setSetting('birthday', birthday);
    await DB.setSetting('show_info_bar', showBarVal ? 'true' : 'false');
    await DB.setSetting('tmdb_api_key', tmdbKey);
    app.notify('Personal settings saved', 'success');
    // Reinit info bar
    if (typeof APP !== 'undefined') APP.initInfoBar();
  });
};

function renderRule(r) {
  const typeLabels = { 'no-reading': 'No Reading', 'max-pages': `Max ${r.max_pages_per_day}p/day` };
  return `
    <div class="book-item" data-rule-id="${r.id}">
      <div class="book-info">
        <div class="book-title" style="font-size: 0.9rem;">${r.name}</div>
        <div class="book-author">${SCHEDULER.formatDateDisplay(r.start_date)} → ${SCHEDULER.formatDateDisplay(r.end_date)}</div>
      </div>
      <div class="book-right">
        <span class="tag ${r.rule_type === 'no-reading' ? 'red' : ''}">${typeLabels[r.rule_type] || r.rule_type}</span>
        <button class="btn btn-secondary btn-sm btn-del-rule" data-id="${r.id}">Remove</button>
      </div>
    </div>
  `;
}

function bindRuleButtons(app) {
  document.querySelectorAll('.btn-del-rule').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this rule?')) return;
      try {
        await DB.delete('calendar_rules', btn.dataset.id);
        app.notify('Rule removed', 'success');
        await app.refreshData();
        PAGES.settings(document.getElementById('main-content'), app);
      } catch (e) {
        app.notify('Failed: ' + e.message, 'error');
      }
    });
  });
}

function showRuleModal(rule, app) {
  app.showModal(`
    <div class="modal-title">${rule ? 'Edit' : 'Add'} Calendar Rule</div>
    <div class="form-group">
      <label>Rule Name</label>
      <input id="rule-name" placeholder="e.g. Summer Holiday, Ramadan" value="${rule?.name || ''}">
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
      <div class="form-group">
        <label>Start Date</label>
        <input type="date" id="rule-start" value="${rule?.start_date || ''}">
      </div>
      <div class="form-group">
        <label>End Date</label>
        <input type="date" id="rule-end" value="${rule?.end_date || ''}">
      </div>
    </div>
    <div class="form-group">
      <label>Rule Type</label>
      <select id="rule-type">
        <option value="no-reading" ${rule?.rule_type === 'no-reading' ? 'selected' : ''}>No Reading (holiday)</option>
        <option value="max-pages" ${rule?.rule_type === 'max-pages' ? 'selected' : ''}>Maximum Pages Per Day</option>
      </select>
    </div>
    <div class="form-group" id="max-pages-group" style="${rule?.rule_type === 'no-reading' ? 'display:none' : ''}">
      <label>Max Pages Per Day</label>
      <input type="number" id="rule-max-pages" value="${rule?.max_pages_per_day || 10}" min="1">
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="btn-save-rule">Save Rule</button>
    </div>
  `);

  document.getElementById('rule-type').addEventListener('change', e => {
    document.getElementById('max-pages-group').style.display = e.target.value === 'max-pages' ? 'block' : 'none';
  });

  document.getElementById('btn-save-rule').addEventListener('click', async () => {
    const name = document.getElementById('rule-name').value.trim();
    const start = document.getElementById('rule-start').value;
    const end = document.getElementById('rule-end').value;
    const type = document.getElementById('rule-type').value;
    const maxPages = parseInt(document.getElementById('rule-max-pages').value) || null;

    if (!name || !start || !end) { app.notify('Fill all required fields', 'error'); return; }

    try {
      const data = { name, start_date: start, end_date: end, rule_type: type, max_pages_per_day: type === 'max-pages' ? maxPages : null };
      if (rule) await DB.update('calendar_rules', rule.id, data);
      else await DB.insert('calendar_rules', data);
      app.closeModal();
      app.notify('Rule saved', 'success');
      await app.refreshData();
      PAGES.settings(document.getElementById('main-content'), app);
    } catch (e) {
      app.notify('Failed: ' + e.message, 'error');
    }
  });
}

PAGES.resetRoutine = (app) => {
  const defaults = { monday: 15, tuesday: 15, wednesday: 15, thursday: 15, friday: 20, saturday: 20, sunday: 0 };
  Object.entries(defaults).forEach(([d, v]) => {
    const el = document.getElementById(`r-${d}`);
    if (el) el.value = v;
  });
};

// Export functions (placeholders — full implementation when SheetJS added)
PAGES.exportYearPlan = (app) => {
  app.notify('Export feature coming in next update', 'info');
};

PAGES.exportLibrary = (app) => {
  app.notify('Export feature coming in next update', 'info');
};

PAGES.exportStats = (app) => {
  app.notify('Export feature coming in next update', 'info');
};
