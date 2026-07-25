// PinVerse · 登录凭证
// 全站唯一的 JWT 存取入口。持久层交给原生安全存储（Android 走 Keystore 加密，
// 明文不落 SharedPreferences / localStorage），运行时只在内存里保留一份。
//
// 因为安全存储是异步的，而各处取 token 都是同步的，这里约定：
//   · 页面一加载就要发的请求 → 放进 PinVerseAuth.onReady(...)，等凭证恢复完再跑；
//   · 用户交互（点击 / 失焦）时才发的请求 → 直接用 authHeaders()，此时必然已就绪。

window.PinVerseAuth = (function () {
  const TOKEN_KEY = 'pinverse_token';
  const LEGACY_KEY = 'pinverse:token'; // 旧版本把 token 明文存在 localStorage
  const LOGIN_PAGE = 'login.html';

  const native = window.Capacitor?.Plugins?.SecureStoragePlugin;

  // 浏览器里调试时没有原生插件，退化为 localStorage；APK 内一律走安全存储。
  // 插件的 get / remove 在键不存在时会 reject，一律按「没有凭证」处理。
  const store = native
    ? {
        async get() {
          try {
            const result = await native.get({ key: TOKEN_KEY });
            return result?.value || null;
          } catch (err) {
            return null;
          }
        },
        set(value) {
          return native.set({ key: TOKEN_KEY, value });
        },
        async remove() {
          try {
            await native.remove({ key: TOKEN_KEY });
          } catch (err) {
            /* 键本来就不存在 */
          }
        },
      }
    : {
        async get() {
          return localStorage.getItem(TOKEN_KEY);
        },
        async set(value) {
          localStorage.setItem(TOKEN_KEY, value);
        },
        async remove() {
          localStorage.removeItem(TOKEN_KEY);
        },
      };

  let token = null;

  // 从旧版本升级上来的用户：把明文 token 迁进安全存储并抹掉原处，
  // 既省掉一次重新登录，也不给自己留一份明文。
  async function restore() {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return store.get();

    try {
      await store.set(legacy);
      localStorage.removeItem(LEGACY_KEY);
    } catch (err) {
      /* 迁移失败就留着，下次启动再试 */
    }
    return legacy;
  }

  // 页面一加载就开始恢复凭证，各脚本通过 ready / onReady 汇合到这一次读取上
  const ready = restore().then((value) => {
    token = value;
    return token;
  });

  return {
    ready,

    onReady(fn) {
      return ready.then(fn);
    },

    getToken() {
      return token;
    },

    // 未登录时返回 null，调用方据此跳过请求（与改造前 authHeaders 的语义一致）
    authHeaders(withJson) {
      if (!token) return null;
      const headers = { Authorization: 'Bearer ' + token };
      if (withJson) headers['Content-Type'] = 'application/json';
      return headers;
    },

    async save(value) {
      token = value;
      await store.set(value);
    },

    async clear() {
      token = null;
      await store.remove();
    },

    // 凭证失效时统一回登录页，避免各页面各写一套跳转
    async logout() {
      await this.clear();
      location.replace(LOGIN_PAGE);
    },

    // 冷启动校验：本地留存的 token 可能已过期或被吊销，拿一个轻量接口探一下。
    // 网络异常按「暂时可用」处理——断网时把用户踢回登录页也登不进去。
    async verify() {
      const headers = this.authHeaders();
      if (!headers) return false;

      try {
        const res = await fetch(window.PINVERSE_API_HOST + '/users/me/devices', {
          method: 'GET',
          headers,
        });
        if (res.status === 401 || res.status === 403) {
          await this.clear();
          return false;
        }
        return true;
      } catch (err) {
        return true;
      }
    },
  };
})();
