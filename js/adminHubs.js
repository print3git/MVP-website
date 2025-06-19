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
  for (const hub of hubs) {
    const shipRes = await fetch(`${API_BASE}/admin/hubs/${hub.id}/shipments`, {
      headers: authHeaders(),
    });
    const shipments = shipRes.ok ? await shipRes.json() : [];
    const div = document.createElement("div");
    div.className = "bg-[#2A2A2E] p-4 rounded space-y-2";
    div.innerHTML = `
      <h2 class="text-lg font-semibold">${hub.name}</h2>
      <div class="space-y-1">
        <label class="block text-sm">Location
          <input class="location w-full bg-[#1A1A1D] border border-white/10 rounded px-2 py-1" value="${hub.location || ""}" />
        </label>
        <label class="block text-sm">Operator
          <input class="operator w-full bg-[#1A1A1D] border border-white/10 rounded px-2 py-1" value="${hub.operator || ""}" />
        </label>
      </div>
      <button class="save bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Save</button>
      <div class="space-y-1 mt-2">
        ${hub.printers
          .map((p) => `<div class="text-sm">Printer ${p.serial}</div>`)
          .join("")}
      </div>
      <input class="serial bg-[#1A1A1D] border border-white/10 rounded px-2 py-1" placeholder="Add printer serial" />
      <button class="add bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Add Printer</button>
      <div class="mt-2 space-y-1">
        <h3 class="font-semibold">Shipments</h3>
        ${shipments
          .map(
            (s) =>
              `<div class="text-sm">${s.carrier} - ${s.tracking_number}</div>`,
          )
          .join("")}
        <div class="flex space-x-2">
          <input class="carrier flex-1 bg-[#1A1A1D] border border-white/10 rounded px-2 py-1" placeholder="Carrier" />
          <input class="tracking flex-1 bg-[#1A1A1D] border border-white/10 rounded px-2 py-1" placeholder="Tracking" />
          <button class="record bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Record</button>
        </div>
      </div>
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
    div.querySelector(".save").addEventListener("click", async () => {
      const location = div.querySelector(".location").value.trim();
      const operator = div.querySelector(".operator").value.trim();
      await fetch(`${API_BASE}/admin/hubs/${hub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ location, operator }),
      });
    });
    div.querySelector(".record").addEventListener("click", async () => {
      const carrier = div.querySelector(".carrier").value.trim();
      const trackingNumber = div.querySelector(".tracking").value.trim();
      if (!carrier || !trackingNumber) return;
      const resp = await fetch(`${API_BASE}/admin/hubs/${hub.id}/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ carrier, trackingNumber }),
      });
      if (resp.ok) {
        load();
      } else {
        alert("Failed to record shipment");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", load);
