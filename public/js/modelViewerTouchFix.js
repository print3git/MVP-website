function blockScrollForModelViewer() {

  function preventScroll(e) {
    if (e.touches.length !== 1) return;
    const el = e.target.closest('model-viewer');
    if (el) e.preventDefault();
  }

  document.addEventListener('touchstart', preventScroll, {passive: false});
  document.addEventListener('touchmove', preventScroll, {passive: false});

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', blockScrollForModelViewer);
} else {
  blockScrollForModelViewer();
}
