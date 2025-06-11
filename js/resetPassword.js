const API_BASE = (window.API_ORIGIN || '') + '/api';

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

async function resetPassword(e) {
  e.preventDefault();
  const passEl = document.getElementById('new-pass');
  passEl.classList.remove('border-red-500');
  const password = passEl.value.trim();
  if (!password) {
    document.getElementById('msg').textContent = 'Password required';
    passEl.classList.add('border-red-500');
    return;
  }
  const res = await fetch(`${API_BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  if (res.status === 204) {
    document.getElementById('msg').classList.remove('text-red-400');
    document.getElementById('msg').classList.add('text-green-400');
    document.getElementById('msg').textContent =
      'Password updated. You may now log in.';
  } else {
    const data = await res.json();
    document.getElementById('msg').textContent =
      data.error || 'Failed to reset password';
    passEl.classList.add('border-red-500');
  }
}

document
  .getElementById('resetPasswordForm')
  .addEventListener('submit', resetPassword);

if (!token) {
  document.getElementById('msg').textContent = 'Invalid or expired link';
  document.querySelector('#resetPasswordForm button').disabled = true;
}
