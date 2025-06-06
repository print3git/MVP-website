async function load() {
  const res = await fetch('/api/competitions/active');
  const list = document.getElementById('list');
  if (!res.ok) {
    list.textContent = 'Failed to load competitions';
    return;
  }
  const comps = await res.json();
  if (comps.length === 0) {
    list.innerHTML =
      '<p class="text-center text-white/80">No active competitions. Check back soon!</p>';
    return;
  }
  comps.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'bg-[#2A2A2E] p-4 rounded-xl space-y-2';
    div.innerHTML = `<h2 class="text-xl">${c.name}</h2>
      <p>${c.prize_description || ''}</p>
      <p class="text-sm"><span class="countdown" data-end="${c.end_date}"></span> left</p>
      <div class="flex space-x-2">
        <button data-id="${c.id}" class="enter bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Enter</button>
        <button onclick="shareOn('twitter')" aria-label="Share on Twitter" class="w-8 h-8 flex items-center justify-center bg-[#1A1A1D] border border-white/10 rounded hover:bg-[#3A3A3E]"><i class="fab fa-twitter"></i></button>
      </div>
      <table class="leaderboard w-full mt-4 text-sm"></table>`;
    list.appendChild(div);
    const table = div.querySelector('.leaderboard');
    loadLeaderboard(c.id, table);
    setInterval(() => loadLeaderboard(c.id, table), 30000);
    div.querySelector('.enter').addEventListener('click', () => enter(c.id));
    const timer = div.querySelector('.countdown');
    startCountdown(timer);
  });
}

async function loadLeaderboard(id, table) {
  const res = await fetch(`/api/competitions/${id}/entries`);
  if (!res.ok) return;
  const rows = await res.json();
  table.innerHTML = rows
    .map((r, i) => `<tr><td>${i + 1}</td><td>${r.model_id}</td><td>${r.likes}</td></tr>`)
    .join('');
}

function startCountdown(el) {
  const end = new Date(el.dataset.end + 'T23:59:59');
  function update() {
    const diff = end - new Date();
    if (diff <= 0) {
      el.textContent = 'Closed';
      clearInterval(timer);
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = `${d}d ${h}h ${m}m`;
  }
  update();
  const timer = setInterval(update, 60000);
}

let currentComp = null;

async function enter(id) {
  const token = localStorage.getItem('token');
  if (!token) return alert('Login required');

  const res = await fetch('/api/my/models', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    alert('Failed to load models');
    return;
  }
  const models = await res.json();
  const modal = document.getElementById('entry-modal');
  const select = document.getElementById('model-select');
  select.innerHTML = '';
  if (models.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No models available';
    opt.disabled = true;
    opt.selected = true;
    select.appendChild(opt);
  } else {
    models.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.job_id;
      opt.textContent = m.prompt || m.job_id;
      select.appendChild(opt);
    });
  }
  currentComp = id;
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

async function submitEntry() {
  const token = localStorage.getItem('token');
  if (!token || !currentComp) return;
  const select = document.getElementById('model-select');
  const modelId = select.value;
  if (!modelId) return;
  await fetch(`/api/competitions/${currentComp}/enter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ modelId }),
  });
  closeModal();
  alert('Submitted');
}

function closeModal() {
  document.getElementById('entry-modal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  currentComp = null;
}

async function loadPast() {
  const res = await fetch('/api/competitions/past');
  const container = document.getElementById('past');
  if (!res.ok) {
    container.textContent = 'Failed to load winners';
    return;
  }
  const comps = await res.json();
  if (comps.length === 0) {
    container.innerHTML = '<p class="text-center text-white/80">No past competitions yet.</p>';
    return;
  }
  comps.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'bg-[#2A2A2E] p-4 rounded-xl space-y-2 text-center';
    div.innerHTML = `<h3 class="text-lg">${c.name}</h3>
      <img src="${c.model_url}" alt="Winning model" class="w-32 h-32 object-contain mx-auto" />`;
    container.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  loadPast();

  const modal = document.getElementById('entry-modal');
  document.getElementById('entry-cancel').addEventListener('click', closeModal);
  document.getElementById('entry-submit').addEventListener('click', submitEntry);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });
});
