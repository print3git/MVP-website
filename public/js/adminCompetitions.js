function getToken() {
  return localStorage.getItem('adminToken') || '';
}

function setToken(token) {
  localStorage.setItem('adminToken', token);
}

const API_BASE = (window.API_ORIGIN || '') + '/api';

async function load() {
  const list = document.getElementById('list');
  list.textContent = 'Loading...';
  const res = await fetch(`${API_BASE}/competitions/active`);
  if (!res.ok) {
    list.textContent = 'Failed to load competitions';
    return;
  }
  const comps = await res.json();
  list.innerHTML = '';
  comps.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'bg-[#2A2A2E] p-4 rounded space-y-2';
    div.innerHTML = `
      <h2 class="text-lg font-semibold">${c.name}</h2>
      <label class="block text-sm">Prize Description
        <input class="prize w-full mt-1 p-2 rounded bg-[#1A1A1D] border border-white/10" value="${c.prize_description || ''}">
      </label>
      <label class="block text-sm">Winner Model ID
        <input class="winner w-full mt-1 p-2 rounded bg-[#1A1A1D] border border-white/10" value="${c.winner_model_id || ''}">
      </label>
      <button class="save bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Save</button>`;
    list.appendChild(div);
    div.querySelector('.save').addEventListener('click', async () => {
      const body = {
        name: c.name,
        start_date: c.start_date,
        end_date: c.end_date,
        prize_description: div.querySelector('.prize').value,
        winner_model_id: div.querySelector('.winner').value || null,
      };
      const resp = await fetch(`${API_BASE}/admin/competitions/${c.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getToken(),
        },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        alert('Saved');
      } else {
        alert('Failed to save');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const tokenInput = document.getElementById('token');
  tokenInput.value = getToken();
  document.getElementById('set-token').addEventListener('click', () => {
    setToken(tokenInput.value.trim());
    load();
  });
  if (getToken()) load();
});
