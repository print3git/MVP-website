const API_BASE = (window.API_ORIGIN || '') + '/api';

async function loadRewardOptions() {
  try {
    const res = await fetch(`${API_BASE}/rewards/options`);
    if (res.ok) {
      const { options } = await res.json();
      const sel = document.getElementById('reward-select');
      if (sel) {
        sel.innerHTML = '';
        options.forEach((o) => {
          const opt = document.createElement('option');
          opt.value = o.points;
          opt.textContent = `${o.points} pts - $${(o.amount_cents / 100).toFixed(2)} off`;
          sel.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.error('Failed to load reward options', err);
  }
}

async function loadRewards() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const headers = { authorization: `Bearer ${token}` };
  try {
    const resLink = await fetch(`${API_BASE}/referral-link`, { headers });
    if (resLink.ok) {
      const { code } = await resLink.json();
      const input = document.getElementById('referral-link');
      if (input) {
        const params = new URLSearchParams({ ref: code });
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach((p) => {
          const v = localStorage.getItem(p);
          if (v) params.set(p, v);
        });
        input.value = `${window.location.origin}?${params.toString()}`;
      }
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

async function redeemReward() {
  const sel = document.getElementById('reward-select');
  if (!sel) return;
  const points = parseInt(sel.value, 10);
  const token = localStorage.getItem('token');
  if (!token || !points) return;
  try {
    const res = await fetch(`${API_BASE}/rewards/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ points }),
    });
    if (res.ok) {
      const { code } = await res.json();
      alert(`Your discount code: ${code}`);
      loadRewards();
    }
  } catch (err) {
    console.error('Failed to redeem', err);
  }
}

window.copyReferral = copyReferral;
window.redeemReward = redeemReward;
window.addEventListener('DOMContentLoaded', () => {
  loadRewardOptions().then(loadRewards);
});
