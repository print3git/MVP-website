const API_BASE = (window.API_ORIGIN || "") + "/api";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("designer-form");
  const msg = document.getElementById("form-msg");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = document.getElementById("model-input").files[0];
    const title = document.getElementById("title-input").value.trim();
    const royalty = document.getElementById("royalty-input").value || "10";
    if (!file) return;
    const token = localStorage.getItem("token");
    if (!token) {
      msg.textContent = "Login required";
      return;
    }
    const data = new FormData();
    data.append("model", file);
    data.append("title", title);
    data.append("royalty_percent", royalty);
    const res = await fetch(`${API_BASE}/designer-submissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    if (res.ok) {
      msg.textContent = "Submitted for review!";
      form.reset();
    } else {
      const err = await res.json().catch(() => ({}));
      msg.textContent = err.error || "Upload failed";
    }
  });
});
