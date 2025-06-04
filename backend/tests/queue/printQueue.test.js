const { enqueuePrint, processQueue, _getQueue } = require("../../queue/printQueue");

afterEach((done) => {
  setTimeout(done, 150);
});

test("enqueuePrint queues a job", async () => {
  enqueuePrint("job1");
  expect(_getQueue().length()).toBe(1);
  await new Promise((r) => setTimeout(r, 120));
});

test("processQueue resolves jobs", async () => {
  enqueuePrint("job2");
  await new Promise((r) => setTimeout(r, 120));
  expect(_getQueue().length()).toBe(0);
});
