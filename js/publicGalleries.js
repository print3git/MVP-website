const sampleGalleries = {
  "3Dprinting": [
    "https://images.unsplash.com/photo-1553490809-57316c603f4c?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1514513879393-69fb4eb0bab5?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1509475826633-fed577a2c71b?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1581349486138-7b1de31c72e8?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1554324283-cd8b571c6e10?auto=compress&fit=crop&w=400&h=300",
  ],
  PrintedMinis: [
    "https://images.unsplash.com/photo-1600393246510-7ae6818d0f70?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1561037404-61cd46aa7c1e?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1578751336048-4340d4ef9e3d?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1544436801-f1964a21c998?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1613109540925-b31e11f8bc3d?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1600534484951-464ef5de1ba8?auto=compress&fit=crop&w=400&h=300",
  ],
  functionalprint: [
    "https://images.unsplash.com/photo-1526716380160-4e0bd7d2cd7e?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1591781348090-95a0bd17f87e?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1584281576108-6b68d6eb0045?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=compress&fit=crop&w=400&h=300",
    "https://images.unsplash.com/photo-1560019551-78c9065a0c1b?auto=compress&fit=crop&w=400&h=300",
  ],
};

function ensureModelViewerLoaded() {
  if (
    window.customElements &&
    typeof window.customElements.get === "function" &&
    window.customElements.get("model-viewer")
  ) {
    return Promise.resolve();
  }
  const cdnUrl =
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js";
  const localUrl = "js/model-viewer.min.js";
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = cdnUrl;
    s.onload = resolve;
    s.onerror = () => {
      s.remove();
      const fallback = document.createElement("script");
      fallback.type = "module";
      fallback.src = localUrl;
      fallback.onload = resolve;
      fallback.onerror = resolve;
      document.head.appendChild(fallback);
    };
    document.head.appendChild(s);
    setTimeout(() => {
      if (
        !(
          window.customElements &&
          typeof window.customElements.get === "function" &&
          window.customElements.get("model-viewer")
        )
      ) {
        s.onerror();
      }
    }, 3000);
  });
}

async function init() {
  await ensureModelViewerLoaded();
  const tagsEl = document.getElementById("subreddit-tags");
  const grid = document.getElementById("gallery-grid");
  const loadBtn = document.getElementById("gallery-load");

  const API_BASE = (window.API_ORIGIN || "") + "/api";
  const fallbackAdvertModels = [
    "models/bag.glb",
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb",
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
  ];
  let advertModels = [...fallbackAdvertModels];
  let currentTag = Object.keys(sampleGalleries)[0];
  let offset = 0;

  async function loadAdvertModels() {
    try {
      const res = await fetch(`${API_BASE}/community/popular?limit=3`);
      if (res.ok) {
        const data = await res.json();
        const urls = data.map((m) => m.model_url).filter(Boolean);
        if (urls.length) advertModels = urls;
      }
    } catch (err) {
      console.error("Failed to load advert models", err);
    }
  }

  function renderTags() {
    if (!tagsEl) return;
    tagsEl.innerHTML = "";
    Object.keys(sampleGalleries).forEach((tag) => {
      const btn = document.createElement("button");
      btn.textContent = `r/${tag}`;
      btn.className =
        "px-3 py-1 border border-white/20 rounded-full whitespace-nowrap";
      if (tag === currentTag) btn.classList.add("bg-[#3A3A3E]");
      else btn.classList.add("bg-[#2A2A2E]");
      btn.addEventListener("click", () => {
        currentTag = tag;
        offset = 0;
        renderGallery();
        renderTags();
      });
      tagsEl.appendChild(btn);
    });
  }

  // Populated by loadAdvertModels()
  let advertIdx = 0;
  let advertInterval;

  function stopAdvert() {
    if (advertInterval) {
      clearInterval(advertInterval);
      advertInterval = null;
    }
  }

  function createAdvert() {
    const advert = document.createElement("div");
    advert.className =
      "relative w-full h-32 bg-[#2A2A2E] border border-dashed border-white/40 rounded-xl flex items-center justify-center text-gray-400";
    advert.textContent = "placeholder";
    return advert;
  }

  function renderGallery() {
    if (!grid) return;
    const urls = sampleGalleries[currentTag] || [];
    const visible = urls.slice(0, offset + 6);
    grid.innerHTML = "";

    stopAdvert();

    visible.forEach((u, idx) => {
      if (idx === 4) {
        grid.appendChild(createAdvert());
        return;
      }
      const img = document.createElement("img");
      img.src = u;
      img.loading = "lazy";
      img.alt = "Community creation";
      img.className = "w-full h-32 object-cover rounded-xl";
      grid.appendChild(img);
    });
    offset = visible.length;
    if (loadBtn) {
      if (offset >= urls.length) loadBtn.classList.add("hidden");
      else loadBtn.classList.remove("hidden");
    }
  }

  if (loadBtn) {
    loadBtn.addEventListener("click", () => {
      offset += 6;
      renderGallery();
    });
  }

  async function start() {
    await loadAdvertModels();
    renderTags();
    renderGallery();
  }

  start();
}

if (document.readyState !== "loading") init();
else document.addEventListener("DOMContentLoaded", init);
