const API_BASE = (window.API_ORIGIN || "") + "/api";
window.addEventListener("DOMContentLoaded", async () => {
  const badge = document.getElementById("earn-rewards-badge");
  if (!badge) return;

  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/rewards`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const { points } = await res.json();
    badge.textContent = `Earn Rewards Points: ${points} ⭐`;
  } catch {
    /* ignore */
  }
});
