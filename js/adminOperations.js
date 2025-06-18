function getToken() {
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}

function setToken(token) {
  localStorage.setItem('adminToken', token);
}

function authHeaders() {
  const admin = localStorage.getItem('adminToken');
  if (admin) return { 'x-admin-token': admin };
  const user = localStorage.getItem('token');
  if (user) return { Authorization: `Bearer ${user}` };
  return {};
}

const API_BASE = (window.API_ORIGIN || '') + '/api';

async function load() {
  const container = document.getElementById('ops');
  container.textContent = 'Loading...';
  try {
    const resp = await fetch(`${API_BASE}/admin/operations`, { headers: authHeaders() });
    if (!resp.ok) throw new Error('Failed');
    const data = await resp.json();
    container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'space-y-2';
    const hub = data.hubs[0];
    div.innerHTML = `
      <p>Backlog: ${hub.backlog}</p>
      <p>Daily Capacity: ${hub.capacity}</p>
      <p>Load: ${(hub.load * 100).toFixed(0)}%</p>
      <p>Scaling: ${data.scaling}</p>
    `;
    container.appendChild(div);
    if (data.errors && data.errors.length) {
      const errList = document.createElement('ul');
      errList.className = 'list-disc ml-4';
      data.errors.forEach((e) => {
        const li = document.createElement('li');
        li.textContent = `${e.job_id}: ${e.error}`;
        errList.appendChild(li);
      });
      container.appendChild(errList);
    }
  } catch (err) {
    container.textContent = 'Failed to load dashboard';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const tokenInput = document.getElementById('token');
  tokenInput.value = localStorage.getItem('adminToken') || '';
  document.getElementById('set-token').addEventListener('click', () => {
    setToken(tokenInput.value.trim());
    load();
  });
  if (getToken()) load();
});
