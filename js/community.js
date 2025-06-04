import { shareOn } from './share.js';

window.shareOn = shareOn;

const API_BASE = '/api/community';
const popularGrid = document.getElementById('popular-grid');
const recentGrid = document.getElementById('recent-grid');
let popularPage = 0;
let recentPage = 0;

function addCard(grid, model) {
  const div = document.createElement('div');
  div.className =
    'model-card h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] transition-shape flex items-center justify-center cursor-pointer';
  div.dataset.model = model.model_url;
  const img = document.createElement('img');
  img.src = 'img/boxlogo.png';
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = 'model';
  div.appendChild(img);
  div.appendChild(sr);
  div.addEventListener('click', () => {
    const modal = document.getElementById('model-modal');
    const viewer = modal.querySelector('model-viewer');
    viewer.src = model.model_url;
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });
  grid.appendChild(div);
}

async function load(type) {
  const grid = type === 'popular' ? popularGrid : recentGrid;
  const page = type === 'popular' ? popularPage : recentPage;
  const res = await fetch(`${API_BASE}/${type}?offset=${page * 6}`);
  const data = await res.json();
  data.forEach((m) => addCard(grid, m));
  if (type === 'popular') popularPage++;
  else recentPage++;
}

function setupInfinite(type) {
  const sentinel = document.getElementById(`${type}-sentinel`);
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) load(type);
  });
  observer.observe(sentinel);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('model-modal').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('model-modal').classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  });
  load('popular');
  load('recent');
  setupInfinite('popular');
  setupInfinite('recent');
});
