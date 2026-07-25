// PinVerse · 设备显示内容
// 设备（墨水屏）靠主动轮询 GET /devices/{deviceId}/content 拿到当前该显示的内容，
// 这里以只读方式拉同一个接口，把设备屏幕正在显示的内容同步到首页的设备预览图（.device__text）。
//
// 关键：必须带 silent=true，这是「静默读取」——
// 只看屏幕当前显示的内容，不按设备轮询语义消费掉它，免得预览把设备该拿的内容抢走。
//
// 接口有三种成功响应：
//   有对话时 —— dialogue_text（角色台词）、options、affinity_level
//   一言时   —— content_type 为 hitokoto，text（正文）、from（出处）、from_who（作者）
//   其余情况 —— greeting_text（问候语）、refresh_after_seconds；
//               此时 content_type 可能是 chat / weather / schedule / easter_egg / morning_brief 中任意一种，
//               所以不能按 content_type 分支，一律「先取台词，没有就取问候语」。
// 只有一言会额外显示出处，它是唯一能靠 content_type 认准的类型。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;
  const DEFAULT_INTERVAL_MS = 10000; // 响应没给 refresh_after_seconds 时的兜底节奏
  const MIN_INTERVAL_MS = 5000; // 后端给了过小或异常的值也不至于把接口打爆
  const MAX_CHARS = 20;
  const SOURCE_MAX_CHARS = 12; // 出处比正文更短，单独截断，不占用正文额度
  const PLACEHOLDER = '屏幕待机中';
  const HITOKOTO = 'hitokoto';

  const textEl = document.getElementById('deviceContentText');
  if (!textEl) return;

  let currentDeviceId = null;
  let loadVersion = 0; // 设备切换后丢弃上一台设备迟到的响应
  let renderedKey = null; // 已渲染内容的指纹，内容没变就不动 DOM，避免轮询时闪烁
  let nextDelayMs = DEFAULT_INTERVAL_MS;
  let timerId = null;

  function authHeaders() {
    return window.PinVerseAuth.authHeaders();
  }

  // 按「字」截断：用 Array.from 而非 slice，避免把 emoji 等代理对字符切坏
  function truncate(text, maxChars) {
    const chars = Array.from(text);
    return chars.length > maxChars ? chars.slice(0, maxChars).join('') + '…' : text;
  }

  function readString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  async function fetchContent(deviceId) {
    const headers = authHeaders();
    if (!headers) return null;

    const url =
      API_HOST + '/devices/' + encodeURIComponent(deviceId) + '/content?silent=true';

    try {
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch (err) {
      return null;
    }
  }

  // 设备屏幕上此刻显示的那句话：有对话时是角色台词，一言时是 text，其余是问候语。
  function pickText(content) {
    if (!content) return '';

    const dialogue = readString(content.dialogue_text);
    if (dialogue) return dialogue;

    const hitokoto = readString(content.text);
    if (hitokoto) return hitokoto;

    return readString(content.greeting_text);
  }

  // 一言的出处：from_who 是作者、from 是作品，两者都可能缺；其余类型没有出处。
  // 截断在拼装前逐段做，避免把「」这类成对符号切开。
  function pickSource(content) {
    if (content?.content_type !== HITOKOTO) return '';

    const who = truncate(readString(content.from_who), SOURCE_MAX_CHARS);
    const work = truncate(readString(content.from), SOURCE_MAX_CHARS);
    if (who && work && who !== work) return '—— ' + who + '「' + work + '」';

    const single = who || work;
    return single ? '—— ' + single : '';
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
    const body = text ? truncate(text, MAX_CHARS) : PLACEHOLDER;
    // 正文落到占位文案时不带出处，免得屏幕待机中还挂着上一句的作者
    const source = text ? pickSource(content) : '';

    const key = body + '\n' + source;
    if (key === renderedKey) return;
    renderedKey = key;

    textEl.textContent = body;
    if (source) {
      const sourceEl = document.createElement('span');
      sourceEl.className = 'device__text-source';
      sourceEl.textContent = source;
      textEl.appendChild(sourceEl);
    }
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
    renderedKey = null;
    textEl.textContent = '';

    await loadContent(deviceId);
    scheduleNext();
  });

  scheduleNext();
})();
