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

  function renderGallery() {
    if (!grid) return;
    const urls = sampleGalleries[currentTag] || [];
    const visible = urls.slice(0, offset + 6);
    grid.innerHTML = "";
    visible.forEach((u) => {
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
