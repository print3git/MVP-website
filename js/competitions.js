async function load() {
  const res = await fetch('/api/competitions/active');
  const list = document.getElementById('list');
  if (!res.ok) {
    list.textContent = 'Failed to load competitions';
    return;
  }
  const comps = await res.json();
  comps.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'bg-[#2A2A2E] p-4 rounded-xl';
    div.innerHTML = `<h2 class="text-xl mb-2">${c.name}</h2>
      <p class="mb-2">${c.prize_description || ''}</p>
      <button data-id="${c.id}" class="enter bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Enter</button>
      <table class="leaderboard w-full mt-4 text-sm"></table>`;
    list.appendChild(div);
    loadLeaderboard(c.id, div.querySelector('.leaderboard'));
    div.querySelector('.enter').addEventListener('click', () => enter(c.id));
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

async function enter(id) {
  const token = localStorage.getItem('token');
  if (!token) return alert('Login required');
  const modelId = prompt('Model ID to submit');
  if (!modelId) return;
  await fetch(`/api/competitions/${id}/enter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ modelId }),
  });
  alert('Submitted');
}

document.addEventListener('DOMContentLoaded', load);
