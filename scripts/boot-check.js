const http = require("http");
const app = require("../backend/src/app");
const server = http.createServer(app);
const PORT = 4010;
const t0 = Date.now();

server.listen(PORT, () => {
  console.log(`boot-ok in ${Date.now() - t0}ms`);
  server.close(() => process.exit(0));
});

setTimeout(() => {
  console.error("boot-timeout");
  process.exit(1);
}, 45000);
