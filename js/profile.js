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
div.className =
"bg-[#2A2A2E] border border-white/10 rounded-3xl p-4 flex justify-between items-center";
div.innerHTML = `<span>${m.prompt} - ${m.model_url || ""}</span><div class="flex items-center gap-2"><span>${m.likes} ❤️</span><button class="reorder px-2 py-1 bg-blue-600 text-white rounded" aria-label="Reorder model">Reorder</button></div>`;
container.appendChild(div);
div.querySelector(".reorder").addEventListener("click", () => {
if (m.model_url) localStorage.setItem("print3Model", m.model_url);
window.location.href = "payment.html";
});
});
}

document.addEventListener("DOMContentLoaded", load);
