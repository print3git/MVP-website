import request from "supertest";
import app from "../src/app";
import { enqueue, getStatus } from "../src/queue/generation";

jest.useFakeTimers();

describe("generation queue status", () => {
  test("per-user serialization and status endpoint", async () => {
    const job1 = await enqueue({ userId: "u1" });
    const job2 = await enqueue({ userId: "u1" });
    const job3 = await enqueue({ userId: "u2" });

    expect(getStatus(job1.id)?.state).toBe("running");
    expect(getStatus(job2.id)).toMatchObject({ state: "queued", position: 1 });
    expect(getStatus(job3.id)?.state).toBe("running");

    const resQueued = await request(app).get(`/api/status/${job2.id}`);
    expect(resQueued.body).toMatchObject({
      id: job2.id,
      state: "queued",
      position: 1,
    });
    const resRunning = await request(app).get(`/api/status/${job1.id}`);
    expect(resRunning.body.state).toBe("running");

    await jest.runAllTimersAsync();

    const done1 = await request(app).get(`/api/status/${job1.id}`);
    const done2 = await request(app).get(`/api/status/${job2.id}`);
    const done3 = await request(app).get(`/api/status/${job3.id}`);

    expect(done1.body).toMatchObject({
      id: job1.id,
      state: "succeeded",
      url: "/placeholder.glb",
    });
    expect(done1.body).toHaveProperty("startedAt");
    expect(done1.body).toHaveProperty("finishedAt");
    expect(done2.body.state).toBe("succeeded");
    expect(done3.body.state).toBe("succeeded");
  });
});
