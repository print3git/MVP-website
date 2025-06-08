function blockScrollForModelViewer() {
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length !== 1) return;
      const el = e.target.closest('model-viewer');
      if (el) e.preventDefault();
    },
    { passive: false }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', blockScrollForModelViewer);
} else {
  blockScrollForModelViewer();
}
