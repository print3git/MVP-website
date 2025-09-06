const PRINTS_MIN = 30;
const PRINTS_MAX = 50;
const TZ = "America/New_York";
const UINT32_MAX = 0xffffffff;

async function computeDailyPrintsSold(date = new Date()) {
  const eastern = new Date(date.toLocaleString("en-US", { timeZone: TZ }));
  const dateStr = eastern.toISOString().slice(0, 10);
  let int;
  if (crypto?.subtle?.digest) {
    const data = new TextEncoder().encode(dateStr);
    const hash = await crypto.subtle.digest("SHA-256", data);
    int = new DataView(hash).getUint32(0);
  } else {
    int = 0;
    for (let i = 0; i < dateStr.length; i++) {
      int = (int * 31 + dateStr.charCodeAt(i)) >>> 0;
    }
  }
  const rand = int / UINT32_MAX;
  return Math.floor(rand * (PRINTS_MAX - PRINTS_MIN + 1)) + PRINTS_MIN;
}

document.addEventListener("DOMContentLoaded", async () => {
  const el = document.getElementById("stats-ticker");
  if (!el) return;
  const prints = await computeDailyPrintsSold();
  el.textContent = "";
  const icon = document.createElement("i");
  icon.className = "fas fa-fire mr-1";
  el.appendChild(icon);
  el.appendChild(document.createTextNode(` ${prints} prints sold`));
  el.appendChild(document.createElement("br"));
  el.appendChild(document.createTextNode("in last 24 hrs"));
});
