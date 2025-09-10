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

function renderPreview() {
  const grid = document.getElementById("addons-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const div = document.createElement("div");
  div.className =
    "model-card p-4 bg-[#2A2A2E] border border-white/10 rounded-xl text-center opacity-50";
  div.innerHTML =
    '<span class="font-semibold">Remix prints</span><span class="block text-xs mt-1">coming soon</span>';
  grid.appendChild(div);
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
  if (!tierRadios.length) return;
  const descriptions = {
    basic: "£19.99 print + 5 print points (usually £29.99)",
    multicolour: "£29.99 print + 5 print points (usually £39.99)",
    premium: "£59.99 print + 10 print points (usually £79.99)",
  };
  const defaultRadio = document.querySelector(
    '#luckybox-tiers input[value="basic"]',
  );
  if (defaultRadio) defaultRadio.checked = true;
  localStorage.setItem("print2Material", "single");
  function selectedTier() {
    const checked = document.querySelector(
      '#luckybox-tiers input[name="luckybox-tier"]:checked',
    );
    return checked ? checked.value : "basic";
  }
  function update() {
    const tier = selectedTier();
    if (desc) desc.textContent = descriptions[tier] || descriptions.basic;
    const material =
      tier === "multicolour"
        ? "multi"
        : tier === "premium"
          ? "premium"
          : "single";
    localStorage.setItem("print2Material", material);
  }
  tierRadios.forEach((r) => r.addEventListener("change", update));
  update();
}

document.addEventListener("DOMContentLoaded", initLuckybox);

function initLuckyboxOptions() {
  const optionRadios = document.querySelectorAll('input[name="luckybox"]');
  const genrePanel = document.getElementById("genre-panel");
  const genreInput = document.getElementById("genre");
  if (!optionRadios.length || !genrePanel || !genreInput) return;
  function update() {
    const selected = document.querySelector('input[name="luckybox"]:checked');
    const show = selected && selected.value === "B";
    genrePanel.hidden = !show;
    genreInput.disabled = !show;
    genreInput.setAttribute("aria-disabled", (!show).toString());
  }
  optionRadios.forEach((r) => r.addEventListener("change", update));
  update();
}

document.addEventListener("DOMContentLoaded", initLuckyboxOptions);

function initLuckyboxValidation() {
  const buyLink = document.querySelector(
    '#luckybox a[href="luckybox-payment.html"]',
  );
  const error = document.getElementById("luckybox-error");
  if (!buyLink || !error) return;
  function hideError() {
    if (
      document.querySelector(
        '#luckybox-tiers input[name="luckybox-tier"]:checked',
      ) &&
      document.querySelector('input[name="luckybox"]:checked')
    ) {
      error.classList.add("hidden");
    }
  }
  buyLink.addEventListener("click", (e) => {
    const tier = document.querySelector(
      '#luckybox-tiers input[name="luckybox-tier"]:checked',
    );
    const choice = document.querySelector('input[name="luckybox"]:checked');
    if (!tier || !choice) {
      e.preventDefault();
      error.textContent =
        "Please choose a tier and a Luckybox option before continuing.";
      error.classList.remove("hidden");
    }
  });
  document
    .querySelectorAll(
      '#luckybox-tiers input[name="luckybox-tier"], input[name="luckybox"]',
    )
    .forEach((input) => input.addEventListener("change", hideError));
}

document.addEventListener("DOMContentLoaded", initLuckyboxValidation);
