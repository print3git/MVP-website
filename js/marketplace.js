const API_BASE = (window.API_ORIGIN || "") + "/api";

function createCard(item) {
  const div = document.createElement("div");
  div.className =
    "model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl flex items-center justify-center";
  div.innerHTML = `<model-viewer src="${item.file_path}" alt="Model" environment-image="https://modelviewer.dev/shared-assets/environments/neutral.hdr" camera-controls auto-rotate loading="lazy" class="w-full h-full bg-[#2A2A2E] rounded-xl"></model-viewer>\n<button class="buy absolute bottom-1 right-1 font-bold text-lg py-1.5 px-4 rounded-full shadow-md transition border-2 border-black" style="background-color:#30D5C8;color:#1A1A1D;transform:scale(0.78);transform-origin:right bottom;">Buy</button>`;
  div.querySelector(".buy").addEventListener("click", () => {
    localStorage.setItem("print3Model", item.file_path);
    if (item.job_id) localStorage.setItem("print3JobId", item.job_id);
    window.location.href = "payment.html";
  });
  return div;
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
  } catch {}
});
