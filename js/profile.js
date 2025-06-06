function createCard(model) {
  const div = document.createElement('div');
  div.className =
    'model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] flex items-center justify-center cursor-pointer';
  div.dataset.model = model.model_url;
  div.dataset.job = model.job_id;
  div.innerHTML = `\n    <img src="${model.snapshot || ''}" alt="Model" class="w-full h-full object-contain pointer-events-none" />\n    <span class="sr-only">${model.prompt || 'Model'}</span>\n    <button class="purchase absolute bottom-1 left-1 text-xs bg-blue-600 px-1 rounded">Reorder</button>`;
  div.querySelector('.purchase').addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.setItem('print3Model', model.model_url);
    localStorage.setItem('print3JobId', model.job_id);
    window.location.href = 'payment.html';
  });
  div.addEventListener('click', () => {
    const modal = document.getElementById('model-modal');
    const viewer = modal.querySelector('model-viewer');
    viewer.src = model.model_url;
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });
  return div;
}

async function createAccount(e) {
  e.preventDefault();
  const nameEl = document.getElementById('ca-name');
  const emailEl = document.getElementById('ca-email');
  const passEl = document.getElementById('ca-pass');
  [nameEl, emailEl, passEl].forEach((el) => el.classList.remove('border-red-500'));
  const username = nameEl.value.trim();
  const email = emailEl.value.trim();
  const password = passEl.value.trim();
  if (!username || !email || !password) {
    document.getElementById('ca-error').textContent = 'All fields required';
    if (!username) nameEl.classList.add('border-red-500');
    if (!email) emailEl.classList.add('border-red-500');
    if (!password) passEl.classList.add('border-red-500');
    return;
  }
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    document.getElementById('create-account-form').classList.add('hidden');
    load();
  } else {
    document.getElementById('ca-error').textContent = data.error || 'Signup failed';
    [nameEl, emailEl, passEl].forEach((el) => el.classList.add('border-red-500'));
  }
}

async function captureSnapshots(container) {
  const cards = container.querySelectorAll('.model-card');
  for (const card of cards) {
    const img = card.querySelector('img');
    if (img && img.src) continue;
    const glbUrl = card.dataset.model;
    const viewer = document.createElement('model-viewer');
    viewer.src = glbUrl;
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
      img.src = await viewer.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to capture snapshot', err);
    } finally {
      viewer.remove();
    }
  }
}

async function load() {
  const token = localStorage.getItem('token');
  if (!token) {
    document.getElementById('create-account-form').classList.remove('hidden');
    return;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const user = urlParams.get('user');
  let endpoint = '/api/my/models';
  if (user) endpoint = `/api/users/${encodeURIComponent(user)}/models`;
  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const models = await res.json();
  const container = document.getElementById('models');
  container.innerHTML = '';

  models.forEach((m) => {
    const card = createCard(m);
    container.appendChild(card);
  });
  captureSnapshots(container);
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('model-modal');
  const closeBtn = document.getElementById('close-modal');
  function close() {
    modal?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
  closeBtn?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  const form = document.getElementById('create-account-form');
  form?.addEventListener('submit', createAccount);
  load();
});
