// PinVerse · 计划详情 / 新增计划
// 新增、修改、删除均通过 window.PinVerseSchedules 操作当前设备的计划。

(function () {
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') === 'add' ? 'add' : 'edit';
  const isEdit = mode === 'edit';
  const scheduleId = params.get('scheduleId');
  const deviceId = params.get('deviceId') || localStorage.getItem('pinverse:currentDeviceId');
  const dayNames = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

  // 展示类型：后端 display_type 字段（不传默认 smalltalk）与下拉文案的对照
  const DISPLAY_TYPES = [
    {
      value: 'smalltalk',
      label: '角色发话',
      subtitle: '绑定角色用自己的口吻说一段话，内容里会揉进天气、日程与今日新番',
    },
    {
      value: 'hitokoto',
      label: '一言',
      subtitle: '展示一句诗句 / 台词 / 格言及其出处，不经角色加工',
    },
  ];
  const DEFAULT_DISPLAY_TYPE = DISPLAY_TYPES[0];

  const screen = document.querySelector('.plan-edit-screen');
  const titleEl = document.getElementById('planEditTitle');
  const cardTitleEl = document.getElementById('planEditCardTitle');
  const backBtn = document.getElementById('planEditBackBtn');
  const deleteBtn = document.getElementById('planEditDeleteBtn');
  const submitBtn = document.getElementById('planEditSubmitBtn');
  const errorEl = document.getElementById('planEditError');
  const weekdayItems = document.querySelectorAll('.weekday-picker__item');
  const startTimeInput = document.getElementById('planStartTime');
  const endTimeInput = document.getElementById('planEndTime');
  const confirmDialog = document.getElementById('confirmDialog');
  const confirmDeleteBtn = confirmDialog.querySelector('[data-action="confirm"]');
  const cardSubtitleEl = document.querySelector('.plan-edit__card-subtitle');
  const smalltalkOnlyRows = document.querySelectorAll('[data-smalltalk-only]');

  // 「一言」下天气地点在界面上隐藏，但 PUT 是整份覆盖，仍要把原值原样回传，
  // 不能传空串把用户之前填的地点洗掉。这里记住加载时拿到的原值。
  let loadedWeatherLocation = '';

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

  function currentDisplayType() {
    const label = getDropdownValue('displayType');
    return DISPLAY_TYPES.find((type) => type.label === label) ?? DEFAULT_DISPLAY_TYPE;
  }

  // 展示类型变化后同步卡片说明，并按类型决定是否展示天气 / 日程相关行
  function applyDisplayType() {
    const type = currentDisplayType();
    cardSubtitleEl.textContent = type.subtitle;
    smalltalkOnlyRows.forEach((row) => {
      row.classList.toggle('is-hidden', type.value !== 'smalltalk');
    });
  }

  function setDisplayType(value) {
    const type = DISPLAY_TYPES.find((item) => item.value === value) ?? DEFAULT_DISPLAY_TYPE;
    setDropdownValue('displayType', type.label);
    applyDisplayType();
  }

  function normalizeTime(value) {
    const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '';
    return match[1].padStart(2, '0') + ':' + match[2];
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
    loadedWeatherLocation = schedule.weather_location ?? schedule.location ?? schedule.city ?? '';
    setDisplayType(schedule.display_type ?? DEFAULT_DISPLAY_TYPE.value);
    setDropdownValue('location', loadedWeatherLocation || '请选择');
    setDropdownValue('calendar', schedule.calendar ?? schedule.calendar_provider ?? '请选择');
    startTimeInput.value = normalizeTime(schedule.start_time ?? schedule.startTime);
    endTimeInput.value = normalizeTime(schedule.end_time ?? schedule.endTime);
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
    const displayType = currentDisplayType();
    const isSmalltalk = displayType.value === 'smalltalk';
    const location = getDropdownValue('location');
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

    if (isSmalltalk && (!location || location === '请选择')) throw new Error('请选择所在地');
    if (!startTime || !endTime) {
      throw new Error('请选择显示时间');
    }
    if (startTime >= endTime) {
      throw new Error('起始时间必须早于结束时间');
    }
    if (!selectedDays.length) throw new Error('请至少选择一个显示日期');

    return {
      enabled: true,
      display_type: displayType.value,
      start_time: startTime.padStart(5, '0'),
      end_time: endTime.padStart(5, '0'),
      weekdays: selectedDays,
      // 一言不看这个字段，但整份覆盖的 PUT 要求原样回传，避免洗掉用户已填的地点
      weather_location: isSmalltalk ? location : loadedWeatherLocation,
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
  applyDisplayType(); // 编辑模式详情拉回前，先按下拉默认值把说明与可见行摆正

  if (isEdit) {
    // 凭证从原生安全存储异步读出，就绪后再拉计划详情
    window.PinVerseAuth.onReady(loadSchedule);
  } else {
    loadedWeatherLocation = '';
    setDisplayType(DEFAULT_DISPLAY_TYPE.value);
    setDropdownValue('location', '请选择');
    setDropdownValue('calendar', '请选择');
    startTimeInput.value = '';
    endTimeInput.value = '';
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

  // dropdown.js 已负责选中态与文案，这里只在选完之后同步依赖展示类型的界面
  document
    .querySelectorAll('.dropdown[data-field="displayType"] .dropdown__option')
    .forEach((option) => {
      option.addEventListener('click', () => {
        applyDisplayType();
        clearError();
      });
    });

  weekdayItems.forEach((item) => {
    item.addEventListener('click', () => {
      item.classList.toggle('is-selected');
      clearError();
    });
  });

  [startTimeInput, endTimeInput].forEach((input) => {
    input.addEventListener('change', clearError);
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
