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

document.addEventListener('DOMContentLoaded', loadProfile);
