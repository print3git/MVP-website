const API_BASE = (window.API_ORIGIN || "") + "/api";

function renderPreview() {
  const grid = document.getElementById("addons-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const div = document.createElement("div");
  div.className =
    "model-card p-4 bg-[#2A2A2E] border border-white/10 rounded-xl text-center opacity-50";
  div.innerHTML =
    '<span class="font-semibold">Remix prints</span><span class="block text-xs mt-1">coming soon</span>';
  grid.appendChild(div);
}

async function checkAccess() {
  const token = localStorage.getItem("token");
  if (!token) {
    document.getElementById("locked-msg").classList.remove("hidden");
    renderPreview();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/my/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("fail");
    const orders = await res.json();
    if (!orders.length) {
      document.getElementById("locked-msg").classList.remove("hidden");
      renderPreview();
    } else {
      renderPreview();
      document.getElementById("locked-msg").classList.add("hidden");
    }
  } catch {
    document.getElementById("locked-msg").classList.remove("hidden");
    renderPreview();
  }
}

document.addEventListener("DOMContentLoaded", checkAccess);

function initLuckybox() {
  const tierRadios = document.querySelectorAll(
    '#luckybox-tiers input[name="luckybox-tier"]',
  );
  const desc = document.getElementById("luckybox-desc");
  if (!tierRadios.length) return;
  const descriptions = {
    basic: "£19.99 print + 5 print points (usually £29.99)",
    multicolour: "£29.99 print + 5 print points (usually £39.99)",
    premium: "£59.99 print + 10 print points (usually £79.99)",
  };
  const defaultRadio = document.querySelector(
    '#luckybox-tiers input[value="multicolour"]',
  );
  if (defaultRadio) defaultRadio.checked = true;
  localStorage.setItem("print3Material", "multi");
  function selectedTier() {
    const checked = document.querySelector(
      '#luckybox-tiers input[name="luckybox-tier"]:checked',
    );
    return checked ? checked.value : "basic";
  }
  function update() {
    const tier = selectedTier();
    if (desc) desc.textContent = descriptions[tier] || descriptions.basic;
    const material =
      tier === "multicolour"
        ? "multi"
        : tier === "premium"
          ? "premium"
          : "single";
    localStorage.setItem("print3Material", material);
  }
  tierRadios.forEach((r) => r.addEventListener("change", update));
  update();
}

document.addEventListener("DOMContentLoaded", initLuckybox);
