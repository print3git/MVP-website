const API_BASE = (window.API_ORIGIN || "") + "/api";

function renderPreview() {
  const grid = document.getElementById("addons-grid");
  if (!grid) return;
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
    {
      name: "Display Stand",
      img: "https://images.unsplash.com/photo-1595475033364-6e46f4735a53?auto=format&fit=crop&w=200&q=60",
    },
    {
      name: "Diorama Arch",
      img: "https://images.unsplash.com/photo-1615335283053-c5241ad3d7e1?auto=format&fit=crop&w=200&q=60",
    },
    {
      name: "Miniature Tree",
      img: "https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=200&q=60",
    },
    {
      name: "Scenic Boulder",
      img: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=200&q=60",
    },
  ];
  grid.innerHTML = "";
  const advert = document.createElement("div");
  advert.className =
    "w-full h-32 bg-[#2A2A2E] border border-dashed border-white/40 rounded-xl flex items-center justify-center text-sm row-start-1 col-start-2";
  advert.textContent = "Advert Placeholder";
  grid.appendChild(advert);
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className =
      "model-card relative h-32 w-full bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] transition-shape flex items-center justify-center";
    div.innerHTML = `<img src="${item.img}" alt="${item.name}" class="w-full h-full object-contain pointer-events-none" />\n      <span class="sr-only">${item.name}</span>`;
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

function initLuckybox() {
  const tierRadios = document.querySelectorAll(
    '#luckybox-tiers input[name="luckybox-tier"]',
  );
  const desc = document.getElementById("luckybox-desc");
  if (!tierRadios.length || !desc) return;
  const descriptions = {
    basic: "£19.99 print + 5 print points (usually £29.99)",
    multicolour: "£29.99 print + 5 print points (usually £39.99)",
    premium: "£59.99 print + 10 print points (usually £79.99)",
  };
  function selectedTier() {
    const checked = document.querySelector(
      '#luckybox-tiers input[name="luckybox-tier"]:checked',
    );
    return checked ? checked.value : "basic";
  }
  function update() {
    desc.textContent = descriptions[selectedTier()] || descriptions.basic;
  }
  tierRadios.forEach((r) => r.addEventListener("change", update));
  update();
}

document.addEventListener("DOMContentLoaded", initLuckybox);
