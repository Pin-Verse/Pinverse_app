// PinVerse · 摄像头 SDK 封装
// 目前基于浏览器 getUserMedia 实现取景 / 拍照。
// 后续如需接入原生 Camera SDK，只需替换本文件内部实现，
// 调用方（role-add.js）只依赖 start / stop / capture 三个接口，无需改动。

window.PinVerseCamera = (function () {
  let stream = null;

  async function start(videoEl, options) {
    options = options || {};
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('camera-unsupported');
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: options.facingMode || 'environment' },
      audio: false,
    });
    videoEl.srcObject = stream;
    await videoEl.play();
  }

  function stop() {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  // 将当前取景帧绘制到指定 canvas，返回拍摄结果的 data URL
  function capture(videoEl, canvasEl) {
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    canvasEl.getContext('2d').drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    return canvasEl.toDataURL('image/jpeg', 0.92);
  }

  return { start, stop, capture };
})();
