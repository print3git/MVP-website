import { shareOn } from "./share.js";

const API_BASE = (window.API_ORIGIN || "") + "/api";
let rewardOptions = [];

async function loadRewardOptions() {
  try {
    const res = await fetch(`${API_BASE}/rewards/options`);
    if (res.ok) {
      const { options } = await res.json();
      rewardOptions = options;
    }
  } catch (err) {
    console.error("Failed to load reward options", err);
  }
}

async function loadRewards() {
  const token = localStorage.getItem("token");
  if (!token) return;
  const headers = { authorization: `Bearer ${token}` };
  try {
    const resLink = await fetch(`${API_BASE}/referral-link`, { headers });
    if (resLink.ok) {
      const { code } = await resLink.json();
      const input = document.getElementById("referral-link");
      if (input) input.value = `${window.location.origin}?ref=${code}`;
    }
  } catch (err) {
    console.error("Failed to load referral link", err);
  }
  try {
    const resPts = await fetch(`${API_BASE}/rewards`, { headers });
    if (resPts.ok) {
      const { points } = await resPts.json();
      const ptsEl = document.getElementById("reward-points");
      if (ptsEl) ptsEl.textContent = points;
      const bar = document.getElementById("reward-progress");
      if (bar) bar.value = points;
      updateNextReward(points);
    }
  } catch (err) {
    console.error("Failed to load rewards", err);
  }
}

function copyReferral() {
  const input = document.getElementById("referral-link");
  input?.select();
  document.execCommand("copy");
}

function updateNextReward(points) {
  const msg = document.getElementById("next-reward-msg");
  if (!msg || !rewardOptions.length) return;
  const next = rewardOptions.find((o) => o.points > points);
  if (!next) {
    msg.textContent = "Max rewards unlocked!";
  } else {
    msg.textContent = `${next.points - points} pts until £${(
      next.amount_cents / 100
    ).toFixed(2)} off`;
  }
}

async function loadLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/leaderboard?limit=5`);
    if (!res.ok) return;
    const data = await res.json();
    const body = document.getElementById("leaderboard-body");
    if (!body) return;
    body.innerHTML = "";
    data.forEach((e) => {
      const spend = Math.round(e.points / 2);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="px-2 py-1">${e.username}</td><td class="px-2 py-1 whitespace-nowrap"><span class="inline-block w-16 text-right">${e.points}</span> <span class="text-[#30D5C8]">(£${spend})</span></td>`;
      body.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load leaderboard", err);
  }
}

async function loadAchievements() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/achievements`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const { achievements } = await res.json();
    const list = document.getElementById("achievements-list");
    if (!list) return;
    list.innerHTML = "";
    achievements.forEach((a) => {
      const li = document.createElement("li");
      li.textContent = a.name;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to load achievements", err);
  }
}

async function shareReferral(network) {
  let link = document.getElementById("referral-link")?.value || null;
  if (!link) {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/referral-link`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { code } = await res.json();
          link = `${window.location.origin}?ref=${code}`;
        }
      } catch {}
    }
  }
  if (!link) link = window.location.href;
  shareOn(network, link, "Join me on print2!");
}

async function redeemReward() {
  const input = document.getElementById("reward-input");
  if (!input) return;
  const points = parseInt(input.value, 10);
  const token = localStorage.getItem("token");
  if (!token || !points) return;
  try {
    const res = await fetch(`${API_BASE}/rewards/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ points }),
    });
    if (res.ok) {
      const { code } = await res.json();
      alert(`Your discount code: ${code}`);
      loadRewards();
    }
  } catch (err) {
    console.error("Failed to redeem", err);
  }
}

window.copyReferral = copyReferral;
window.redeemReward = redeemReward;
window.shareReferral = shareReferral;
export { shareReferral };
window.addEventListener("DOMContentLoaded", () => {
  const loggedIn = !!localStorage.getItem("token");
  const reminder = document.getElementById("login-reminder");
  if (loggedIn && reminder) {
    reminder.classList.add("hidden");
  }
  if (!loggedIn) {
    document
      .getElementById("referral-link")
      ?.classList.add("cursor-default", "pointer-events-none");
    document
      .querySelector('label[for="referral-link"]')
      ?.classList.add("opacity-50", "cursor-default", "pointer-events-none");
    document
      .getElementById("copy-referral")
      ?.classList.add("opacity-50", "cursor-default", "pointer-events-none");
    document
      .getElementById("reward-input")
      ?.classList.add("cursor-default", "pointer-events-none");
    document
      .querySelector('label[for="reward-input"]')
      ?.classList.add("opacity-50", "cursor-default", "pointer-events-none");
    document
      .getElementById("redeem-button")
      ?.classList.add("opacity-50", "cursor-default", "pointer-events-none");
  }
  loadRewardOptions().then(() => {
    loadRewards();
    loadLeaderboard();
    loadAchievements();
  });
});
