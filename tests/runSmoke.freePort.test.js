const http = require("http");
const net = require("net");
const { freePort } = require("../scripts/run-smoke.js");

test("freePort terminates existing listener", (done) => {
  http
    .createServer(() => {})
    .listen(3000, () => {
      freePort(3000);
      setTimeout(() => {
        const socket = net.connect({ port: 3000 });
        socket.on("error", () => {
          done();
        });
        socket.on("connect", () => {
          socket.end();
          done(new Error("port still open"));
        });
      }, 300);
    });
});
