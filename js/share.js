const API_BASE = (window.API_ORIGIN || '') + '/api';

async function captureSnapshot(glbUrl) {
  if (!glbUrl) return null;
  const viewer = document.createElement('model-viewer');
  viewer.crossOrigin = 'anonymous';
  viewer.src = glbUrl;
  viewer.setAttribute(
    'environment-image',
    'https://modelviewer.dev/shared-assets/environments/neutral.hdr'
  );
  viewer.style.position = 'fixed';
  viewer.style.left = '-10000px';
  viewer.style.width = '300px';
  viewer.style.height = '300px';
  document.body.appendChild(viewer);
  try {
    await viewer.updateComplete;
    return await viewer.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to capture snapshot', err);
    return null;
  } finally {
    viewer.remove();
  }
}

async function shareOn(network) {
  const shareLink = 'https://print2.io';
  const url = encodeURIComponent(shareLink);
  const text = encodeURIComponent('Check out print3!');
  let shareUrl = '';
  switch (network) {
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
      break;
    case 'reddit':
      shareUrl = `https://www.reddit.com/submit?url=${url}&title=${text}`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/shareArticle?url=${url}&title=${text}`;
      break;
    case 'tiktok':
      shareUrl = `https://www.tiktok.com/upload?url=${url}`;
      break;
    case 'instagram':
      shareUrl = `https://www.instagram.com/?url=${url}`;
      break;
  }
  if (typeof fetch === 'function') {
    try {
      const shareId =
        typeof localStorage !== 'undefined' ? localStorage.getItem('shareId') : null;
      await fetch(`${API_BASE}/track/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, network }),
      });
    } catch (err) {
      console.error('Failed to track share', err);
    }
  }
  const modelUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('print3Model') : null;
  if (navigator.share && modelUrl) {
    try {
      const dataUrl = await captureSnapshot(modelUrl);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'model.png', { type: 'image/png' });
      await navigator.share({
        title: 'print3 model',
        text: 'Check out print3!',
        url: shareLink,
        files: [file],
      });
      return;
    } catch (err) {
      console.error('Web share failed', err);
    }
  }
  window.open(shareUrl, '_blank', 'noopener');
}

if (typeof module !== 'undefined') {
  module.exports = { shareOn };
}
export { shareOn };
