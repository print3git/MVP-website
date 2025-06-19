export async function fetchWithCache(
  url,
  options = {},
  key = url,
  ttl = 300000,
) {
  const now = Date.now();
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const { time, data } = JSON.parse(stored);
      if (now - time < ttl) return data;
    }
  } catch {}
  const res = await fetch(url, options);
  if (!res.ok) throw new Error("Request failed");
  const data = await res.json();
  try {
    localStorage.setItem(key, JSON.stringify({ time: now, data }));
  } catch {}
  return data;
}
