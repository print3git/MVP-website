import { fetchWithCache } from './apiCache.js';

const API_BASE = (window.API_ORIGIN || '') + '/api';

async function loadProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  const data = await fetchWithCache(
    `${API_BASE}/me`,
    { headers: { Authorization: `Bearer ${token}` } },
    'me'
  );
  document.getElementById('mp-username').textContent = data.username;
  document.getElementById('mp-email').textContent = data.email;
  const displayEl = document.getElementById('mp-display');
  if (displayEl) displayEl.textContent = data.displayName || '';
}

async function loadSubscription() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const { subscription: sub, credits } = await fetchWithCache(
      `${API_BASE}/subscription/summary`,
      { headers: { Authorization: `Bearer ${token}` } },
      'subscription-summary'
    );
    const container = document.getElementById('subscription-progress');
    const previews = document.getElementById('design-previews');
    const tcStatus = document.getElementById('time-capsule-status');
    const manage = document.getElementById('manage-subscription');
    if (!sub || sub.active === false || sub.status === 'canceled') {
      if (manage) {
        manage.textContent = 'Join Print Club';
        manage.onclick = () => {
          window.location.href = 'payment.html';
        };
      }
      previews?.classList.add('hidden');
      return;
    }
    if (container) container.classList.remove('hidden');
    previews?.classList.remove('hidden');
    const used = credits.total - credits.remaining;
    const pct = credits.total ? (used / credits.total) * 100 : 0;
    const bar = document.getElementById('credit-bar');
    if (bar) bar.style.width = `${pct}%`;
    document.getElementById('credits-used').textContent = used;
    document.getElementById('credits-total').textContent = credits.total;
    if (manage) {
      manage.textContent = 'Manage subscription';
      manage.onclick = openPortal;
    }

    if (tcStatus) {
      const text = tcStatus.querySelector('#time-capsule-text');
      const btn = tcStatus.querySelector('#time-capsule-action');
      const active = localStorage.getItem('timeCapsuleActive') === 'true';
      tcStatus.classList.remove('hidden');
      if (active) {
        text.textContent = 'Monthly Time Capsule prints are active.';
        btn.textContent = 'Disable';
        btn.onclick = () => {
          localStorage.removeItem('timeCapsuleActive');
          loadSubscription();
        };
      } else {
        text.textContent = 'Add a monthly Time Capsule print to your subscription.';
        btn.textContent = 'Activate';
        btn.onclick = () => {
          localStorage.setItem('timeCapsuleActive', 'true');
          loadSubscription();
        };
      }
    }
  } catch (err) {
    console.error('Failed to load subscription info', err);
  }
}

async function openPortal() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  const res = await fetch(`${API_BASE}/subscription/portal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const data = await res.json();
    window.location.href = data.url;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadSubscription();
});
