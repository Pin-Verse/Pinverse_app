// PinVerse · 计划详情 / 新增计划（独立页面）
// 通过 URL 参数区分入口：
//   plan-edit.html?mode=edit → 「具体日程」设置配置进入，右上角展示删除按钮
//   plan-edit.html?mode=add  → 「新建计划」进入，右上角不展示删除按钮，底部展示「新增」按钮
// 下拉栏展开/收起逻辑见 dropdown.js。

(function () {
  const mode = new URLSearchParams(location.search).get('mode') === 'add' ? 'add' : 'edit';
  const isEdit = mode === 'edit';

  const screen = document.querySelector('.plan-edit-screen');
  const titleEl = document.getElementById('planEditTitle');
  const cardTitleEl = document.getElementById('planEditCardTitle');
  const backBtn = document.getElementById('planEditBackBtn');
  const deleteBtn = document.getElementById('planEditDeleteBtn');
  const submitBtn = document.getElementById('planEditSubmitBtn');
  const weekdayItems = document.querySelectorAll('.weekday-picker__item');
  const confirmDialog = document.getElementById('confirmDialog');

  function setDropdownValue(field, value) {
    const dropdown = document.querySelector('.dropdown[data-field="' + field + '"]');
    if (!dropdown) return;
    const valueEl = dropdown.querySelector('.dropdown__value');
    const options = dropdown.querySelectorAll('.dropdown__option');
    if (valueEl) valueEl.textContent = value;
    options.forEach((option) => {
      option.classList.toggle('is-selected', option.dataset.value === value);
    });
  }

  function setWeekdaySelection(days) {
    weekdayItems.forEach((item) => {
      item.classList.toggle('is-selected', days.includes(item.dataset.day));
    });
  }

  // ---------- 返回上一页（带退出动效） ----------
  // 用 history.back() 而非 location.href，让浏览器尽量用 bfcache 还原 index.html，
  // 避免重新加载整份首页（含较大的顶部插画）造成的卡顿。
  function goBack() {
    screen.classList.add('is-leaving');
    setTimeout(() => {
      if (history.length > 1) {
        history.back();
      } else {
        location.href = 'index.html';
      }
    }, 180);
  }

  // ---------- 按入口模式初始化界面 ----------
  titleEl.textContent = isEdit ? '早报' : '新增计划';
  cardTitleEl.textContent = isEdit ? '早报' : '新增计划';
  deleteBtn.classList.toggle('is-hidden-placeholder', !isEdit);
  submitBtn.classList.toggle('is-hidden', isEdit);

  if (isEdit) {
    setDropdownValue('location', '杭州');
    setDropdownValue('calendar', '请选择');
    setDropdownValue('start-time', '7:00');
    setDropdownValue('end-time', '8:00');
    setWeekdaySelection(['1', '2', '3', '4', '5']);
  } else {
    setDropdownValue('location', '请选择');
    setDropdownValue('calendar', '请选择');
    setDropdownValue('start-time', '请选择');
    setDropdownValue('end-time', '请选择');
    setWeekdaySelection([]);
  }

  backBtn.addEventListener('click', goBack);

  // ---------- 新增：写回「计划已存在」状态并返回 ----------
  submitBtn.addEventListener('click', () => {
    localStorage.removeItem('pinverse:planDeleted');
    goBack();
  });

  // ---------- 显示日期：星期多选 ----------
  weekdayItems.forEach((item) => {
    item.addEventListener('click', () => item.classList.toggle('is-selected'));
  });

  // ---------- 删除二次确认 ----------
  function openConfirmDialog() {
    confirmDialog.classList.add('is-open');
  }

  function closeConfirmDialog() {
    confirmDialog.classList.remove('is-open');
  }

  deleteBtn.addEventListener('click', openConfirmDialog);

  confirmDialog.querySelectorAll('[data-action="cancel"]').forEach((el) => {
    el.addEventListener('click', closeConfirmDialog);
  });

  confirmDialog.querySelector('[data-action="confirm"]').addEventListener('click', () => {
    localStorage.setItem('pinverse:planDeleted', '1');
    closeConfirmDialog();
    goBack();
  });
})();
