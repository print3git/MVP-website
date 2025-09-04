export default function toast(message) {
  const el = document.createElement("div");
  el.textContent = message;
  el.className = "fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded";
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3000);
}
