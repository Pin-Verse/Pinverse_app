// PinVerse · 角色列表
// 从 GET /characters 获取角色；非正方形头像会在浏览器中居中裁成 1:1。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;
  const TOKEN_KEY = 'pinverse:token';
  const listEl = document.getElementById('characterList');
  const statusEl = document.getElementById('characterListStatus');
  let binding = false;
  let suppressNextClick = false;

  if (!listEl || !statusEl) return;

  function setStatus(message) {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-visible', Boolean(message));
  }

  function extractCharacters(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    const candidates = [payload.characters, payload.data, payload.items];
    const list = candidates.find(Array.isArray);
    if (list) return list;
    if (payload.data && typeof payload.data === 'object') {
      return extractCharacters(payload.data);
    }
    return [];
  }

  function resolveImageUrl(url) {
    if (!url) return 'assets/avatar-ryo.png';
    try {
      return new URL(url, API_HOST + '/').href;
    } catch (err) {
      return 'assets/avatar-ryo.png';
    }
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  function characterMeta(character) {
    const favorability =
      character.favorability ?? character.affection ?? character.intimacy ?? character.favorability_level;
    const createdAt = character.created_at ?? character.createdAt ?? character.date;
    const parts = [];
    if (favorability !== undefined && favorability !== null) parts.push('好感度 ' + favorability);
    if (createdAt) parts.push(formatDate(createdAt));
    return parts.join('｜');
  }

  function characterId(character) {
    return character.id ?? character.character_id ?? null;
  }

  function boundCharacterId(device) {
    return device?.character_id ?? device?.bound_character_id ?? device?.character?.id ?? null;
  }

  function selectCard(characterId) {
    listEl.querySelectorAll('.role-card').forEach((card) => {
      card.classList.toggle(
        'is-selected',
        characterId !== null && String(card.dataset.characterId) === String(characterId)
      );
    });
  }

  function createCard(character) {
    const card = document.createElement('div');
    const name = character.name ?? character.character_name ?? '未命名角色';
    const id = characterId(character);
    card.className = 'role-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', name + '，点击绑定，长按管理');
    if (id !== null) card.dataset.characterId = id;

    const avatar = document.createElement('img');
    avatar.className = 'role-card__avatar';
    avatar.alt = name;
    avatar.decoding = 'async';
    avatar.src = 'assets/avatar-ryo.png';

    const nameEl = document.createElement('div');
    nameEl.className = 'role-card__name';
    nameEl.textContent = name;

    const metaEl = document.createElement('div');
    metaEl.className = 'role-card__meta';
    metaEl.textContent = characterMeta(character);

    card.append(avatar, nameEl, metaEl);
    cropImageToSquare(resolveImageUrl(character.img_url), avatar);
    return card;
  }

  // 长按角色卡片进入管理页。手指有明显移动时视为滚动，不触发长按；
  // 长按完成后屏蔽随后的 click，避免同时执行角色绑定。
  const LONG_PRESS_MS = 600;
  const MOVE_TOLERANCE = 10;
  let pressTimer = null;
  let pressedCard = null;
  let pressStartX = 0;
  let pressStartY = 0;

  function clearLongPress() {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
    pressedCard?.classList.remove('is-pressing');
    pressedCard = null;
  }

  function openCharacterManager(card) {
    const id = card?.dataset.characterId;
    if (!id) return;
    suppressNextClick = true;
    clearLongPress();
    document.querySelector('.screen')?.classList.add('is-leaving');
    setTimeout(() => {
      location.href = 'role-manage.html?characterId=' + encodeURIComponent(id);
    }, 180);
  }

  listEl.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const card = event.target.closest('.role-card');
    if (!card || !listEl.contains(card) || !card.dataset.characterId) return;
    clearLongPress();
    pressedCard = card;
    pressStartX = event.clientX;
    pressStartY = event.clientY;
    card.classList.add('is-pressing');
    pressTimer = setTimeout(() => openCharacterManager(card), LONG_PRESS_MS);
  });

  listEl.addEventListener('pointermove', (event) => {
    if (!pressedCard) return;
    if (
      Math.abs(event.clientX - pressStartX) > MOVE_TOLERANCE ||
      Math.abs(event.clientY - pressStartY) > MOVE_TOLERANCE
    ) {
      clearLongPress();
    }
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
    listEl.addEventListener(eventName, clearLongPress);
  });

  listEl.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.role-card')) event.preventDefault();
  });

  // Canvas 生成真正的方形图片；若图片服务未开放 CORS，CSS 的 object-fit: cover 负责兜底。
  function cropImageToSquare(url, target) {
    const source = new Image();
    source.crossOrigin = 'anonymous';
    source.onload = () => {
      if (source.naturalWidth === source.naturalHeight) {
        target.src = url;
        return;
      }

      const size = Math.min(source.naturalWidth, source.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) {
        target.src = url;
        return;
      }

      const sourceX = (source.naturalWidth - size) / 2;
      const sourceY = (source.naturalHeight - size) / 2;
      context.drawImage(source, sourceX, sourceY, size, size, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) {
          target.src = url;
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        target.onload = () => URL.revokeObjectURL(objectUrl);
        target.src = objectUrl;
      }, 'image/webp');
    };
    source.onerror = () => {
      target.src = url;
    };
    source.src = url;
  }

  async function loadCharacters() {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: 'Bearer ' + token } : {};

    try {
      const response = await fetch(API_HOST + '/characters', { method: 'GET', headers });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const characters = extractCharacters(await response.json());
      listEl.replaceChildren(...characters.map(createCard));
      const device = window.PinVerseDevices?.getCurrent();
      const selectedId = boundCharacterId(device);
      if (selectedId !== null) selectCard(selectedId);
      setStatus(characters.length ? '' : '暂无角色');
    } catch (err) {
      listEl.replaceChildren();
      setStatus('角色加载失败，请稍后重试');
    }
  }

  async function bindCharacter(deviceId, characterId) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;

    try {
      const response = await fetch(
        API_HOST + '/devices/' + encodeURIComponent(deviceId) + '/bind',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ character_id: characterId }),
        }
      );
      const data = await response.json().catch(() => null);
      return response.ok && !(data && data.error);
    } catch (err) {
      return false;
    }
  }

  listEl.addEventListener('click', async (event) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      event.preventDefault();
      return;
    }
    const card = event.target.closest('.role-card');
    if (!card || !listEl.contains(card) || binding || card.classList.contains('is-selected')) return;

    const characterId = card.dataset.characterId;
    const device = window.PinVerseDevices?.getCurrent();
    if (!characterId || !device?.device_id) return;

    binding = true;
    listEl.classList.add('is-binding');
    setStatus('正在绑定角色…');

    const success = await bindCharacter(device.device_id, characterId);
    binding = false;
    listEl.classList.remove('is-binding');

    if (!success) {
      setStatus('角色绑定失败，请稍后重试');
      return;
    }

    window.PinVerseDevices?.setCurrentCharacter(characterId, device.device_id);
    const currentDevice = window.PinVerseDevices?.getCurrent();
    const selectedId =
      currentDevice?.device_id === device.device_id ? characterId : boundCharacterId(currentDevice);
    selectCard(selectedId);
    setStatus('');
  });

  window.PinVerseDevices?.onChange((device) => {
    if (binding) return;
    const selectedId = boundCharacterId(device);
    if (selectedId !== null) selectCard(selectedId);
  });

  loadCharacters();
})();
