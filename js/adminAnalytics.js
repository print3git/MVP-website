import { API_BASE, authHeaders } from './api.js';

function formatCurrency(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function load() {
  const app = document.getElementById('app');
  app.textContent = 'Loading...';
  const res = await fetch(`${API_BASE}/admin/analytics`, { headers: authHeaders() });
  if (!res.ok) {
    app.textContent = 'Failed to load analytics';
    return;
  }
  const logs = await res.json();
  const table = document.createElement('table');
  table.className = 'w-full text-sm';
  table.innerHTML = `
    <thead><tr><th class="text-left">Prompt</th><th>Duration (s)</th><th>Source</th><th>Cost</th><th>Started</th></tr></thead>
    <tbody></tbody>`;
  const tbody = table.querySelector('tbody');
  let totalCost = 0;
  let totalDuration = 0;
  logs.forEach((l) => {
    const dur = l.finished_at ? (new Date(l.finished_at) - new Date(l.started_at)) / 1000 : 0;
    totalCost += l.cost_cents || 0;
    totalDuration += dur;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="pr-2">${l.prompt}</td><td class="text-center">${dur.toFixed(1)}</td><td class="text-center">${l.source}</td><td class="text-center">${formatCurrency(l.cost_cents)}</td><td>${new Date(l.started_at).toLocaleString()}</td>`;
    tbody.appendChild(tr);
  });
  const summary = document.createElement('div');
  summary.className = 'space-y-1';
  summary.innerHTML = `
    <p>Total generations: ${logs.length}</p>
    <p>Average duration: ${(logs.length ? totalDuration / logs.length : 0).toFixed(1)}s</p>
    <p>Cumulative cost: ${formatCurrency(totalCost)}</p>`;
  app.innerHTML = '';
  app.appendChild(summary);
  app.appendChild(table);
  if (logs.length) {
    const canvas = document.createElement('canvas');
    canvas.id = 'genChart';
    app.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    // eslint-disable-next-line no-undef
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: logs.map((l) => new Date(l.started_at).toLocaleTimeString()),
        datasets: [{ label: 'Cost ($)', data: logs.map((l) => l.cost_cents / 100), backgroundColor: '#30D5C8' }],
      },
      options: { scales: { y: { beginAtZero: true } } },
    });
  }
}

document.addEventListener('DOMContentLoaded', load);
