function applyTouchFix() {
  document
    .querySelectorAll('model-viewer')
    .forEach((el) => (el.style.touchAction = 'none'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyTouchFix);
} else {
  applyTouchFix();
}
