(() => {
  try {
    const map = {
      print3Basket: "print2Basket",
      print3Model: "print2Model",
      print3JobId: "print2JobId",
      print3Material: "print2Material",
      print3Color: "print2Color",
      print3EtchName: "print2EtchName",
      print3Email: "print2Email",
      print3ShipName: "print2ShipName",
      print3ShipAddress: "print2ShipAddress",
      print3ShipCity: "print2ShipCity",
      print3ShipZip: "print2ShipZip",
      print3DiscountCode: "print2DiscountCode",
      print3CheckoutItems: "print2CheckoutItems",
      print3Prompt: "print2Prompt",
      print3Images: "print2Images",
      print3Saved: "print2Saved",
      print3CommunityOpen: "print2CommunityOpen",
      print3CommunityState: "print2CommunityState",
    };
    for (const [oldKey, newKey] of Object.entries(map)) {
      const val = localStorage.getItem(oldKey);
      if (val !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, val);
        localStorage.removeItem(oldKey);
      }
    }
  } catch {
    // ignore
  }
})();

const API_BASE = (window.API_ORIGIN || "") + "/api";

function createCard(order) {
  const div = document.createElement("div");
  div.className =
    "relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] flex items-center justify-center cursor-pointer";
  div.dataset.model = order.model_url;
  div.dataset.job = order.job_id;
  div.innerHTML = `
    <img src="${order.snapshot || ""}" alt="Model" class="w-full h-full object-contain pointer-events-none" />
    <span class="sr-only">${order.prompt || "Model"}</span>
    <button class="reorder absolute bottom-1 left-1 text-xs bg-blue-600 px-1 rounded">Reorder</button>
    <button class="remix absolute bottom-1 right-1 text-xs bg-green-600 px-1 rounded">Remix</button>`;
  div.querySelector(".reorder").addEventListener("click", (e) => {
    e.stopPropagation();
    localStorage.setItem("print2Model", order.model_url);
    localStorage.setItem("print2JobId", order.job_id);
    window.location.href = "payment.html";
  });
  div.querySelector(".remix").addEventListener("click", (e) => {
    e.stopPropagation();
    try {
      localStorage.setItem("print2Prompt", order.prompt || "");
    } catch {}
    const url = `index.html?sr=${encodeURIComponent(order.model_url)}`;
    window.location.href = url;
  });
  div.addEventListener("click", () => {
    const modal = document.getElementById("model-modal");
    const viewer = modal.querySelector("model-viewer");
    viewer.src = order.model_url;
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  });
  return div;
}

async function loadOrders() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  const res = await fetch(`${API_BASE}/my/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const orders = await res.json();
  const container = document.getElementById("orders");
  orders.forEach((o) => container.appendChild(createCard(o)));
}

function createObserver() {
  const closeBtn = document.getElementById("close-modal");
  function close() {
    document.getElementById("model-modal").classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }
  closeBtn?.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  createObserver();
  loadOrders();
});
