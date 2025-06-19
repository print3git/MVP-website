const API_BASE = (window.API_ORIGIN || "") + "/api";

async function operatorSignup(e) {
  e.preventDefault();
  const name = document.getElementById("op-name").value.trim();
  const email = document.getElementById("op-email").value.trim();
  const training = Array.from(
    document.querySelectorAll(".training input"),
  ).every((c) => c.checked);
  if (!name || !email) {
    document.getElementById("op-error").textContent = "All fields required";
    return;
  }
  const res = await fetch(`${API_BASE}/operators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, trainingCompleted: training }),
  });
  const data = await res.json();
  if (res.ok) {
    document.getElementById("op-error").textContent = "";
    document.getElementById("op-form").reset();
    alert("Signup submitted!");
  } else {
    document.getElementById("op-error").textContent =
      data.error || "Signup failed";
  }
}

document.getElementById("op-form").addEventListener("submit", operatorSignup);
