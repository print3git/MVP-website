export async function captureSnapshots(container) {
  const cards = container.querySelectorAll('[data-model]');
  for (const card of cards) {
    const img = card.querySelector('img');
    if (img && img.src) continue;
    const glbUrl = card.dataset.model;
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
      img.src = await viewer.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to capture snapshot', err);
    } finally {
      viewer.remove();
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = { captureSnapshots };
}
