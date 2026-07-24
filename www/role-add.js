// PinVerse · 添加角色 · 第一步 拍摄吧唧
// 摄像头调用逻辑见 camera.js（独立封装，便于后续替换为原生 Camera SDK）。

(function () {
  const screen = document.querySelector('.role-add-screen');
  const backBtn = document.getElementById('roleAddBackBtn');
  const cameraFrame = document.getElementById('cameraFrame');
  const captureBtn = document.getElementById('roleAddCaptureBtn');
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  const placeholder = document.getElementById('cameraPlaceholder');
  const placeholderText = document.getElementById('cameraPlaceholderText');
  const subtitleCapture = document.getElementById('roleAddSubtitleCapture');
  const subtitlePreview = document.getElementById('roleAddSubtitlePreview');
  const preview = document.getElementById('roleAddPreview');
  const previewImg = document.getElementById('roleAddPreviewImg');
  const previewActions = document.getElementById('roleAddPreviewActions');
  const continueBtn = document.getElementById('roleAddContinueBtn');
  const retakeBtn = document.getElementById('roleAddRetakeBtn');

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

  // ---------- 拍摄：取景框未就绪时不响应，拍摄后延时 1 秒展示预览 ----------
  captureBtn.addEventListener('click', () => {
    if (video.classList.contains('is-hidden') || captureBtn.disabled) return;
    const photo = window.PinVerseCamera.capture(video, canvas);
    captureBtn.disabled = true;
    setTimeout(() => showPreview(photo), 1000);
  });

  function showPreview(photo) {
    previewImg.src = photo;
    cameraFrame.classList.add('is-hidden');
    captureBtn.classList.add('is-hidden');
    subtitleCapture.classList.add('is-hidden');
    preview.classList.remove('is-hidden');
    previewActions.classList.remove('is-hidden');
    subtitlePreview.classList.remove('is-hidden');
    captureBtn.disabled = false;
  }

  // ---------- 重拍：回到取景状态，重新拍摄 ----------
  function showCamera() {
    preview.classList.add('is-hidden');
    previewActions.classList.add('is-hidden');
    subtitlePreview.classList.add('is-hidden');
    cameraFrame.classList.remove('is-hidden');
    captureBtn.classList.remove('is-hidden');
    subtitleCapture.classList.remove('is-hidden');
  }

  retakeBtn.addEventListener('click', showCamera);
  continueBtn.addEventListener('click', goBack);

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      screen.classList.remove('is-leaving');
      initCamera();
    }
  });

  initCamera();
})();
