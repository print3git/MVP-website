import { captureSnapshots } from "./snapshot.js";

const API_BASE = (window.API_ORIGIN || "") + "/api";

function startOfWeek(d = new Date()) {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

function showNextCreditCountdown() {
  const el = document.getElementById("next-credit");
  if (!el) return;
  const next = new Date(startOfWeek().getTime() + 7 * 24 * 60 * 60 * 1000);
  function update() {
    const diff = next - Date.now();
    if (diff <= 0) {
      el.textContent = "New credits available!";
      clearInterval(timer);
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    el.textContent = `Next credit in ${days}d ${hours}h`;
  }
  update();
  const timer = setInterval(update, 3600000);
}

async function loadPrintOfWeek() {
  const container = document.getElementById("pow-container");
  const wrapper = document.getElementById("print-week");
  if (!container || !wrapper) return;
  try {
    const res = await fetch(`${API_BASE}/community/popular?limit=1`);
    if (!res.ok) return;
    const models = await res.json();
    if (!models.length) return;
    const m = models[0];
    container.innerHTML = `\n      <img src="${m.snapshot || ""}" alt="${m.title || "Model"}" class="w-full h-48 object-contain mb-2" />\n      <button class="bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded-xl">Buy</button>`;
    container.querySelector("button").addEventListener("click", () => {
      localStorage.setItem("print3Model", m.model_url);
      localStorage.setItem("print3JobId", m.job_id);
      window.location.href = "payment.html";
    });
    wrapper.classList.remove("hidden");
  } catch (err) {
    console.error("Failed to load print of the week", err);
  }
}

function createCard(model) {
  const div = document.createElement("div");
  div.className =
    "model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] flex items-center justify-center cursor-pointer";
  div.dataset.model = model.model_url;
  div.dataset.job = model.job_id;
  div.innerHTML = `\n    <img src="${model.snapshot || ""}" alt="Model" class="w-full h-full object-contain pointer-events-none" />\n    <span class="sr-only">${model.prompt || "Model"}</span>\n    <button class="purchase absolute bottom-1 left-1 text-xs bg-blue-600 px-1 rounded">Buy</button>`;
  div.querySelector(".purchase").addEventListener("click", (e) => {
    e.stopPropagation();
    localStorage.setItem("print3Model", model.model_url);
    localStorage.setItem("print3JobId", model.job_id);
    window.location.href = "payment.html";
  });
  div.addEventListener("click", () => {
    const modal = document.getElementById("model-modal");
    const viewer = modal.querySelector("model-viewer");
    viewer.src = model.model_url;
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  });
  return div;
}

const state = { offset: 0, done: false, loading: false };

async function loadMore() {
  if (state.loading || state.done) return;
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  state.loading = true;
  const query = new URLSearchParams({ limit: 9, offset: state.offset });
  const res = await fetch(`${API_BASE}/my/models?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    state.loading = false;
    return;
  }
  const models = await res.json();
  const container = document.getElementById("models");
  models.forEach((m) => container.appendChild(createCard(m)));
  await captureSnapshots(container);
  state.offset += models.length;
  if (models.length < 9) state.done = true;
  state.loading = false;
}

async function loadProfileDetails() {
  const token = localStorage.getItem("token");
  if (!token) return;
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const data = await res.json();
  if (data.avatarUrl) {
    const avatar = document.getElementById("avatar-preview");
    if (avatar) avatar.src = data.avatarUrl;
  }
  if (data.profile) {
    document.getElementById("shipping-input").value =
      data.profile.shipping_info?.address || "";
    document.getElementById("payment-input").value =
      data.profile.payment_info?.details || "";
    document.getElementById("competition-toggle").checked =
      data.profile.competition_notify !== false;
  }
}

async function loadDashboard() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.profile) {
      document.getElementById("shipping-input").value =
        data.profile.shipping_info?.address || "";
      document.getElementById("payment-input").value =
        data.profile.payment_info?.details || "";
      document.getElementById("competition-toggle").checked =
        data.profile.competition_notify !== false;
      if (data.profile.avatar_url) {
        document.getElementById("avatar-preview").src = data.profile.avatar_url;
      }
    }
    if (data.orders) {
      const body = document.getElementById("orders-body");
      body.innerHTML = "";
      data.orders.forEach((o) => {
        const tr = document.createElement("tr");
        const date = o.created_at
          ? new Date(o.created_at).toLocaleDateString()
          : "";
        const total = ((o.price_cents - (o.discount_cents || 0)) / 100).toFixed(
          2,
        );
        tr.innerHTML = `<td class="px-2 py-1">${date}</td><td class="px-2 py-1">${o.quantity}</td><td class="px-2 py-1">$${total}</td><td class="px-2 py-1">${o.status}</td>`;
        body.appendChild(tr);
      });
    }
    if (data.commissions) {
      const body = document.getElementById("commission-body");
      body.innerHTML = "";
      data.commissions.commissions.forEach((c) => {
        const tr = document.createElement("tr");
        const amount = (c.commission_cents / 100).toFixed(2);
        const date = c.created_at
          ? new Date(c.created_at).toLocaleDateString()
          : "";
        tr.innerHTML = `<td class="px-2 py-1">$${amount}</td><td class="px-2 py-1 capitalize">${c.status}</td><td class="px-2 py-1">${date}</td>`;
        body.appendChild(tr);
      });
      document.getElementById("total-pending").textContent = (
        data.commissions.totalPending / 100
      ).toFixed(2);
      document.getElementById("total-paid").textContent = (
        data.commissions.totalPaid / 100
      ).toFixed(2);
    }
    if (data.credits) {
      const used = data.credits.total - data.credits.remaining;
      const bar = document.getElementById("progress-bar");
      const text = document.getElementById("progress-text");
      const percent = data.credits.total
        ? Math.min(100, (used / data.credits.total) * 100)
        : 0;
      if (bar) bar.style.width = `${percent}%`;
      if (text)
        text.textContent = `${used} of ${data.credits.total} prints used`;
      if (data.credits.remaining === 0) {
        document.getElementById("upgrade-cta")?.classList.remove("hidden");
      }
      showNextCreditCountdown();
    }
  } catch (err) {
    console.error("Failed to load dashboard", err);
  }
}

async function uploadAvatar(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const file = document.getElementById("avatar-input").files[0];
  if (!token || !file) return;
  const form = new FormData();
  form.append("avatar", file);
  const res = await fetch(`${API_BASE}/profile/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (res.ok) {
    const data = await res.json();
    document.getElementById("avatar-preview").src = data.url;
  }
}

async function saveProfile(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  if (!token) return;
  const shipping = document.getElementById("shipping-input").value.trim();
  const payment = document.getElementById("payment-input").value.trim();
  const notify = document.getElementById("competition-toggle").checked;
  await fetch(`${API_BASE}/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      shippingInfo: { address: shipping },
      paymentInfo: { details: payment },
      competitionNotify: notify,
    }),
  });
}

async function loadOrders() {
  const token = localStorage.getItem("token");
  if (!token) return;
  const res = await fetch(`${API_BASE}/my/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const orders = await res.json();
  const body = document.getElementById("orders-body");
  body.innerHTML = "";
  orders.forEach((o) => {
    const tr = document.createElement("tr");
    const date = o.created_at
      ? new Date(o.created_at).toLocaleDateString()
      : "";
    const total = ((o.price_cents - (o.discount_cents || 0)) / 100).toFixed(2);
    tr.innerHTML = `<td class="px-2 py-1">${date}</td><td class="px-2 py-1">${o.quantity}</td><td class="px-2 py-1">$${total}</td><td class="px-2 py-1">${o.status}</td>`;
    body.appendChild(tr);
  });
}

async function deleteAccount() {
  if (!confirm("Delete account permanently?")) return;
  const token = localStorage.getItem("token");
  if (!token) return;
  const res = await fetch(`${API_BASE}/account`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  }
}

async function loadCommissions() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/commissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const body = document.getElementById("commission-body");
    body.innerHTML = "";
    data.commissions.forEach((c) => {
      const tr = document.createElement("tr");
      const amount = (c.commission_cents / 100).toFixed(2);
      const date = c.created_at
        ? new Date(c.created_at).toLocaleDateString()
        : "";
      tr.innerHTML = `
        <td class="px-2 py-1">$${amount}</td>
        <td class="px-2 py-1 capitalize">${c.status}</td>
        <td class="px-2 py-1">${date}</td>`;
      body.appendChild(tr);
    });
    document.getElementById("total-pending").textContent = (
      data.totalPending / 100
    ).toFixed(2);
    document.getElementById("total-paid").textContent = (
      data.totalPaid / 100
    ).toFixed(2);
  } catch (err) {
    console.error("Failed to load commissions", err);
  }
}

async function requestPayout() {
  const token = localStorage.getItem("token");
  if (!token) return;
  const msg = document.getElementById("payout-msg");
  msg.textContent = "";
  try {
    const res = await fetch(`${API_BASE}/payouts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      msg.classList.remove("text-red-400");
      msg.classList.add("text-green-400");
      msg.textContent = "Payout requested";
    } else {
      const data = await res.json();
      msg.classList.remove("text-green-400");
      msg.classList.add("text-red-400");
      msg.textContent = data.error || "Request failed";
    }
  } catch (err) {
    msg.classList.remove("text-green-400");
    msg.classList.add("text-red-400");
    msg.textContent = "Request failed";
  }
}

async function loadCredits() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/subscription/credits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const used = data.total - data.remaining;
    const bar = document.getElementById("progress-bar");
    const text = document.getElementById("progress-text");
    const percent = data.total ? Math.min(100, (used / data.total) * 100) : 0;
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${used} of ${data.total} prints used`;
    if (data.remaining === 0) {
      document.getElementById("upgrade-cta")?.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Failed to load credits", err);
  }
}

function createObserver() {
  const sentinel = document.getElementById("models-sentinel");
  if (!sentinel) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMore();
  });
  observer.observe(sentinel);
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("model-modal");
  const closeBtn = document.getElementById("close-modal");
  function close() {
    modal?.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }
  closeBtn?.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  });
  document
    .getElementById("payout-btn")
    ?.addEventListener("click", requestPayout);
  document
    .getElementById("avatar-upload")
    ?.addEventListener("click", uploadAvatar);
  document
    .getElementById("profile-form")
    ?.addEventListener("submit", saveProfile);
  document
    .getElementById("delete-account")
    ?.addEventListener("click", deleteAccount);
  createObserver();
  loadMore();
  loadDashboard();
  loadPrintOfWeek();
});
