async function signup(e) {
  e.preventDefault();
  const nameEl = document.getElementById("su-name");
  const emailEl = document.getElementById("su-email");
  const passEl = document.getElementById("su-pass");
  [nameEl, emailEl, passEl].forEach((el) =>
    el.classList.remove("border-red-500"),
  );
  const username = nameEl.value.trim();
  const email = emailEl.value.trim();
  const password = passEl.value.trim();
  if (!username || !email || !password) {
    document.getElementById("error").textContent = "All fields required";
    if (!username) nameEl.classList.add("border-red-500");
    if (!email) emailEl.classList.add("border-red-500");
    if (!password) passEl.classList.add("border-red-500");
    return;
  }
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
    document.getElementById("error").textContent =
      data.error || "Signup failed";
    [nameEl, emailEl, passEl].forEach((el) =>
      el.classList.add("border-red-500"),
    );
  }
}

document.getElementById("signupForm").addEventListener("submit", signup);
