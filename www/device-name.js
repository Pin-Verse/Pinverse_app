// PinVerse · 设备名称修改
// 设置页的「设备名称」输入框：
// 1. 从 window.PinVerseDevices 订阅当前选中设备，把设备名填进输入框；
// 2. 用户失焦或按回车时，PUT /devices/{deviceId} 提交新名称；
// 3. 成功后把服务端返回的名称同步回顶部标题行，失败则回滚为原值。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;
  const TOKEN_KEY = 'pinverse:token';

  const inputEl = document.getElementById('deviceNameInput');
  if (!inputEl || !window.PinVerseDevices) return;

  let deviceId = null;
  let savedName = ''; // 服务端已确认的名称，用于提交失败时回滚
  let submitting = false;

  window.PinVerseDevices.onChange((device) => {
    deviceId = device ? device.device_id : null;
    savedName = device ? device.device_name || '' : '';
    inputEl.disabled = !device;
    // 用户正在编辑时不要覆盖输入内容（轮询每 30s 会刷新一次设备列表）
    if (document.activeElement !== inputEl && !submitting) inputEl.value = savedName;
  });

  async function renameDevice(name) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    try {
      const res = await fetch(API_HOST + '/devices/' + encodeURIComponent(deviceId), {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_name: name }),
      });
      const data = await res.json().catch(() => null);
      // 403 表示非本人设备（越权），与其他失败一样按回滚处理
      if (!res.ok || !data || data.error) return null;
      return data.device_name || name;
    } catch (err) {
      return null;
    }
  }

  async function submit() {
    const name = inputEl.value.trim();
    if (!deviceId || submitting || name === savedName) {
      inputEl.value = savedName;
      return;
    }
    if (!name) {
      inputEl.value = savedName; // 空名称不提交
      return;
    }

    submitting = true;
    inputEl.disabled = true;
    const result = await renameDevice(name);
    submitting = false;
    inputEl.disabled = false;

    if (result === null) {
      inputEl.value = savedName; // 提交失败，回滚
      return;
    }

    savedName = result;
    inputEl.value = result;
    window.PinVerseDevices.setCurrentName(result);
  }

  inputEl.addEventListener('blur', submit);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') inputEl.blur(); // 交给 blur 统一提交
  });
})();
