const badge = document.getElementById('print-club-badge');
const modal = document.getElementById('printclub-modal');
const closeBtn = document.getElementById('printclub-close');
const bannerLink = document.getElementById('printclub-banner-link');

badge?.addEventListener('click', () => modal?.classList.remove('hidden'));
bannerLink?.addEventListener('click', (e) => {
  e.preventDefault();
  modal?.classList.remove('hidden');
});
closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
modal?.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});
