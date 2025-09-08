const DEFAULT_SRC = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

function setModelSrc(viewer, url) {
  if (!viewer) return;
  viewer.setAttribute("src", url || DEFAULT_SRC);
}

document.addEventListener("DOMContentLoaded", () => {
  const viewer = document.querySelector('[data-testid="model-viewer"]');
  setModelSrc(viewer);
});

export { DEFAULT_SRC, setModelSrc };
