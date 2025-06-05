function like(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Login required");
    return;
  }
  fetch(`/api/models/${id}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((d) => {
      const span = document.querySelector(`#likes-${id}`);
      if (span) span.textContent = d.likes;
    });
}
async function fetchCreations(type, offset = 0, limit = 6, category = "") {
  const query = new URLSearchParams({ limit, offset });
  if (category) query.set("category", category);
  const res = await fetch(`/api/community/${type}?${query}`);
  if (!res.ok) return [];
  return res.json();
}

function createCard(model) {
  const div = document.createElement("div");
  div.className =
    "model-card h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] transition-shape flex items-center justify-center cursor-pointer";
  div.dataset.model = model.model_url;
  div.innerHTML = `\n      <img src="${model.snapshot || ""}" alt="Model" class="w-full h-full object-contain pointer-events-none" />\n      <span class="sr-only">${model.title || "Model"}</span>\n      <span class="absolute bottom-1 right-1 text-xs bg-black/50 px-1 rounded" id="likes-${model.id}">${model.likes}</span>`;
  div.addEventListener("click", () => {
    const modal = document.getElementById("model-modal");
    const viewer = modal.querySelector("model-viewer");
    viewer.src = model.model_url;
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  });
  return div;
}

async function captureSnapshots(container) {
  const cards = container.querySelectorAll(".model-card");
  for (const card of cards) {
    const img = card.querySelector("img");
    if (img && img.src) continue;
    const glbUrl = card.dataset.model;
    const viewer = document.createElement("model-viewer");
    viewer.src = glbUrl;
    viewer.style.position = "fixed";
    viewer.style.left = "-10000px";
    viewer.style.width = "300px";
    viewer.style.height = "300px";
    document.body.appendChild(viewer);
    try {
      await viewer.updateComplete;
      img.src = await viewer.toDataURL("image/png");
    } catch (err) {
      console.error("Failed to capture snapshot", err);
    } finally {
      viewer.remove();
    }
  }
}

async function loadMore(type) {
  const state = window.communityState[type];
  const category = document.getElementById("category").value;
  const models = await fetchCreations(type, state.offset, 6, category);
  state.offset += models.length;
  const grid = document.getElementById(`${type}-grid`);
  models.forEach((m) => grid.appendChild(createCard(m)));
  await captureSnapshots(grid);
  if (models.length < 6) {
    document.getElementById(`${type}-load`).classList.add("hidden");
  }
}

function init() {
  window.communityState = { recent: { offset: 0 }, popular: { offset: 0 } };
  document
    .getElementById("recent-load")
    .addEventListener("click", () => loadMore("recent"));
  document
    .getElementById("popular-load")
    .addEventListener("click", () => loadMore("popular"));
  document.getElementById("category").addEventListener("change", () => {
    document.getElementById("recent-grid").innerHTML = "";
    document.getElementById("popular-grid").innerHTML = "";
    window.communityState = { recent: { offset: 0 }, popular: { offset: 0 } };
    loadMore("popular");
    loadMore("recent");
  });
  loadMore("popular");
  loadMore("recent");
}

export { like, init };
