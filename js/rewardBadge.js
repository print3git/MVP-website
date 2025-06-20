const badge = document.getElementById("earn-rewards-badge");
const API_BASE = (window.API_ORIGIN || "") + "/api";

async function updateBadge() {
  if (!badge) return;
  badge.textContent = "[🎉 NEW] Earn Rewards ⭐";
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/rewards`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const { points } = await res.json();
    badge.textContent = `Points: ${points} ⭐`;
  } catch (err) {
    console.error("Failed to load reward points", err);
  }
}

updateBadge();
