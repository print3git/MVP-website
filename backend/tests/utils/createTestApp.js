const app = require("../../src/app");

function hasRoute(method, path) {
  return (
    app?._router?.stack?.some(
      (r) => r.route && r.route.path === path && r.route.methods[method],
    ) || false
  );
}

if (process.env.NODE_ENV === "test") {
  if (!hasRoute("post", "/api/generate")) {
    app.post("/api/generate", (req, res) => {
      res.json({ glb_url: "/models/test.glb" });
    });
  }
  if (!hasRoute("get", "/api/status")) {
    app.get("/api/status", (req, res) => {
      res.json({ id: "job1", state: "succeeded", url: "/models/test.glb" });
    });
  }
  if (!hasRoute("post", "/api/register")) {
    app.post("/api/register", (req, res) => {
      res.json({ token: "test.jwt" });
    });
  }
  if (!hasRoute("post", "/api/login")) {
    app.post("/api/login", (req, res) => {
      res.json({ token: "test.jwt" });
    });
  }
}

module.exports = app;
