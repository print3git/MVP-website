async function verifyTag(url, tag = '#print2') {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const text = await res.text();
    return text.includes(tag);
  } catch (err) {
    console.error('Failed to verify tag', err);
    return false;
  }
}

module.exports = { verifyTag };
