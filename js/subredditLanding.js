async function loadMap() {
  try {
    const resp = await fetch('public/subreddit_models.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (err) {
    console.error('Failed to load subreddit model map', err);
    return {};
  }
}

function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

window.addEventListener('DOMContentLoaded', async () => {
  const map = await loadMap();
  const sr = getParam('sr');
  const viewer = document.getElementById('viewer');

  const quoteEl = document.getElementById('sr-quote');
  const entry = sr && map[sr.toLowerCase()];

  if (entry && viewer) {
    viewer.src = entry.glb;
    if (quoteEl) quoteEl.textContent = entry.quote;
  } else if (quoteEl) {
    quoteEl.textContent = 'Design anything you can imagine.';
  }
});
