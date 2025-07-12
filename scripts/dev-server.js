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

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Dev server listening on http://localhost:${port}`);
  });
}

module.exports = app;
