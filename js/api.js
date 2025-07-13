export const API_BASE = (window.API_ORIGIN || "") + "/api";

export function authHeaders() {
  const admin = localStorage.getItem("adminToken");
  if (admin) return { "x-admin-token": admin };
  const user = localStorage.getItem("token");
  if (user) return { Authorization: `Bearer ${user}` };
  return {};
}
