const API_BASE = (window.API_ORIGIN || '') + '/api';

function authHeaders() {
  const admin = localStorage.getItem('adminToken');
  if (admin) return { 'x-admin-token': admin };
  const user = localStorage.getItem('token');
  if (user) return { Authorization: `Bearer ${user}` };
  return {};
}

async function load() {
  const app = document.getElementById('app');
  app.textContent = 'Loading...';
  const res = await fetch(`${API_BASE}/admin/ads/pending`, { headers: authHeaders() });
  if (!res.ok) {
    app.textContent = 'Failed to load ads';
    return;
  }
  const ads = await res.json();
  app.innerHTML = '';
  ads.forEach((ad) => {
    const div = document.createElement('div');
    div.className = 'bg-[#2A2A2E] p-4 rounded space-y-2';
    div.innerHTML = `
      <p class="text-sm">Subreddit: r/${ad.subreddit}</p>
      <textarea class="copy w-full bg-[#1A1A1D] border border-white/10 rounded p-1">${ad.copy}</textarea>
      ${ad.image ? `<img class="w-32 h-32 object-cover" src="${ad.image}" />` : ''}
      <div class="space-x-2">
        <button class="approve bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Approve</button>
        <button class="reject bg-red-600 px-3 py-1 rounded">Reject</button>
      </div>
    `;
    app.appendChild(div);
    const copyEl = div.querySelector('.copy');
    div.querySelector('.approve').addEventListener('click', async () => {
      const updated = copyEl.value;
      await fetch(`${API_BASE}/admin/ads/${ad.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ copy: updated }),
      });
      load();
    });
    div.querySelector('.reject').addEventListener('click', async () => {
      await fetch(`${API_BASE}/admin/ads/${ad.id}/reject`, {
        method: 'POST',
        headers: authHeaders(),
      });
      load();
    });
  });
}

document.addEventListener('DOMContentLoaded', load);
