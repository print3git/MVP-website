import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { applyMockEnv } from "../backend/src/lib/mockEnv";
applyMockEnv();

jest.setTimeout(60000);

const cp = require("node:child_process");
const DEFAULT_CMD_TIMEOUT = 60000;

function patchSpawn(fn: typeof cp.spawn) {
  return (...args: any[]) => {
    const child = fn(...args);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      console.error(`Command timed out after ${DEFAULT_CMD_TIMEOUT}ms: ${args[0]}`);
      if (stdout) console.error(`stdout: ${stdout}`);
      if (stderr) console.error(`stderr: ${stderr}`);
      child.kill("SIGTERM");
    }, DEFAULT_CMD_TIMEOUT);
    child.on("exit", () => clearTimeout(timer));
    return child;
  };
}

function patchExec(fn: typeof cp.exec) {
  return (command: string, options?: any, callback?: any) => {
    const opts = typeof options === "function" ? {} : options || {};
    const cb = typeof options === "function" ? options : callback;
    return fn(
      command,
      { ...opts, timeout: DEFAULT_CMD_TIMEOUT },
      (error: any, stdout: string, stderr: string) => {
        if (error && error.killed && error.signal === "SIGTERM") {
          console.error(`Command timed out after ${DEFAULT_CMD_TIMEOUT}ms: ${command}`);
          if (stdout) console.error(`stdout: ${stdout}`);
          if (stderr) console.error(`stderr: ${stderr}`);
        }
        cb && cb(error, stdout, stderr);
      }
    );
  };
}

cp.spawn = patchSpawn(cp.spawn);
cp.exec = patchExec(cp.exec);
cp.execFile = patchExec(cp.execFile);

if (!process.env.CI_REQUIRE_EXTERNAL) {
  process.env.CI_REQUIRE_EXTERNAL = "0";
}
