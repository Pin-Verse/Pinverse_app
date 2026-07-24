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

  // 将当前取景帧绘制到指定 canvas，返回拍摄结果的 data URL。
  // 传入 frameEl 时，按取景圆环区域裁切为圆形 PNG（四角透明）；
  // 不传则回退为全画面 JPEG。
  function capture(videoEl, canvasEl, frameEl) {
    const ctx = canvasEl.getContext('2d');

    if (!frameEl) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      return canvasEl.toDataURL('image/jpeg', 0.92);
    }

    // --- 圆环裁切模式 ---
    const videoW = videoEl.videoWidth;
    const videoH = videoEl.videoHeight;
    const frameRect = frameEl.getBoundingClientRect();
    const frameW = frameRect.width;
    const frameH = frameRect.height;

    // 圆环在取景框中的位置（与 CSS 保持一致）
    const ringRadius = 65; // px，ring 元素 130/2
    const ringCenterX = frameW * 0.5;
    const ringCenterY = frameH * 0.53;

    // object-fit: cover → 视频坐标映射
    const scale = Math.max(frameW / videoW, frameH / videoH);
    const offsetX = (videoW * scale - frameW) / 2;
    const offsetY = (videoH * scale - frameH) / 2;

    // 圆环外接正方形在视频像素中的区域
    const cropX = (ringCenterX - ringRadius + offsetX) / scale;
    const cropY = (ringCenterY - ringRadius + offsetY) / scale;
    const cropSize = (ringRadius * 2) / scale;

    const outSize = Math.round(cropSize);
    canvasEl.width = outSize;
    canvasEl.height = outSize;

    ctx.drawImage(videoEl, cropX, cropY, cropSize, cropSize, 0, 0, outSize, outSize);

    // 圆形裁切：保留圆内像素，圆外透明
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    return canvasEl.toDataURL('image/png');
  }

  return { start, stop, capture };
})();
