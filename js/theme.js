function applyTheme() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.dataset.theme = theme;
}

function toggleTheme() {
  const theme = localStorage.getItem('theme') === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
  applyTheme();
}

window.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  const btn = document.getElementById('theme-toggle');
  btn?.addEventListener('click', toggleTheme);
});
