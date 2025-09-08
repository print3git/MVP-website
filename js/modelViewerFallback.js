var MODEL_SRC = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
var ENV_SRC = "https://modelviewer.dev/shared-assets/environments/neutral.hdr";

function ensureModelViewerLoaded() {
  if (window.customElements?.get("model-viewer")) {
    return Promise.resolve();
  }
  const cdnUrl =
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js";
  const localUrl = "js/model-viewer.min.js";

  return new Promise((resolve, reject) => {
    const finalize = () => {
      if (window.customElements?.get("model-viewer")) {
        resolve();
      } else {
        reject(new Error("model-viewer failed to load"));
      }
    };

    const s = document.createElement("script");
    s.type = "module";
    s.src = cdnUrl;
    let timer;
    s.onload = () => {
      clearTimeout(timer);
      finalize();
    };
    s.onerror = () => {
      clearTimeout(timer);
      s.remove?.();
      s.parentNode?.removeChild(s);
      const fallback = document.createElement("script");
      fallback.type = "module";
      fallback.src = localUrl;
      fallback.onload = finalize;
      fallback.onerror = () => reject(new Error("model-viewer failed to load"));
      document.head.appendChild(fallback);
    };
    document.head.appendChild(s);
    timer = setTimeout(() => {
      if (!window.customElements?.get("model-viewer")) {
        s.onerror();
      }
    }, 3000);
  });
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
