const API_BASE = (window.API_ORIGIN || '') + '/api';

async function loadProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const data = await res.json();
  document.getElementById('mp-username').textContent = data.username;
  document.getElementById('mp-email').textContent = data.email;
}

async function loadSubscription() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const subRes = await fetch(`${API_BASE}/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!subRes.ok) return;
    const sub = await subRes.json();
    const container = document.getElementById('subscription-progress');
    const manage = document.getElementById('manage-subscription');
    if (!sub || sub.active === false || sub.status === 'canceled') {
      if (manage) {
        manage.textContent = 'Join Print Club';
        manage.href = 'payment.html';
      }
      return;
    }
    const creditsRes = await fetch(`${API_BASE}/subscription/credits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!creditsRes.ok) return;
    const credits = await creditsRes.json();
    if (container) container.classList.remove('hidden');
    const used = credits.total - credits.remaining;
    const pct = credits.total ? (used / credits.total) * 100 : 0;
    const bar = document.getElementById('credit-bar');
    if (bar) bar.style.width = `${pct}%`;
    document.getElementById('credits-used').textContent = used;
    document.getElementById('credits-total').textContent = credits.total;
    if (manage) {
      manage.textContent = 'Manage subscription';
      manage.href = 'subscription_settings.html';
    }
  } catch (err) {
    console.error('Failed to load subscription info', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadSubscription();
});
