// PinVerse · 设备显示内容
// 设备（墨水屏）靠主动轮询 GET /devices/{deviceId}/content 拿到当前该显示的内容，
// 这里以只读方式拉同一个接口，把设备屏幕正在显示的内容同步到首页的设备预览图（.device__text）。
//
// 关键：必须带 slient=true（接口文档中的拼写就是 slient），这是「静默读取」——
// 只看屏幕当前显示的内容，不按设备轮询语义消费掉它，免得预览把设备该拿的内容抢走。
//
// 接口有两种成功响应：
//   有对话时 —— dialogue_text（角色台词）、options、affinity_level
//   无对话时 —— greeting_text（问候语）、refresh_after_seconds；
//               此时 content_type 可能是 chat / weather / schedule / easter_egg / morning_brief 中任意一种，
//               所以不能按 content_type 分支，一律「先取台词，没有就取问候语」。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;
  const DEFAULT_INTERVAL_MS = 10000; // 响应没给 refresh_after_seconds 时的兜底节奏
  const MIN_INTERVAL_MS = 5000; // 后端给了过小或异常的值也不至于把接口打爆
  const MAX_CHARS = 20;
  const PLACEHOLDER = '屏幕待机中';

  const textEl = document.getElementById('deviceContentText');
  if (!textEl) return;

  let currentDeviceId = null;
  let loadVersion = 0; // 设备切换后丢弃上一台设备迟到的响应
  let renderedText = null; // 已渲染的文本，内容没变就不动 DOM，避免轮询时闪烁
  let nextDelayMs = DEFAULT_INTERVAL_MS;
  let timerId = null;

  function authHeaders() {
    return window.PinVerseAuth.authHeaders();
  }

  // 按「字」截断：用 Array.from 而非 slice，避免把 emoji 等代理对字符切坏
  function truncate(text) {
    const chars = Array.from(text);
    return chars.length > MAX_CHARS ? chars.slice(0, MAX_CHARS).join('') + '…' : text;
  }

  async function fetchContent(deviceId) {
    const headers = authHeaders();
    if (!headers) return null;

    const url =
      API_HOST + '/devices/' + encodeURIComponent(deviceId) + '/content?slient=true';

    try {
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch (err) {
      return null;
    }
  }

  // 设备屏幕上此刻显示的那句话：有对话时是角色台词，没对话时是问候语。
  function pickText(content) {
    if (!content) return '';

    const dialogue = typeof content.dialogue_text === 'string' ? content.dialogue_text.trim() : '';
    if (dialogue) return dialogue;

    return typeof content.greeting_text === 'string' ? content.greeting_text.trim() : '';
  }

  // 无对话的响应里带了 refresh_after_seconds，即设备下次该来取内容的时间，
  // 预览跟着这个节奏走，比固定间隔更贴近屏幕真实的更新时机。
  function pickDelay(content) {
    const seconds = Number(content?.refresh_after_seconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_INTERVAL_MS;
    return Math.max(seconds * 1000, MIN_INTERVAL_MS);
  }

  function render(content) {
    const text = pickText(content);
    const next = text ? truncate(text) : PLACEHOLDER;
    if (next === renderedText) return;

    renderedText = next;
    textEl.textContent = next;
  }

  async function loadContent(deviceId) {
    if (!deviceId) return;
    const version = ++loadVersion;
    const content = await fetchContent(deviceId);
    if (version !== loadVersion) return; // 期间切过设备，这次结果作废

    nextDelayMs = pickDelay(content);
    render(content);
  }

  function scheduleNext() {
    clearTimeout(timerId);
    timerId = setTimeout(poll, nextDelayMs);
  }

  async function poll() {
    await loadContent(currentDeviceId);
    scheduleNext();
  }

  // 设备状态是轮询刷新的（见 device-status.js），onChange 会被反复触发，
  // 只有真的换了设备才清空并重新拉取，同一台设备的内容按上面的节奏刷新。
  window.PinVerseDevices?.onChange(async (device) => {
    const deviceId = device?.device_id ?? null;
    if (deviceId === currentDeviceId) return;

    currentDeviceId = deviceId;
    renderedText = null;
    textEl.textContent = '';

    await loadContent(deviceId);
    scheduleNext();
  });

  scheduleNext();
})();
