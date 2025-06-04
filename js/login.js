async function login(e) {
  e.preventDefault();
  const username = document.getElementById("li-name").value;
  const password = document.getElementById("li-pass").value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    window.location.href = "profile.html";
  } else {
    document.getElementById("error").textContent = data.error || "failed";
  }
}

document.getElementById("loginForm").addEventListener("submit", login);
