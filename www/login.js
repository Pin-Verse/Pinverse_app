// PinVerse · 登录
// 通过 /auth/login 换取 JWT，交给 PinVerseAuth 存进原生安全存储，
// 供后续接口鉴权使用（Authorization: Bearer <token>）。凭证会一直保留到失效或解绑，
// 下次冷启动由 index.html 直接进首页，无需再登录一次。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;

  const screen = document.querySelector('.login-screen');
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const errorEl = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginSubmitBtn');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('is-visible');
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? '登录中…' : '登录';
  }

  // 后端响应字段名未在 OpenAPI 中固定（additionalProperties），做兼容处理
  function extractToken(data) {
    if (!data || typeof data !== 'object') return null;
    return data.access_token || data.token || data.jwt || data.accessToken || null;
  }

  async function login(username, password) {
    clearError();

    if (!username || !password) {
      showError('请输入账号和密码');
      return;
    }

    setLoading(true);

    let res;
    try {
      res = await fetch(API_HOST + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
    } catch (err) {
      showError('网络异常，请检查连接后重试');
      setLoading(false);
      return;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      showError((data && data.message) || '登录失败，请重试');
      setLoading(false);
      return;
    }

    const token = extractToken(data);
    if (!token) {
      showError('登录响应异常，未获取到登录凭证');
      setLoading(false);
      return;
    }

    try {
      await window.PinVerseAuth.save(token);
    } catch (err) {
      showError('登录凭证保存失败，请重试');
      setLoading(false);
      return;
    }

    screen.classList.add('is-leaving');
    setTimeout(() => {
      location.href = 'home.html';
    }, 180);
  }

  submitBtn.addEventListener('click', () => {
    login(usernameInput.value.trim(), passwordInput.value);
  });

  [usernameInput, passwordInput].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitBtn.click();
    });
  });
})();
