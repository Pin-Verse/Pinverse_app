// PinVerse · 角色管理
// 角色详情、更新和删除分别对应 GET / PUT / DELETE /characters/{character_id}。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;
  const characterId = new URLSearchParams(location.search).get('characterId');
  const screen = document.getElementById('roleManageScreen');
  const backBtn = document.getElementById('roleManageBackBtn');
  const avatar = document.getElementById('roleManageAvatar');
  const nameInput = document.getElementById('roleManageName');
  const callMeInput = document.getElementById('roleManageCallMe');
  const catchphraseInput = document.getElementById('roleManageCatchphrase');
  const grid = document.getElementById('roleManagePersonalityGrid');
  const handle = document.getElementById('roleManagePersonalityHandle');
  const statusEl = document.getElementById('roleManageStatus');
  const saveBtn = document.getElementById('roleManageSaveBtn');
  const deleteBtn = document.getElementById('roleManageDeleteBtn');
  const deleteDialog = document.getElementById('roleDeleteDialog');
  const confirmDeleteBtn = deleteDialog.querySelector('[data-action="confirm"]');
  const personality = { x: 50, y: 50 };

  function goBack() {
    screen.classList.add('is-leaving');
    setTimeout(() => {
      if (history.length > 1) {
        history.back();
      } else {
        location.href = 'home.html?tab=role';
      }
    }, 180);
  }

  function goToRoleList() {
    screen.classList.add('is-leaving');
    setTimeout(() => {
      location.href = 'home.html?tab=role';
    }, 180);
  }

  backBtn.addEventListener('click', goBack);

  function showStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-visible', Boolean(message));
    statusEl.classList.toggle('is-success', Boolean(message) && !isError);
  }

  function extractErrorMessage(data) {
    if (data && typeof data.message === 'string') return data.message;
    if (data && typeof data.error === 'string') return data.error;
    if (data && Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
    if (data && typeof data.detail === 'string') return data.detail;
    return '';
  }

  function authHeaders(withJson) {
    return window.PinVerseAuth.authHeaders(withJson);
  }

  function resolveImageUrl(url) {
    if (!url) return 'assets/avatar-ryo.png';
    try {
      return new URL(url, API_HOST + '/').href;
    } catch (err) {
      return 'assets/avatar-ryo.png';
    }
  }

  function setHandleFromValues(x, y) {
    const rect = grid.getBoundingClientRect();
    personality.x = Math.max(0, Math.min(100, Number(x)));
    personality.y = Math.max(0, Math.min(100, Number(y)));
    handle.style.left = (personality.x / 100) * rect.width + 'px';
    handle.style.top = (personality.y / 100) * rect.height + 'px';
  }

  function setHandleFromEvent(event) {
    const rect = grid.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    setHandleFromValues((x / rect.width) * 100, (y / rect.height) * 100);
  }

  let dragging = false;
  grid.addEventListener('pointerdown', (event) => {
    dragging = true;
    grid.setPointerCapture(event.pointerId);
    setHandleFromEvent(event);
  });
  grid.addEventListener('pointermove', (event) => {
    if (dragging) setHandleFromEvent(event);
  });
  function stopDragging(event) {
    dragging = false;
    if (grid.hasPointerCapture(event.pointerId)) grid.releasePointerCapture(event.pointerId);
  }
  grid.addEventListener('pointerup', stopDragging);
  grid.addEventListener('pointercancel', stopDragging);

  function setFormEnabled(enabled) {
    [nameInput, callMeInput, catchphraseInput, saveBtn, deleteBtn].forEach((element) => {
      element.disabled = !enabled;
    });
    grid.classList.toggle('is-disabled', !enabled);
  }

  function fillForm(character) {
    nameInput.value = character.character_name ?? character.name ?? '';
    callMeInput.value = character.address_for_user ?? '';
    catchphraseInput.value = character.custom_phrases ?? '';
    avatar.src = resolveImageUrl(character.img_url);

    const sliders = character.personality_sliders ?? {};
    const apiPersonality = Number(sliders['性格']);
    const apiTone = Number(sliders['语气']);
    // 接口值越大越温柔/元气，界面越靠左/上，因此需要反向映射。
    const x = Number.isFinite(apiPersonality) ? 100 - apiPersonality : 50;
    const y = Number.isFinite(apiTone) ? 100 - apiTone : 50;
    setHandleFromValues(x, y);
  }

  async function loadCharacter() {
    if (!characterId) {
      showStatus('缺少角色信息，请返回重试', true);
      return;
    }
    const headers = authHeaders(false);
    if (!headers) {
      showStatus('登录状态已失效，请重新登录', true);
      return;
    }

    try {
      const response = await fetch(
        API_HOST + '/characters/' + encodeURIComponent(characterId),
        { method: 'GET', headers }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.error) {
        showStatus(extractErrorMessage(data) || '角色加载失败，请稍后重试', true);
        return;
      }
      fillForm(data.character ?? data.data ?? data);
      setFormEnabled(true);
      showStatus('');
    } catch (err) {
      showStatus('网络异常，请检查连接后重试', true);
    }
  }

  saveBtn.addEventListener('click', async () => {
    const characterName = nameInput.value.trim();
    if (!characterName) {
      showStatus('请输入角色名称', true);
      nameInput.focus();
      return;
    }
    const headers = authHeaders(true);
    if (!headers) {
      showStatus('登录状态已失效，请重新登录', true);
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = '正在保存…';
    showStatus('');
    const payload = {
      character_name: characterName,
      address_for_user: callMeInput.value.trim(),
      personality_sliders: {
        性格: Math.round(100 - personality.x),
        语气: Math.round(100 - personality.y),
      },
      custom_phrases: catchphraseInput.value.trim(),
    };

    try {
      const response = await fetch(
        API_HOST + '/characters/' + encodeURIComponent(characterId),
        { method: 'PUT', headers, body: JSON.stringify(payload) }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.error)) {
        showStatus(extractErrorMessage(data) || '保存失败，请稍后重试', true);
        return;
      }
      showStatus('修改已保存', false);
    } catch (err) {
      showStatus('网络异常，请检查连接后重试', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '保存修改';
    }
  });

  deleteBtn.addEventListener('click', () => {
    deleteDialog.classList.add('is-open');
    confirmDeleteBtn.focus();
  });

  deleteDialog.querySelectorAll('[data-action="cancel"]').forEach((element) => {
    element.addEventListener('click', () => deleteDialog.classList.remove('is-open'));
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    const headers = authHeaders(false);
    if (!headers) {
      deleteDialog.classList.remove('is-open');
      showStatus('登录状态已失效，请重新登录', true);
      return;
    }

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = '删除中…';
    try {
      const response = await fetch(
        API_HOST + '/characters/' + encodeURIComponent(characterId),
        { method: 'DELETE', headers }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.error)) {
        deleteDialog.classList.remove('is-open');
        showStatus(extractErrorMessage(data) || '删除失败，请稍后重试', true);
        return;
      }
      goToRoleList();
    } catch (err) {
      deleteDialog.classList.remove('is-open');
      showStatus('网络异常，请检查连接后重试', true);
    } finally {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = '删除';
    }
  });

  [nameInput, callMeInput, catchphraseInput].forEach((input) => {
    input.addEventListener('input', () => showStatus(''));
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) screen.classList.remove('is-leaving');
  });

  setHandleFromValues(50, 50);
  window.PinVerseAuth.onReady(loadCharacter);
})();
