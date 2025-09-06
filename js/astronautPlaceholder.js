const DEFAULT_SRC = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

async function loadPlaceholder() {
  const viewer = document.querySelector('[data-testid="model-viewer"]');
  if (!viewer) return;
  const src = viewer.getAttribute("data-model-src") || DEFAULT_SRC;

  if (window.customElements?.whenDefined) {
    try { await customElements.whenDefined("model-viewer"); } catch {}
  }
  viewer.src = src;
}
document.addEventListener("DOMContentLoaded", loadPlaceholder);
