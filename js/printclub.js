const badge = document.getElementById('print-club-badge');
const modal = document.getElementById('printclub-modal');
const closeBtn = document.getElementById('printclub-close');
const bannerLink = document.getElementById('printclub-banner-link');
const API_BASE = (window.API_ORIGIN || '') + '/api';

bannerLink?.addEventListener('click', (e) => {
  e.preventDefault();
  modal?.classList.remove('hidden');
});
closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
modal?.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

async function updateBadgeText() {
  if (!badge) return;
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const sub = await res.json();
    if (sub && sub.active !== false && sub.status !== 'canceled') {
      badge.textContent = 'Print Club';
    }
  } catch (err) {
    console.error('Failed to fetch subscription', err);
  }
}

updateBadgeText();
