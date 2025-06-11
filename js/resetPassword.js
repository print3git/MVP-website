const API_BASE = (window.API_ORIGIN || '') + '/api';

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

async function resetPassword(e) {
  e.preventDefault();
  const form = e.target;
  const button = form.querySelector('button');
  const passEl = document.getElementById('new-pass');
  passEl.classList.remove('border-red-500');
  button.disabled = true;
  const password = passEl.value.trim();
  if (!password) {
    document.getElementById('msg').textContent = 'Password required';
    passEl.classList.add('border-red-500');
    button.disabled = false;
    return;
  }
  try {
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
  } catch (err) {
    document.getElementById('msg').textContent = 'Failed to reset password';
    passEl.classList.add('border-red-500');
  } finally {
    button.disabled = false;
  }
}

document
  .getElementById('resetPasswordForm')
  .addEventListener('submit', resetPassword);

if (!token) {
  document.getElementById('msg').textContent = 'Invalid or expired link';
  document.querySelector('#resetPasswordForm button').disabled = true;
}
