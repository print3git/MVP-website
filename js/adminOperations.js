const API_BASE = (window.API_ORIGIN || "") + "/api";

function authHeaders() {
  const admin = localStorage.getItem("adminToken");
  if (admin) return { "x-admin-token": admin };
  const user = localStorage.getItem("token");
  if (user) return { Authorization: `Bearer ${user}` };
  return {};
}

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
  const eventsRes = await fetch(`${API_BASE}/admin/scaling-events`, {
    headers: authHeaders(),
  });
  const events = eventsRes.ok ? await eventsRes.json() : [];
  app.innerHTML = "";

  data.hubs.forEach((hub) => {
    const div = document.createElement("div");
    div.className = "bg-[#2A2A2E] p-4 rounded space-y-2";
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

  if (events.length) {
    const div = document.createElement("div");
    div.className = "bg-[#2A2A2E] p-4 rounded space-y-2";
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
