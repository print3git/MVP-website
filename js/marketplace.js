const API_BASE = (window.API_ORIGIN || "") + "/api";

function createCard(item) {
  const div = document.createElement("div");
  div.className =
    "model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl flex items-center justify-center";
  div.innerHTML = `<model-viewer src="${item.file_path}" alt="Model" environment-image="https://modelviewer.dev/shared-assets/environments/neutral.hdr" camera-controls auto-rotate loading="lazy" class="w-full h-full bg-[#2A2A2E] rounded-xl"></model-viewer>\n<progress max="100" value="${item.royalty_percent || 0}" class="absolute left-1 bottom-1 w-16 h-2"></progress>\n<button class="buy absolute bottom-1 right-1 font-bold text-lg py-1.5 px-4 rounded-full shadow-md transition border-2 border-black" style="background-color:#30D5C8;color:#1A1A1D;transform:scale(0.78);transform-origin:right bottom;">Buy</button>`;
  div.querySelector(".buy").addEventListener("click", () => {
    localStorage.setItem("print3Model", item.file_path);
    if (item.job_id) localStorage.setItem("print3JobId", item.job_id);
    window.location.href = "payment.html";
  });
  return div;
}

async function loadLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/leaderboard?limit=5`);
    if (!res.ok) return;
    const data = await res.json();
    const body = document.getElementById("leaderboard-body");
    const promo = document.getElementById("designer-month");
    if (!body) return;
    body.innerHTML = "";
    data.forEach((e, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="px-2 py-1">${e.username}</td><td class="px-2 py-1">${e.points}</td>`;
      body.appendChild(tr);
      if (idx === 0 && promo) {
        promo.textContent = `Designer of the Month: ${e.username}`;
      }
    });
  } catch (err) {
    console.error("Failed to load leaderboard", err);
  }
}

async function loadAchievements() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/achievements`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const { achievements } = await res.json();
    const list = document.getElementById("achievements-list");
    if (!list) return;
    list.innerHTML = "";
    achievements.forEach((a) => {
      const li = document.createElement("li");
      li.textContent = a.name;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to load achievements", err);
  }
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

  loadLeaderboard();
  loadAchievements();
  checkFlashSale();
});
