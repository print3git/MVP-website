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
  const [hubsRes, metricsRes] = await Promise.all([
    fetch(`${API_BASE}/admin/hubs`, { headers: authHeaders() }),
    fetch(`${API_BASE}/admin/printers/status`, { headers: authHeaders() }),
  ]);
  if (!hubsRes.ok) {
    app.textContent = 'Failed to load hubs';
    return;
  }
  const hubs = await hubsRes.json();
  const metrics = metricsRes.ok ? await metricsRes.json() : [];
  app.innerHTML = '';
  hubs.forEach((hub) => {
    const div = document.createElement('div');
    div.className = 'bg-[#2A2A2E] p-4 rounded space-y-2';
    div.innerHTML = `
      <h2 class="text-lg font-semibold">${hub.name}</h2>
      <p class="text-sm">Location: ${hub.location || 'n/a'}</p>
      <p class="text-sm">Operator: ${hub.operator || 'n/a'}</p>
      <div class="space-y-1">
        ${hub.printers
          .map((p) => {
            const m = metrics.find((mt) => mt.printer_id === p.id) || {};
            const status = m.status || 'unknown';
            const q = m.queue_length != null ? m.queue_length : 'n/a';
            return `<div class="text-sm">Printer ${p.serial} - ${status} (queue ${q})</div>`;
          })
          .join('')}
      </div>
      <input class="serial bg-[#1A1A1D] border border-white/10 rounded px-2 py-1" placeholder="Add printer serial" />
      <button class="add bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Add Printer</button>
    `;
    app.appendChild(div);
    div.querySelector('.add').addEventListener('click', async () => {
      const serial = div.querySelector('.serial').value.trim();
      if (!serial) return;
      const resp = await fetch(`${API_BASE}/admin/hubs/${hub.id}/printers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ serial }),
      });
      if (resp.ok) {
        load();
      } else {
        alert('Failed to add printer');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', load);
