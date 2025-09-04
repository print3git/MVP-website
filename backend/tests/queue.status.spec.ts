import request from "supertest";
import app from "../src/app";
import { enqueue, getStatus } from "../src/queue/generation";

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

describe("generation queue status", () => {
  test("per-user serialization and status endpoint", async () => {
    const job1 = await enqueue("u1", { prompt: "a", source: "prompt" });
    const job2 = await enqueue("u1", { prompt: "b", source: "prompt" });
    const job3 = await enqueue("u2", { prompt: "c", source: "prompt" });

    expect(getStatus(job1.jobId)?.state).toBe("running");
    expect(getStatus(job2.jobId)).toMatchObject({
      state: "queued",
      position: 1,
    });
    expect(getStatus(job3.jobId)?.state).toBe("running");

    const resQueued = await request(app).get(`/api/status/${job2.jobId}`);
    expect(resQueued.body).toMatchObject({
      id: job2.jobId,
      state: "queued",
      position: 1,
    });
    const resRunning = await request(app).get(`/api/status/${job1.jobId}`);
    expect(resRunning.body.state).toBe("running");

    await jest.runAllTimersAsync();

    const done1 = await request(app).get(`/api/status/${job1.jobId}`);
    const done2 = await request(app).get(`/api/status/${job2.jobId}`);
    const done3 = await request(app).get(`/api/status/${job3.jobId}`);

    expect(done1.body).toMatchObject({
      id: job1.jobId,
      state: "succeeded",
      url: "/placeholder.glb",
    });
    expect(done1.body).toHaveProperty("startedAt");
    expect(done1.body).toHaveProperty("finishedAt");
    expect(done2.body.state).toBe("succeeded");
    expect(done3.body.state).toBe("succeeded");
  });
});
