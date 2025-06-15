'use strict';
import { shareOn } from './share.js';

function ensureModelViewerLoaded() {
  if (window.customElements?.get('model-viewer')) return;
  const s = document.createElement('script');
  s.type = 'module';
  s.src =
    'https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js';
  document.head.appendChild(s);
}

if (
  localStorage.getItem('hasGenerated') === 'true' ||
  localStorage.getItem('demoDismissed') === 'true'
) {
  document.documentElement.classList.add('has-generated');
}

const API_BASE = (window.API_ORIGIN || '') + '/api';
const FALLBACK_GLB = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const EXAMPLES = ['cute robot figurine', 'ornate chess piece', 'geometric flower vase'];
const TRENDING = ['dragon statue', 'space rover', 'anime character'];
const $ = (id) => document.getElementById(id);
const refs = {
  previewImg: $('preview-img'),
  loader: $('loader'),
  viewer: $('viewer'),
  progressBar: $('progress-bar'),
  progressWrapper: $('progress-wrapper'),
  progressText: $('progress-text'),
  demoNote: $('demo-note'),
  demoClose: $('demo-note-close'),
  promptInput: $('promptInput'),
  promptWrapper: $('prompt-wrapper'),
  submitBtn: $('submit-button'),
  submitIcon: $('submit-icon'),
  uploadInput: $('uploadInput'),
  imagePreviewArea: $('image-preview-area'),
  dropZone: $('drop-zone'),
  examples: $('prompt-examples'),
  trending: $('trending-prompts'),
  checkoutBtn: $('checkout-button'),
  buyNowBtn: $('buy-now-button'),
  addBasketBtn: $('add-basket-button'),
  stepPrompt: $('step-prompt'),
  stepModel: $('step-model'),
  stepBuy: $('step-buy'),
};

function setStep(name) {
  const map = {
    prompt: refs.stepPrompt,
    model: refs.stepModel,
    buy: refs.stepBuy,
  };
  Object.entries(map).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle('font-semibold', key === name);
    el.classList.toggle('text-gray-400', key !== name);
  });
}

window.shareOn = shareOn;
let uploadedFiles = [];
let lastJobId = null;

let savedProfile = null;
let userProfile = null;

// Track when the prompt or images have been modified after a generation
let editsPending = false;

let progressInterval = null;
let progressStart = null;
let usingViewerProgress = false;

function updateWizardFromInputs() {
  if (!window.setWizardStage) return;
  window.setWizardStage('prompt');
}

async function captureModelSnapshot(url) {
  if (!url) return null;
  const viewer = document.createElement('model-viewer');
  viewer.crossOrigin = 'anonymous';
  viewer.src = url;
  viewer.setAttribute(
    'environment-image',
    'https://modelviewer.dev/shared-assets/environments/neutral.hdr'
  );
  viewer.style.position = 'fixed';
  viewer.style.left = '-10000px';
  viewer.style.width = '300px';
  viewer.style.height = '300px';
  document.body.appendChild(viewer);
  try {
    await viewer.updateComplete;
    return await viewer.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to capture snapshot', err);
    return null;
  } finally {
    viewer.remove();
  }
}

function startProgress(estimateMs = 20000) {
  if (!refs.progressWrapper) return;
  progressStart = Date.now();
  usingViewerProgress = false;
  refs.progressBar.style.width = '0%';
  refs.progressWrapper.style.display = 'block';
  const tick = () => {
    if (usingViewerProgress) return;
    const elapsed = Date.now() - progressStart;
    const pct = Math.min((elapsed / estimateMs) * 100, 99);
    refs.progressBar.style.width = pct + '%';
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
  refs.progressBar.style.width = '100%';
  refs.progressText.textContent = '';
  setTimeout(() => {
    refs.progressWrapper.style.display = 'none';
  }, 300);
}

const hideAll = () => {
  refs.previewImg.style.display = 'none';
  refs.loader.style.display = 'none';
  refs.viewer.style.display = 'none';
  if (typeof refs.viewer.pause === 'function') {
    refs.viewer.pause();
  }
};
const showLoader = () => {
  hideAll();
  refs.loader.style.display = 'flex';
  startProgress();
};
const showModel = () => {
  hideAll();
  refs.viewer.style.display = 'block';
  if (typeof refs.viewer.play === 'function') {
    refs.viewer.play();
  }
  stopProgress();
  // Force a render in case Safari paused the canvas while hidden
  if (typeof refs.viewer.requestUpdate === 'function') {
    refs.viewer.requestUpdate();
  }
};
const hideDemo = () => {
  refs.demoNote && (refs.demoNote.style.display = 'none');
  document.documentElement.classList.add('has-generated');
};

async function fetchProfile() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      userProfile = await res.json();
    }
  } catch (err) {
    console.error('Failed to load profile', err);
  }
}

async function buyNow() {
  if (!userProfile) return;
  if (window.setWizardStage) window.setWizardStage('purchase');
  const jobId = localStorage.getItem('print3JobId');
  const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId,
      price: 2000,
      qty: 1,
      shippingInfo: userProfile.shipping_info,
    }),
  });
  const data = await res.json();
  window.location.href = data.checkoutUrl;
}

function showError(msg) {
  const el = document.getElementById('gen-error');
  if (!el) return;
  el.textContent = msg;
  if (typeof window !== 'undefined' && typeof window.positionQuote === 'function') {
    requestAnimationFrame(() => window.positionQuote());
  }
}

function validatePrompt(p) {
  const txt = p ? p.trim() : '';
  if (!txt && uploadedFiles.length === 0) {
    showError('Enter a prompt or upload image');
    refs.promptWrapper.classList.add('border-red-500');
    return false;
  }
  if (txt && txt.length < 5) {
    showError('Prompt must be at least 5 characters');
    refs.promptWrapper.classList.add('border-red-500');
    return false;
  }
  if (txt && /\n/.test(txt)) {
    showError('Prompt cannot contain line breaks');
    refs.promptWrapper.classList.add('border-red-500');
    return false;
  }
  if (txt && /[<>]/.test(txt)) {
    showError('Prompt contains invalid characters');
    refs.promptWrapper.classList.add('border-red-500');
    return false;
  }
  if (txt && txt.length > 200) {
    showError('Prompt must be under 200 characters');
    refs.promptWrapper.classList.add('border-red-500');
    return false;
  }
  return true;
}

refs.demoClose?.addEventListener('click', () => {
  hideDemo();
  localStorage.setItem('demoDismissed', 'true');
});

refs.promptInput.addEventListener('input', () => {
  const el = refs.promptInput;
  el.style.height = 'auto';
  const lh = parseFloat(getComputedStyle(el).lineHeight);
  el.style.height = Math.min(el.scrollHeight, lh * 9) + 'px';
  el.style.overflowY = el.scrollHeight > lh * 9 ? 'auto' : 'hidden';
  document.getElementById('gen-error').textContent = '';
  refs.promptWrapper.classList.remove('border-red-500');
  editsPending = true;
  refs.buyNowBtn?.classList.add('hidden');
  setStep('prompt');
  updateWizardFromInputs();
});

refs.promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    refs.submitBtn.click();
  }
});

function syncUploadHeights() {
  if (!refs.dropZone || !refs.imagePreviewArea) return;
  const h = refs.dropZone.getBoundingClientRect().height;
  // Keep preview thumbnails square and aligned with the drop zone
  // height while allowing the drop zone itself to size naturally via CSS.
  refs.imagePreviewArea.style.height = h + 'px';
  refs.imagePreviewArea.style.width = h + 'px';
}

function renderThumbnails(arr) {
  refs.imagePreviewArea.innerHTML = '';
  if (!arr.length) {
    refs.imagePreviewArea.classList.add('hidden');
    syncUploadHeights();
    return;
  }
  refs.imagePreviewArea.classList.remove('hidden');
  arr.forEach((url, i) => {
    const wrap = document.createElement('div');
    // Make the wrapper fill the preview container so images and
    // buttons are sized relative to it rather than their natural
    // dimensions. This avoids oversized previews in Safari on iPad.
    wrap.className = 'relative w-full h-full';
    const img = document.createElement('img');
    img.src = url;
    // Use object-contain so tall images fit within the square thumbnail
    // without overflowing in Safari on iPad.
    img.className = 'object-contain w-full h-full rounded-md shadow-md';
    wrap.appendChild(img);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '<i class="fas fa-times"></i>';
    // Position the remove button fully inside the preview box so it
    // isn't clipped when the container has overflow-hidden.
    // Keep the remove button inside the rounded corner so it isn't
    // clipped by overflow hidden on the preview box.
    btn.className =
      'absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-black border border-black flex items-center justify-center z-20';
    btn.onclick = () => {
      arr.splice(i, 1);
      uploadedFiles.splice(i, 1);
      localStorage.setItem('print3Images', JSON.stringify(arr));
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
        let [w, h] = [im.width, im.height],
          max = 200,
          r = Math.min(max / w, max / h, 1);
        w *= r;
        h *= r;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        res(c.toDataURL('image/png', 0.7));
      };
      im.src = R.result;
    };
    R.readAsDataURL(file);
  });
}

async function processFiles(files) {
  if (!files.length) return;

  uploadedFiles = [...files];
  const thumbs = await Promise.all(uploadedFiles.map((f) => getThumbnail(f)));

  localStorage.setItem('print3Images', JSON.stringify(thumbs));
  renderThumbnails(thumbs);
  editsPending = true;
  refs.buyNowBtn?.classList.add('hidden');
  setStep('prompt');
  updateWizardFromInputs();
}

refs.uploadInput.addEventListener('change', (e) => {
  processFiles([...e.target.files]);
});

if (refs.dropZone) {
  refs.dropZone.addEventListener('click', () => refs.uploadInput.click());
  ['dragover', 'dragenter'].forEach((ev) => {
    refs.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      refs.dropZone.classList.add('ring-2', 'ring-cyan-400');
    });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    refs.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      refs.dropZone.classList.remove('ring-2', 'ring-cyan-400');
      if (ev === 'drop') {
        processFiles([...e.dataTransfer.files]);
      }
    });
  });
}

async function fetchGlb(prompt, files) {
  try {
    const fd = new FormData();
    if (prompt) fd.append('prompt', prompt);
    files.forEach((f) => fd.append('images', f));
    const r = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      body: fd,
    });
    if (!r.ok) throw new Error();
    const data = await r.json();
    lastJobId = data.jobId;
    return data.glb_url;
  } catch (err) {
    showError('Generation failed');

    return FALLBACK_GLB;
  }
}

refs.submitBtn.addEventListener('click', async () => {
  const prompt = refs.promptInput.value.trim();
  if (!validatePrompt(prompt)) {
    // Ensure icon resets if validation fails
    refs.submitIcon.classList.replace('fa-stop', 'fa-arrow-up');
    return;
  }
  showError('');
  refs.promptWrapper.classList.remove('border-red-500');
  refs.buyNowBtn?.classList.add('hidden');
  refs.submitIcon.classList.replace('fa-arrow-up', 'fa-stop');
  showLoader();
  if (window.setWizardStage) window.setWizardStage('building');

  try {
    localStorage.setItem('print3Prompt', prompt);
    localStorage.setItem('hasGenerated', 'true');

    const url = await fetchGlb(prompt, uploadedFiles);
    localStorage.setItem('print3Model', url);
    localStorage.setItem('print3JobId', lastJobId);

    editsPending = false;

    refs.viewer.src = url;
    await refs.viewer.updateComplete;
    showModel();
    if (window.addAutoItem) {
      let snapshot = refs.previewImg?.src;
      if (!snapshot || snapshot.includes('placehold.co')) {
        snapshot = await captureModelSnapshot(url);
      }
      window.addAutoItem({ jobId: lastJobId, modelUrl: url, snapshot });
    }
    setStep('model');
    if (window.setWizardStage) window.setWizardStage('purchase');
    hideDemo();

    refs.checkoutBtn.classList.remove('hidden');
    if (userProfile) refs.buyNowBtn?.classList.remove('hidden');
  } finally {
    // Always return the button to the arrow state
    refs.submitIcon.classList.replace('fa-stop', 'fa-arrow-up');
  }
});

async function init() {
  ensureModelViewerLoaded();
  syncUploadHeights();
  window.addEventListener('resize', syncUploadHeights);
  setStep('prompt');
  if (window.setWizardStage) window.setWizardStage('prompt');
  showLoader();
  const sr = new URLSearchParams(window.location.search).get('sr');
  if (!sr) {
    refs.viewer.src = FALLBACK_GLB;
    localStorage.setItem('print3Model', FALLBACK_GLB);
    localStorage.removeItem('print3JobId');
  }
  if (refs.viewer) {
    refs.viewer.addEventListener('progress', (e) => {
      if (!progressStart) progressStart = Date.now();
      usingViewerProgress = true;
      const pct = Math.round(e.detail.totalProgress * 100);
      refs.progressBar.style.width = pct + '%';
      const elapsed = Date.now() - progressStart;
      if (pct < 100) {
        const remaining = pct > 0 ? (elapsed * (100 - pct)) / pct : 0;
        refs.progressText.textContent = `~${Math.ceil(remaining / 1000)}s remaining`;
      } else {
        stopProgress();
      }
    });
    await refs.viewer.updateComplete;
  }
  showModel();
  fetchProfile().then(() => {
    if (userProfile && refs.buyNowBtn) {
      refs.buyNowBtn.classList.remove('hidden');
      refs.buyNowBtn.addEventListener('click', buyNow);
    }
  });

  const prompt = localStorage.getItem('print3Prompt');
  const thumbs = JSON.parse(localStorage.getItem('print3Images') || '[]');

  const oldPlaceholders = [
    'Describe your 3D print request…',
    'Describe your idea or upload images…',
    'Desribe your 3D print request…',
    'Desribe your idea or upload images…',
  ];
  let usePlaceholder = true;
  if (prompt) {
    const isOld = oldPlaceholders.some((p) => prompt.startsWith(p));
    if (!isOld) {
      refs.promptInput.value = prompt;
      refs.promptInput.dispatchEvent(new Event('input'));
      usePlaceholder = false;
    } else {
      localStorage.removeItem('print3Prompt');
    }
  }
  if (usePlaceholder) {
    // Keep placeholder text consistent with index.html
    refs.promptInput.placeholder = 'Text, image, or both — we\u2019ll 3D print it\u2026';
  }
  if (refs.examples) {
    refs.examples.textContent = `Try: ${EXAMPLES.join(' · ')}`;
  }
  if (thumbs.length) renderThumbnails(thumbs);

  if (refs.trending) {
    refs.trending.textContent = `Trending: ${TRENDING.join(' · ')}`;
  }
  if (refs.promptTip && !localStorage.getItem('promptTipDismissed')) {
    refs.promptInput.addEventListener(
      'focus',
      () => {
        refs.promptTip.style.display = 'block';
      },
      { once: true }
    );
    refs.promptTipClose?.addEventListener('click', () => {
      refs.promptTip.style.display = 'none';
      localStorage.setItem('promptTipDismissed', 'true');
    });
  }

  // Ensure checkout uses the model currently shown in the viewer
  refs.checkoutBtn?.addEventListener('click', () => {
    if (refs.viewer?.src) {
      localStorage.setItem('print3Model', refs.viewer.src);
    }
    if (lastJobId) {
      localStorage.setItem('print3JobId', lastJobId);
    } else {
      localStorage.removeItem('print3JobId');
    }
    if (window.setWizardStage) window.setWizardStage('purchase');
  });

  refs.addBasketBtn?.addEventListener('click', async () => {
    if (!window.addToBasket || !refs.viewer?.src) return;
    let snapshot = refs.previewImg?.src;
    if (!snapshot || snapshot.includes('placehold.co')) {
      snapshot = await captureModelSnapshot(refs.viewer.src);
    }
    const item = { jobId: lastJobId, modelUrl: refs.viewer.src, snapshot };
    if (
      window.manualizeItem &&
      window.getBasket?.().some((it) => it.auto && it.modelUrl === item.modelUrl)
    ) {
      window.manualizeItem((it) => it.modelUrl === item.modelUrl);
    } else {
      window.addToBasket(item);
    }
  });
}

window.initIndexPage = init;



window.addEventListener('DOMContentLoaded', init);
