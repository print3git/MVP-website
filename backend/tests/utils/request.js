const supertest = require("supertest");
const app = require("./createTestApp");

function req() {
  const agent = supertest(app);
  const wrap = (m) => (url) => agent[m](url).set("x-test-shim", "1");
  return {
    get: wrap("get"),
    post: wrap("post"),
    put: wrap("put"),
    delete: wrap("delete"),
    patch: wrap("patch"),
  };
}

module.exports = { req };
