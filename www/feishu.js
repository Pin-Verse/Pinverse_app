// PinVerse · 飞书日历绑定
// 设置视图里的「绑定 / 解绑飞书日历」：
//   进入页面      GET  /users/me/feishu/status  按 bound 决定按钮形态
//   点击绑定      GET  /users/me/feishu/oauth-url  拿到授权地址 → 原生 WebView 打开
//                 WebView 拦截 https://pin.verse/bind-success 后关闭并回传 ok/reason
//   点击解绑      二次确认 → DELETE /users/me/feishu
//
// 关键约定：access_token 只存在于后端，前端只关心 bound / boundAt / ok。
// WebView 回传的 ok 仅用于决定提示文案，UI 状态一律以 status 接口的返回为准（不做乐观更新）。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;
  const TOKEN_KEY = 'pinverse:token';

  const btn = document.getElementById('feishuBindBtn');
  const hintEl = document.getElementById('feishuBoundAt');
  const dialog = document.getElementById('feishuUnbindDialog');

  if (!btn || !hintEl || !dialog) return;

  // 后端 302 到 bind-success 时可能携带的失败原因
  const REASON_TEXT = {
    invalid_code: '授权码无效',
    invalid_state: '授权已过期，请重新发起',
    expired_state: '授权已过期，请重新发起',
    access_denied: '已取消授权',
  };

  function authHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: 'Bearer ' + token } : null;
  }

  async function request(path, method) {
    const headers = authHeaders();
    if (!headers) throw new Error('登录状态无效，请重新登录');

    const res = await fetch(API_HOST + path, { method, headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        data?.message ||
        (typeof data?.detail === 'string' ? data.detail : '') ||
        data?.error ||
        '请求失败（' + res.status + '）';
      throw new Error(message);
    }
    return data;
  }

  const api = {
    status: () => request('/users/me/feishu/status', 'GET'),
    oauthUrl: () => request('/users/me/feishu/oauth-url', 'GET'),
    unbind: () => request('/users/me/feishu', 'DELETE'),
  };

  function toast(message) {
    window.PinVerseToast?.show(message);
  }

  function formatBoundAt(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = (n) => String(n).padStart(2, '0');
    return (
      date.getFullYear() +
      '-' + pad(date.getMonth() + 1) +
      '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) +
      ':' + pad(date.getMinutes())
    );
  }

  // ---------- 状态与渲染 ----------
  // status 为 null 表示尚未取到（加载中或加载失败），此时按钮不可点。
  let status = null;
  let busy = false;

  function render() {
    if (busy) {
      btn.disabled = true;
      btn.textContent = '处理中…';
      return;
    }

    if (!status) {
      btn.disabled = true;
      btn.textContent = '加载中…';
      hintEl.classList.remove('is-visible');
      return;
    }

    btn.disabled = false;
    btn.textContent = status.bound ? '解绑' : '绑定';
    btn.classList.toggle('setting-btn--danger', status.bound);

    const boundAt = status.bound ? formatBoundAt(status.boundAt) : '';
    hintEl.textContent = boundAt ? '已绑定 · ' + boundAt : '';
    hintEl.classList.toggle('is-visible', Boolean(boundAt));
  }

  async function refreshStatus() {
    try {
      const data = await api.status();
      status = { bound: Boolean(data?.bound), boundAt: data?.boundAt || '' };
    } catch (err) {
      status = null;
      btn.textContent = '重试';
      btn.disabled = false;
      hintEl.textContent = '状态加载失败';
      hintEl.classList.add('is-visible');
      return;
    }
    render();
  }

  function setBusy(value) {
    busy = value;
    render();
  }

  // ---------- 绑定 ----------
  // 原生环境走 FeishuAuth 插件（可拦截 bind-success）；浏览器调试时退化为新开窗口，
  // 拿不到 ok，回来后同样以 status 接口为准。
  async function openAuthWebView(url) {
    const plugin = window.Capacitor?.Plugins?.FeishuAuth;
    if (plugin?.openAuth) return await plugin.openAuth({ url });

    const win = window.open(url, '_blank');
    if (!win) throw new Error('无法打开授权页面');
    await new Promise((resolve) => {
      const timer = setInterval(() => {
        if (win.closed) {
          clearInterval(timer);
          resolve();
        }
      }, 500);
    });
    return { completed: false };
  }

  async function bind() {
    setBusy(true);
    try {
      const data = await api.oauthUrl();
      if (!data?.url) throw new Error('未获取到授权地址');

      const result = await openAuthWebView(data.url);
      if (result?.completed) {
        if (result.ok) {
          toast('飞书日历绑定成功');
        } else {
          const reason = REASON_TEXT[result.reason] || result.reason;
          toast(reason ? '绑定失败：' + reason : '绑定失败，请重试');
        }
      }
    } catch (err) {
      toast(err.message || '绑定失败，请重试');
    } finally {
      // 无论授权成功、失败还是中途退出，都重新拉一次真实状态
      setBusy(false);
      await refreshStatus();
    }
  }

  // ---------- 解绑 ----------
  async function unbind() {
    setBusy(true);
    try {
      await api.unbind();
      toast('已解绑飞书日历');
    } catch (err) {
      // 失败时不动 UI，状态仍由 refreshStatus 校正
      toast(err.message || '解绑失败，请重试');
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  }

  function closeDialog() {
    dialog.classList.remove('is-open');
  }

  dialog.querySelectorAll('[data-action="cancel"]').forEach((el) => {
    el.addEventListener('click', closeDialog);
  });

  dialog.querySelector('[data-action="confirm"]').addEventListener('click', () => {
    closeDialog();
    unbind();
  });

  btn.addEventListener('click', () => {
    if (busy) return;
    if (!status) {
      refreshStatus();
      return;
    }
    if (status.bound) {
      dialog.classList.add('is-open');
    } else {
      bind();
    }
  });

  render();
  refreshStatus();
})();
