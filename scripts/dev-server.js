const express = require("express");
const path = require("path");

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

app.get("/healthz", (_req, res) => {
  res.send("ok");
});

function startDevServer(port = 3000) {
  return app.listen(port, () => {
    console.log(`Dev server listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  startDevServer(port);
}
module.exports = app;
module.exports.startDevServer = startDevServer;
