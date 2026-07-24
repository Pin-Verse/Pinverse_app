// PinVerse · 添加角色 · 第二步 配置角色
// 性格由一个二维面板决定：用户拖动白色圆点，程序读取圆点的 X / Y 坐标，
// 分别映射为 1~100 的数值（X：1=温柔 → 100=冷酷；Y：1=活泼外向 → 100=内向收敛）。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;
  const TOKEN_KEY = 'pinverse:token';
  const screen = document.querySelector('.role-config-screen');
  const backBtn = document.getElementById('roleConfigBackBtn');
  const avatar = document.getElementById('roleConfigAvatar');
  const nameInput = document.getElementById('roleConfigName');
  const callMeInput = document.getElementById('roleConfigCallMe');
  const catchphraseInput = document.getElementById('roleConfigCatchphrase');
  const grid = document.getElementById('personalityGrid');
  const handle = document.getElementById('personalityHandle');
  const errorEl = document.getElementById('roleConfigError');
  const submitBtn = document.getElementById('roleConfigSubmitBtn');

  // ---------- 头像：沿用第一步拍摄的吧唧照片 ----------
  avatar.src = localStorage.getItem('pinverse:newRolePhoto') || 'assets/avatar-ryo.png';

  // ---------- 返回上一页（带退出动效） ----------
  function goBack() {
    screen.classList.add('is-leaving');
    setTimeout(() => {
      if (history.length > 1) {
        history.back();
      } else {
        location.href = 'role-add.html';
      }
    }, 180);
  }

  backBtn.addEventListener('click', goBack);

  // ---------- 性格二维面板：拖动圆点，X/Y 映射为 1~100 ----------
  const personality = { x: 50, y: 50 };

  function setHandle(x, y, width, height) {
    x = Math.max(0, Math.min(width, x));
    y = Math.max(0, Math.min(height, y));
    handle.style.left = x + 'px';
    handle.style.top = y + 'px';
    personality.x = Math.round((x / width) * 99) + 1;
    personality.y = Math.round((y / height) * 99) + 1;
  }

  function setHandleFromEvent(e) {
    const rect = grid.getBoundingClientRect();
    setHandle(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
  }

  let dragging = false;

  grid.addEventListener('pointerdown', (e) => {
    dragging = true;
    grid.setPointerCapture(e.pointerId);
    setHandleFromEvent(e);
  });

  grid.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    setHandleFromEvent(e);
  });

  function stopDragging(e) {
    dragging = false;
    if (grid.hasPointerCapture(e.pointerId)) grid.releasePointerCapture(e.pointerId);
  }

  grid.addEventListener('pointerup', stopDragging);
  grid.addEventListener('pointercancel', stopDragging);

  // 初始居中（面板尺寸固定为 215×215，见 role-config.css）
  const initialRect = grid.getBoundingClientRect();
  setHandle(initialRect.width / 2, initialRect.height / 2, initialRect.width, initialRect.height);

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
    submitBtn.textContent = submitting ? '正在创建…' : '完成配置';
  }

  function buildCharacterPayload() {
    const catchphrase = catchphraseInput.value.trim();

    return {
      character_name: nameInput.value.trim(),
      img_url: 'mock://character-avatar',
      call_me: callMeInput.value.trim(),
      personality_sliders: {
        温柔度: 100 - personality.x,
        话痨程度: 100 - personality.y,
        毒舌程度: personality.x,
        元气值: 100 - personality.y,
      },
      custom_phrases: catchphrase ? [catchphrase] : [],
    };
  }

  function extractErrorMessage(data) {
    if (data && typeof data.message === 'string') return data.message;
    if (data && typeof data.error === 'string') return data.error;
    if (data && Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
    if (data && typeof data.detail === 'string') return data.detail;
    return '';
  }

  // ---------- 完成配置：创建角色成功后跳转到角色标签卡 ----------
  submitBtn.addEventListener('click', async () => {
    clearError();

    const payload = buildCharacterPayload();
    if (!payload.character_name) {
      showError('请输入角色名称');
      nameInput.focus();
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      showError('登录状态已失效，请重新登录');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(API_HOST + '/characters', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.error)) {
        showError(extractErrorMessage(data) || '角色创建失败，请稍后重试');
        return;
      }

      localStorage.removeItem('pinverse:newRolePhoto');
    } catch (err) {
      showError('网络异常，请检查连接后重试');
      return;
    } finally {
      setSubmitting(false);
    }

    screen.classList.add('is-leaving');
    setTimeout(() => {
      location.href = 'home.html?tab=role';
    }, 180);
  });

  [nameInput, callMeInput, catchphraseInput].forEach((input) => {
    input.addEventListener('input', clearError);
  });
})();
