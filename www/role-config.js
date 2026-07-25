// PinVerse · 添加角色 · 第二步 配置角色
// 性格由一个二维面板决定：用户拖动白色圆点，程序读取圆点的 X / Y 坐标，
// 再按接口语义换算为 0~100（性格：0=毒舌 → 100=温柔；语气：0=冷淡寡言 → 100=元气话痨）。

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
    personality.x = Math.round((x / width) * 100);
    personality.y = Math.round((y / height) * 100);
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

  // 角色一旦创建成功就记下 ID：后续若只是头像上传失败，重试时不再重复创建角色。
  let createdCharacterId = null;

  function setSubmitting(submitting) {
    submitBtn.disabled = submitting;
    if (submitting) {
      submitBtn.textContent = createdCharacterId ? '正在上传头像…' : '正在创建…';
    } else {
      submitBtn.textContent = createdCharacterId ? '重试上传头像' : '完成配置';
    }
  }

  function extractCharacterId(data) {
    if (!data || typeof data !== 'object') return null;
    return data.character_id ?? data.id ?? data.character?.character_id ?? null;
  }

  // 字段名与 POST /characters 文档保持一致。界面坐标方向和接口数值方向相反，
  // 因此 X/Y 都需要取反：左/上是 100，右/下是 0。
  function buildCharacterPayload() {
    return {
      character_name: nameInput.value.trim(),
      address_for_user: callMeInput.value.trim(),
      personality_sliders: {
        性格: 100 - personality.x,
        语气: 100 - personality.y,
      },
      custom_phrases: catchphraseInput.value.trim(),
    };
  }

  function extractErrorMessage(data) {
    if (data && typeof data.message === 'string') return data.message;
    if (data && typeof data.error === 'string') return data.error;
    if (data && Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
    if (data && typeof data.detail === 'string') return data.detail;
    return '';
  }

  // ---------- 完成配置 ----------
  // 顺序：先创建角色拿到 character_id，再把第一步拍摄的吧唧上传到该角色名下，
  // 上传接口会把图片 URL 绑定到角色，最后跳转到角色标签卡。
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
      if (!createdCharacterId) {
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

        createdCharacterId = extractCharacterId(data);
      }

      const photo = localStorage.getItem('pinverse:newRolePhoto');
      if (photo && createdCharacterId) {
        try {
          await window.PinVerseUploads.uploadAvatar(photo, createdCharacterId);
        } catch (err) {
          showError('角色已创建，但头像上传失败，请重试');
          return;
        }
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
