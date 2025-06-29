import { getSaved, removeSaved } from "./saveList.js";

function render() {
  const list = document.getElementById("saved-items-list");
  if (!list) return;
  list.innerHTML = "";
  const items = getSaved();
  if (!items.length) {
    list.innerHTML =
      '<p class="text-white text-center col-span-2">No saved items</p>';
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
      render();
    });
    div.appendChild(img);
    div.appendChild(btn);
    list.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", render);
