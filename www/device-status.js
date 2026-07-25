// PinVerse · 设备状态
// 顶部标题行的设备状态展示：
// 1. GET /users/me/devices 拿到当前用户名下的所有设备，取出 device_id 列表；
// 2. 对每个 device_id 调用 GET /devices/{deviceId}/status 拿到实时状态；
// 3. 合并两者渲染到 .app-header（在线指示灯 / 设备名 / 电量），并生成设备分页圆点。
//
// 同时对外暴露 window.PinVerseDevices，供其他脚本读取「当前选中设备」并订阅其变化
// （如 device-name.js 修改设备名称），避免各处重复拉取设备列表。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;
  const CURRENT_DEVICE_KEY = 'pinverse:currentDeviceId';
  const POLL_INTERVAL_MS = 5000;

  const dotEl = document.getElementById('deviceStatusDot');
  const textEl = document.getElementById('deviceStatusText');
  const titleEl = document.getElementById('deviceStatusTitle');
  const batteryEl = document.getElementById('deviceStatusBattery');
  const dotsEl = document.getElementById('deviceStatusDots');

  if (!dotEl || !textEl || !titleEl || !batteryEl || !dotsEl) return;

  let devices = []; // [{ device_id, device_name, online, battery }]
  let currentIndex = 0;
  const listeners = []; // 当前设备变化时的订阅者，见文件末尾的 window.PinVerseDevices

  function currentDevice() {
    return devices[currentIndex] || null;
  }

  function emitChange() {
    const device = currentDevice();
    listeners.forEach((fn) => fn(device ? Object.assign({}, device) : null));
  }

  function authHeaders() {
    return window.PinVerseAuth.authHeaders();
  }

  async function fetchDeviceList() {
    const headers = authHeaders();
    if (!headers) return [];

    const res = await fetch(API_HOST + '/users/me/devices', { method: 'GET', headers });
    // 轮询期间凭证过期（或被吊销）时清掉凭证回登录页，避免页面一直空转
    if (res.status === 401 || res.status === 403) {
      window.PinVerseAuth.logout();
      return [];
    }
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
      emitChange();
      return;
    }

    const device = devices[currentIndex];
    dotEl.classList.toggle('is-offline', !device.online);
    textEl.textContent = device.online ? '在线' : '离线';
    titleEl.textContent = device.device_name || device.device_id;
    batteryEl.textContent = typeof device.battery === 'number' ? device.battery + '%' : '--';
    renderDots();
    emitChange();
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
        ...d,
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

  // ---------- 对外接口 ----------
  // getCurrent()      取当前选中设备的快照（无设备时为 null）
  // onChange(fn)      订阅当前设备变化；注册时立即回调一次当前值
  // setCurrentName()  设备名改动后同步到本地状态并重渲染（不发请求）
  // setCurrentCharacter() 角色绑定成功后同步指定设备的角色（不发请求）
  // unbindCurrent()   解绑当前设备并刷新设备列表
  window.PinVerseDevices = {
    getCurrent() {
      const device = currentDevice();
      return device ? Object.assign({}, device) : null;
    },
    onChange(fn) {
      listeners.push(fn);
      fn(this.getCurrent());
    },
    setCurrentName(name) {
      const device = currentDevice();
      if (!device) return;
      device.device_name = name;
      render();
    },
    setCurrentCharacter(characterId, deviceId) {
      const device = devices.find((item) => item.device_id === deviceId);
      if (!device) return;
      device.character_id = characterId;
      device.bound_character_id = characterId;
      if (device === currentDevice()) emitChange();
    },
    async unbindCurrent() {
      const device = currentDevice();
      const headers = authHeaders();
      if (!device || !headers) throw new Error('登录状态或设备无效');

      const res = await fetch(
        API_HOST + '/devices/' + encodeURIComponent(device.device_id),
        { method: 'DELETE', headers },
      );
      if (!res.ok) throw new Error('设备解绑失败（' + res.status + '）');

      localStorage.removeItem(CURRENT_DEVICE_KEY);
      await loadDeviceStatus();
    },
  };

  // 凭证是从原生安全存储里异步读出来的，等它就绪后再开始轮询
  window.PinVerseAuth.onReady(() => {
    loadDeviceStatus();
    setInterval(loadDeviceStatus, POLL_INTERVAL_MS);
  });
})();
