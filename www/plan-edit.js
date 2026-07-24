// PinVerse · 计划详情 / 新增计划
// 新增、修改、删除均通过 window.PinVerseSchedules 操作当前设备的计划。

(function () {
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') === 'add' ? 'add' : 'edit';
  const isEdit = mode === 'edit';
  const scheduleId = params.get('scheduleId');
  const deviceId = params.get('deviceId') || localStorage.getItem('pinverse:currentDeviceId');
  const dayNames = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

  const screen = document.querySelector('.plan-edit-screen');
  const titleEl = document.getElementById('planEditTitle');
  const cardTitleEl = document.getElementById('planEditCardTitle');
  const backBtn = document.getElementById('planEditBackBtn');
  const deleteBtn = document.getElementById('planEditDeleteBtn');
  const submitBtn = document.getElementById('planEditSubmitBtn');
  const errorEl = document.getElementById('planEditError');
  const weekdayItems = document.querySelectorAll('.weekday-picker__item');
  const confirmDialog = document.getElementById('confirmDialog');
  const confirmDeleteBtn = confirmDialog.querySelector('[data-action="confirm"]');

  function setDropdownValue(field, value) {
    const dropdown = document.querySelector('.dropdown[data-field="' + field + '"]');
    if (!dropdown) return;
    const normalized = value || '请选择';
    dropdown.querySelector('.dropdown__value').textContent = normalized;
    dropdown.querySelectorAll('.dropdown__option').forEach((option) => {
      option.classList.toggle('is-selected', option.dataset.value === normalized);
    });
  }

  function getDropdownValue(field) {
    return document.querySelector(
      '.dropdown[data-field="' + field + '"] .dropdown__value'
    )?.textContent.trim();
  }

  function normalizeDay(day) {
    const value = String(day);
    const chineseIndex = dayNames.indexOf(value);
    if (chineseIndex >= 0) return String(chineseIndex + 1);
    const number = Number(value);
    return number >= 1 && number <= 7 ? String(number) : '';
  }

  function setWeekdaySelection(days) {
    const normalized = days.map(normalizeDay).filter(Boolean);
    weekdayItems.forEach((item) => {
      item.classList.toggle('is-selected', normalized.includes(item.dataset.day));
    });
  }

  function scheduleKey(schedule) {
    return schedule?.id ?? schedule?.brief_id ?? schedule?.schedule_id ?? null;
  }

  function populate(schedule) {
    const title = schedule.name ?? schedule.title ?? schedule.schedule_name ?? '早报';
    titleEl.textContent = title;
    cardTitleEl.textContent = title;
    setDropdownValue(
      'location',
      schedule.weather_location ?? schedule.location ?? schedule.city ?? '请选择'
    );
    setDropdownValue('calendar', schedule.calendar ?? schedule.calendar_provider ?? '请选择');
    setDropdownValue('start-time', schedule.start_time ?? schedule.startTime);
    setDropdownValue('end-time', schedule.end_time ?? schedule.endTime);
    setWeekdaySelection(schedule.weekdays ?? schedule.days ?? []);
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add('is-visible');
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
  }

  function setSubmitting(submitting) {
    submitBtn.disabled = submitting;
    deleteBtn.disabled = submitting;
    submitBtn.textContent = submitting ? '正在保存…' : isEdit ? '保存' : '新增';
  }

  function buildPayload() {
    const selectedDays = Array.from(weekdayItems)
      .filter((item) => item.classList.contains('is-selected'))
      .map((item) => dayNames[Number(item.dataset.day) - 1]);
    const location = getDropdownValue('location');
    const startTime = getDropdownValue('start-time');
    const endTime = getDropdownValue('end-time');

    if (!location || location === '请选择') throw new Error('请选择所在地');
    if (!startTime || startTime === '请选择' || !endTime || endTime === '请选择') {
      throw new Error('请选择显示时间');
    }
    if (!selectedDays.length) throw new Error('请至少选择一个显示日期');

    return {
      enabled: true,
      start_time: startTime.padStart(5, '0'),
      end_time: endTime.padStart(5, '0'),
      weekdays: selectedDays,
      weather_location: location,
    };
  }

  function goBack() {
    screen.classList.add('is-leaving');
    setTimeout(() => {
      if (history.length > 1) {
        history.back();
      } else {
        location.href = 'home.html';
      }
    }, 180);
  }

  async function loadSchedule() {
    if (!deviceId || !scheduleId) {
      showError('未找到有效的设备或计划');
      submitBtn.disabled = true;
      deleteBtn.disabled = true;
      return;
    }

    setSubmitting(true);
    try {
      const schedules = await window.PinVerseSchedules.list(deviceId);
      const schedule = schedules.find((item) => String(scheduleKey(item)) === scheduleId);
      if (!schedule) throw new Error('计划不存在或已被删除');
      populate(schedule);
    } catch (err) {
      showError(err.message || '计划加载失败，请稍后重试');
      submitBtn.disabled = true;
      deleteBtn.disabled = true;
      return;
    }
    setSubmitting(false);
  }

  titleEl.textContent = isEdit ? '早报' : '新增计划';
  cardTitleEl.textContent = isEdit ? '早报' : '新增计划';
  deleteBtn.classList.toggle('is-hidden-placeholder', !isEdit);
  submitBtn.textContent = isEdit ? '保存' : '新增';

  if (isEdit) {
    loadSchedule();
  } else {
    setDropdownValue('location', '请选择');
    setDropdownValue('calendar', '请选择');
    setDropdownValue('start-time', '请选择');
    setDropdownValue('end-time', '请选择');
    setWeekdaySelection([]);
    if (!deviceId) {
      showError('请先选择一个有效设备');
      submitBtn.disabled = true;
    }
  }

  backBtn.addEventListener('click', goBack);

  submitBtn.addEventListener('click', async () => {
    clearError();
    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      showError(err.message);
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await window.PinVerseSchedules.update(deviceId, scheduleId, payload);
      } else {
        await window.PinVerseSchedules.create(deviceId, payload);
      }
      sessionStorage.setItem('pinverse:schedulesChanged', '1');
      goBack();
    } catch (err) {
      showError(err.message || '计划保存失败，请稍后重试');
      setSubmitting(false);
    }
  });

  weekdayItems.forEach((item) => {
    item.addEventListener('click', () => {
      item.classList.toggle('is-selected');
      clearError();
    });
  });

  function closeConfirmDialog() {
    confirmDialog.classList.remove('is-open');
  }

  deleteBtn.addEventListener('click', () => confirmDialog.classList.add('is-open'));
  confirmDialog.querySelectorAll('[data-action="cancel"]').forEach((element) => {
    element.addEventListener('click', closeConfirmDialog);
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    confirmDeleteBtn.disabled = true;
    try {
      await window.PinVerseSchedules.remove(deviceId, scheduleId);
      sessionStorage.setItem('pinverse:schedulesChanged', '1');
      closeConfirmDialog();
      goBack();
    } catch (err) {
      closeConfirmDialog();
      showError(err.message || '计划删除失败，请稍后重试');
      confirmDeleteBtn.disabled = false;
    }
  });
})();
