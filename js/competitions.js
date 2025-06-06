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

async function enter(id) {
  const token = localStorage.getItem('token');
  if (!token) return alert('Login required');
  const modelId = prompt('Model ID to submit');
  if (!modelId) return;
  await fetch(`/api/competitions/${id}/enter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ modelId }),
  });
  alert('Submitted');
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
    const altText = c.name ? `Winner of ${c.name}` : `Model ${c.winner_model_id}`;
    div.innerHTML = `<h3 class="text-lg">${c.name}</h3>
      <img src="${c.model_url}" alt="${altText}" class="w-32 h-32 object-contain mx-auto" />`;
    container.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  loadPast();
});
