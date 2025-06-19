const COLOR_KEY = 'colorScheme';

export function applyColorScheme() {
  const scheme = localStorage.getItem(COLOR_KEY);
  if (scheme === 'light') {
    document.body.classList.add('light');
  }
}

// initialize on load
applyColorScheme();
