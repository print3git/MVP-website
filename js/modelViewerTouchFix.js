function applyTouchFix() {
  function setTouchNone(el) {
    el.style.touchAction = "none";
  }

  document.querySelectorAll("model-viewer").forEach(setTouchNone);

  const observer = new MutationObserver((records) => {
    for (const rec of records) {
      for (const node of rec.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === "MODEL-VIEWER") setTouchNone(node);
        node.querySelectorAll?.("model-viewer").forEach(setTouchNone);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let active = false;

  function start(e) {
    if (e.touches.length === 1 && e.target.closest("model-viewer")) {
      active = true;
      e.preventDefault();
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

  document.addEventListener("touchstart", start, { passive: false });
  document.addEventListener("touchmove", move, { passive: false });
  document.addEventListener("touchend", end, { passive: true });
  document.addEventListener("touchcancel", end, { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyTouchFix);
} else {
  applyTouchFix();
}
