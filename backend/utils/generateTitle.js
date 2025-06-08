function generateTitle(prompt = '') {
  if (typeof prompt !== 'string' || !prompt.trim()) return 'Untitled Model';

  // remove punctuation except spaces
  const cleaned = prompt.replace(/[^\w\s]/g, '');
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (!words.length) return 'Untitled Model';

  // pick up to first 3 nouns/keywords heuristically (just unique words)
  const unique = [];
  for (const w of words) {
    const lower = w.toLowerCase();
    if (!unique.includes(lower)) unique.push(lower);
    if (unique.length >= 3) break;
  }

  const title = unique
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return title || 'Untitled Model';
}

module.exports = generateTitle;
