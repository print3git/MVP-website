/**
 * Fetch a URL and check if it includes the provided hashtag.
 *
 * @param {string} url - The URL to inspect.
 * @param {string} [tag='#print2'] - Hashtag to look for.
 * @returns {Promise<boolean>} Whether the tag exists in the page.
 */
async function verifyTag(url, tag = "#print2") {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const text = await res.text();
    return text.includes(tag);
  } catch (err) {
    console.error("Failed to verify tag", err);
    return false;
  }
}

module.exports = { verifyTag };
