// PinVerse · 计划页
// 点击「计划 / 角色」标签，在对应视图之间切换（带淡入过渡）。
// 「设置」暂无对应视图，点击时不切换。
// 下拉栏组件逻辑见 dropdown.js（index.html / plan-edit.html 共用）。

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

  // ---------- 计划：在 plan-edit.html 中确认删除后，回到列表显示空状态 ----------
  const planCard = document.getElementById('planCard');
  const planEmpty = document.getElementById('planEmpty');
  function syncPlanDeletedState() {
    const deleted = localStorage.getItem('pinverse:planDeleted') === '1';
    if (planCard) planCard.classList.toggle('is-hidden', deleted);
    if (planEmpty) planEmpty.classList.toggle('is-visible', deleted);
  }
  syncPlanDeletedState();

  // ---------- 跳转到其他页面（如 plan-edit.html / role-add.html）前先播放退出动效，避免切换生硬 ----------
  // 凡是需要该过渡的站内跳转链接，都标注 [data-nav-link]。
  const screen = document.querySelector('.screen');
  document.querySelectorAll('a[data-nav-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      screen.classList.add('is-leaving');
      setTimeout(() => {
        location.href = href;
      }, 180);
    });
  });

  // ---------- 从 plan-edit.html 用 history.back() 返回时，若命中 bfcache，
  // 页面会带着离开前加的 is-leaving（淡出）状态被直接恢复，这里去掉它 ----------
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      screen.classList.remove('is-leaving');
      syncPlanDeletedState();
    }
  });
})();
