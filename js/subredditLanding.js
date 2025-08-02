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

function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function fetchSubredditInfo(sr) {
  try {
    const resp = await fetch(`${API_BASE}/subreddit/${encodeURIComponent(sr)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (err) {
    console.error("Failed to load subreddit data", err);
    return null;
  }
}

const FALLBACK_QUOTE = "Feels like magic";

window.addEventListener("DOMContentLoaded", async () => {
  const sr = getParam("sr") || "default";
  const viewer = document.getElementById("viewer");
  const quoteEl = document.getElementById("subreddit-quote");

  const entry = await fetchSubredditInfo(sr);
  if (entry && viewer) {
    viewer.src = entry.glb;
    localStorage.setItem("print2Model", entry.glb);
    localStorage.removeItem("print2JobId");
  }

  if (quoteEl) {
    const p = quoteEl.querySelector("p");
    if (entry && p) {
      const srName = entry.subreddit || "subreddit";
      p.innerHTML = `"${entry.quote}" – email from an <span class="text-white">r/${srName}</span> user`;
    }

    if (window.positionQuote) window.positionQuote();
  }
});
