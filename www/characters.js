// PinVerse · 角色列表
// 从 GET /characters 获取角色；非正方形头像会在浏览器中居中裁成 1:1。

(function () {
  const API_HOST = window.PINVERSE_API_HOST;
  const TOKEN_KEY = 'pinverse:token';
  const listEl = document.getElementById('characterList');
  const statusEl = document.getElementById('characterListStatus');

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

  function createCard(character, index) {
    const card = document.createElement('div');
    const name = character.name ?? character.character_name ?? '未命名角色';
    card.className = 'role-card' + (index === 0 ? ' is-selected' : '');
    if (character.id !== undefined) card.dataset.characterId = character.id;

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
      setStatus(characters.length ? '' : '暂无角色');
    } catch (err) {
      listEl.replaceChildren();
      setStatus('角色加载失败，请稍后重试');
    }
  }

  loadCharacters();
})();
