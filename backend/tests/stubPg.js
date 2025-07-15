const fs = require("fs");
const path = require("path");
const Module = require("module");
const logFile =
  process.env.PG_MOCK_LOG || path.join(process.cwd(), "pg-mock.log");

class MockClient {
  constructor() {
    this.log = [];
  }
  connect() {
    return Promise.resolve();
  }
  query(sql) {
    this.log.push(sql);
    return Promise.resolve();
  }
  end() {
    fs.writeFileSync(logFile, JSON.stringify(this.log));
    return Promise.resolve();
  }
}

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "pg") {
    return { Client: MockClient };
  }
  return originalLoad(request, parent, isMain);
};
