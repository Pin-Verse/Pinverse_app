// PinVerse · 添加角色 · 第一步 拍摄吧唧
// 摄像头调用逻辑见 camera.js（独立封装，便于后续替换为原生 Camera SDK）。

(function () {
  const screen = document.querySelector('.role-add-screen');
  const backBtn = document.getElementById('roleAddBackBtn');
  const captureBtn = document.getElementById('roleAddCaptureBtn');
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  const placeholder = document.getElementById('cameraPlaceholder');
  const placeholderText = document.getElementById('cameraPlaceholderText');

  // ---------- 返回上一页（带退出动效，并释放摄像头） ----------
  function goBack() {
    window.PinVerseCamera.stop();
    screen.classList.add('is-leaving');
    setTimeout(() => {
      if (history.length > 1) {
        history.back();
      } else {
        location.href = 'index.html';
      }
    }, 180);
  }

  backBtn.addEventListener('click', goBack);

  // ---------- 打开摄像头，就绪后用实时画面替换占位提示 ----------
  async function initCamera() {
    try {
      await window.PinVerseCamera.start(video);
      video.classList.remove('is-hidden');
      placeholder.classList.add('is-hidden');
    } catch (err) {
      placeholderText.textContent = '无法访问摄像头，请检查权限设置';
    }
  }

  // ---------- 拍摄：取景框未就绪时不响应 ----------
  captureBtn.addEventListener('click', () => {
    if (video.classList.contains('is-hidden')) return;
    window.PinVerseCamera.capture(video, canvas);
    goBack();
  });

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      screen.classList.remove('is-leaving');
      initCamera();
    }
  });

  initCamera();
})();
