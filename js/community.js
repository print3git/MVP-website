import { captureSnapshots } from "./snapshot.js";
import {
  updatePrintRunInfo,
  adjustedSlots,
  computeSlotsByTime,
} from "./print-slots.js";

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

const OPEN_KEY = "print2CommunityOpen";
const FALLBACK_GLB =
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

const PRINT_RUN_OVERLAY_CLASS = "print-run-indicator";
const PRINT_RUN_TZ = "America/New_York";
const PRINT_RUN_TARGETS = [
  { id: "popular-grid", count: 2 },
  { id: "gallery-grid", count: 1 },
  { id: "recent-grid", count: 1 },
];
let printRunBaseSlots = computeSlotsByTime();
let activeCycleKey = getCycleKeyForCommunity();

function getCycleKeyForCommunity() {
  const now = new Date();
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: PRINT_RUN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: PRINT_RUN_TZ,
    hour: "numeric",
    hour12: false,
  });
  const dateStr = dateFmt.format(now);
  const hour = parseInt(hourFmt.format(now), 10);
  if (hour < 1) {
    const prev = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return dateFmt.format(prev);
  }
  return dateStr;
}

function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getCardSectionId(card) {
  const section = card.closest("#popular-grid, #gallery-grid, #recent-grid");
  return section?.id || "";
}

function scoreCard(card, index, key) {
  const identifier = `${card.dataset.model || ""}|${card.dataset.job || ""}`;
  return hashString(`${key}|${identifier}|${index}`);
}

function selectCardsForOverlay(cards, key) {
  if (!cards.length) return [];
  const entries = cards.map((card, index) => ({
    card,
    section: getCardSectionId(card),
    score: scoreCard(card, index, key),
  }));

  const chosen = new Set();
  const selected = [];

  PRINT_RUN_TARGETS.forEach(({ id, count }) => {
    if (!count) return;
    const sectionCards = entries
      .filter((entry) => entry.section === id)
      .sort((a, b) => a.score - b.score);
    for (let i = 0; i < Math.min(count, sectionCards.length); i += 1) {
      const card = sectionCards[i].card;
      if (chosen.has(card)) continue;
      chosen.add(card);
      selected.push(sectionCards[i]);
    }
  });

  if (selected.length < Math.min(4, entries.length)) {
    const remaining = entries
      .filter((entry) => !chosen.has(entry.card))
      .sort((a, b) => a.score - b.score);
    for (const entry of remaining) {
      chosen.add(entry.card);
      selected.push(entry);
      if (selected.length >= Math.min(4, entries.length)) break;
    }
  }

  return selected.map((entry) => entry.card).slice(0, 4);
}

function getAdjustedSlotsCount() {
  return adjustedSlots(printRunBaseSlots);
}

function updateOverlayText() {
  const slots = getAdjustedSlotsCount();
  document
    .querySelectorAll(`.${PRINT_RUN_OVERLAY_CLASS} [data-print-run-slots]`)
    .forEach((el) => {
      el.textContent = slots;
    });
}

function ensureOverlay(card) {
  let overlay = card.querySelector(`.${PRINT_RUN_OVERLAY_CLASS}`);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = `${PRINT_RUN_OVERLAY_CLASS} absolute top-2 left-2 text-xs sm:text-sm text-red-400 leading-snug font-semibold pointer-events-none`;
    overlay.innerHTML =
      'Only <span data-print-run-slots></span> prints remaining';
    card.appendChild(overlay);
  }
  return overlay;
}

function applyPrintRunHighlights() {
  const allCards = Array.from(
    document.querySelectorAll(
      ".model-card:not(.viewer-card)[data-model]",
    ),
  );
  const key = getCycleKeyForCommunity();
  const selectedCards = selectCardsForOverlay(allCards, key);
  const selectedSet = new Set(selectedCards);

  allCards.forEach((card) => {
    const overlay = card.querySelector(`.${PRINT_RUN_OVERLAY_CLASS}`);
    if (overlay && !selectedSet.has(card)) {
      overlay.remove();
    }
  });

  selectedCards.forEach((card) => {
    ensureOverlay(card);
  });

  updateOverlayText();
}

async function refreshPrintRunInfo() {
  const base = await updatePrintRunInfo();
  if (typeof base === "number") {
    printRunBaseSlots = base;
  } else {
    printRunBaseSlots = computeSlotsByTime();
  }
  updateOverlayText();
  const key = getCycleKeyForCommunity();
  if (key !== activeCycleKey) {
    activeCycleKey = key;
    applyPrintRunHighlights();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  refreshPrintRunInfo();
  window.setInterval(refreshPrintRunInfo, 60000);
});

function handleModelError(e) {
  const img = document.createElement("img");
  img.src = "images/box logo.png";
  img.alt = "3D model preview unavailable";
  img.className = e.target.className;
  e.target.replaceWith(img);
}

function addBasketModel(model) {
  if (window.addToBasket) {
    window.addToBasket({
      jobId: model.job_id,
      modelUrl: model.model_url,
      snapshot: model.snapshot || "",
    });
  }
}

const SEARCH_DELAY = 300;

const STATE_KEY = "print2CommunityState";

async function fetchComments(id) {
  try {
    const res = await fetch(`${API_BASE}/community/${id}/comments`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch comments", err);
    return [];
  }
}

async function postComment(id, text) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Login required");
    return null;
  }
  try {
    const res = await fetch(`${API_BASE}/community/${id}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to post comment", err);
    return null;
  }
}

function loadState() {
  try {
    const data = localStorage.getItem(STATE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Failed to parse saved community state", err);
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(window.communityState));
  } catch (err) {
    console.error("Failed to save community state", err);
  }
}

async function renderComments(id) {
  const list = document.getElementById("comments-list");
  if (!list) return;
  list.innerHTML = "";
  const comments = await fetchComments(id);
  comments.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = `${c.username}: ${c.text}`;
    list.appendChild(li);
  });
}

/**
 * Return a function that delays invoking `fn` until after `delay` ms
 * have elapsed since the last invocation.
 * @param {Function} fn
 * @param {number} delay
 */
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
var fetchCreations = window.fetchCreations;
if (!fetchCreations)
  fetchCreations = async function (
    type,
    offset = 0,
    limit = 9,
    category = "",
    search = "",
    order = "desc",
  ) {
    const query = new URLSearchParams({ limit, offset });
    if (category) query.set("category", category);
    if (search) query.set("search", search);
    if (order && type === "recent") query.set("order", order);
    try {
      const res = await fetch(`${API_BASE}/community/${type}?${query}`);
      if (!res.ok) throw new Error("bad response");
      return await res.json();
    } catch (err) {
      console.error("Failed to fetch creations", err);
      return [];
    }
  };

var getFallbackModels = window.getFallbackModels;
if (!getFallbackModels)
  getFallbackModels = function (count = 9, start = 0) {
    const base =
      "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0";

    const samples = [
      { name: "DamagedHelmet", ext: "png" },
      { name: "BoomBox", ext: "jpg" },
      { name: "BarramundiFish", ext: "jpg" },
      // FlightHelmet lacks a GLB; use a different sample that definitely has one
      { placeholder: true },
      { name: "Avocado", ext: "jpg" },
      { name: "AntiqueCamera", ext: "png" },
      { name: "Lantern", ext: "jpg" },
      { name: "WaterBottle", ext: "jpg" },
      { name: "Corset", ext: "jpg" },
      { name: "ToyCar", ext: "jpg" },
      { name: "Duck", ext: "png" },
      { name: "CesiumMan", ext: "gif" },
      { name: "2CylinderEngine", ext: "png" },
      { name: "SheenChair", ext: "jpg" },
      { name: "IridescenceLamp", ext: "jpg" },
      { name: "ReciprocatingSaw", ext: "png" },
      { name: "VertexColorTest", ext: "png" },
      { name: "CesiumMilkTruck", ext: "gif" },
    ];

    return samples.slice(start, start + count).map((s, i) => {
      const id = `fallback-${start + i}`;
      if (s.placeholder) {
        return { placeholder: true, id, job_id: id };
      }
      return {
        model_url: `${base}/${s.name}/glTF-Binary/${s.name}.glb`,
        id,
        job_id: id,
        snapshot: `${base}/${s.name}/screenshot/screenshot.${s.ext}`,
      };
    });
  };

const prefetchedModels = new Set();
function prefetchModel(url) {
  if (prefetchedModels.has(url)) return;
  const link = document.createElement("link");
  // Preload with low priority to reduce initial page load cost
  link.rel = "preload";
  link.href = url;
  link.as = "fetch";
  link.crossOrigin = "anonymous";
  link.fetchPriority = "low";
  document.head.appendChild(link);
  prefetchedModels.add(url);
}

function openModel(model) {
  const modal = document.getElementById("model-modal");
  const viewer = modal.querySelector("model-viewer");
  viewer?.addEventListener("error", handleModelError);
  const checkoutBtn = document.getElementById("modal-checkout");
  const addBasketBtn = document.getElementById("modal-add-basket");
  const submitBtn = document.getElementById("comment-submit");
  const input = document.getElementById("comment-input");
  viewer.setAttribute("poster", model.snapshot || "");
  viewer.setAttribute("fetchpriority", "high");
  viewer.setAttribute("loading", "eager");
  viewer.src = model.model_url;
  if (checkoutBtn) {
    checkoutBtn.dataset.model = model.model_url;
    checkoutBtn.dataset.job = model.job_id;
  }
  if (addBasketBtn) {
    addBasketBtn.dataset.model = model.model_url;
    addBasketBtn.dataset.job = model.job_id;
    addBasketBtn.dataset.snapshot = model.snapshot || "";
  }
  const copyBtn = document.getElementById("modal-copy-link");
  if (copyBtn) {
    copyBtn.dataset.id = model.id;
  }
  if (submitBtn) {
    submitBtn.dataset.id = model.id;
    input.value = "";
    renderComments(model.id);
  }
  window.setTier?.("bronze");
  const tierToggle = document.getElementById("tier-toggle");
  if (tierToggle) {
    tierToggle.querySelectorAll("button[data-tier]").forEach((btn) => {
      const isBronze = btn.dataset.tier === "bronze";
      btn.disabled = !isBronze;
      btn.classList.toggle("cursor-not-allowed", !isBronze);
    });
  }
  modal.classList.remove("hidden");
  const closeBtn = document.getElementById("close-modal");
  const svg = closeBtn?.querySelector("svg");
  if (closeBtn) {
    closeBtn.classList.remove("w-[9rem]", "h-[9rem]");
    closeBtn.classList.add("w-[4.5rem]", "h-[4.5rem]");
  }
  if (svg) {
    svg.classList.remove("w-20", "h-20");
    svg.classList.add("w-10", "h-10");
  }
  document.body.classList.add("overflow-hidden");
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(model));
  } catch (err) {
    console.error("Failed to save open model", err);
  }
}

function closeModel() {
  const modal = document.getElementById("model-modal");
  modal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
  localStorage.removeItem(OPEN_KEY);
}

function restoreOpenModel() {
  try {
    const data = localStorage.getItem(OPEN_KEY);
    if (!data) return;
    const model = JSON.parse(data);
    if (model) openModel(model);
  } catch (err) {
    console.error("Failed to restore open model", err);
  }
}

async function copyReferral(id) {
  let ref = "";
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/referral-link`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        ref = `?ref=${encodeURIComponent(d.code)}`;
      }
    } catch (err) {
      console.error("Failed to fetch referral", err);
    }
  }
  const url = `https://prints3.com/item/${id}${ref}`;
  await navigator.clipboard.writeText(url);
}

async function loadReferralLink() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/referral-link`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { code } = await res.json();
      document.querySelectorAll(".referral-link").forEach((input) => {
        input.value = `${window.location.origin}?ref=${code}`;
      });
    }
  } catch (err) {
    console.error("Failed to fetch referral link", err);
  }
}

function copyReferralLink(e) {
  const input = e?.currentTarget?.previousElementSibling;
  input?.select();
  document.execCommand("copy");
}

function createCard(model) {
  const div = document.createElement("div");
  div.className =
    "model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl flex items-center justify-center";
  if (model.placeholder) {
    div.className =
      "model-card relative min-h-32 bg-[#2A2A2E] border border-dashed border-white/40 rounded-xl flex flex-col items-center justify-center text-sm pt-4 pb-14";
    const loggedIn = !!localStorage.getItem("token");
    const msg = loggedIn
      ? '<p class="text-white">Earn <span class="text-[#30D5C8]">free prints</span></p>'
      : '<p class="text-white">Sign up to earn <span class="text-[#30D5C8]">free prints</span>.</p>';
    const link = loggedIn ? "earn-rewards.html" : "signup.html";
    const btnText = loggedIn ? "Earn Rewards" : "Sign Up";
    div.innerHTML =
      msg +
      `<a href="${link}" class="absolute bottom-4 left-1/2 font-bold text-lg py-1.5 px-4 rounded-full shadow-md transition border-2 border-black inline-block" style="background-color: #30D5C8; color: #1A1A1D; transform: translateX(-50%) scale(0.78);" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${btnText}</a>`;
    return div;
  }
  div.classList.add("hover:bg-[#3A3A3E]", "transition-shape", "cursor-pointer");
  div.dataset.model = model.model_url;
  div.dataset.job = model.job_id;

  div.innerHTML = `\n      <img src="${model.snapshot || ""}" alt="Model" loading="lazy" fetchpriority="low" class="w-full h-full object-contain pointer-events-none" />\n      <span class="sr-only">${model.title || "Model"}</span>\n      <button class="add-basket absolute bottom-1 left-1 font-bold text-lg py-1.5 px-4 rounded-full shadow-md transition border-2 border-black bg-[#30D5C8] text-[#1A1A1D]" style="transform: scale(0.78); transform-origin: left bottom;">Add to Basket</button>\n      <button class="purchase absolute bottom-1 right-1 font-bold text-lg py-1.5 px-4 rounded-full shadow-md transition border-2 border-black bg-[#30D5C8] text-[#1A1A1D]" style="transform: scale(0.78); transform-origin: right bottom;">Buy from £29.99</button>`;

  div.querySelector(".purchase").addEventListener("click", (e) => {
    e.stopPropagation();
    sessionStorage.setItem("fromCommunity", "1");
    localStorage.setItem("print2Model", model.model_url);
    localStorage.setItem("print2JobId", model.job_id);
    localStorage.removeItem("print2Basket");
    try {
      localStorage.setItem(
        "print2CheckoutItems",
        JSON.stringify([
          {
            modelUrl: model.model_url,
            jobId: model.job_id,
            snapshot: model.snapshot || "",
          },
        ]),
      );
    } catch {}
    window.location.href = "payment.html";
  });
  const basketBtn = div.querySelector(".add-basket");
  basketBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    addBasketModel(model);
  });
  div.addEventListener("pointerenter", () => prefetchModel(model.model_url));
  div.addEventListener("click", (e) => {
    e.stopPropagation();
    openModel(model);
  });
  return div;
}

function createViewerCard(modelUrl) {
  const div = document.createElement("div");
  div.className =
    "viewer-card model-card relative bg-[#2A2A2E] border border-white/10 rounded-xl flex items-stretch justify-center cursor-pointer h-full row-span-1 sm:row-span-2 sm:col-start-2 md:row-span-3 md:col-start-3";

  div.dataset.model = modelUrl;
  div.innerHTML = `<span class="absolute top-2 left-2 z-10 text-xs sm:text-sm font-semibold text-red-400 bg-black/60 px-3 py-1 rounded-full pointer-events-none">🔥 Bestseller</span>\n    <model-viewer src="${modelUrl}" alt="3D model preview" poster="images/box logo.png" environment-image="https://modelviewer.dev/shared-assets/environments/neutral.hdr" camera-controls auto-rotate loading="lazy" class="w-full h-full min-h-0 flex-1 bg-[#2A2A2E] rounded-xl"></model-viewer>\n    <button class="purchase absolute bottom-1 right-1 font-bold text-lg py-1.5 px-4 rounded-full shadow-md transition border-2 border-black bg-[#30D5C8] text-[#1A1A1D]" style="transform: scale(0.78); transform-origin: right bottom;">Buy from £29.99</button>`;
  const viewer = div.querySelector("model-viewer");
  viewer.addEventListener("error", handleModelError);
  div.addEventListener("pointerenter", () => prefetchModel(modelUrl));
  div.addEventListener("click", (e) => {
    // Avoid opening the modal when rotating the model preview
    if (!e.target.closest("model-viewer")) {
      e.stopPropagation();
      openModel({ model_url: modelUrl, job_id: "" });
    }
  });
  div.querySelector(".purchase")?.addEventListener("click", (e) => {
    e.stopPropagation();
    sessionStorage.setItem("fromCommunity", "1");
    localStorage.setItem("print2Model", modelUrl);
    localStorage.setItem("print2JobId", "");
    localStorage.removeItem("print2Basket");
    try {
      localStorage.setItem(
        "print2CheckoutItems",
        JSON.stringify([{ modelUrl, jobId: "", snapshot: "" }]),
      );
    } catch {}
    window.location.href = "payment.html";
  });
  return div;
}

function applyPopularViewer() {
  const grid = document.getElementById("popular-grid");
  if (!grid) return;

  const cards = Array.from(
    grid.querySelectorAll(".model-card:not(.viewer-card)"),
  ).filter((card) => !card.classList.contains("popular-referral"));

  const models = cards.filter((card) => card.dataset.model);
  if (models.length < 2) return;

  const modelCard = models[1];
  const modelUrl = modelCard?.dataset?.model;
  if (!modelUrl) return;

  const nextViewer = createViewerCard(modelUrl);
  const existingViewer = grid.querySelector(".viewer-card");
  if (existingViewer) {
    existingViewer.replaceWith(nextViewer);
    return;
  }

  const columns = getColumnCount(grid);
  if (columns < 1) {
    grid.appendChild(nextViewer);
    return;
  }

  const targetColumn = Math.min(columns, 3) - 1;
  if (targetColumn < 0) {
    grid.appendChild(nextViewer);
    return;
  }

  grid.appendChild(nextViewer);
  const viewerSpan = Math.max(1, getRowSpan(nextViewer));
  nextViewer.remove();

  const overlapping = [];
  for (let row = 0; row < viewerSpan; row += 1) {
    const index = row * columns + targetColumn;
    const card = models[index];
    if (card && card !== modelCard) overlapping.push(card);
  }

  const reference = overlapping[0] || models[targetColumn] || null;
  if (reference) grid.insertBefore(nextViewer, reference);
  else grid.appendChild(nextViewer);

  overlapping.forEach((card) => card.remove());
  overlapping.forEach((card) => grid.appendChild(card));
}

function getColumnCount(grid) {
  const template = window.getComputedStyle(grid).gridTemplateColumns || "";
  const repeatMatch = template.match(/repeat\((\d+)/);
  if (repeatMatch) return parseInt(repeatMatch[1], 10) || 1;
  const parts = template.split(" ").filter((part) => part.trim());
  return parts.length || 1;
}

function getRowSpan(element) {
  if (!element) return 0;
  const rowEnd = window.getComputedStyle(element).gridRowEnd || "";
  const match = rowEnd.match(/span\s*(\d+)/i);
  if (match) {
    const span = parseInt(match[1], 10);
    if (!Number.isNaN(span) && span > 0) return span;
  }
  return element.classList.contains("viewer-card") ? 3 : 1;
}

function getPopularRemainder() {
  const grid = document.getElementById("popular-grid");
  if (!grid) return 0;
  const columns = getColumnCount(grid);
  if (!columns || columns <= 1) return 0;
  const viewer = grid.querySelector(".viewer-card");
  const advert = grid.querySelector(".popular-referral");
  const cards = grid.querySelectorAll(".model-card:not(.viewer-card)");
  const units =
    cards.length +
    (viewer ? getRowSpan(viewer) : 0) +
    (advert ? getRowSpan(advert) : 0);
  return units % columns;
}

function balancePopularGrid(state, adjustOffset = false) {
  const grid = document.getElementById("popular-grid");
  if (!grid || !state) return 0;

  const remainder = getPopularRemainder();
  if (!remainder) return 0;

  const cards = Array.from(
    grid.querySelectorAll(".model-card:not(.viewer-card)"),
  );
  let removed = 0;
  while (cards.length && removed < remainder) {
    const last = cards.pop();
    if (!last) break;
    last.remove();
    removed += 1;
    if (state.models && state.models.length) state.models.pop();
    if (
      adjustOffset &&
      typeof state.offset === "number" &&
      state.offset > 0
    ) {
      state.offset = Math.max(0, state.offset - 1);
    }
  }
  return removed;
}

function applyRecentViewer() {
  const grid = document.getElementById("recent-grid");
  if (!grid) return;

  const existingViewer = grid.querySelector(".viewer-card");
  if (existingViewer) existingViewer.remove();

  const firstModel = Array.from(grid.children).find((c) => c.dataset?.model);
  if (!firstModel) return;

  const modelUrl = firstModel.dataset.model;

  const viewer = createViewerCard(modelUrl);

  const insertBefore = firstModel;
  if (insertBefore) grid.insertBefore(viewer, insertBefore);
  else grid.appendChild(viewer);
}

function addRecentModel(model) {
  if (!model || model.model_url === FALLBACK_GLB) return;
  const grid = document.getElementById("recent-grid");
  if (!grid) return;
  const card = createCard(model);
  grid.prepend(card);
  const filters = getFilters();
  if (
    !filters.search &&
    (!filters.category || filters.category === model.category)
  ) {
    const key = `${filters.category}|${filters.search}|${filters.order}`;
    const cache = window.communityState.recent;
    if (!cache[key]) cache[key] = { offset: 0, models: [] };
    cache[key].models.unshift(model);
    cache[key].offset += 1;
    saveState();
  }
  captureSnapshots(grid);
  applyRecentViewer();
  applyPrintRunHighlights();
}

function getFilters() {
  const category = document.getElementById("category").value;
  const search = document.getElementById("search")?.value || "";
  const order = "desc";
  return { category, search, order, key: `${category}|${search}|${order}` };
}

async function loadMore(type, filters = getFilters()) {
  const { category, search, order, key } = filters;
  const cache = window.communityState[type];
  if (!cache[key]) cache[key] = { offset: 0, models: [] };
  const state = cache[key];
  const offsetBefore = state.offset;
  const isPopular = type === "popular";
  const isRecent = type === "recent";
  const baseLimit = isRecent && offsetBefore === 0 ? 8 : isPopular ? 12 : 9;
  const grid = document.getElementById(`${type}-grid`);
  if (!grid) return;

  if (!isPopular) {
    let models = await fetchCreations(
      type,
      state.offset,
      baseLimit,
      category,
      search,
      order,
    );
    if (models.length === 0) {
      models = getFallbackModels(baseLimit, state.offset);
    }
    const fetchedCount = models.length;
    models = models.filter(
      (m) => m && (m.placeholder || (m.model_url && m.snapshot)),
    );
    state.offset += fetchedCount;
    state.models = state.models.concat(models);
    models.forEach((m) => grid.appendChild(createCard(m)));
    await captureSnapshots(grid);
    if (isRecent) applyRecentViewer();
    const btn = document.getElementById(`${type}-load`);
    if (btn) {
      if (models.length < baseLimit) {
        btn.classList.add("hidden");
      } else {
        btn.classList.remove("hidden");
      }
    }
    if (isRecent) {
      const hasViewer = !!grid.querySelector(".viewer-card");
      let models = Array.from(
        grid.querySelectorAll(".model-card:not(.viewer-card)"),
      );
      const base = hasViewer ? 5 : 0;
      while ((models.length - base) % 3 !== 0) {
        const last = models.pop();
        if (!last) break;
        last.remove();
        state.models.pop();
        state.offset -= 1;
      }
    }
    saveState();
    return;
  }

  let limit = baseLimit;
  let iterations = 0;
  let appended = 0;
  let reachedEnd = false;
  while (iterations < 10) {
    let models = await fetchCreations(
      type,
      state.offset,
      limit,
      category,
      search,
      order,
    );
    const fetchedCount = models.length;
    if (fetchedCount === 0) {
      reachedEnd = true;
      models = getFallbackModels(limit, state.offset);
    }
    models = models.filter(
      (m) => m && (m.placeholder || (m.model_url && m.snapshot)),
    );
    if (fetchedCount) state.offset += fetchedCount;
    if (models.length) {
      state.models = state.models.concat(models);
      models.forEach((m) => grid.appendChild(createCard(m)));
      appended += models.length;
    }

    applyPopularViewer();
    const columns = getColumnCount(grid);
    const remainder = getPopularRemainder();
    if (!remainder) {
      reachedEnd = fetchedCount < limit || reachedEnd;
      break;
    }
    if (fetchedCount === 0 || fetchedCount < limit) {
      reachedEnd = true;
      balancePopularGrid(state, true);
      break;
    }
    const complement = columns - remainder;
    if (complement <= 0) {
      iterations += 1;
      continue;
    }
    limit = complement;
    iterations += 1;
  }

  await captureSnapshots(grid);
  applyPopularViewer();
  if (getPopularRemainder()) {
    balancePopularGrid(state, true);
    applyPopularViewer();
  }
  const btn = document.getElementById(`${type}-load`);
  if (btn) {
    if (appended === 0 || reachedEnd) {
      btn.classList.add("hidden");
    } else {
      btn.classList.remove("hidden");
    }
  }
  saveState();
  applyPrintRunHighlights();
}

function renderGrid(type, filters = getFilters()) {
  const { key } = filters;
  const grid = document.getElementById(`${type}-grid`);
  grid.innerHTML = "";
  if (type === "recent" || type === "popular") {
    const advert = document.createElement("div");
    advert.className =
      type === "recent"
        ? "w-full min-h-32 bg-[#2A2A2E] border border-dashed border-white/40 rounded-xl flex items-center justify-center text-sm p-2 row-start-1 sm:col-start-2 md:col-start-3"
        : "w-full min-h-32 bg-[#2A2A2E] border border-dashed border-white/40 rounded-xl flex items-center justify-center text-sm p-2 row-start-3 sm:col-start-2 md:col-start-2";
    advert.classList.add("flex-col");
    if (type === "popular") advert.classList.add("popular-referral");
    const loggedIn = !!localStorage.getItem("token");
    const inputClass =
      "flex-1 bg-[#1A1A1D] border border-white/10 rounded-l-xl px-3 py-2 text-white placeholder-gray-500" +
      (loggedIn ? "" : " cursor-default pointer-events-none");
    const btnClass =
      "bg-[#30D5C8] text-[#1A1A1D] px-4 rounded-r-xl" +
      (loggedIn ? "" : " opacity-50 cursor-default pointer-events-none");
    const btnHandler = loggedIn ? ' onclick="copyReferralLink(event)"' : "";
    const inputId =
      type === "recent" ? "referral-link-recent" : "referral-link";
    advert.innerHTML =
      '<p class="mb-2 text-center text-white">Earn <span class="text-[#30D5C8]">£5 credit</span> when someone buys with your link.</p>' +
      '<div class="space-y-1 w-full max-w-xs">' +
      `<label for="${inputId}" class="block text-sm">Your referral link:</label>` +
      '<div class="flex">' +
      `<input id="${inputId}" aria-label="Referral link" class="referral-link ${inputClass}" placeholder="Log in to get your link" readonly />` +
      `<button aria-label="Copy referral link" class="${btnClass}"${btnHandler}>Copy</button>` +
      "</div></div>";
    grid.appendChild(advert);
  } else {
    const advert = document.createElement("div");
    advert.className =
      "w-full min-h-32 bg-[#2A2A2E] border border-dashed border-white/40 rounded-xl flex flex-col items-center justify-center text-sm row-start-3 sm:col-start-2 md:col-start-2";
    advert.classList.add("text-center");
    advert.innerHTML =
      '<p class="text-white"><span class="text-[#30D5C8]">£7 off</span> your 2nd and <span class="text-[#30D5C8]">£15 off</span> 3rd item you buy from this page.</p>' +
      '<a href="payment.html" class="absolute bottom-4 left-1/2 font-bold text-lg py-1.5 px-4 rounded-full shadow-md transition border-2 border-black inline-block" style="background-color: #30D5C8; color: #1A1A1D; transform: translateX(-50%) scale(0.78);" onmouseover="this.style.opacity=\'0.85\'" onmouseout="this.style.opacity=\'1\'">Buy Current Basket →</a>';
    grid.appendChild(advert);
  }
  let state = window.communityState[type][key];
  if (state && state.models.length) {
    state.models.forEach((m) => grid.appendChild(createCard(m)));
    captureSnapshots(grid);
    if (type === "recent") applyRecentViewer();
    if (type === "popular") applyPopularViewer();
    if (type === "popular") balancePopularGrid(state);
    const btn = document.getElementById(`${type}-load`);
    if (btn) {
      const threshold = 8;
      if (state.models.length < threshold) btn.classList.add("hidden");
      else btn.classList.remove("hidden");
    }
  } else {
    loadMore(type, filters);
    state = window.communityState[type][key];
  }
  if (state) state.loading = false;
  applyPrintRunHighlights();
}

// IntersectionObserver support has been removed in favor of explicit "More"
// buttons. The following function is left in place for potential future use
// but is no longer invoked.
function createObserver(type) {
  const sentinel = document.getElementById(`${type}-sentinel`);
  if (!sentinel) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      loadMore(type);
    }
  });
  observer.observe(sentinel);
  window.communityState[type].observer = observer;
}

async function subscribeRealtime() {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (!url || !key) return;
  const { createClient } = await import(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"
  );
  const supabase = createClient(url, key);
  supabase
    .channel("community_creations")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "community_creations" },
      async (payload) => {
        const id = payload.new.id;
        try {
          const res = await fetch(`${API_BASE}/community/model/${id}`);
          if (!res.ok) return;
          const model = await res.json();
          addRecentModel(model);
        } catch {}
      },
    )
    .subscribe();
}

function init() {
  let navType = "navigate";
  if (typeof performance !== "undefined") {
    const entries = performance.getEntriesByType?.("navigation") || [];
    if (entries.length && entries[0].type) {
      navType = entries[0].type;
    } else if (performance.navigation) {
      if (performance.navigation.type === 1) navType = "reload";
      else if (performance.navigation.type === 2) navType = "back_forward";
    }
  }
  if (navType !== "reload") {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(OPEN_KEY);
  }

  const saved = loadState();
  window.communityState = saved || { recent: {}, popular: {} };

  const popBtn = document.getElementById("popular-load");
  if (popBtn) popBtn.addEventListener("click", () => loadMore("popular"));
  const recentBtn = document.getElementById("recent-load");
  if (recentBtn) recentBtn.addEventListener("click", () => loadMore("recent"));
  const form = document.getElementById("comment-form");
  if (form && !localStorage.getItem("token")) {
    form.classList.add("hidden");
  }
  const submitBtn = document.getElementById("comment-submit");
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const id = submitBtn.dataset.id;
      const input = document.getElementById("comment-input");
      const text = input.value.trim();
      if (!id || !text) return;
      const res = await postComment(id, text);
      if (res) {
        input.value = "";
        renderComments(id);
      }
    });
  }
  document.getElementById("category").addEventListener("change", () => {
    document.getElementById("recent-grid").innerHTML = "";
    document.getElementById("popular-grid").innerHTML = "";
    window.communityState = { recent: {}, popular: {} };
    saveState();
    renderGrid("popular");
    renderGrid("recent");
  });
  const searchInput = document.getElementById("search");
  if (searchInput) {
    function onSearchInput() {
      document.getElementById("recent-grid").innerHTML = "";
      document.getElementById("popular-grid").innerHTML = "";
      window.communityState = { recent: {}, popular: {} };
      saveState();
      renderGrid("popular");
      renderGrid("recent");
    }

    searchInput.addEventListener(
      "input",
      debounce(onSearchInput, SEARCH_DELAY),
    );
  }
  renderGrid("popular");
  renderGrid("recent");
  subscribeRealtime();
}

export {
  addBasketModel,
  init,
  closeModel,
  restoreOpenModel,
  copyReferral,
  loadReferralLink,
  copyReferralLink,
};
