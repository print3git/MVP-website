function getToken() {
  return (
    localStorage.getItem("adminToken") || localStorage.getItem("token") || ""
  );
}

function setToken(token) {
  localStorage.setItem("adminToken", token);
}

import { API_BASE, authHeaders } from "./api.js";
import { setSafeInnerHTML } from "./dom-utils-securityfix-79d3fa.ts";

async function load() {
  const container = document.getElementById("sale");
  container.textContent = "Loading...";
  let sale = null;
  try {
    const resp = await fetch(`${API_BASE}/flash-sale`, {
      headers: authHeaders(),
    });
    if (resp.ok) {
      sale = await resp.json();
    }
  } catch {}
  container.innerHTML = "";
  if (sale) {
    const div = document.createElement("div");
    div.className = "space-y-2";
    setSafeInnerHTML(
      div,
      [
        "<p>Active sale: ",
        "% off ",
        '</p><button id="end" class="bg-red-500 px-3 py-1 rounded">End Sale</button>',
      ],
      sale.discount_percent,
      sale.product_type,
    );
    container.appendChild(div);
    div.querySelector("#end").addEventListener("click", async () => {
      const resp = await fetch(`${API_BASE}/admin/flash-sale/${sale.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (resp.ok) load();
      else alert("Failed");
    });
  } else {
    const div = document.createElement("div");
    div.className = "space-y-2";
    setSafeInnerHTML(div, [
      '<label class="block text-sm">Product Type\n        <input id="prod" class="w-full mt-1 p-2 rounded bg-[#1A1A1D] border border-white/10">\n      </label>\n      <label class="block text-sm">Discount %\n        <input id="disc" type="number" class="w-full mt-1 p-2 rounded bg-[#1A1A1D] border border-white/10">\n      </label>\n      <label class="block text-sm">Duration Minutes\n        <input id="mins" type="number" value="60" class="w-full mt-1 p-2 rounded bg-[#1A1A1D] border border-white/10">\n      </label>\n      <button id="start" class="bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Start Sale</button>',
    ]);
    container.appendChild(div);
    div.querySelector("#start").addEventListener("click", async () => {
      const now = Date.now();
      const body = {
        product_type: div.querySelector("#prod").value,
        discount_percent: parseInt(div.querySelector("#disc").value, 10),
        start_time: new Date(now).toISOString(),
        end_time: new Date(
          now + parseInt(div.querySelector("#mins").value, 10) * 60000,
        ).toISOString(),
      };
      const resp = await fetch(`${API_BASE}/admin/flash-sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (resp.ok) load();
      else alert("Failed");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const tokenInput = document.getElementById("token");
  tokenInput.value = localStorage.getItem("adminToken") || "";
  document.getElementById("set-token").addEventListener("click", () => {
    setToken(tokenInput.value.trim());
    load();
  });
  if (getToken()) load();
});
