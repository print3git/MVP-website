var MODEL_SRC = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
var ENV_SRC = "https://modelviewer.dev/shared-assets/environments/neutral.hdr";

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

document.addEventListener?.("DOMContentLoaded", async () => {
  const elements = document.querySelectorAll("model-viewer");
  await ensureModelViewerLoaded();
  elements.forEach((el) => {
    if (!el.hasAttribute("src")) {
      el.setAttribute("src", MODEL_SRC);
    }
    if (!el.hasAttribute("environment-image")) {
      el.setAttribute("environment-image", ENV_SRC);
    }
  });
});

export { MODEL_SRC, ENV_SRC, ensureModelViewerLoaded };
