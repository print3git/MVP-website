(function () {
  function enterFullscreen() {
    const el = document.documentElement;
    const request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;
    if (request) request.call(el);
  }

  const events = ['click', 'dblclick', 'mousedown', 'mouseup', 'touchstart', 'keydown'];
  function handleGesture() {
    enterFullscreen();
    events.forEach((e) => document.removeEventListener(e, handleGesture));
  }

  events.forEach((e) => document.addEventListener(e, handleGesture));
})();
