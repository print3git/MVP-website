const API_BASE = (window.API_ORIGIN || '') + '/api';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function signup(e) {
  e.preventDefault();
  const nameEl = document.getElementById('su-name');
  const displayEl = document.getElementById('su-display');
  const emailEl = document.getElementById('su-email');
  const passEl = document.getElementById('su-pass');
  const optInEl = document.getElementById('signup-mailing');
  [nameEl, displayEl, emailEl, passEl].forEach((el) =>
    el.classList.remove('border-red-500')
  );
  const username = nameEl.value.trim();
  const displayName = displayEl.value.trim();
  const email = emailEl.value.trim();
  const password = passEl.value.trim();
  const optIn = optInEl && optInEl.checked;
  if (!username || !displayName || !email || !password) {
    document.getElementById('error').textContent = 'All fields required';
    if (!username) nameEl.classList.add('border-red-500');
    if (!displayName) displayEl.classList.add('border-red-500');
    if (!email) emailEl.classList.add('border-red-500');
    if (!password) passEl.classList.add('border-red-500');
    return;
  }
  if (!isValidEmail(email)) {
    document.getElementById('error').textContent = 'Invalid email format';
    emailEl.classList.add('border-red-500');
    return;
  }
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, displayName, email, password }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    const ref = localStorage.getItem('referrerId');
    if (ref) {
      fetch(`${API_BASE}/referral-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ref }),
      }).catch(() => {});
    }
    if (optIn) {
      fetch(`${API_BASE}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    }
    window.location.href = 'profile.html';
  } else {
    document.getElementById('error').textContent = data.error || 'Signup failed';
    [nameEl, emailEl, passEl].forEach((el) => el.classList.add('border-red-500'));
  }
}

document.getElementById('signupForm').addEventListener('submit', signup);
