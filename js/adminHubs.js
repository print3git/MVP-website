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
  const [hubRes, opRes] = await Promise.all([
    fetch(`${API_BASE}/admin/hubs`, { headers: authHeaders() }),
    fetch(`${API_BASE}/admin/operators`, { headers: authHeaders() }),
  ]);
  if (!hubRes.ok || !opRes.ok) {
    app.textContent = "Failed to load hubs";
    return;
  }
  const [hubs, operators] = await Promise.all([hubRes.json(), opRes.json()]);
  app.innerHTML = "";
  hubs.forEach((hub) => {
    const div = document.createElement("div");
    div.className = "bg-[#2A2A2E] p-4 rounded space-y-2";
    div.innerHTML = `
      <h2 class="text-lg font-semibold">${hub.name}</h2>
      <p class="text-sm">Location: ${hub.location || "n/a"}</p>
      <label class="text-sm">Operator:
        <select class="op-select bg-[#1A1A1D] border border-white/10 rounded px-2 py-1 ml-2">
          <option value="">n/a</option>
          ${operators
            .map(
              (o) =>
                `<option value='${o.id}' ${o.id === hub.operator ? "selected" : ""}>${o.name}</option>`,
            )
            .join("")}
        </select>
      </label>
      <button class="save-op bg-[#30D5C8] text-[#1A1A1D] px-2 py-1 rounded">Save</button>
      <div class="space-y-1">
        ${hub.printers
          .map((p) => `<div class="text-sm">Printer ${p.serial}</div>`)
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

    div.querySelector(".save-op").addEventListener("click", async () => {
      const opId = div.querySelector(".op-select").value;
      const resp = await fetch(`${API_BASE}/admin/hubs/${hub.id}/operator`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ operatorId: opId || null }),
      });
      if (resp.ok) {
        load();
      } else {
        alert("Failed to assign operator");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", load);
