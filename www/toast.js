// PinVerse · 轻提示
// 页面底部一闪而过的文字提示，供各页面复用：window.PinVerseToast.show('已解绑')。

(function () {
  const DURATION_MS = 2400;

  let el = null;
  let timer = 0;

  function show(message) {
    if (!message) return;

    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }

    el.textContent = message;
    el.classList.add('is-visible');

    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('is-visible'), DURATION_MS);
  }

  window.PinVerseToast = { show };
})();
