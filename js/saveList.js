const KEY = "print3Saved";
export function getSaved() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}
function saveList(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

function showLoginPrompt() {
  if (document.getElementById("login-save-prompt")) return;
  const div = document.createElement("div");
  div.id = "login-save-prompt";
  div.className =
    "fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#2A2A2E] border border-white text-white rounded-lg px-4 py-2 z-50";
  div.innerHTML =
    'Log in to save models <a href="login.html" class="font-bold text-[#30D5C8] underline">Log In</a>';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

export function addSaved(item) {
  const token = localStorage.getItem("token");
  if (!token) {
    showLoginPrompt();
    return;
  }
  const items = getSaved();
  if (!items.find((it) => it.id === item.id)) {
    items.push(item);
    saveList(items);
  }
  updateBadge();
  renderList();
}
export function removeSaved(id) {
  const items = getSaved().filter((it) => it.id !== id);
  saveList(items);
  updateBadge();
  renderList();
}
export function clearSaved() {
  saveList([]);
  updateBadge();
  renderList();
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
    const token = localStorage.getItem("token");
    if (!token) {
      list.innerHTML =
        '<p class="text-white col-span-2 text-center"><a href="login.html" class="inline font-bold text-[#30D5C8]">Log In</a> or <a href="signup.html" class="inline font-bold text-[#30D5C8]">Sign Up</a> to save items.</p>';
    } else {
      list.innerHTML =
        '<p class="text-white col-span-2 text-center">No saved items</p>';
    }
    return;
  }
  items.forEach((it) => {
    const div = document.createElement("div");
    div.className = "relative group";
    const img = document.createElement("img");
    img.src = it.snapshot || it.modelUrl || "";
    img.alt = it.title || "Model";
    img.className =
      "w-24 h-24 object-cover rounded-lg bg-[#2A2A2E] border border-white/20";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "remove absolute bottom-1 right-1 text-xs px-2 py-1 bg-red-600 rounded opacity-80 group-hover:opacity-100";
    btn.textContent = "Remove";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeSaved(it.id);
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
    "fixed bottom-4 left-4 bg-[#2A2A2E] text-white p-3 rounded-full shadow-lg z-50 border border-white/20";
  btn.innerHTML =
    '<i class="fas fa-heart"></i> <span id="saved-count" class="ml-1"></span>';
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
  overlay.querySelector("#saved-close")?.addEventListener("click", closeSaved);
  overlay.addEventListener("click", (e) => {
    const container = overlay.querySelector("div");
    const btnEl = document.getElementById("saved-button");
    if (!container.contains(e.target) && !(btnEl && btnEl.contains(e.target))) {
      closeSaved();
    }
  });
  updateBadge();
}
window.addEventListener("DOMContentLoaded", setupSavedUI);
window.addSavedModel = addSaved;
window.getSavedModels = getSaved;
