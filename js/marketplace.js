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

function handleModelError(e) {
  const img = document.createElement("img");
  img.src = "images/astro-image.png";
  img.alt = "3D model preview unavailable";
  img.className = e.target.className;
  e.target.replaceWith(img);
}

function createCard(item) {
  const div = document.createElement("div");
  div.className =
    "model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl flex items-center justify-center";
  div.innerHTML = `<model-viewer src="${item.file_path}" alt="Model" poster="images/astro-image.png" environment-image="https://modelviewer.dev/shared-assets/environments/neutral.hdr" camera-controls auto-rotate loading="lazy" crossOrigin="anonymous" class="w-full h-full bg-[#2A2A2E] rounded-xl"></model-viewer>\n<progress max="100" value="${item.royalty_percent || 0}" class="absolute left-1 bottom-1 w-16 h-2"></progress>\n<button class="buy absolute bottom-1 right-1 font-bold text-lg py-1.5 px-4 rounded-full shadow-md transition border-2 border-black" style="background-color:#30D5C8;color:#1A1A1D;transform:scale(0.78);transform-origin:right bottom;">Buy</button>`;
  div
    .querySelector("model-viewer")
    ?.addEventListener("error", handleModelError);
  div.querySelector(".buy").addEventListener("click", () => {
    localStorage.setItem("print2Model", item.file_path);
    if (item.job_id) localStorage.setItem("print2JobId", item.job_id);
    sessionStorage.setItem("fromMarketplace", "1");
    window.location.href = "payment.html";
  });
  return div;
}

async function checkFlashSale() {
  const banner = document.getElementById("flash-banner");
  if (!banner) return;
  let timerEl = document.getElementById("flash-timer");
  if (!timerEl) return;
  try {
    const resp = await fetch(`${API_BASE}/flash-sale`);
    if (!resp.ok) return;
    const sale = await resp.json();
    const end = new Date(sale.end_time).getTime();
    banner.innerHTML = `Flash sale! <span id="flash-timer">5:00</span> left - ${sale.discount_percent}% off ${sale.product_type}`;
    timerEl = banner.querySelector("#flash-timer");
    const update = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        banner.hidden = true;
        clearInterval(int);
        return;
      }
      const s = Math.ceil(diff / 1000);
      const m = Math.floor(s / 60);
      const sec = String(s % 60).padStart(2, "0");
      timerEl.textContent = `${m}:${sec}`;
    };
    update();
    const int = setInterval(update, 1000);
    banner.hidden = false;
  } catch {}
}

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("marketplace-grid");
  if (!grid) return;
  try {
    const res = await fetch(
      `${API_BASE}/designer-submissions/approved?limit=20`,
    );
    if (!res.ok) return;
    const items = await res.json();
    items.forEach((it) => grid.appendChild(createCard(it)));
  } catch (err) {
    console.error("Failed to load marketplace items", err);
  }
  checkFlashSale();
});
