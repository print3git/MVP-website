import { req } from "./utils/request";
import { enqueue } from "../src/queue/generation";

jest.mock("../src/lib/generateModel", () => ({
  generateModel: jest.fn().mockResolvedValue(Buffer.from("a")),
}));
jest.mock("../src/lib/preserveColors", () => ({
  preserveColors: jest.fn(async (b: Buffer) => b),
}));
jest.mock("../src/lib/uploadS3", () => ({
  uploadS3: jest.fn().mockResolvedValue({ url: "/placeholder.glb", key: "k" }),
}));

jest.useFakeTimers();

describe("progress sse", () => {
  test("streams final status", async () => {
    const job = await enqueue("u1", { prompt: "x", source: "prompt" });
    const resPromise = req().get(`/api/progress/${job.jobId}`);
    await jest.runAllTimersAsync();
    const res = await resPromise;
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.text).toContain('"state":"succeeded"');
  });
});
