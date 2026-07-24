// PinVerse · 通用下拉栏组件
// 页面内所有 [data-dropdown] 元素共用同一套展开 / 收起 / 选中逻辑。
// home.html（面板样式）与 plan-edit.html（所在地 / 日历链接 / 时间）共用此文件。

(function () {
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
