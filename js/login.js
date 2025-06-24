const API_BASE = (window.API_ORIGIN || "") + "/api";
function getSaved() {
  try {
    return JSON.parse(localStorage.getItem("print3Saved")) || [];
  } catch {
    return [];
  }
}

async function login(e) {
  e.preventDefault();
  const nameEl = document.getElementById("li-name");
  const passEl = document.getElementById("li-pass");
  nameEl.classList.remove("border-red-500");
  passEl.classList.remove("border-red-500");
  const username = nameEl.value.trim();
  const password = passEl.value.trim();
  if (!username || !password) {
    document.getElementById("error").textContent = "All fields required";
    if (!username) nameEl.classList.add("border-red-500");
    if (!password) passEl.classList.add("border-red-500");
    return;
  }
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    if (data.isAdmin) localStorage.setItem("isAdmin", "true");
    const saved = getSaved();
    for (const item of saved) {
      try {
        await fetch(`${API_BASE}/models/${item.id}/like`, {
          method: "POST",
          headers: { Authorization: `Bearer ${data.token}` },
        });
      } catch {}
    }
    window.location.href = "my_profile.html";
  } else {
    document.getElementById("error").textContent = data.error || "Login failed";
    nameEl.classList.add("border-red-500");
    passEl.classList.add("border-red-500");
  }
}

document.getElementById("loginForm").addEventListener("submit", login);
