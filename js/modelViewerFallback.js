const MODEL_SRC = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
const ENV_SRC =
  "https://modelviewer.dev/shared-assets/environments/neutral.hdr";

function ensureModelViewerLoaded() {
  if (window.customElements?.get("model-viewer")) {
    return Promise.resolve();
  }
  const cdnUrl =
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js";
  const localUrl = "js/model-viewer.min.js";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.type = "module";
      s.src = src;
      s.onload = () => {
        if (window.customElements?.whenDefined) {
          window.customElements.whenDefined("model-viewer").then(resolve);
        } else {
          resolve();
        }
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  return loadScript(cdnUrl).catch(() => loadScript(localUrl));
}

window.addEventListener?.("DOMContentLoaded", async () => {
  const el = document.querySelector('[data-testid="viewer"]');
  await ensureModelViewerLoaded();
  if (el) el.setAttribute("src", MODEL_SRC);
  el?.setAttribute("environment-image", ENV_SRC);
});

export { MODEL_SRC, ENV_SRC, ensureModelViewerLoaded };
