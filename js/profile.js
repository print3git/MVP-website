import { captureSnapshots } from "./snapshot.js";
const API_BASE = (window.API_ORIGIN || "") + "/api";
function authHeaders() {
  const admin = localStorage.getItem("adminToken");
  if (admin) return { "x-admin-token": admin };
  const user = localStorage.getItem("token");
  if (user) return { Authorization: `Bearer ${user}` };
  return {};
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createCard(model) {
  const div = document.createElement("div");
  div.className =
    "model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] flex items-center justify-center cursor-pointer";
  div.dataset.model = model.model_url;
  div.dataset.job = model.job_id;
  div.innerHTML = `\n    <img src="${model.snapshot || ""}" alt="Model" class="w-full h-full object-contain pointer-events-none" />\n    <span class="sr-only">${model.prompt || "Model"}</span>\n    <button class="purchase absolute bottom-1 left-1 text-xs bg-blue-600 px-1 rounded">Reorder</button>\n    <button class="add-basket absolute bottom-1 right-1 text-xs bg-green-600 px-1 rounded">Add</button>`;
  div.querySelector(".purchase").addEventListener("click", (e) => {
    e.stopPropagation();
    localStorage.setItem("print3Model", model.model_url);
    localStorage.setItem("print3JobId", model.job_id);
    window.location.href = "payment.html";
  });
  div.querySelector(".add-basket").addEventListener("click", (e) => {
    e.stopPropagation();
    if (window.addToBasket) {
      window.addToBasket({
        jobId: model.job_id,
        modelUrl: model.model_url,
        snapshot: model.snapshot,
      });
    }
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

async function createAccount(e) {
  e.preventDefault();
  const nameEl = document.getElementById("ca-name");
  const emailEl = document.getElementById("ca-email");
  const passEl = document.getElementById("ca-pass");
  [nameEl, emailEl, passEl].forEach((el) =>
    el.classList.remove("border-red-500"),
  );
  const username = nameEl.value.trim();
  const email = emailEl.value.trim();
  const password = passEl.value.trim();
  if (!username || !email || !password) {
    document.getElementById("ca-error").textContent = "All fields required";
    if (!username) nameEl.classList.add("border-red-500");
    if (!email) emailEl.classList.add("border-red-500");
    if (!password) passEl.classList.add("border-red-500");
    return;
  }
  if (!isValidEmail(email)) {
    document.getElementById("ca-error").textContent = "Invalid email format";
    emailEl.classList.add("border-red-500");
    return;
  }
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    document.getElementById("create-account-form").classList.add("hidden");
    load();
  } else {
    document.getElementById("ca-error").textContent =
      data.error || "Signup failed";
    [nameEl, emailEl, passEl].forEach((el) =>
      el.classList.add("border-red-500"),
    );
  }
}

async function load() {
  const token = localStorage.getItem("token");
  const logoutBtn = document.getElementById("logout-btn");
  const accountLink = document.getElementById("account-link");
  if (!token) {
    document.getElementById("auth-options").classList.remove("hidden");
    logoutBtn?.classList.add("hidden");
    accountLink?.classList.add("hidden");
    return;
  } else {
    logoutBtn?.classList.remove("hidden");
    accountLink?.classList.remove("hidden");
  }
  const urlParams = new URLSearchParams(window.location.search);
  const user = urlParams.get("user");
  let endpoint = `${API_BASE}/my/models`;
  if (user) endpoint = `${API_BASE}/users/${encodeURIComponent(user)}/models`;
  const res = await fetch(endpoint, { headers: authHeaders() });
  const models = await res.json();
  const container = document.getElementById("models");
  container.innerHTML = "";

  models.forEach((m) => {
    const card = createCard(m);
    container.appendChild(card);
  });
  captureSnapshots(container);
}

async function loadProfileHeader() {
  const token = localStorage.getItem("token");
  const urlParams = new URLSearchParams(window.location.search);
  const user = urlParams.get("user");
  let endpoint;
  if (user) {
    endpoint = `${API_BASE}/users/${encodeURIComponent(user)}/profile`;
  } else {
    endpoint = `${API_BASE}/profile`;
  }
  const res = await fetch(endpoint, user ? {} : { headers: authHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  document.getElementById("profile-name").textContent =
    data.display_name || "Profile";
  const avatar = document.getElementById("profile-avatar");
  const model = document.getElementById("profile-avatar-model");
  const display = document.getElementById("profile-display");
  if (data.avatar_glb && model) {
    model.src = data.avatar_glb;
    model.classList.remove("hidden");
    avatar?.classList.add("hidden");
  } else if (avatar && data.avatar_url) {
    avatar.src = data.avatar_url;
    avatar.classList.remove("hidden");
    model?.classList.add("hidden");
  }
  if (display) display.textContent = data.display_name || "";
  if (!user && token) {
    try {
      const res2 = await fetch(`${API_BASE}/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res2.ok) {
        const d = await res2.json();
        const el = document.getElementById("sale-credit");
        if (el)
          el.textContent = `Store credit: £${(d.credit / 100).toFixed(2)}`;
      }
    } catch {}
  }
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
  const form = document.getElementById("create-account-form");
  form?.addEventListener("submit", createAccount);
  const showCreate = document.getElementById("show-create-btn");
  showCreate?.addEventListener("click", () => {
    document.getElementById("auth-options")?.classList.add("hidden");
    document.getElementById("create-account-form")?.classList.remove("hidden");
  });
  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  });
  loadProfileHeader();
  load();
});
