// PinVerse · 设备早报计划 API
// 集中封装 morning-briefs 系列接口，供首页和计划编辑页复用。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;

  function authHeaders(withBody) {
    return window.PinVerseAuth.authHeaders(withBody);
  }

  function collectionUrl(deviceId) {
    return API_HOST + '/devices/' + encodeURIComponent(deviceId) + '/morning-briefs';
  }

  function extractList(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    const list = payload.morning_briefs ?? payload.briefs ?? payload.items ?? payload.data;
    if (Array.isArray(list)) return list;
    return extractList(list);
  }

  async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    if (!response.ok || (data && data.error)) {
      const message =
        data?.message ||
        (typeof data?.detail === 'string' ? data.detail : '') ||
        data?.detail?.[0]?.msg ||
        '请求失败';
      throw new Error(message);
    }
    return data;
  }

  window.PinVerseSchedules = {
    async list(deviceId) {
      const headers = authHeaders(false);
      if (!deviceId || !headers) return [];
      const data = await request(collectionUrl(deviceId), { method: 'GET', headers });
      return extractList(data);
    },

    create(deviceId, payload) {
      const headers = authHeaders(true);
      if (!deviceId || !headers) return Promise.reject(new Error('登录状态或设备无效'));
      return request(collectionUrl(deviceId), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    },

    update(deviceId, scheduleId, payload) {
      const headers = authHeaders(true);
      if (!deviceId || !scheduleId || !headers) {
        return Promise.reject(new Error('登录状态、设备或计划无效'));
      }
      return request(collectionUrl(deviceId) + '/' + encodeURIComponent(scheduleId), {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
    },

    remove(deviceId, scheduleId) {
      const headers = authHeaders(false);
      if (!deviceId || !scheduleId || !headers) {
        return Promise.reject(new Error('登录状态、设备或计划无效'));
      }
      return request(collectionUrl(deviceId) + '/' + encodeURIComponent(scheduleId), {
        method: 'DELETE',
        headers,
      });
    },
  };
})();
