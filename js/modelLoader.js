const DEFAULT_SRC = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

export function setModelSrc(url = DEFAULT_SRC) {
  const viewer = document.querySelector('[data-testid="model-viewer"]');
  if (viewer) {
    viewer.src = url || DEFAULT_SRC;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setModelSrc();
});
