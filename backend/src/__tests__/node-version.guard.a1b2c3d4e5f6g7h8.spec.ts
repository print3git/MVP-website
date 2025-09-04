import { describe, it, expect } from "@jest/globals";

describe("node version guard", () => {
  it("runs on Node.js 20", () => {
    const major = Number(process.versions.node.split(".")[0]);
    expect(major).toBe(20);
  });
});
