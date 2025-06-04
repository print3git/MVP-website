async function signup(e) {
  e.preventDefault();
  const username = document.getElementById("su-name").value;
  const email = document.getElementById("su-email").value;
  const password = document.getElementById("su-pass").value;
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    window.location.href = "profile.html";
  } else {
    document.getElementById("error").textContent = data.error || "failed";
  }
}

document.getElementById("signupForm").addEventListener("submit", signup);
