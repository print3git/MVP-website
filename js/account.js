async function loadAccount() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  const res = await fetch('/api/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    window.location.href = 'login.html';
    return;
  }
  const profile = await res.json();
  const container = document.getElementById('account-info');
  container.innerHTML = `
    <div class="space-y-2">
      <p><strong>Username:</strong> ${profile.display_name || ''}</p>
      <pre class="bg-[#2A2A2E] p-4 rounded-xl">${JSON.stringify(profile, null, 2)}</pre>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', loadAccount);
