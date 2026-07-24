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

  async function loadSchedules(device) {
    const version = ++scheduleLoadVersion;
    planList.replaceChildren();
    planEmpty.classList.add('is-visible');

    if (!device?.device_id) {
      planEmpty.textContent = '暂无设备';
      planAddLink.href = 'plan-edit.html?mode=add';
      return;
    }

    planEmpty.textContent = '正在加载计划…';
    planAddLink.href =
      'plan-edit.html?mode=add&deviceId=' + encodeURIComponent(device.device_id);

    try {
      const schedules = await window.PinVerseSchedules.list(device.device_id);
      if (version !== scheduleLoadVersion) return;
      const validSchedules = schedules.filter((schedule) => scheduleId(schedule) !== null);
      if (validSchedules.length) {
        renderSchedules(validSchedules, device.device_id);
      } else {
        planEmpty.textContent = '暂无计划';
      }
    } catch (err) {
      if (version !== scheduleLoadVersion) return;
      planEmpty.textContent = '计划加载失败，请稍后重试';
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
