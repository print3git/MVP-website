const API_BASE = (window.API_ORIGIN || "") + "/api";
import { getBasket, removeFromBasket } from "./basket.js";

function render() {
  const list = document.getElementById("cart-items");
  list.innerHTML = "";
  const items = getBasket();
  if (!items.length) {
    list.textContent = "Cart empty";
    return;
  }
  items.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "flex items-center gap-2";
    const img = document.createElement("img");
    img.src = it.snapshot || it.modelUrl || "";
    img.className = "w-16 h-16 object-cover rounded";
    div.appendChild(img);
    const input = document.createElement("input");
    input.type = "number";
    input.value = it.quantity || 1;
    input.min = "1";
    input.className = "w-16 text-black px-1";
    input.addEventListener("change", () => {
      const q = parseInt(input.value, 10) || 1;
      const items = getBasket();
      items[idx].quantity = q;
      localStorage.setItem("print3Basket", JSON.stringify(items));
      if (it.serverId) {
        const token = localStorage.getItem("token");
        if (token)
          fetch(`${API_BASE}/cart/items/${it.serverId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ quantity: q }),
          }).catch(() => {});
      }
    });
    div.appendChild(input);
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.className = "text-red-500";
    btn.addEventListener("click", () => removeFromBasket(idx));
    div.appendChild(btn);
    list.appendChild(div);
  });
}

async function checkout() {
  const token = localStorage.getItem("token");
  if (!token) return;
  const res = await fetch(`${API_BASE}/cart/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.checkoutUrl) window.location.href = data.checkoutUrl;
}

document.getElementById("checkout-all").addEventListener("click", checkout);
window.addEventListener("basket-change", render);
render();
