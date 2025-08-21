const app = require("../../backend/src/app");
const request = require("supertest");

function createServer() {
  return request(app);
}

module.exports = { createServer };
