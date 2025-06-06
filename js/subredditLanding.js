const MAP = {
  art: {
    glb: 'models/reddit_art.glb',
    quote: 'Create artistic masterpieces with print3!',
  },
  '3dprinting': {
    glb: 'models/reddit_3dprinting.glb',
    quote: '',
  },
  gamedev: {
    glb: 'models/reddit_gamedev.glb',
    quote: 'Bring your game ideas to life with print3!',
  },
};

function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

window.addEventListener('DOMContentLoaded', () => {
  const sr = getParam('sr');
  const viewer = document.getElementById('viewer');
  const quoteEl = document.getElementById('subreddit-quote');
  const entry = sr && MAP[sr.toLowerCase()];
  if (entry && viewer) {
    viewer.src = entry.glb;
    if (quoteEl) quoteEl.textContent = entry.quote;
  } else if (quoteEl) {
    quoteEl.textContent = 'Design anything you can imagine.';
  }
});
