import { shareOn } from './share.js';
window.shareOn = shareOn;
const API_BASE = (window.API_ORIGIN || '') + '/api';

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const community = params.get('community');
  if (!slug && !community) {
    document.getElementById('error').textContent = 'Missing share link';
    return;
  }
  try {
    const endpoint = slug
      ? `${API_BASE}/shared/${slug}`
      : `${API_BASE}/community/model/${community}`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('bad');
    const data = await res.json();
    const viewer = document.getElementById('viewer');
    if (data.snapshot) {
      viewer.setAttribute('poster', data.snapshot);
    }
    viewer.src = data.model_url;
    const copyBtn = document.getElementById('copy-link');
    copyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied'));
    });
  } catch (err) {
    document.getElementById('error').textContent = 'Failed to load model';
  }
});
