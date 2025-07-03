const sampleGalleries = {
  "3Dprinting": [
    "https://images.unsplash.com/photo-1553490809-57316c603f4c",
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77",
    "https://images.unsplash.com/photo-1514513879393-69fb4eb0bab5",
    "https://images.unsplash.com/photo-1509475826633-fed577a2c71b",
    "https://images.unsplash.com/photo-1581349486138-7b1de31c72e8",
    "https://images.unsplash.com/photo-1554324283-cd8b571c6e10",
  ],
  PrintedMinis: [
    "https://images.unsplash.com/photo-1600393246510-7ae6818d0f70",
    "https://images.unsplash.com/photo-1561037404-61cd46aa7c1e",
    "https://images.unsplash.com/photo-1578751336048-4340d4ef9e3d",
    "https://images.unsplash.com/photo-1544436801-f1964a21c998",
    "https://images.unsplash.com/photo-1613109540925-b31e11f8bc3d",
    "https://images.unsplash.com/photo-1600534484951-464ef5de1ba8",
  ],
  functionalprint: [
    "https://images.unsplash.com/photo-1526716380160-4e0bd7d2cd7e",
    "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92",
    "https://images.unsplash.com/photo-1591781348090-95a0bd17f87e",
    "https://images.unsplash.com/photo-1584281576108-6b68d6eb0045",
    "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672",
    "https://images.unsplash.com/photo-1560019551-78c9065a0c1b",
  ],
};

window.addEventListener("DOMContentLoaded", () => {
  const tagsEl = document.getElementById("subreddit-tags");
  const grid = document.getElementById("gallery-grid");
  const loadBtn = document.getElementById("gallery-load");

  let currentTag = Object.keys(sampleGalleries)[0];
  let offset = 0;

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

  const advertModels = [
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb",
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoomBox/glTF-Binary/BoomBox.glb",
  ];
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
      "relative w-full h-64 bg-[#2A2A2E] border border-dashed border-white/40 rounded-xl flex items-center justify-center";
    advert.innerHTML = `
      <model-viewer id="advert-viewer" src="${advertModels[0]}" camera-controls auto-rotate environment-image="https://modelviewer.dev/shared-assets/environments/neutral.hdr" class="w-full h-full rounded-xl"></model-viewer>
      <button id="advert-prev" class="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white"><i class="fas fa-chevron-left"></i><span class="sr-only">Previous</span></button>
      <button id="advert-next" class="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white"><i class="fas fa-chevron-right"></i><span class="sr-only">Next</span></button>
    `;
    const viewer = advert.querySelector("#advert-viewer");
    const prevBtn = advert.querySelector("#advert-prev");
    const nextBtn = advert.querySelector("#advert-next");

    function show(delta) {
      advertIdx = (advertIdx + delta + advertModels.length) % advertModels.length;
      viewer.src = advertModels[advertIdx];
    }

    prevBtn.addEventListener("click", () => {
      stopAdvert();
      show(-1);
    });
    nextBtn.addEventListener("click", () => {
      stopAdvert();
      show(1);
    });

    advertInterval = setInterval(() => {
      show(1);
    }, 4000);
    return advert;
  }

  function renderGallery() {
    if (!grid) return;
    const urls = sampleGalleries[currentTag] || [];
    const visible = urls.slice(0, offset + 6);
    grid.innerHTML = "";

    stopAdvert();
    grid.appendChild(createAdvert());

    visible.forEach((u, idx) => {
      if (idx === 0) return;
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

  loadBtn?.addEventListener("click", () => {
    offset += 6;
    renderGallery();
  });

  renderTags();
  renderGallery();
});
