'use strict';
import { shareOn } from './share.js';

if (
  localStorage.getItem('hasGenerated') === 'true' ||
  localStorage.getItem('demoDismissed') === 'true'
) {
  document.documentElement.classList.add('has-generated');
}

const API_BASE = '/api';
const FALLBACK_GLB = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const EXAMPLES = ['cute robot figurine', 'ornate chess piece', 'geometric flower vase'];
const $ = (id) => document.getElementById(id);
const refs = {
  previewImg: $('preview-img'),
  loader: $('loader'),
  viewer: $('viewer'),
  demoNote: $('demo-note'),
  demoClose: $('demo-note-close'),
  promptInput: $('promptInput'),
  promptWrapper: $('prompt-wrapper'),
  submitBtn: $('submit-button'),
  submitIcon: $('submit-icon'),
  uploadInput: $('uploadInput'),
  imagePreviewArea: $('image-preview-area'),
  dropZone: $('drop-zone'),
  cropModal: $('crop-modal'),
  cropImage: $('crop-image'),
  cropConfirm: $('crop-confirm'),
  cropCancel: $('crop-cancel'),
  examples: $('prompt-examples'),
  checkoutBtn: $('checkout-button'),
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

const hideAll = () => {
  refs.previewImg.style.display = 'none';
  refs.loader.style.display = 'none';
  refs.viewer.style.display = 'none';
};
const showLoader = () => {
  hideAll();
  refs.loader.style.display = 'flex';
};
const showModel = () => {
  hideAll();
  refs.viewer.style.display = 'block';
};
const hideDemo = () => {
  refs.demoNote && (refs.demoNote.style.display = 'none');
  document.documentElement.classList.add('has-generated');
};

function showError(msg) {
  document.getElementById('gen-error').textContent = msg;
}

function validatePrompt(p) {
  if (!p && uploadedFiles.length === 0) {
    showError('Enter a prompt or upload images');
    refs.promptWrapper.classList.add('border-red-500');
    return false;
  }
  if (p && p.length < 5) {
    showError('Prompt must be at least 5 characters');
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
});

refs.promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    refs.submitBtn.click();
  }
});

function renderThumbnails(arr) {
  refs.imagePreviewArea.innerHTML = '';
  if (!arr.length) {
    refs.imagePreviewArea.classList.add('hidden');
    return;
  }
  refs.imagePreviewArea.classList.remove('hidden');
  arr.forEach((url, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'relative';
    const img = document.createElement('img');
    img.src = url;
    img.className = 'object-cover w-full h-20 rounded-md shadow-md';
    wrap.appendChild(img);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '<i class="fas fa-times"></i>';
    btn.className =
      'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white text-black border border-black flex items-center justify-center';
    btn.onclick = () => {
      arr.splice(i, 1);
      uploadedFiles.splice(i, 1);
      localStorage.setItem('print3Images', JSON.stringify(arr));
      renderThumbnails(arr);
    };
    wrap.appendChild(btn);
    refs.imagePreviewArea.appendChild(wrap);
  });
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

function openCropper(file) {
  return new Promise((resolve) => {
    refs.cropImage.src = URL.createObjectURL(file);
    refs.cropModal.classList.remove('hidden');
    const cropper = new Cropper(refs.cropImage, { aspectRatio: 1, viewMode: 1 });
    const done = (result) => {
      cropper.destroy();
      refs.cropModal.classList.add('hidden');
      resolve(result);
    };
    refs.cropConfirm.onclick = () => {
      const canvas = cropper.getCroppedCanvas({ width: 512, height: 512 });
      canvas.toBlob((b) => {
        done(new File([b], file.name, { type: 'image/png' }));
      }, 'image/png');
    };
    refs.cropCancel.onclick = () => done(null);
  });
}

async function processFiles(files) {
  if (!files.length) return;
  const processed = [];
  for (const f of files) {
    const c = await openCropper(f);
    if (c) processed.push(c);
  }
  uploadedFiles = processed;
  const thumbs = await Promise.all(processed.map((f) => getThumbnail(f)));
  localStorage.setItem('print3Images', JSON.stringify(thumbs));
  renderThumbnails(thumbs);
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
    document.getElementById('gen-error').textContent = 'Generation failed';
    return FALLBACK_GLB;
  }
}

refs.submitBtn.addEventListener('click', async () => {
  const prompt = refs.promptInput.value.trim();
  if (!validatePrompt(prompt)) return;
  showError('');
  refs.promptWrapper.classList.remove('border-red-500');
  refs.checkoutBtn.classList.add('hidden');
  refs.submitIcon.classList.replace('fa-arrow-up', 'fa-stop');
  showLoader();

  localStorage.setItem('print3Prompt', prompt);
  localStorage.setItem('hasGenerated', 'true');

  const url = await fetchGlb(prompt, uploadedFiles);
  localStorage.setItem('print3Model', url);
  localStorage.setItem('print3JobId', lastJobId);

  refs.viewer.src = url;
  await refs.viewer.updateComplete;
  showModel();
  setStep('model');
  hideDemo();

  refs.checkoutBtn.classList.remove('hidden');
  refs.submitIcon.classList.replace('fa-stop', 'fa-arrow-up');
});

window.addEventListener('DOMContentLoaded', () => {
  setStep('prompt');
  showModel();
  refs.viewer.src = FALLBACK_GLB;

  const prompt = localStorage.getItem('print3Prompt');
  const thumbs = JSON.parse(localStorage.getItem('print3Images') || '[]');
  if (prompt) {
    refs.promptInput.value = prompt;

    refs.promptInput.dispatchEvent(new Event('input'));
  } else {
    const ex = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
    refs.promptInput.placeholder = ex;
  }
  if (refs.examples) {
    refs.examples.textContent = `Try: ${EXAMPLES.join(' · ')}`;
  }
  if (thumbs.length) renderThumbnails(thumbs);
});
