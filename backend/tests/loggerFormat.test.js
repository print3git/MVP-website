const path = require("path");
const Transport = require("winston-transport");

class MemoryTransport extends Transport {
  constructor() {
    super();
    this.logs = [];
  }
  log(info, callback) {
    this.logs.push(JSON.stringify(info));
    callback();
  }
}

describe("logger JSON format", () => {
  let logger;
  let memory;

  beforeEach(() => {
    jest.resetModules();
    if (console.log.mockRestore) console.log.mockRestore();
    if (console.error.mockRestore) console.error.mockRestore();
    process.env.NODE_ENV = "development";
    logger = require(path.join(__dirname, "..", "..", "src", "logger.js"));
    memory = new MemoryTransport();
    logger.add(memory);
  });

  afterEach(() => {
    logger.remove(memory);
    jest.restoreAllMocks();
  });

  test("startup log includes timestamp, level and code", () => {
    logger.info("S000: startup complete");
    const obj = JSON.parse(memory.logs[0]);
    expect(obj.level).toBe("info");
    expect(obj.message).toBe("S000: startup complete");
    expect(obj.timestamp).toBeDefined();
  });

  test("error log includes timestamp, level and code", () => {
    logger.error("E999: fatal error");
    const obj = JSON.parse(memory.logs[0]);
    expect(obj.level).toBe("error");
    expect(obj.message).toBe("E999: fatal error");
    expect(obj.timestamp).toBeDefined();
  });
});
