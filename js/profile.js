async function load() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const user = urlParams.get("user");
  let endpoint = "/api/my/models";
  if (user) endpoint = `/api/users/${encodeURIComponent(user)}/models`;
  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const models = await res.json();
  const container = document.getElementById("models");
  container.innerHTML = "";
  models.forEach((m) => {
    const div = document.createElement("div");
    div.textContent = `${m.prompt} - ${m.model_url || ""}`;
    container.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", load);
