(function () {
  if (window.__modelReadyHookInstalled) return;
  window.__modelReadyHookInstalled = true;
  window.__modelsLoaded = window.__modelsLoaded || {};
  window.markModelLoaded = function (key = "default") {
    window.__modelsLoaded[key] = Date.now();
    window.dispatchEvent(new CustomEvent("model-loaded", { detail: { key } }));
  };
})();
