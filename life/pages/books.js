// Books Module — Library · Plan · Log
PAGES.books = async (container, app, initialTab = 'library') => {
  let activeTab = initialTab;

  const renderShell = () => {
    container.innerHTML = `
      <div class="module-tabs">
        <button class="module-tab ${activeTab==='library'?'active':''}" data-tab="library">Library</button>
        <button class="module-tab ${activeTab==='plan'?'active':''}" data-tab="plan">Plan</button>
        <button class="module-tab ${activeTab==='log'?'active':''}" data-tab="log">Past Years</button>
      </div>
      <div id="module-content"></div>
    `;

    container.querySelector('.module-tabs').addEventListener('click', e => {
      const tab = e.target.dataset.tab;
      if (!tab || tab === activeTab) return;
      activeTab = tab;
      container.querySelectorAll('.module-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
      loadTab(tab);
    });

    loadTab(activeTab);
  };

  const loadTab = (tab) => {
    const inner = document.getElementById('module-content');
    if (!inner) return;
    if (tab === 'library')  PAGES.library(inner, app);
    else if (tab === 'plan') PAGES.year(inner, app);
    else if (tab === 'log')  PAGES.stats(inner, app);
  };

  renderShell();
};
