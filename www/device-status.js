// PinVerse · 设备状态
// 顶部标题行的设备状态展示：
// 1. GET /users/me/devices 拿到当前用户名下的所有设备，取出 device_id 列表；
// 2. 对每个 device_id 调用 GET /devices/{deviceId}/status 拿到实时状态；
// 3. 合并两者渲染到 .app-header（在线指示灯 / 设备名 / 电量），并生成设备分页圆点。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;
  const TOKEN_KEY = 'pinverse:token';
  const CURRENT_DEVICE_KEY = 'pinverse:currentDeviceId';
  const POLL_INTERVAL_MS = 30000;

  const dotEl = document.getElementById('deviceStatusDot');
  const textEl = document.getElementById('deviceStatusText');
  const titleEl = document.getElementById('deviceStatusTitle');
  const batteryEl = document.getElementById('deviceStatusBattery');
  const dotsEl = document.getElementById('deviceStatusDots');

  if (!dotEl || !textEl || !titleEl || !batteryEl || !dotsEl) return;

  let devices = []; // [{ device_id, device_name, online, battery }]
  let currentIndex = 0;

  function authHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: 'Bearer ' + token } : null;
  }

  async function fetchDeviceList() {
    const headers = authHeaders();
    if (!headers) return [];

    const res = await fetch(API_HOST + '/users/me/devices', { method: 'GET', headers });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data) ? data : [];
  }

  async function fetchDeviceStatus(deviceId) {
    const headers = authHeaders();
    if (!headers) return null;

    try {
      const res = await fetch(API_HOST + '/devices/' + encodeURIComponent(deviceId) + '/status', {
        method: 'GET',
        headers,
      });
      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch (err) {
      return null;
    }
  }

  function renderDots() {
    dotsEl.innerHTML = '';
    devices.forEach((device, index) => {
      const dot = document.createElement('span');
      if (index === currentIndex) dot.classList.add('is-active');
      dot.addEventListener('click', () => {
        currentIndex = index;
        localStorage.setItem(CURRENT_DEVICE_KEY, devices[currentIndex].device_id);
        render();
      });
      dotsEl.appendChild(dot);
    });
  }

  function render() {
    if (!devices.length) {
      dotEl.classList.add('is-offline');
      textEl.textContent = '未绑定设备';
      titleEl.textContent = '--';
      batteryEl.textContent = '--';
      dotsEl.innerHTML = '';
      return;
    }

    const device = devices[currentIndex];
    dotEl.classList.toggle('is-offline', !device.online);
    textEl.textContent = device.online ? '在线' : '离线';
    titleEl.textContent = device.device_name || device.device_id;
    batteryEl.textContent = typeof device.battery === 'number' ? device.battery + '%' : '--';
    renderDots();
  }

  async function loadDeviceStatus() {
    const list = await fetchDeviceList();
    if (!list.length) {
      devices = [];
      render();
      return;
    }

    const statuses = await Promise.all(list.map((d) => fetchDeviceStatus(d.device_id)));

    devices = list.map((d, i) => {
      const status = statuses[i];
      return {
        device_id: d.device_id,
        device_name: d.device_name,
        online: status ? status.online : false,
        battery: status ? status.battery : d.battery,
      };
    });

    const rememberedId = localStorage.getItem(CURRENT_DEVICE_KEY);
    const rememberedIndex = devices.findIndex((d) => d.device_id === rememberedId);
    currentIndex = rememberedIndex >= 0 ? rememberedIndex : 0;

    render();
  }

  loadDeviceStatus();
  setInterval(loadDeviceStatus, POLL_INTERVAL_MS);
})();
