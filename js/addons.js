const API_BASE = (window.API_ORIGIN || "") + "/api";

function renderPreview() {
  const grid = document.getElementById("addons-grid");
  const items = [
    {
      name: "Snow Base",
      img: "https://images.unsplash.com/photo-1581905764498-f1ec34cc1373?auto=format&fit=crop&w=200&q=60",
    },
    {
      name: "LED Stand",
      img: "https://images.unsplash.com/photo-1518933165971-611dbc9c412d?auto=format&fit=crop&w=200&q=60",
    },
    {
      name: "Companion Droid",
      img: "https://images.unsplash.com/photo-1604066867775-4a6c52db06f2?auto=format&fit=crop&w=200&q=60",
    },
  ];
  grid.innerHTML = "";
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className =
      "bg-[#2A2A2E] border border-white/10 rounded-xl p-3 flex flex-col items-center";
    div.innerHTML = `<img src="${item.img}" alt="${item.name}" class="h-24 object-contain mb-2" />\n      <span>${item.name}</span>`;
    grid.appendChild(div);
  });
}

async function checkAccess() {
  const token = localStorage.getItem("token");
  if (!token) {
    document.getElementById("locked-msg").classList.remove("hidden");
    renderPreview();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/my/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("fail");
    const orders = await res.json();
    if (!orders.length) {
      document.getElementById("locked-msg").classList.remove("hidden");
      renderPreview();
    } else {
      renderPreview();
      document.getElementById("locked-msg").classList.add("hidden");
    }
  } catch {
    document.getElementById("locked-msg").classList.remove("hidden");
    renderPreview();
  }
}

document.addEventListener("DOMContentLoaded", checkAccess);
