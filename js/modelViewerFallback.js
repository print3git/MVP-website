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
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  return loadScript(cdnUrl).catch(() => loadScript(localUrl));
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await ensureModelViewerLoaded();
    document.querySelectorAll("model-viewer").forEach((el) => {
      el.src = MODEL_SRC;
      if (!el.getAttribute("environment-image")) {
        el.setAttribute("environment-image", ENV_SRC);
      }
    });
  } catch (err) {
    console.error("model-viewer still unavailable", err);
  }
});
