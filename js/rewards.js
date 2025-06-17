const API_BASE = (window.API_ORIGIN || '') + '/api';

async function loadRewards() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const headers = { authorization: `Bearer ${token}` };
  try {
    const resLink = await fetch(`${API_BASE}/referral-link`, { headers });
    if (resLink.ok) {
      const { code } = await resLink.json();
      const input = document.getElementById('referral-link');
      if (input) input.value = `${window.location.origin}?ref=${code}`;
    }
  } catch (err) {
    console.error('Failed to load referral link', err);
  }
  try {
    const resPts = await fetch(`${API_BASE}/rewards`, { headers });
    if (resPts.ok) {
      const { points } = await resPts.json();
      const ptsEl = document.getElementById('reward-points');
      if (ptsEl) ptsEl.textContent = points;
      const bar = document.getElementById('reward-progress');
      if (bar) bar.value = points;
    }
  } catch (err) {
    console.error('Failed to load rewards', err);
  }
}

function copyReferral() {
  const input = document.getElementById('referral-link');
  input?.select();
  document.execCommand('copy');
}

window.copyReferral = copyReferral;
window.addEventListener('DOMContentLoaded', loadRewards);
