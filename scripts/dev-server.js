const express = require("express");
const path = require("path");
const http = require("http");
const https = require("https");
const selfsigned = require("selfsigned");

const app = express();
const root = path.join(__dirname, "..");

app.use(
  express.static(root, {
    index: "index.html",
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-store");
    },
  }),
);

app.use(express.json());

// Basic stub for API requests so smoke tests don't fail when the backend isn't running.
app.post("/api/generate", (_req, res) => {
  res.json({ glb_url: "/models/bag.glb" });
});

app.get("/healthz", (_req, res) => {
  res.send("ok");
});

function startDevServer(port = 3000, useHttps = process.env.USE_HTTPS === "1") {
  const onError = (err) => {
    console.error("Dev server failed", err.stack || err.message);
    process.exit(1);
  };
  let server;
  if (useHttps) {
    const { private: key, cert } = selfsigned.generate(null, { days: 1 });
    server = https
      .createServer({ key, cert }, app)
      .listen(port, () => {
        console.log(`Dev server listening on https://localhost:${port}`);
      })
      .on("error", onError);
  } else {
    server = http
      .createServer(app)
      .listen(port, () => {
        console.log(`Dev server listening on http://localhost:${port}`);
      })
      .on("error", onError);
  }
  server.on("close", () => {
    console.log("Dev server closed");
  });
  return server;
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  startDevServer(port);
}
module.exports = app;
module.exports.startDevServer = startDevServer;
