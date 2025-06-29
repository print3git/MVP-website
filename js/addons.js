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
    {
      name: "Ruins Wall",
      img: "https://images.unsplash.com/photo-1608571423211-3f61272762ab?auto=format&fit=crop&w=200&q=60",
    },
  ];
  grid.innerHTML = "";
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className =
      "model-card relative h-32 w-full bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] transition-shape flex items-center justify-center";
    div.innerHTML = `<img src="${item.img}" alt="${item.name}" class="w-full h-full object-contain pointer-events-none" />\n      <span class="sr-only">${item.name}</span>`;
    grid.appendChild(div);
  });
  adjustLuckyboxHeight();
  alignGridBottom();
  setupLuckyboxScroll();
}

function adjustLuckyboxHeight() {
  const locked = document.getElementById("locked-msg");
  const firstAddon = document.querySelector("#addons-grid > div:first-child");
  const lucky = document.getElementById("luckybox");
  if (!locked || !firstAddon || !lucky) return;
  const lockedBottom = locked.getBoundingClientRect().bottom;
  const topGap = firstAddon.getBoundingClientRect().top - lockedBottom;
  const luckyTop = lucky.getBoundingClientRect().top;
  const luckyGap = luckyTop - lockedBottom;
  const diff = luckyGap - topGap;
  if (diff > 0) {
    lucky.style.height = `${lucky.offsetHeight + diff}px`;
  }
}

function alignGridBottom() {
  const lucky = document.getElementById("luckybox");
  const grid = document.getElementById("addons-grid");
  if (!lucky || !grid) return;
  const items = grid.querySelectorAll(".model-card");
  if (!items.length) return;
  const luckyBottom = lucky.getBoundingClientRect().bottom;
  const gridBottom = items[items.length - 1].getBoundingClientRect().bottom;
  const diff = luckyBottom - gridBottom;
  if (diff > 0) {
    const rows = Math.ceil(items.length / 2);
    const increase = diff / rows;
    items.forEach((item) => {
      item.style.height = `${item.offsetHeight + increase}px`;
    });
  }
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
window.addEventListener("resize", () => {
  adjustLuckyboxHeight();
  alignGridBottom();
  setupLuckyboxScroll();
  updateLuckyboxOnScroll();
});
window.addEventListener("load", () => {
  adjustLuckyboxHeight();
  alignGridBottom();
  setupLuckyboxScroll();
});

function initLuckybox() {
  const tier = document.getElementById("luckybox-tier");
  const desc = document.getElementById("luckybox-desc");
  if (!tier || !desc) return;
  const descriptions = {
    basic:
      "Get a (usually £39.99) single-colour print and 5 print points for just £20.",
    multicolour:
      "Get a (usually £39.99) multicolour print and 5 print points for £29.99.",
    premium:
      "Get a (usually £79.99) premium print and 10 print points for £59.99.",
  };
  function update() {
    desc.textContent = descriptions[tier.value] || descriptions.basic;
  }
  tier.addEventListener("change", update);
  update();
}

document.addEventListener("DOMContentLoaded", initLuckybox);

let luckyInitialHeight;
let lockedInitialBottom;

function setupLuckyboxScroll() {
  const locked = document.getElementById("locked-msg");
  const lucky = document.getElementById("luckybox");
  if (!locked || !lucky || locked.classList.contains("hidden")) return;
  luckyInitialHeight = lucky.offsetHeight;
  lockedInitialBottom = locked.getBoundingClientRect().bottom;
  window.removeEventListener("scroll", updateLuckyboxOnScroll);
  window.addEventListener("scroll", updateLuckyboxOnScroll);
}

function updateLuckyboxOnScroll() {
  const locked = document.getElementById("locked-msg");
  const lucky = document.getElementById("luckybox");
  if (!locked || !lucky || locked.classList.contains("hidden")) return;
  if (luckyInitialHeight === undefined || lockedInitialBottom === undefined)
    return;
  const lockedBottom = locked.getBoundingClientRect().bottom;
  const clamped = lockedBottom > 0 ? lockedBottom : 0;
  const newHeight = luckyInitialHeight + (clamped - lockedInitialBottom);
  lucky.style.height = `${Math.max(luckyInitialHeight, newHeight)}px`;
}
