import { shareOn } from "./share.js";

if (
  localStorage.getItem("hasGenerated") === "true" ||
  localStorage.getItem("demoDismissed") === "true"
) {
  document.documentElement.classList.add("has-generated");
}

const API_BASE = "/api";
const FALLBACK_GLB =
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
const $ = (id) => document.getElementById(id);
const refs = {
  previewImg: $("preview-img"),
  loader: $("loader"),
  viewer: $("viewer"),
  demoNote: $("demo-note"),
  demoClose: $("demo-note-close"),
  promptInput: $("promptInput"),
  submitBtn: $("submit-button"),
  submitIcon: $("submit-icon"),
  uploadInput: $("uploadInput"),
  imagePreviewArea: $("image-preview-area"),
  checkoutBtn: $("checkout-button"),
  progressContainer: $("progress-container"),
  progressBar: $("progress-bar"),
};

window.shareOn = shareOn;
let uploadedFiles = [];
let lastJobId = null;

const hideAll = () => {
  refs.previewImg.style.display = "none";
  refs.loader.style.display = "none";
  refs.viewer.style.display = "none";
};
const showLoader = () => {
  hideAll();
  refs.loader.style.display = "flex";
};
const showModel = () => {
  hideAll();
  refs.viewer.style.display = "block";
};
const hideDemo = () => {
  refs.demoNote && (refs.demoNote.style.display = "none");
  document.documentElement.classList.add("has-generated");
};

let progressTimer = null;
const startProgress = () => {
  if (!refs.progressContainer) return;
  refs.progressBar.style.width = "0%";
  refs.progressContainer.hidden = false;
  let pct = 0;
  progressTimer = setInterval(() => {
    pct = Math.min(100, pct + 10);
    refs.progressBar.style.width = pct + "%";
    if (pct === 100) clearInterval(progressTimer);
  }, 500);
};
const stopProgress = () => {
  if (!refs.progressContainer) return;
  clearInterval(progressTimer);
  refs.progressContainer.hidden = true;
};

refs.demoClose?.addEventListener("click", () => {
  hideDemo();
  localStorage.setItem("demoDismissed", "true");
});

refs.promptInput.addEventListener("input", () => {
  const el = refs.promptInput;
  el.style.height = "auto";
  const lh = parseFloat(getComputedStyle(el).lineHeight);
  el.style.height = Math.min(el.scrollHeight, lh * 9) + "px";
  el.style.overflowY = el.scrollHeight > lh * 9 ? "auto" : "hidden";
});

refs.promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    refs.submitBtn.click();
  }
});

function renderThumbnails(arr) {
  refs.imagePreviewArea.innerHTML = "";
  if (!arr.length) {
    refs.imagePreviewArea.classList.add("hidden");
    return;
  }
  refs.imagePreviewArea.classList.remove("hidden");
  arr.forEach((url, i) => {
    const wrap = document.createElement("div");
    wrap.className = "relative";
    const img = document.createElement("img");
    img.src = url;
    img.className = "object-cover w-full h-20 rounded-md shadow-md";
    wrap.appendChild(img);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = '<i class="fas fa-times"></i>';
    btn.className =
      "absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white text-black border border-black flex items-center justify-center";
    btn.onclick = () => {
      arr.splice(i, 1);
      uploadedFiles.splice(i, 1);
      localStorage.setItem("print3Images", JSON.stringify(arr));
      renderThumbnails(arr);
    };
    wrap.appendChild(btn);
    refs.imagePreviewArea.appendChild(wrap);
  });
}

refs.uploadInput.addEventListener("change", async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  uploadedFiles = files;

  const thumbs = await Promise.all(
    files.map(
      (file) =>
        new Promise((res) => {
          const R = new FileReader();
          R.onload = () => {
            const im = new Image();
            im.onload = () => {
              let [w, h] = [im.width, im.height],
                max = 200,
                r = Math.min(max / w, max / h, 1);
              w *= r;
              h *= r;
              const c = document.createElement("canvas");
              c.width = w;
              c.height = h;
              c.getContext("2d").drawImage(im, 0, 0, w, h);
              res(c.toDataURL("image/png", 0.7));
            };
            im.src = R.result;
          };
          R.readAsDataURL(file);
        }),
    ),
  );

  localStorage.setItem("print3Images", JSON.stringify(thumbs));
  renderThumbnails(thumbs);
});

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
    document.getElementById("gen-error").textContent = "Generation failed";
    return FALLBACK_GLB;
  }
}

refs.submitBtn.addEventListener("click", async () => {
  const prompt = refs.promptInput.value.trim();
  if (!prompt && uploadedFiles.length === 0) return;
  refs.checkoutBtn.classList.add("hidden");
  refs.submitIcon.classList.replace("fa-arrow-up", "fa-stop");
  showLoader();
  startProgress();

  localStorage.setItem("print3Prompt", prompt);
  localStorage.setItem("hasGenerated", "true");

  const url = await fetchGlb(prompt, uploadedFiles);
  localStorage.setItem("print3Model", url);
  localStorage.setItem("print3JobId", lastJobId);

  refs.viewer.src = url;
  await refs.viewer.updateComplete;
  showModel();
  stopProgress();
  hideDemo();

  refs.checkoutBtn.classList.remove("hidden");
  refs.submitIcon.classList.replace("fa-stop", "fa-arrow-up");
});

window.addEventListener("DOMContentLoaded", () => {
  showModel();
  refs.viewer.src = FALLBACK_GLB;

  const prompt = localStorage.getItem("print3Prompt");
  const thumbs = JSON.parse(localStorage.getItem("print3Images") || "[]");
  if (prompt) {
    refs.promptInput.value = prompt;
    refs.promptInput.dispatchEvent(new Event("input"));
  }
  if (thumbs.length) renderThumbnails(thumbs);
});
