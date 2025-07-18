/* eslint-disable jsdoc/check-tag-names */
/**
 * @jest-environment jsdom
 */

const fetchMock = require("jest-fetch-mock");
fetchMock.enableMocks();

const { track, flushAnalytics } = require("../js/analytics.js");

describe("whitelisted events", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.useFakeTimers().setSystemTime(new Date("2020-01-01T00:00:00Z"));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const events = ["page", "click", "cart", "checkout", "share"];
  events.forEach((event) => {
    for (let i = 0; i < 10; i++) {
      test(`${event} event ${i}`, async () => {
        fetchMock.mockResponseOnce("{}");
        await track(event, { index: i });
        expect(fetch).toHaveBeenCalledWith(
          `/api/track/${event}`,
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ index: i, timestamp: expect.any(String) }),
          }),
        );
      });
    }
  });
});

describe("custom headers and payload validation", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.useFakeTimers().setSystemTime(new Date("2020-01-01T00:00:00Z"));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  for (let i = 0; i < 50; i++) {
    test(`custom headers ${i}`, async () => {
      fetchMock.mockResponseOnce("{}");
      await track("click", { pos: i }, { headers: { "X-Test": "1" } });
      const call = fetchMock.mock.calls[0];
      expect(call[1].headers["X-Test"]).toBe("1");
      expect(JSON.parse(call[1].body)).toEqual({
        pos: i,
        timestamp: expect.any(String),
      });
    });
  }
});

describe("retry logic with backoff", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  for (let i = 0; i < 50; i++) {
    test(`retry ${i}`, async () => {
      fetchMock.mockRejectOnce(new Error("net")); // first failure
      fetchMock.mockRejectOnce(new Error("net")); // second failure
      fetchMock.mockResponseOnce("{}"); // success

      const p = track("page", { step: i });

      jest.advanceTimersByTime(100);
      await Promise.resolve();
      jest.advanceTimersByTime(200);
      await Promise.resolve();
      jest.advanceTimersByTime(400);

      await p;
      expect(fetchMock.mock.calls.length).toBe(3);
    });
  }
});

describe("batching and deduplication", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  for (let i = 0; i < 25; i++) {
    test(`batch group A ${i}`, async () => {
      fetchMock.mockResponse("{}");
      track("share", { id: i });
      track("share", { id: i });
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(fetchMock.mock.calls.length).toBe(1);
    });
  }

  for (let i = 0; i < 25; i++) {
    test(`batch flush ${i}`, async () => {
      fetchMock.mockResponse("{}");
      track("page", { id: i });
      await flushAnalytics();
      expect(fetchMock).toHaveBeenCalled();
    });
  }
});
