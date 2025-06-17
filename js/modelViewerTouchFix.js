function applyTouchFix() {
  document.querySelectorAll('model-viewer').forEach((el) => (el.style.touchAction = 'none'));

  let active = false;

  function start(e) {
    if (e.touches.length === 1 && e.target.closest('model-viewer')) {
      active = true;
    }
  }

  function move(e) {
    if (active && e.touches.length === 1) {
      e.preventDefault();
    }
  }

  function end() {
    active = false;
  }

  document.addEventListener('touchstart', start, { passive: true });
  document.addEventListener('touchmove', move, { passive: false });
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', end, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyTouchFix);
} else {
  applyTouchFix();
}
