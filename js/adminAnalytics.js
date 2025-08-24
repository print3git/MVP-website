import { API_BASE, authHeaders } from "./api.js";

function groupByDay(logs) {
  const map = {};
  logs.forEach((l) => {
    const day = new Date(l.start_time).toISOString().slice(0, 10);
    if (!map[day]) map[day] = { count: 0, cost: 0 };
    map[day].count += 1;
    map[day].cost += l.cost_cents || 0;
  });
  return map;
}

async function load() {
  const app = document.getElementById("app");
  app.textContent = "Loading...";
  const res = await fetch(`${API_BASE}/admin/analytics`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    app.textContent = "Failed to load analytics";
    return;
  }
  const { logs, stats } = await res.json();
  app.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "space-y-1";
  summary.innerHTML = `
    <div>Total generations: ${stats.total}</div>
    <div>Average duration: ${stats.avg_duration ? stats.avg_duration.toFixed(2) : "n/a"}s</div>
    <div>Cumulative cost: $${((stats.total_cost || 0) / 100).toFixed(2)}</div>
  `;
  app.appendChild(summary);

  const table = document.createElement("table");
  table.className = "w-full text-sm text-left border-collapse";
  table.innerHTML = `
    <thead><tr>
      <th class="border-b px-2 py-1">Prompt</th>
      <th class="border-b px-2 py-1">Duration (s)</th>
      <th class="border-b px-2 py-1">Source</th>
      <th class="border-b px-2 py-1">Cost</th>
      <th class="border-b px-2 py-1">Timestamp</th>
    </tr></thead>
    <tbody></tbody>`;
  const tbody = table.querySelector("tbody");
  logs.forEach((l) => {
    const tr = document.createElement("tr");
    const dur = l.finish_time
      ? (new Date(l.finish_time) - new Date(l.start_time)) / 1000
      : 0;
    tr.innerHTML = `
      <td class="border-b px-2 py-1">${l.prompt}</td>
      <td class="border-b px-2 py-1">${dur.toFixed(2)}</td>
      <td class="border-b px-2 py-1">${l.source}</td>
      <td class="border-b px-2 py-1">$${(l.cost_cents / 100).toFixed(2)}</td>
      <td class="border-b px-2 py-1">${new Date(l.start_time).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
  app.appendChild(table);

  const groups = groupByDay(logs);
  const labels = Object.keys(groups).sort();
  const counts = labels.map((d) => groups[d].count);
  const costs = labels.map((d) => groups[d].cost / 100);
  if (labels.length) {
    const canvas = document.createElement("canvas");
    app.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    // eslint-disable-next-line no-undef
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Generations",
            data: counts,
            borderColor: "#30D5C8",
            backgroundColor: "#30D5C8",
          },
          {
            label: "Cost ($)",
            data: costs,
            borderColor: "#f87171",
            backgroundColor: "#f87171",
          },
        ],
      },
      options: { scales: { y: { beginAtZero: true } } },
    });
  }
}

document.addEventListener("DOMContentLoaded", load);
