import { API_BASE, authHeaders } from "./api.js";

async function load() {
  const app = document.getElementById("app");
  app.textContent = "Loading...";
  const res = await fetch(`${API_BASE}/admin/operations`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    app.textContent = "Failed to load dashboard";
    return;
  }
  const data = await res.json();
  const forecastRes = await fetch(`${API_BASE}/metrics/demand-forecast`, {
    headers: authHeaders(),
  });
  const forecast = forecastRes.ok ? await forecastRes.json() : [];
  const eventsRes = await fetch(`${API_BASE}/admin/scaling-events`, {
    headers: authHeaders(),
  });
  const events = eventsRes.ok ? await eventsRes.json() : [];
  app.innerHTML = "";

  data.hubs.forEach((hub) => {
    const div = document.createElement("div");
    div.className = "bg-[#2A2A2E] p-4 rounded space-y-2 border border-white/10";
    const errors = hub.errors
      .map((e) => `<div class="text-red-500 text-sm">${e.error}</div>`)
      .join("");
    div.innerHTML = `
      <h2 class="text-lg font-semibold">${hub.name}</h2>
      <p class="text-sm">Backlog: ${hub.backlog}</p>
      <p class="text-sm">Daily Capacity: ${hub.dailyCapacity || "n/a"}</p>
      ${errors}
    `;
    app.appendChild(div);
  });

  if (forecast.length) {
    const div = document.createElement("div");
    div.className = "bg-[#2A2A2E] p-4 rounded space-y-2 border border-white/10";
    div.innerHTML =
      '<h2 class="text-lg font-semibold">Fulfillment Forecast</h2>' +
      '<canvas id="forecastChart" class="w-full"></canvas>';
    app.appendChild(div);
    const ctx = div.querySelector("#forecastChart").getContext("2d");
    // eslint-disable-next-line no-undef
    new Chart(ctx, {
      type: "line",
      data: {
        labels: forecast.map((d) => d.day),
        datasets: [
          {
            label: "Demand (h)",
            data: forecast.map((d) => d.demand),
            borderColor: "#30D5C8",
            fill: false,
          },
          {
            label: "Capacity (h)",
            data: forecast.map((d) => d.capacity),
            borderColor: "#f87171",
            fill: false,
          },
        ],
      },
      options: { scales: { y: { beginAtZero: true } } },
    });
  }

  if (events.length) {
    const div = document.createElement("div");
    div.className = "bg-[#2A2A2E] p-4 rounded space-y-2 border border-white/10";
    div.innerHTML =
      '<h2 class="text-lg font-semibold">Recent Scaling Events</h2>' +
      events
        .slice(0, 5)
        .map(
          (e) =>
            `<div class="text-sm">${new Date(e.created_at).toLocaleDateString()} - ${e.subreddit}: ${e.reason}</div>`,
        )
        .join("");
    app.appendChild(div);
  }
}

document.addEventListener("DOMContentLoaded", load);
