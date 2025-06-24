const KEY = "print3Saved";
export function getSaved() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}
function save(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
export function toggleSave(item) {
  const items = getSaved();
  const idx = items.findIndex((it) => it.id === item.id);
  if (idx !== -1) {
    items.splice(idx, 1);
  } else {
    items.push(item);
  }
  save(items);
  updateBadge();
  renderList();
}
export function isSaved(id) {
  return getSaved().some((it) => it.id === id);
}
function updateBadge() {
  const badge = document.getElementById("saved-count");
  if (badge) {
    const n = getSaved().length;
    badge.textContent = String(n);
    badge.hidden = n === 0;
  }
}
function renderList() {
  const list = document.getElementById("saved-list");
  if (!list) return;
  list.innerHTML = "";
  const items = getSaved();
  if (!items.length) {
    list.innerHTML = '<p class="text-white">No saved models</p>';
    return;
  }
  items.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "relative group";
    const img = document.createElement("img");
    img.src = it.snapshot || it.modelUrl || "";
    img.alt = "Model";
    img.className =
      "w-24 h-24 object-cover rounded-lg bg-[#2A2A2E] border border-white/20";
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.type = "button";
    btn.className =
      "remove absolute bottom-1 right-1 text-xs px-2 py-1 bg-red-600 rounded opacity-80 group-hover:opacity-100";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSave(it);
    });
    div.appendChild(img);
    div.appendChild(btn);
    list.appendChild(div);
  });
}
function openSaved() {
  renderList();
  document.getElementById("saved-overlay")?.classList.remove("hidden");
}
function closeSaved() {
  document.getElementById("saved-overlay")?.classList.add("hidden");
}
export function setupSavedUI() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "saved-button";
  btn.className =
    "fixed bottom-4 left-4 bg-[#30D5C8] text-black p-3 rounded-full shadow-lg z-50 border-2 border-black";
  btn.innerHTML =
    '<i class="fas fa-star"></i> <span id="saved-count" class="ml-1"></span>';
  btn.addEventListener("click", openSaved);
  document.body.appendChild(btn);

  const overlay = document.createElement("div");
  overlay.id = "saved-overlay";
  overlay.className =
    "fixed inset-0 bg-black/80 flex items-center justify-center hidden z-50";
  overlay.innerHTML = `\
    <div class="relative bg-[#2A2A2E] border border-white/10 rounded-3xl p-6 text-center w-72">
      <button id="saved-close" type="button" class="absolute -top-1 -right-1 text-white text-4xl w-9 h-9 flex items-center justify-center">
        <i class="fas fa-times-circle"></i>
      </button>
      <h2 class="text-xl font-semibold mb-2 text-white">Saved</h2>
      <div id="saved-list" class="grid grid-cols-2 gap-3 mb-2"></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#saved-close").addEventListener("click", closeSaved);
  overlay.addEventListener("click", (e) => {
    const container = overlay.querySelector("div");
    if (!container.contains(e.target) && !btn.contains(e.target)) {
      closeSaved();
    }
  });
  updateBadge();
}
window.addEventListener("DOMContentLoaded", setupSavedUI);
window.toggleSave = toggleSave;
window.isSaved = isSaved;
