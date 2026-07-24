// PinVerse · 图片上传
// 封装 POST /upload/avatar：请求体是图片原始二进制，character_id 以查询参数传入，
// 服务端会把生成的图片 URL 绑定到该角色，响应形如 { "url": "/uploads/xxx" }。
// 调用方只依赖 uploadAvatar 一个接口，不关心编码与端点细节。

window.PinVerseUploads = (function () {
  const TOKEN_KEY = 'pinverse:token';

  // data URL（拍照结果）→ Blob，避免 base64 字符串直接进网络请求。
  function dataUrlToBlob(dataUrl) {
    const [header, base64] = String(dataUrl).split(',');
    const match = /^data:([^;]+)/.exec(header || '');
    const mime = match ? match[1] : 'application/octet-stream';
    const binary = atob(base64 || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  // 上传角色头像并绑定到角色，成功返回图片 URL，失败抛出异常。
  async function uploadAvatar(dataUrl, characterId) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('unauthorized');

    const blob = dataUrlToBlob(dataUrl);
    const query = characterId ? '?character_id=' + encodeURIComponent(characterId) : '';
    const response = await fetch(window.PINVERSE_API_HOST + '/upload/avatar' + query, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': blob.type || 'application/octet-stream',
      },
      body: blob,
    });

    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json().catch(() => null);
    if (!data || !data.url) throw new Error('invalid-response');
    return data.url;
  }

  return { uploadAvatar };
})();
