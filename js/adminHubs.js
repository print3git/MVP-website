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
  const res = await fetch(`${API_BASE}/admin/hubs`, { headers: authHeaders() });
  if (!res.ok) {
    app.textContent = "Failed to load hubs";
    return;
  }
  const hubs = await res.json();
  app.innerHTML = "";
  hubs.forEach((hub) => {
    const div = document.createElement("div");
    div.className = "bg-[#2A2A2E] p-4 rounded space-y-2";
    div.innerHTML = `
      <h2 class="text-lg font-semibold">${hub.name}</h2>
      <p class="text-sm">Location: ${hub.location || "n/a"}</p>
      <p class="text-sm">Operator: ${hub.operator || "n/a"}</p>
      <div class="space-y-1">
        ${hub.printers
          .map(
            (p) => `
              <div class="text-sm flex items-center space-x-2">
                <span>Printer ${p.serial}</span>
                <button class="cam bg-[#30D5C8] text-[#1A1A1D] rounded px-2 py-0.5 text-xs" data-id="${p.id}">Camera</button>
              </div>`,
          )
          .join("")}
      </div>
      <input class="serial bg-[#1A1A1D] border border-white/10 rounded px-2 py-1" placeholder="Add printer serial" />
      <button class="add bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Add Printer</button>
    `;
    app.appendChild(div);
    div.querySelector(".add").addEventListener("click", async () => {
      const serial = div.querySelector(".serial").value.trim();
      if (!serial) return;
      const resp = await fetch(`${API_BASE}/admin/hubs/${hub.id}/printers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ serial }),
      });
      if (resp.ok) {
        load();
      } else {
        alert("Failed to add printer");
      }
    });
    div.querySelectorAll(".cam").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const resp = await fetch(`${API_BASE}/admin/printers/${id}/stream`, {
          headers: authHeaders(),
        });
        if (resp.ok) {
          const data = await resp.json();
          window.open(data.streamUrl, "_blank");
        } else {
          alert("Failed to fetch stream");
        }
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", load);
