function like(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Login required");
    return;
  }
  fetch(`/api/models/${id}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((d) => {
      const span = document.querySelector(`#likes-${id}`);
      if (span) span.textContent = d.likes;
    });
}
export { like };
