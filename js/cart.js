import { getBasket, removeFromBasket } from "./basket.js";

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
      localStorage.setItem("print2Basket", JSON.stringify(items));
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
