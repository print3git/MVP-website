import type { Config } from "@jest/types";
import base from "../../jest.config.js";
import path from "path";

const retries = parseInt(process.env.JEST_RETRIES || "0", 10);

const config: Config.InitialOptions = {
  ...base,
  testRunner: "jest-circus/runner",
  retryTimes: retries,
  reporters: ["default", "jest-junit"],
  transform: {
    "^.+\\.[tj]sx?$": path.join(__dirname, "quarantine-transform.js"),
  },
};

export default config;
