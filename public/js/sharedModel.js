import { shareOn } from './share.js';
window.shareOn = shareOn;
const API_BASE = (window.API_ORIGIN || '') + '/api';

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) {
    document.getElementById('error').textContent = 'Missing share link';
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/shared/${slug}`);
    if (!res.ok) throw new Error('bad');
    const data = await res.json();
    const viewer = document.getElementById('viewer');
    viewer.src = data.model_url;
  } catch (err) {
    document.getElementById('error').textContent = 'Failed to load model';
  }
});
