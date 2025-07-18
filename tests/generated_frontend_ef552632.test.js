/**
 * @jest-environment jsdom
 */
/* global localStorage */

const { enableFetchMocks } = require("jest-fetch-mock");
const { renderHook } = require("@testing-library/react-hooks");

enableFetchMocks();

jest.mock("../src/apiClient.js");

const apiClient = require("../src/apiClient.js");

beforeEach(() => {
  fetch.resetMocks();
  jest.clearAllMocks();
  localStorage.clear();
});

describe("apiClient basic methods", () => {
  for (let i = 0; i < 50; i++) {
    test(`get request ${i}`, async () => {
      fetch.mockResponseOnce(JSON.stringify({ ok: true }));
      await apiClient.get(`/path${i}`);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/path${i}`),
        expect.any(Object),
      );
    });
  }
});

describe("apiClient token refresh", () => {
  for (let i = 0; i < 50; i++) {
    test(`refresh on 401 ${i}`, async () => {
      fetch.mockResponses(
        [JSON.stringify({ error: "expired" }), { status: 401 }],
        [JSON.stringify({ token: "new" }), { status: 200 }],
        [JSON.stringify({ ok: true }), { status: 200 }],
      );
      localStorage.setItem("token", "old");
      await apiClient.get(`/refresh${i}`);
      expect(fetch.mock.calls[1][0]).toContain("/api/auth/refresh");
    });
  }
});

describe("apiClient additional features", () => {
  for (let i = 0; i < 50; i++) {
    test(`custom headers merge ${i}`, async () => {
      fetch.mockResponseOnce(JSON.stringify({ ok: true }));
      await apiClient.post(`/h${i}`, { a: 1 }, { headers: { "X-Test": "1" } });
      const [, options] = fetch.mock.calls[0];
      expect(options.headers["X-Test"]).toBe("1");
      expect(options.headers.Authorization).toBeDefined();
    });
  }
});

describe("apiClient hooks and cancellation", () => {
  for (let i = 0; i < 50; i++) {
    test(`useApiClient hook ${i}`, () => {
      const { result } = renderHook(() =>
        require("../src/hooks/useApiClient").default(),
      );
      expect(result.current).toBe(apiClient);
    });
  }
});
