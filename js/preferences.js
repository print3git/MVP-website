const COLOR_KEY = 'colorScheme';

export function applyColorScheme() {
  const scheme = localStorage.getItem(COLOR_KEY);
  if (scheme === 'light') {
    document.body.classList.add('light');
  }
}

export function toggleColorScheme() {
  const light = document.body.classList.toggle('light');
  localStorage.setItem(COLOR_KEY, light ? 'light' : 'dark');
}

// initialize on load
applyColorScheme();
const btn = document.getElementById('color-toggle');
if (btn) btn.addEventListener('click', toggleColorScheme);
