// PinVerse · 计划页
// 点击「计划 / 角色」标签，在对应视图之间切换（带淡入过渡）。
// 「设置」暂无对应视图，点击时不切换。
// 下拉栏组件逻辑见 dropdown.js（home.html / plan-edit.html 共用）。

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

  // ---------- 从其他页面跳转回来时，按 ?tab= 指定要展示的标签页 ----------
  // 例如 role-config.html 完成配置后跳转到 home.html?tab=role，直接展示「角色」标签页。
  const initialTab = new URLSearchParams(location.search).get('tab');
  if (initialTab) switchTo(initialTab);

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

  // ---------- 解绑设备：二次确认对话框 ----------
  const unbindBtn = document.getElementById('unbindDeviceBtn');
  const unbindDialog = document.getElementById('unbindConfirmDialog');

  if (unbindBtn && unbindDialog) {
    unbindBtn.addEventListener('click', () => unbindDialog.classList.add('is-open'));

    unbindDialog.querySelectorAll('[data-action="cancel"]').forEach((el) => {
      el.addEventListener('click', () => unbindDialog.classList.remove('is-open'));
    });

    unbindDialog.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      // TODO: 接入真实解绑逻辑后在此处理设备解绑
      unbindDialog.classList.remove('is-open');
    });
  }

  // ---------- 从 plan-edit.html 用 history.back() 返回时，若命中 bfcache，
  // 页面会带着离开前加的 is-leaving（淡出）状态被直接恢复，这里去掉它 ----------
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      screen.classList.remove('is-leaving');
      syncPlanDeletedState();
    }
  });
})();
