'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('exit-discount-overlay');
  const closeBtn = document.getElementById('exit-discount-close');
  if (!overlay || !closeBtn) return;

  closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));

  let ready = false;
  let shown = false;
  setTimeout(() => {
    ready = true;
  }, 3000);

  function maybeShow(e) {
    if (!ready || shown) return;
    if (e.clientY <= 0 && !e.relatedTarget) {
      overlay.classList.remove('hidden');
      shown = true;
    }
  }

  document.addEventListener('mouseout', maybeShow);
});
