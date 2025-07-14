"use strict";
import { shareOn } from "./share.js";

const API_BASE = (window.API_ORIGIN || "") + "/api";
const TZ = "America/New_York";
// Local fallback model used when generation fails or the viewer hasn't loaded a model yet.
const FALLBACK_GLB_LOW = "models/bag.glb";
const FALLBACK_GLB_HIGH = FALLBACK_GLB_LOW;
const FALLBACK_GLB = FALLBACK_GLB_LOW;
const LOW_POLY_GLB = FALLBACK_GLB_LOW;

// Save referrer ID from query string for later checkout discount
(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("referrerId", ref);
      fetch(`${API_BASE}/referral-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: ref }),
      }).catch(() => {});
    }
  } catch {
    /* ignore errors */
  }
})();

// Ensure session ID exists for attribution
(() => {
  try {
    let sessionId = localStorage.getItem("adSessionId");
    if (!sessionId) {
      sessionId =
        typeof crypto?.randomUUID === "function"
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      localStorage.setItem("adSessionId", sessionId);
    }
    const subreddit = localStorage.getItem("adSubreddit");
    fetch(`${API_BASE}/track/page`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        subreddit,
        utmSource: localStorage.getItem("utm_source") || undefined,
        utmMedium: localStorage.getItem("utm_medium") || undefined,
        utmCampaign: localStorage.getItem("utm_campaign") || undefined,
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
})();

// Capture UTM parameters on first visit
(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign"].forEach((p) => {
      const val = params.get(p);
      if (val && !localStorage.getItem(p)) {
        localStorage.setItem(p, val);
      }
    });
  } catch {
    /* ignore */
  }
})();

// Record ad click when arriving via ?sr= subreddit param
(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const sr = params.get("sr");
    if (sr) {
      let sessionId = localStorage.getItem("adSessionId");
      if (!sessionId) {
        sessionId =
          typeof crypto?.randomUUID === "function"
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2);
        localStorage.setItem("adSessionId", sessionId);
      }
      localStorage.setItem("adSubreddit", sr);
      fetch(`${API_BASE}/track/ad-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subreddit: sr, sessionId }),
      }).catch(() => {});
    }
  } catch {
    /* ignore errors */
  }
})();

function resetMaterialSelection() {
  try {
    if (!localStorage.getItem("print3Material")) {
      localStorage.setItem("print3Material", "multi");
    }
  } catch {
    /* ignore quota errors */
  }
}

resetMaterialSelection();

/**
 * Load the <model-viewer> library if it hasn't already been loaded.
 * Returns a promise that resolves once the custom element is defined.
 *
 * The CDN script occasionally fails to load in some environments. To make the
 * viewer more robust, fall back to a local copy bundled under js/ if the
 * network request errors out.
 */
function ensureModelViewerLoaded() {
  if (window.customElements?.get("model-viewer")) {
    return Promise.resolve();
  }
  if (
    typeof navigator !== "undefined" &&
    (navigator.userAgent?.includes("Node.js") ||
      navigator.userAgent?.includes("jsdom"))
  ) {
    return Promise.resolve();
  }

  const cdnUrl =
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js";
  const localUrl = "js/model-viewer.min.js";

  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = cdnUrl;
    s.onload = () => {
      window.modelViewerSource = "cdn";
      resolve();
    };
    s.onerror = () => {
      s.remove();
      window.modelViewerSource = "local";
      const fallback = document.createElement("script");
      fallback.type = "module";
      fallback.src = localUrl;
      fallback.onload = resolve;
      fallback.onerror = resolve;
      document.head.appendChild(fallback);
    };
    document.head.appendChild(s);
  });

  return new Promise((resolve, reject) => {
    const finalize = (attemptedLocal) => {
      if (window.customElements?.get("model-viewer")) {
        resolve();
      } else if (!attemptedLocal) {
        window.modelViewerSource = "local";
        loadScript(localUrl, () => finalize(true));
      } else {
        reject(new Error("model-viewer failed to load"));
      }
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    fetch(cdnUrl, {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal,
    })
      .then(() => {
        clearTimeout(timer);
        window.modelViewerSource = "cdn";
        loadScript(cdnUrl, () => finalize(false));
      })
      .catch(() => {
        clearTimeout(timer);
        window.modelViewerSource = "local";
        loadScript(localUrl, () => finalize(true));
      });
  });
}

if (
  localStorage.getItem("hasGenerated") === "true" ||
  localStorage.getItem("demoDismissed") === "true"
) {
  document.documentElement.classList.add("has-generated");
}

const EXAMPLES = [
  "cute robot figurine",
  "ornate chess piece",
  "geometric flower vase",
];
const TRENDING = ["dragon statue", "space rover", "anime character"];
const THEME_CAMPAIGNS = [
  { name: "Sci-fi Month", tagline: "Explore out-of-this-world designs!" },
  { name: "D&D Drop", tagline: "Epic minis all month long!" },
  { name: "Fantasy February", tagline: "Dragons and castles galore!" },
];
const PRINTS_MIN = 30;
const PRINTS_MAX = 50;
const UINT32_MAX = 0xffffffff;

function showThemeBanner() {
  const banner = document.getElementById("theme-banner");
  if (!banner) return;
  const idx = new Date().getMonth() % THEME_CAMPAIGNS.length;
  const theme = THEME_CAMPAIGNS[idx];
  banner.textContent = `${theme.name} – ${theme.tagline}`;
  banner.hidden = false;
}

async function computeDailyPrintsSold(date = new Date()) {
  const eastern = new Date(date.toLocaleString("en-US", { timeZone: TZ }));
  const dateStr = eastern.toISOString().slice(0, 10);
  const data = new TextEncoder().encode(dateStr);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const int = new DataView(hash).getUint32(0);
  const rand = int / UINT32_MAX;
  return Math.floor(rand * (PRINTS_MAX - PRINTS_MIN + 1)) + PRINTS_MIN;
}
const $ = (id) => document.getElementById(id);
const refs = {
  previewImg: $("preview-img"),
  loader: $("loader"),
  viewer: $("viewer"),
  progressBar: $("progress-bar"),
  progressWrapper: $("progress-wrapper"),
  progressText: $("progress-text"),
  demoNote: $("demo-note"),
  demoClose: $("demo-note-close"),
  promptInput: $("promptInput"),
  promptWrapper: $("prompt-wrapper"),
  submitBtn: $("submit-button"),
  submitIcon: $("submit-icon"),
  uploadInput: $("uploadInput"),
  imagePreviewArea: $("image-preview-area"),
  dropZone: $("drop-zone"),
  examples: $("prompt-examples"),
  trending: $("trending-prompts"),
  checkoutBtn: $("checkout-button"),
  buyNowBtn: $("buy-now-button"),
  addBasketBtn: $("add-basket-button"),
  stepPrompt: $("step-prompt"),
  stepModel: $("step-model"),
  stepBuy: $("step-buy"),
};

function setStep(name) {
  const map = {
    prompt: refs.stepPrompt,
    model: refs.stepModel,
    buy: refs.stepBuy,
  };
  Object.entries(map).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("font-semibold", key === name);
    el.classList.toggle("text-gray-400", key !== name);
  });
}

window.shareOn = shareOn;
let uploadedFiles = [];
let previewUrls = [];
let lastJobId = null;

let savedProfile = null;
let userProfile = null;

// Track when the prompt or images have been modified after a generation
let editsPending = false;

let progressInterval = null;
let progressStart = null;
let usingViewerProgress = false;
let lastSnapshot = null;
let errorFadeTimeout = null;
let errorClearTimeout = null;

function getCycleKey() {
  const now = new Date();
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
  });
  const dateStr = dateFmt.format(now);
  const hour = parseInt(hourFmt.format(now), 10);
  if (hour < 1) {
    const prev = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return dateFmt.format(prev);
  }
  return dateStr;
}

function resetPurchaseCount() {
  const key = getCycleKey();
  if (localStorage.getItem("slotCycle") !== key) {
    localStorage.setItem("slotCycle", key);
    localStorage.setItem("slotPurchases", "0");
  }
}

function getPurchaseCount() {
  resetPurchaseCount();
  const n = parseInt(localStorage.getItem("slotPurchases"), 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function adjustedSlots(base) {
  const n = getPurchaseCount();
  return Math.max(0, base - n);
}

function computeSlotsByTime() {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    hour: "numeric",
  });
  const hour = parseInt(dtf.format(new Date()), 10);
  if (hour >= 1 && hour < 4) return 9;
  if (hour >= 4 && hour < 7) return 8;
  if (hour >= 7 && hour < 10) return 7;
  if (hour >= 10 && hour < 13) return 6;
  if (hour >= 13 && hour < 16) return 5;
  if (hour >= 16 && hour < 19) return 4;
  if (hour >= 19 && hour < 22) return 3;
  if (hour >= 22 && hour < 24) return 2;
  return 1;
}

function computePrintRunHours() {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    hour: "numeric",
  });
  const hour = parseInt(dtf.format(new Date()), 10);
  const remain = 6 - (hour % 6);
  return remain === 0 ? 6 : remain;
}

async function updatePrintRunInfo() {
  const hoursEl = document.getElementById("print-run-hours");
  const hoursLabelEl = document.getElementById("print-run-hours-label");
  const slotsEl = document.getElementById("print-run-slots");
  const info = document.getElementById("print-run-info");
  if (!hoursEl && !slotsEl) return;
  let baseSlots = computeSlotsByTime();
  try {
    const resp = await fetch(`${API_BASE}/print-slots`);
    if (resp.ok) {
      const data = await resp.json();
      if (typeof data.slots === "number") {
        baseSlots = data.slots;
      }
    }
  } catch {
    /* ignore */
  }
  const hours = computePrintRunHours();
  hoursEl.textContent = hours;
  if (hoursLabelEl) hoursLabelEl.textContent = hours === 1 ? "hour" : "hours";
  if (slotsEl) slotsEl.textContent = `${adjustedSlots(baseSlots)}`;

  if (info) info.classList.remove("invisible");
  if (typeof window.positionQuote === "function") {
    requestAnimationFrame(() => window.positionQuote());
  }
}

async function updateWizardSlotCount() {
  if (!window.setWizardSlotCount) return;
  let baseSlots = computeSlotsByTime();
  try {
    const resp = await fetch(`${API_BASE}/print-slots`);
    if (resp.ok) {
      const data = await resp.json();
      if (typeof data.slots === "number") {
        baseSlots = data.slots;
      }
    }
  } catch {
    // ignore errors
  }
  window.setWizardSlotCount(adjustedSlots(baseSlots));
}

async function fetchInitData() {
  try {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/init-data`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCampaign() {
  try {
    const res = await fetch(`${API_BASE}/campaign`);
    if (!res.ok) return;
    const data = await res.json();
    const banner = document.getElementById("theme-banner");
    if (banner && data.theme) {
      banner.textContent = data.theme;
      banner.classList.remove("hidden");
    }
  } catch {
    /* ignore errors */
  }
}

function updateWizardFromInputs() {
  if (!window.setWizardStage) return;
  window.setWizardStage("prompt");
}

async function captureModelSnapshot(url) {
  if (!url) return null;
  async function attempt(glb) {
    const viewer = document.createElement("model-viewer");
    viewer.crossOrigin = "anonymous";
    viewer.src = glb;
    viewer.setAttribute(
      "environment-image",
      "https://modelviewer.dev/shared-assets/environments/neutral.hdr",
    );
    viewer.style.position = "fixed";
    viewer.style.left = "-10000px";
    viewer.style.width = "300px";
    viewer.style.height = "300px";
    document.body.appendChild(viewer);
    try {
      await viewer.updateComplete;
      return await viewer.toDataURL("image/png");
    } catch (err) {
      console.error("Failed to capture snapshot", err);
      return null;
    } finally {
      viewer.remove();
    }
  }

  let result = await attempt(url);
  if (!result && url !== FALLBACK_GLB) {
    result = await attempt(FALLBACK_GLB);
  }
  return result;
}

function startProgress(estimateMs = 20000) {
  if (!refs.progressWrapper) return;
  progressStart = Date.now();
  usingViewerProgress = false;
  refs.progressBar.style.width = "0%";
  refs.progressWrapper.style.display = "block";
  const tick = () => {
    if (usingViewerProgress) return;
    const elapsed = Date.now() - progressStart;
    const pct = Math.min((elapsed / estimateMs) * 100, 99);
    refs.progressBar.style.width = pct + "%";
    const remaining = Math.max(estimateMs - elapsed, 0);
    refs.progressText.textContent = `~${Math.ceil(remaining / 1000)}s remaining`;
  };
  tick();
  clearInterval(progressInterval);
  progressInterval = setInterval(tick, 500);
}

function stopProgress() {
  if (!refs.progressWrapper) return;
  clearInterval(progressInterval);
  usingViewerProgress = false;
  refs.progressBar.style.width = "100%";
  refs.progressText.textContent = "";
  setTimeout(() => {
    refs.progressWrapper.style.display = "none";
  }, 300);
}

const hideAll = () => {
  refs.previewImg.style.display = "none";
  refs.loader.style.display = "none";

  refs.viewer.style.opacity = "0";
  refs.viewer.style.pointerEvents = "none";
  if (typeof refs.viewer.pause === "function") {
    refs.viewer.pause();
  }
  if (globalThis.document) {
    delete document.body.dataset.viewerReady;
  }
};
const showLoader = (withProgress = true) => {
  // Keep the viewer visible while showing the loader so the fallback model
  // remains on screen during generation and on failures.
  refs.previewImg.style.display = "none";
  refs.loader.style.display = "flex";
  refs.viewer.style.display = "block";
  refs.viewer.style.opacity = "1";
  refs.viewer.style.pointerEvents = "auto";
  if (typeof refs.viewer.play === "function") {
    refs.viewer.play();
  }
  if (withProgress) startProgress();
};
const showModel = () => {
  hideAll();
  refs.viewer.style.display = "block";

  refs.viewer.style.opacity = "1";
  refs.viewer.style.pointerEvents = "auto";
  if (typeof refs.viewer.play === "function") {
    refs.viewer.play();
  }

  if (globalThis.document) {
    document.body.dataset.viewerReady = "true";
  }

  stopProgress();
  // Force a render in case Safari paused the canvas while hidden
  if (typeof refs.viewer.requestUpdate === "function") {
    refs.viewer.requestUpdate();
  }
};
const hideDemo = () => {
  refs.demoNote && (refs.demoNote.style.display = "none");
  document.documentElement.classList.add("has-generated");
};

async function fetchProfile() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      userProfile = await res.json();
    }
  } catch (err) {
    console.error("Failed to load profile", err);
  }
}

async function buyNow() {
  if (!userProfile) return;
  if (window.setWizardStage) window.setWizardStage("purchase");
  const jobId = localStorage.getItem("print3JobId");
  const res = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId,
      price: 2000,
      qty: 1,
      shippingInfo: userProfile.shipping_info,
      productType: "single",
    }),
  });
  const data = await res.json();
  window.location.href = data.checkoutUrl;
}

function showError(msg) {
  const el = document.getElementById("gen-error");
  if (!el) return;
  if (errorFadeTimeout) clearTimeout(errorFadeTimeout);
  if (errorClearTimeout) clearTimeout(errorClearTimeout);
  el.textContent = msg;
  if (!msg) {
    el.style.opacity = 0;
    return;
  }
  el.style.opacity = 1;
  el.style.transition = "";
  if (
    typeof window !== "undefined" &&
    typeof window.positionQuote === "function"
  ) {
    requestAnimationFrame(() => window.positionQuote());
  }
  errorFadeTimeout = setTimeout(() => {
    el.style.transition = "opacity 2s";
    el.style.opacity = 0;
    errorClearTimeout = setTimeout(() => {
      el.textContent = "";
      el.style.transition = "";
    }, 2000);
  }, 10000);
}

function validatePrompt(p) {
  const txt = p ? p.trim() : "";
  if (!txt && uploadedFiles.length === 0) {
    showError("Enter a prompt or upload image");
    refs.promptWrapper.classList.add("border-red-500");
    return false;
  }
  if (txt && txt.length < 5) {
    showError("Prompt must be at least 5 characters");
    refs.promptWrapper.classList.add("border-red-500");
    return false;
  }
  if (txt && /\n/.test(txt)) {
    showError("Prompt cannot contain line breaks");
    refs.promptWrapper.classList.add("border-red-500");
    return false;
  }
  if (txt && /[<>]/.test(txt)) {
    showError("Prompt contains invalid characters");
    refs.promptWrapper.classList.add("border-red-500");
    return false;
  }
  if (txt && txt.length > 200) {
    showError("Prompt must be under 200 characters");
    refs.promptWrapper.classList.add("border-red-500");
    return false;
  }
  return true;
}

refs.demoClose?.addEventListener("click", () => {
  hideDemo();
  localStorage.setItem("demoDismissed", "true");
});

refs.promptInput.addEventListener("input", () => {
  const el = refs.promptInput;
  el.style.height = "auto";
  const lh = parseFloat(getComputedStyle(el).lineHeight);
  // Limit visible lines to 4 then enable scrolling
  const maxLines = 4;
  el.style.height = Math.min(el.scrollHeight, lh * maxLines) + "px";
  el.style.overflowY = el.scrollHeight > lh * maxLines ? "auto" : "hidden";
  const errEl = document.getElementById("gen-error");
  if (errEl) {
    errEl.textContent = "";
    errEl.style.opacity = 0;
  }
  if (errorFadeTimeout) clearTimeout(errorFadeTimeout);
  if (errorClearTimeout) clearTimeout(errorClearTimeout);
  refs.promptWrapper.classList.remove("border-red-500");
  editsPending = true;
  refs.buyNowBtn?.classList.add("hidden");
  setStep("prompt");
  updateWizardFromInputs();
});

refs.promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    refs.submitBtn.click();
  }
});

function syncUploadHeights() {
  if (!refs.dropZone || !refs.imagePreviewArea) return;
  const h = refs.dropZone.getBoundingClientRect().height;
  // Keep preview thumbnails square and aligned with the drop zone
  // height while allowing the drop zone itself to size naturally via CSS.
  refs.imagePreviewArea.style.height = h + "px";
  refs.imagePreviewArea.style.width = h + "px";
}

function renderThumbnails(arr) {
  refs.imagePreviewArea.innerHTML = "";
  if (!arr.length) {
    refs.imagePreviewArea.classList.add("hidden");
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    previewUrls = [];
    syncUploadHeights();
    return;
  }
  refs.imagePreviewArea.classList.remove("hidden");
  arr.forEach((url, i) => {
    const wrap = document.createElement("div");
    // Make the wrapper fill the preview container so images and
    // buttons are sized relative to it rather than their natural
    // dimensions. This avoids oversized previews in Safari on iPad.
    wrap.className = "thumbnail-wrapper relative w-full h-full overflow-hidden";
    const img = document.createElement("img");
    img.src = url;
    img.className = "w-full h-full rounded-md shadow-md";
    wrap.appendChild(img);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = '<i class="fas fa-times"></i>';
    // Position the remove button fully inside the preview box so it
    // isn't clipped when the container has overflow-hidden.
    // Keep the remove button inside the rounded corner so it isn't
    // clipped by overflow hidden on the preview box.
    btn.className =
      "absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-black border border-black flex items-center justify-center z-20";
    btn.onclick = () => {
      const [removed] = arr.splice(i, 1);
      uploadedFiles.splice(i, 1);
      if (arr === previewUrls) {
        URL.revokeObjectURL(removed);
        previewUrls = [...arr];
      }
      try {
        localStorage.setItem("print3Images", JSON.stringify(arr));
      } catch {
        /* ignore storage errors */
      }
      renderThumbnails(arr);
      updateWizardFromInputs();
    };
    wrap.appendChild(btn);
    refs.imagePreviewArea.appendChild(wrap);
  });
  syncUploadHeights();
}

function getThumbnail(file) {
  return new Promise((res) => {
    const R = new FileReader();
    R.onload = () => {
      const im = new Image();
      im.onload = () => {
        const size = 200;
        const c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#2A2A2E";
        ctx.fillRect(0, 0, size, size);
        let sx = 0,
          sy = 0,
          sw = im.width,
          sh = im.height;
        if (im.width > im.height) {
          sx = (im.width - im.height) / 2;
          sw = im.height;
        } else if (im.height > im.width) {
          sy = (im.height - im.width) / 2;
          sh = im.width;
        }
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(im, sx, sy, sw, sh, 0, 0, size, size);
        res(c.toDataURL("image/jpeg", 0.7));
      };
      im.src = R.result;
    };
    im.src = url;
  });
}

async function processFiles(files) {
  if (!files.length) return;

  uploadedFiles = [...files];
  previewUrls.forEach((u) => URL.revokeObjectURL(u));
  previewUrls = uploadedFiles.map((f) => URL.createObjectURL(f));
  renderThumbnails(previewUrls);

  const schedule = window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb) => setTimeout(cb, 0);
  schedule(async () => {
    const thumbs = await Promise.all(uploadedFiles.map((f) => getThumbnail(f)));
    try {
      localStorage.setItem("print3Images", JSON.stringify(thumbs));
    } catch {
      /* ignore storage errors */
    }
  });
  editsPending = true;
  refs.buyNowBtn?.classList.add("hidden");
  setStep("prompt");
  updateWizardFromInputs();
}

refs.uploadInput.addEventListener("change", (e) => {
  processFiles([...e.target.files]);
});

if (refs.dropZone) {
  refs.dropZone.addEventListener("click", () => refs.uploadInput.click());
  ["dragover", "dragenter"].forEach((ev) => {
    refs.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      refs.dropZone.classList.add("ring-2", "ring-cyan-400");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    refs.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      refs.dropZone.classList.remove("ring-2", "ring-cyan-400");
      if (ev === "drop") {
        processFiles([...e.dataTransfer.files]);
      }
    });
  });
}

async function fetchGlb(prompt, files) {
  try {
    const fd = new FormData();
    if (prompt) fd.append("prompt", prompt);
    files.forEach((f) => fd.append("images", f));
    const r = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      body: fd,
    });
    if (!r.ok) throw new Error();
    const data = await r.json();
    lastJobId = data.jobId;
    return data.glb_url;
  } catch (err) {
    showError("Generation failed");

    return FALLBACK_GLB;
  }
}

refs.submitBtn.addEventListener("click", async () => {
  const prompt = refs.promptInput.value.trim();
  if (!validatePrompt(prompt)) {
    // Ensure icon resets if validation fails
    refs.submitIcon.classList.replace("fa-stop", "fa-arrow-up");
    return;
  }
  showError("");
  refs.promptWrapper.classList.remove("border-red-500");
  refs.buyNowBtn?.classList.add("hidden");
  refs.submitIcon.classList.replace("fa-arrow-up", "fa-stop");
  showLoader();
  if (window.setWizardStage) window.setWizardStage("building");

  try {
    localStorage.setItem("print3Prompt", prompt);
    localStorage.setItem("hasGenerated", "true");

    const url = await fetchGlb(prompt, uploadedFiles);
    localStorage.setItem("print3Model", url);
    localStorage.setItem("print3JobId", lastJobId);

    editsPending = false;

    refs.viewer.src = url;
    await refs.viewer.updateComplete;
    showModel();
    if (window.addAutoItem) {
      let snapshot = refs.previewImg?.src;
      if (
        !snapshot ||
        snapshot.includes("placehold.co") ||
        snapshot.includes("images.unsplash.com")
      ) {
        snapshot = await captureModelSnapshot(url);
      }
      lastSnapshot = snapshot;
      window.addAutoItem({ jobId: lastJobId, modelUrl: url, snapshot });
    } else {
      lastSnapshot = await captureModelSnapshot(url);
    }
    setStep("model");
    if (window.setWizardStage) window.setWizardStage("purchase");
    hideDemo();

    refs.checkoutBtn.classList.remove("hidden");
    if (userProfile) refs.buyNowBtn?.classList.remove("hidden");
  } finally {
    // Always return the button to the arrow state
    refs.submitIcon.classList.replace("fa-stop", "fa-arrow-up");
  }
});

async function init() {
  await ensureModelViewerLoaded();
  if (window.customElements?.whenDefined) {
    try {
      await customElements.whenDefined("model-viewer");
    } catch {}
  }
  syncUploadHeights();
  window.addEventListener("resize", syncUploadHeights);
  setStep("prompt");
  if (window.setWizardStage) window.setWizardStage("prompt");
  showLoader(false);
  fetchCampaign();
  const initData = await fetchInitData();
  if (initData) {
    if (window.setWizardSlotCount)
      window.setWizardSlotCount(adjustedSlots(initData.slots));
    if (initData.profile) {
      userProfile = initData.profile;
      if (refs.buyNowBtn) {
        refs.buyNowBtn.classList.remove("hidden");
        refs.buyNowBtn.addEventListener("click", buyNow);
      }
    }
    await updateStats(initData.stats);
    showThemeBanner();
    updatePrintRunInfo();
    setInterval(updatePrintRunInfo, 60000);
  } else {
    updateWizardSlotCount();
    fetchProfile().then(() => {
      if (userProfile && refs.buyNowBtn) {
        refs.buyNowBtn.classList.remove("hidden");
        refs.buyNowBtn.addEventListener("click", buyNow);
      }
    });
    await updateStats();
    showThemeBanner();
    updatePrintRunInfo();
    setInterval(updatePrintRunInfo, 60000);
  }
  const sr = new URLSearchParams(window.location.search).get("sr");
  if (!sr) {
    let hiStart = null;
    const handleLoad = () => {
      if (refs.viewer.src === LOW_POLY_GLB) {
        hiStart = performance.now();
        refs.viewer.src = FALLBACK_GLB;
      } else if (refs.viewer.src === FALLBACK_GLB && hiStart !== null) {
        const t = Math.round(performance.now() - hiStart);
        console.log("Model load time", t, "ms");
        localStorage.setItem("print3Model", FALLBACK_GLB);
        refs.viewer.removeEventListener("load", handleLoad);
      }
    };
    refs.viewer.addEventListener("load", handleLoad);
    refs.viewer.src = LOW_POLY_GLB;
    localStorage.removeItem("print3JobId");
    refs.viewer.addEventListener(
      "load",
      () => {
        const loader = document.createElement("model-viewer");
        loader.style.display = "none";
        loader.crossOrigin = "anonymous";
        loader.src = FALLBACK_GLB_HIGH;
        loader.addEventListener("load", () => {
          if (refs.viewer.src === FALLBACK_GLB_LOW) {
            refs.viewer.src = FALLBACK_GLB_HIGH;
          }
          loader.remove();
        });
        document.body.appendChild(loader);
      },
      { once: true },
    );
  }
  if (refs.viewer) {
    refs.viewer.addEventListener("progress", (e) => {
      if (!progressStart) progressStart = Date.now();
      usingViewerProgress = true;
      const pct = Math.round(e.detail.totalProgress * 100);
      refs.progressBar.style.width = pct + "%";
      const elapsed = Date.now() - progressStart;
      if (pct < 100) {
        const remaining = pct > 0 ? (elapsed * (100 - pct)) / pct : 0;
        refs.progressText.textContent = `~${Math.ceil(remaining / 1000)}s remaining`;
      } else {
        stopProgress();
      }
    });
    refs.viewer.addEventListener("load", showModel, { once: true });
    refs.viewer.addEventListener(
      "error",
      () => {
        refs.viewer.src = FALLBACK_GLB;
        showModel();
      },
      { once: true },
    );
    await refs.viewer.updateComplete;
    try {
      lastSnapshot = await captureModelSnapshot(refs.viewer.src);
    } catch {}
  }
  showModel();
  fetchProfile().then(() => {
    if (userProfile && refs.buyNowBtn) {
      refs.buyNowBtn.classList.remove("hidden");
      refs.buyNowBtn.addEventListener("click", buyNow);
    }
  });

  const prompt = localStorage.getItem("print3Prompt");
  const thumbs = JSON.parse(localStorage.getItem("print3Images") || "[]");

  const oldPlaceholders = [
    "Describe your 3D print request…",
    "Describe your idea or upload images…",
    "Desribe your 3D print request…",
    "Desribe your idea or upload images…",
  ];
  let usePlaceholder = true;
  if (prompt) {
    const isOld = oldPlaceholders.some((p) => prompt.startsWith(p));
    if (!isOld) {
      refs.promptInput.value = prompt;
      refs.promptInput.dispatchEvent(new Event("input"));
      usePlaceholder = false;
    } else {
      localStorage.removeItem("print3Prompt");
    }
  }
  if (usePlaceholder) {
    // Keep placeholder text consistent with index.html
    refs.promptInput.placeholder =
      "Text, image, or both — we\u2019ll 3D print it\u2026";
  }
  if (refs.examples) {
    refs.examples.textContent = `Try: ${EXAMPLES.join(" · ")}`;
  }
  if (thumbs.length) renderThumbnails(thumbs);

  if (refs.trending) {
    refs.trending.textContent = `Trending: ${TRENDING.join(" · ")}`;
  }
  if (refs.promptTip && !localStorage.getItem("promptTipDismissed")) {
    refs.promptInput.addEventListener(
      "focus",
      () => {
        refs.promptTip.style.display = "block";
      },
      { once: true },
    );
    refs.promptTipClose?.addEventListener("click", () => {
      refs.promptTip.style.display = "none";
      localStorage.setItem("promptTipDismissed", "true");
    });
  }

  // Ensure checkout uses the model currently shown in the viewer
  refs.checkoutBtn?.addEventListener("click", () => {
    if (refs.viewer?.src) {
      localStorage.setItem("print3Model", refs.viewer.src);
    }
    if (lastJobId) {
      localStorage.setItem("print3JobId", lastJobId);
    } else {
      localStorage.removeItem("print3JobId");
    }
    try {
      const items = [
        {
          modelUrl: refs.viewer.src,
          jobId: lastJobId || "",
          snapshot: lastSnapshot || "",
        },
      ];
      localStorage.setItem("print3CheckoutItems", JSON.stringify(items));
      localStorage.removeItem("print3Basket");
    } catch {}
    if (window.setWizardStage) window.setWizardStage("purchase");
  });

  refs.addBasketBtn?.addEventListener("click", async () => {
    if (!window.addToBasket || !refs.viewer?.src) return;
    let snapshot = refs.previewImg?.src;
    if (
      !snapshot ||
      snapshot.includes("placehold.co") ||
      snapshot.includes("images.unsplash.com")
    ) {
      snapshot = await captureModelSnapshot(refs.viewer.src);
    }
    lastSnapshot = snapshot;
    const item = { jobId: lastJobId, modelUrl: refs.viewer.src, snapshot };
    if (
      window.manualizeItem &&
      window
        .getBasket?.()
        .some((it) => it.auto && it.modelUrl === item.modelUrl)
    ) {
      window.manualizeItem((it) => it.modelUrl === item.modelUrl);
    } else {
      window.addToBasket(item);
    }
    const sessionId = localStorage.getItem("adSessionId");
    const subreddit = localStorage.getItem("adSubreddit");
    if (sessionId && subreddit && item.jobId) {
      fetch(`${API_BASE}/track/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, modelId: item.jobId, subreddit }),
      }).catch(() => {});
    }
    // Animation and sound handled in basket.js
  });

  async function updateStats(initial) {
    const el = document.getElementById("stats-ticker");
    if (!el) return;
    let prints;
    if (initial && typeof initial.printsSold === "number") {
      prints = initial.printsSold;
    } else {
      try {
        const res = await fetch(`${API_BASE}/stats`);
        if (res.ok) {
          const data = await res.json();
          prints =
            typeof data?.printsSold === "number"
              ? data.printsSold
              : await computeDailyPrintsSold();
        } else {
          prints = await computeDailyPrintsSold();
        }
      } catch {
        prints = await computeDailyPrintsSold();
      }
    }
    el.innerHTML = `<i class="fas fa-fire mr-1"></i> ${prints} prints sold<br>in last 24 hrs`;
  }

  setInterval(updateStats, 3600000);

  // Keep the wizard UI in sync with the payment page
  updateWizardSlotCount();

  const cutoffEl = document.getElementById("shipping-cutoff");
  function updateCutoff() {
    if (!cutoffEl) return;
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(17, 0, 0, 0);
    if (now > cutoff) cutoff.setDate(cutoff.getDate() + 1);
    const diff = cutoff - now;
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    cutoffEl.textContent = `Order in ${hrs}h ${String(mins).padStart(2, "0")}m for same-day processing`;
  }
  updateCutoff();
  setInterval(updateCutoff, 60000);

  const popupEl = document.getElementById("purchase-popups");
  let popupMsgs = [
    "Someone recently bought a print",
    "Someone recently created a model",
    "Someone bought 2 prints earlier",
    "Someone bought a model, earned £5 credit",
    "Someone just received their model by post",
  ];
  async function loadPopupNames() {
    try {
      const res = await fetch(`${API_BASE}/usernames`);
      if (res.ok) {
        const names = await res.json();
        if (Array.isArray(names) && names.length >= 2) {
          popupMsgs = [
            `${names[0]} recently bought a print`,
            `${names[1]} recently created a model`,
            `${names[0]} bought 2 prints earlier`,
            `${names[1]} bought a model, earned £5 credit`,
            `${names[0]} just received their model by post`,
          ];
        }
      }
    } catch {
      /* ignore errors */
    }
  }
  loadPopupNames();

  async function loadPurchaseFeed() {
    try {
      const res = await fetch(`${API_BASE}/recent-purchases`);
      if (res.ok) {
        const msgs = await res.json();
        if (Array.isArray(msgs) && msgs.length) {
          popupMsgs = popupMsgs.concat(msgs);
        }
      }
    } catch {
      /* ignore errors */
    }
  }
  loadPurchaseFeed();
  let popupIdx = 0;
  function showPopup() {
    if (!popupEl) return;
    const msg = popupMsgs[popupIdx % popupMsgs.length];
    popupEl.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = msg;
    const viewer = document.createElement("model-viewer");
    viewer.src = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
    viewer.setAttribute(
      "environment-image",
      "https://modelviewer.dev/shared-assets/environments/neutral.hdr",
    );
    viewer.setAttribute("camera-controls", "");
    viewer.setAttribute("auto-rotate", "");
    viewer.setAttribute("crossOrigin", "anonymous");
    viewer.className = "w-[13rem] h-[13rem] mb-2";
    popupEl.appendChild(viewer);
    popupEl.appendChild(span);
    popupEl.classList.remove("hidden");
    popupEl.classList.remove("purchase-fade");
    void popupEl.offsetWidth;
    popupEl.classList.add("purchase-fade");
    setTimeout(() => {
      popupEl.classList.add("hidden");
      popupEl.classList.remove("purchase-fade");
    }, 8000);
    popupIdx++;
  }
  setInterval(showPopup, 15000);

  const banner = document.getElementById("theme-banner");
  if (banner) {
    function updateCountdown() {
      const now = new Date();
      const day = now.getDay();
      if (day === 0 || day === 6) {
        banner.classList.add("hidden");
        return;
      }
      const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      friday.setDate(friday.getDate() + ((5 - day + 7) % 7));
      const diff = friday - now;
      if (diff > 0 && diff < 7 * 86400000) {
        const hoursTotal = Math.floor(diff / 3600000);
        const days = Math.floor(hoursTotal / 24);
        const hours = hoursTotal % 24;
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        parts.push(`${hours.toString().padStart(2, "0")}h`);
        parts.push(`${minutes.toString().padStart(2, "0")}m`);
        parts.push(`${seconds.toString().padStart(2, "0")}s`);
        banner.textContent = `${parts.join(" ")} left for weekend delivery`;
        banner.classList.remove("hidden");
      } else {
        banner.classList.add("hidden");
      }
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  document.getElementById("promo-optin")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      console.log("Opted in for promo notifications");
    }
  });

  // The print2 Pro badge now links directly to its own page. Remove the old
  // modal-related click handlers so no popup flashes before navigation.
}

window.initIndexPage = init;

let _initialized = false;
function start() {
  if (!_initialized) {
    _initialized = true;
    init();
  }
}
if (document.readyState !== "loading") {
  start();
}
window.addEventListener("DOMContentLoaded", start);
