// PinVerse · 标签页切换
// 点击「计划 / 角色」标签，在对应视图之间切换（带淡入过渡）。
// 「设置」暂无对应视图，点击时不切换。

(function () {
  const tabs = document.querySelectorAll('.tabs__item');
  const views = document.querySelectorAll('.view');

  function switchTo(name) {
    const target = document.querySelector('.view[data-view="' + name + '"]');
    if (!target) return; // 没有对应视图（如「设置」）则忽略

    tabs.forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.tab === name);
    });
    views.forEach((view) => {
      view.classList.toggle('is-active', view.dataset.view === name);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTo(tab.dataset.tab));
  });

  // ---------- 角色卡片（单选：选中变蓝） ----------
  const roleCards = document.querySelectorAll('.role-card');
  roleCards.forEach((card) => {
    card.addEventListener('click', () => {
      roleCards.forEach((c) => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
    });
  });

  // ---------- 下拉栏（面板样式） ----------
  document.querySelectorAll('[data-dropdown]').forEach((dropdown) => {
    const toggle = dropdown.querySelector('.dropdown__toggle');
    const value = dropdown.querySelector('.dropdown__value');
    const options = dropdown.querySelectorAll('.dropdown__option');

    function close() {
      dropdown.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const opening = !dropdown.classList.contains('is-open');
      dropdown.classList.toggle('is-open', opening);
      toggle.setAttribute('aria-expanded', String(opening));
    });

    options.forEach((option) => {
      option.addEventListener('click', () => {
        options.forEach((o) => o.classList.remove('is-selected'));
        option.classList.add('is-selected');
        value.textContent = option.dataset.value;
        close();
      });
    });
  });

  // 点击空白处收起所有下拉栏
  document.addEventListener('click', () => {
    document.querySelectorAll('[data-dropdown].is-open').forEach((d) => {
      d.classList.remove('is-open');
      d.querySelector('.dropdown__toggle').setAttribute('aria-expanded', 'false');
    });
  });
})();
