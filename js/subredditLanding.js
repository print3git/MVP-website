const API_BASE = (window.API_ORIGIN || '') + '/api';

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
    console.error('Failed to load subreddit data', err);
    return null;
  }
}

const FALLBACK_QUOTE = "I'm astonished at how high-quality the print is";

window.addEventListener('DOMContentLoaded', async () => {
  const sr = getParam('sr') || 'default';
  const viewer = document.getElementById('viewer');
  const quoteEl = document.getElementById('subreddit-quote');

  const entry = await fetchSubredditInfo(sr);
  if (entry && viewer) viewer.src = entry.glb;

  if (quoteEl) {
    const p = quoteEl.querySelector('p');
    if (entry && p) {
      const srName = entry.subreddit || 'subreddit';
      p.innerHTML = `"${entry.quote}" – email from an <span class="text-white">r/${srName}</span> user`;
    }

    if (window.positionQuote) window.positionQuote();
  }
});
