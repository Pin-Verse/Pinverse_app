// PinVerse · 计划页
// 点击「计划 / 角色」标签，在对应视图之间切换（带淡入过渡）。
// 「设置」暂无对应视图，点击时不切换。
// 下拉栏组件逻辑见 dropdown.js（home.html / plan-edit.html 共用）。

(function () {
  const tabs = document.querySelectorAll('.tabs__item');
  const views = document.querySelectorAll('.view');

  function switchTo(name) {
    const target = document.querySelector('.view[data-view="' + name + '"]');
    if (!target) return; // 没有对应视图（如「设置」）则忽略

    tabs.forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.tab === name);
    });
    views.forEach((view) => {
      view.classList.toggle('is-active', view.dataset.view === name);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTo(tab.dataset.tab));
  });

  // ---------- 从其他页面跳转回来时，按 ?tab= 指定要展示的标签页 ----------
  // 例如 role-config.html 完成配置后跳转到 home.html?tab=role，直接展示「角色」标签页。
  const initialTab = new URLSearchParams(location.search).get('tab');
  if (initialTab) switchTo(initialTab);

  // ---------- 当前设备计划 ----------
  const planCard = document.getElementById('planCard');
  const planList = document.getElementById('planList');
  const planEmpty = document.getElementById('planEmpty');
  const planAddLink = document.getElementById('planAddLink');
  let scheduleLoadVersion = 0;
  let renderedDeviceId; // undefined 表示还没跑过一次加载
  let renderedSignature = null; // 已渲染内容的指纹，用来判断本轮拉取是否真的有变化

  function scheduleId(schedule) {
    return schedule?.id ?? schedule?.brief_id ?? schedule?.schedule_id ?? null;
  }

  function formatWeekdays(days) {
    if (!Array.isArray(days) || !days.length) return '每天';
    const values = days.map(String);
    const workdays = ['星期一', '星期二', '星期三', '星期四', '星期五'];
    if (workdays.every((day) => values.includes(day)) && values.length === 5) return '周一～五';
    return values
      .map((day) => day.replace('星期', '周'))
      .join('、');
  }

  // 计划列表的指纹：只包含卡片上真正展示的字段，避免后端返回无关字段变动就重绘
  function schedulesSignature(schedules) {
    return JSON.stringify(
      schedules.map((schedule) => [
        scheduleId(schedule),
        schedule?.name ?? schedule?.title ?? schedule?.schedule_name ?? '',
        schedule?.start_time ?? schedule?.startTime ?? '',
        schedule?.end_time ?? schedule?.endTime ?? '',
        schedule?.weekdays ?? schedule?.days ?? null,
      ]),
    );
  }

  function renderSchedules(schedules, deviceId) {
    const cards = schedules.map((schedule) => {
      const id = scheduleId(schedule);
      const card = planCard.cloneNode(true);
      const title = schedule?.name ?? schedule?.title ?? schedule?.schedule_name ?? '早报';
      const start = schedule?.start_time ?? schedule?.startTime ?? '--:--';
      const end = schedule?.end_time ?? schedule?.endTime ?? '--:--';
      card.removeAttribute('id');
      card.classList.remove('is-hidden');
      card.querySelector('.card__title').textContent = title;
      card.querySelector('.card__subtitle').textContent =
        formatWeekdays(schedule?.weekdays ?? schedule?.days) + ' ' + start + '~' + end;
      card.querySelector('.card__action').href =
        'plan-edit.html?mode=edit&deviceId=' +
        encodeURIComponent(deviceId) +
        '&scheduleId=' +
        encodeURIComponent(id);
      return card;
    });
    planList.replaceChildren(...cards);
    planEmpty.classList.remove('is-visible');
  }

  // 设备状态是轮询刷新的（见 device-status.js），本函数会被反复调用。
  // 为避免每次轮询都「清空 → 正在加载 → 重新渲染」地闪一下，这里只在
  // 首次加载和切换设备时清空并给出加载提示；同一台设备的后续刷新静默进行，
  // 拉到的内容与已渲染内容不同（比如后端新增了一条计划）时才更新 DOM。
  async function loadSchedules(device) {
    const version = ++scheduleLoadVersion;
    const deviceId = device?.device_id ?? null;
    const isDeviceChanged = deviceId !== renderedDeviceId;

    if (isDeviceChanged) {
      renderedDeviceId = deviceId;
      renderedSignature = null;
      planList.replaceChildren();
      planEmpty.textContent = deviceId ? '正在加载计划…' : '暂无设备';
      planEmpty.classList.add('is-visible');
    }

    if (!deviceId) {
      planAddLink.href = 'plan-edit.html?mode=add';
      return;
    }

    planAddLink.href = 'plan-edit.html?mode=add&deviceId=' + encodeURIComponent(deviceId);

    try {
      const schedules = await window.PinVerseSchedules.list(deviceId);
      if (version !== scheduleLoadVersion) return;

      const validSchedules = schedules.filter((schedule) => scheduleId(schedule) !== null);
      const signature = schedulesSignature(validSchedules);
      if (signature === renderedSignature) return; // 内容没变，不动 DOM
      renderedSignature = signature;

      if (validSchedules.length) {
        renderSchedules(validSchedules, deviceId);
      } else {
        planList.replaceChildren();
        planEmpty.textContent = '暂无计划';
        planEmpty.classList.add('is-visible');
      }
    } catch (err) {
      if (version !== scheduleLoadVersion) return;
      // 轮询失败时保留已渲染的计划，只有一次都没成功过才提示失败
      if (renderedSignature === null) planEmpty.textContent = '计划加载失败，请稍后重试';
    }
  }

  window.PinVerseDevices?.onChange(loadSchedules);

  // ---------- 跳转到其他页面（如 plan-edit.html / role-add.html）前先播放退出动效，避免切换生硬 ----------
  // 凡是需要该过渡的站内跳转链接，都标注 [data-nav-link]。
  const screen = document.querySelector('.screen');
  screen.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-nav-link]');
    if (!link || !screen.contains(link)) return;
    event.preventDefault();
    const href = link.getAttribute('href');
    screen.classList.add('is-leaving');
    setTimeout(() => {
      location.href = href;
    }, 180);
  });

  // ---------- 解绑设备：二次确认对话框 ----------
  const unbindBtn = document.getElementById('unbindDeviceBtn');
  const unbindDialog = document.getElementById('unbindConfirmDialog');

  if (unbindBtn && unbindDialog) {
    unbindBtn.addEventListener('click', () => unbindDialog.classList.add('is-open'));

    unbindDialog.querySelectorAll('[data-action="cancel"]').forEach((el) => {
      el.addEventListener('click', () => unbindDialog.classList.remove('is-open'));
    });

    const confirmUnbindBtn = unbindDialog.querySelector('[data-action="confirm"]');
    confirmUnbindBtn.addEventListener('click', async () => {
      confirmUnbindBtn.disabled = true;
      try {
        await window.PinVerseDevices.unbindCurrent();
        unbindDialog.classList.remove('is-open');
      } catch (err) {
        window.alert(err.message || '设备解绑失败，请稍后重试');
      } finally {
        confirmUnbindBtn.disabled = false;
      }
    });
  }

  // ---------- 从 plan-edit.html 用 history.back() 返回时，若命中 bfcache，
  // 页面会带着离开前加的 is-leaving（淡出）状态被直接恢复，这里去掉它 ----------
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      screen.classList.remove('is-leaving');
      if (sessionStorage.getItem('pinverse:schedulesChanged') === '1') {
        sessionStorage.removeItem('pinverse:schedulesChanged');
        loadSchedules(window.PinVerseDevices?.getCurrent());
      }
    }
  });
})();
