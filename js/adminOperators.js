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
  const res = await fetch(`${API_BASE}/admin/operators`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    app.textContent = "Failed to load operators";
    return;
  }
  const ops = await res.json();
  app.innerHTML = "";
  ops.forEach((op) => {
    const div = document.createElement("div");
    div.className = "bg-[#2A2A2E] p-4 rounded space-y-1";
    div.innerHTML = `
      <p class="text-sm">Name: ${op.name}</p>
      <p class="text-sm">Email: ${op.email}</p>
      <p class="text-sm">Approved: ${op.approved}</p>
      <p class="text-sm">Training: ${op.training_completed}</p>
    `;
    app.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", load);
