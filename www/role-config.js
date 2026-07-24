// PinVerse · 添加角色 · 第二步 配置角色
// 性格由一个二维面板决定：用户拖动白色圆点，程序读取圆点的 X / Y 坐标，
// 分别映射为 1~100 的数值（X：1=温柔 → 100=冷酷；Y：1=活泼外向 → 100=内向收敛）。

(function () {
  const screen = document.querySelector('.role-config-screen');
  const backBtn = document.getElementById('roleConfigBackBtn');
  const avatar = document.getElementById('roleConfigAvatar');
  const nameInput = document.getElementById('roleConfigName');
  const callMeInput = document.getElementById('roleConfigCallMe');
  const catchphraseInput = document.getElementById('roleConfigCatchphrase');
  const grid = document.getElementById('personalityGrid');
  const handle = document.getElementById('personalityHandle');
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

  // ---------- 完成配置：写入新角色信息并跳转到角色标签卡 ----------
  submitBtn.addEventListener('click', () => {
    localStorage.setItem(
      'pinverse:newRole',
      JSON.stringify({
        name: nameInput.value.trim(),
        callMe: callMeInput.value.trim(),
        catchphrase: catchphraseInput.value.trim(),
        personality: personality,
      })
    );
    screen.classList.add('is-leaving');
    setTimeout(() => {
      location.href = 'index.html?tab=role';
    }, 180);
  });
})();
