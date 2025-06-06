function createCard(model) {
  const div = document.createElement('div');
  div.className =
    'model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] flex items-center justify-center cursor-pointer';
  div.dataset.model = model.model_url;
  div.dataset.job = model.job_id;
  div.innerHTML = `\n    <img src="${model.snapshot || ''}" alt="Model" class="w-full h-full object-contain pointer-events-none" />\n    <span class="sr-only">${model.prompt || 'Model'}</span>\n    <button class="purchase absolute bottom-1 left-1 text-xs bg-blue-600 px-1 rounded">Buy</button>`;
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
    window.location.href = 'login.html';
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
    const div = document.createElement('div');
    div.className =
      'bg-[#2A2A2E] border border-white/10 rounded-3xl p-4 flex justify-between items-center';
    div.innerHTML = `<span>${m.prompt} - ${m.model_url || ''}</span><span>${m.likes} ❤️</span>`;
    if (!user) {
      const btn = document.createElement('button');
      btn.textContent = m.is_public ? 'Make Private' : 'Make Public';
      btn.className = 'ml-2 text-xs bg-blue-600 px-2 rounded';
      btn.addEventListener('click', async () => {
        const res = await fetch(`/api/models/${m.job_id}/public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isPublic: !m.is_public }),
        });
        if (res.ok) {
          m.is_public = !m.is_public;
          btn.textContent = m.is_public ? 'Make Private' : 'Make Public';
        }
      });
      div.appendChild(btn);
    }
    container.appendChild(div);
  });
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
  load();
});
