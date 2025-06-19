const COLOR_KEY = 'colorScheme';
const UNIT_KEY = 'units';

export function applyPreferences() {
  const scheme = localStorage.getItem(COLOR_KEY);
  if (scheme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
  const units = localStorage.getItem(UNIT_KEY) || 'metric';
  document.documentElement.setAttribute('data-units', units);
}

export function toggleColorScheme() {
  const current = localStorage.getItem(COLOR_KEY);
  if (current === 'light') {
    localStorage.removeItem(COLOR_KEY);
    document.documentElement.classList.remove('light');
  } else {
    localStorage.setItem(COLOR_KEY, 'light');
    document.documentElement.classList.add('light');
  }
}

export function setUnits(units) {
  localStorage.setItem(UNIT_KEY, units);
  document.documentElement.setAttribute('data-units', units);
}

document.addEventListener('DOMContentLoaded', () => {
  applyPreferences();
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.addEventListener('click', toggleColorScheme);
});
