const API_BASE = (window.API_ORIGIN || '') + '/api';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendRequest(e) {
  e.preventDefault();
  const form = e.target;
  const button = form.querySelector('button');
  const emailEl = document.getElementById('req-email');
  emailEl.classList.remove('border-red-500');
  button.disabled = true;
  const email = emailEl.value.trim();
  if (!email || !isValidEmail(email)) {
    document.getElementById('msg').textContent = 'Valid email required';
    emailEl.classList.add('border-red-500');
    button.disabled = false;
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.status === 204) {
      document.getElementById('msg').classList.remove('text-red-400');
      document.getElementById('msg').classList.add('text-green-400');
      document.getElementById('msg').textContent =
        'If the address is registered, a reset link has been sent.';
    } else {
      const data = await res.json();
      document.getElementById('msg').textContent =
        data.error || 'Failed to send email';
    }
  } catch (err) {
    document.getElementById('msg').textContent = 'Failed to send email';
  } finally {
    button.disabled = false;
  }
}

document
  .getElementById('resetRequestForm')
  .addEventListener('submit', sendRequest);
