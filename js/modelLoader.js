var DEFAULT_SRC =
  globalThis.DEFAULT_SRC ||
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
globalThis.DEFAULT_SRC = DEFAULT_SRC;

/**
 * Updates the src attribute on a model-viewer element.
 *
 * @param {string} [url] - Optional glb URL. Falls back to DEFAULT_SRC when falsy.
 * @param {HTMLElement} [viewer] - Optional <model-viewer> element.
 */
function setModelSrc(url, viewer) {
  const el = viewer || document.querySelector("model-viewer");
  if (!el) return;
  el.setAttribute("src", url || DEFAULT_SRC);
}

document.addEventListener("DOMContentLoaded", () => {
  setModelSrc();
});

export { DEFAULT_SRC, setModelSrc };
