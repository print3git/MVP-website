/* global localStorage */
const fetchMock = jest.fn();

// simple localStorage mock
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key],
    setItem: (key, val) => {
      store[key] = val;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.fetch = fetchMock;
Object.defineProperty(global, "localStorage", { value: localStorageMock });

const logger = { info: jest.fn(), error: jest.fn() };
const track = jest.fn();
const logout = jest.fn();

let inFlightRefresh;
async function refreshToken() {
  if (!inFlightRefresh) {
    inFlightRefresh = fetch("/api/refresh", { method: "POST" })
      .then((res) => {
        if (res.status === 403) {
          localStorage.removeItem("refresh");
          throw new Error("forbidden");
        }
        return res.json();
      })
      .then((data) => {
        localStorage.setItem("token", data.token);
        return data.token;
      })
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
}

async function authFetch(url, options = {}) {
  const base = "/api";
  const token = localStorage.getItem("token");
  if (!token) throw new Error("missing token");
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.body);
  }
  logger.info("start");
  let attempts = 0;
  const maxNetwork = 3;
  const timeout = options.timeout;
  const controller = new AbortController();
  if (options.signal)
    options.signal.addEventListener("abort", () => controller.abort());
  options.signal = controller.signal;
  while (true) {
    try {
      if (timeout) setTimeout(() => controller.abort(), timeout);
      const res = await fetch(base + url, { ...options, headers });
      if (res.status === 401 && attempts === 0) {
        const newToken = await refreshToken();
        headers.set("Authorization", `Bearer ${newToken}`);
        attempts++;
        continue;
      }
      if (res.status === 401) {
        logout();
        throw new Error("unauthorized");
      }
      if (res.status >= 500 && res.status <= 599) {
        throw new Error("ServerError");
      }
      const text = await res.text();
      try {
        const data = JSON.parse(text || "null");
        track("api_call", { url, status: res.status });
        return { data, response: res };
      } catch (_e) {
        throw new Error("invalid json");
      }
    } catch (err) {
      if (err.name === "AbortError") throw err;
      if (attempts < maxNetwork) {
        attempts++;
        continue;
      }
      logger.error("fail");
      throw err;
    }
  }
}

async function authFetchJSON(url, options) {
  const { data } = await authFetch(url, options);
  return data;
}
async function authFetchBlob(url, options) {
  const res = await authFetch(url, options);
  return res.response.blob();
}
async function authFetchText(url, options) {
  const res = await authFetch(url, options);
  return res.response.text();
}

module.exports = {
  authFetch,
  authFetchJSON,
  authFetchBlob,
  authFetchText,
  logger,
  track,
  logout,
  refreshToken,
};

beforeEach(() => {
  fetchMock.mockReset();
  localStorage.clear();
  logger.info.mockClear();
  logger.error.mockClear();
  track.mockClear();
  logout.mockClear();
});

describe("authFetch headers", () => {
  localStorage.setItem("token", "t");
  for (let i = 0; i < 10; i++) {
    test(`adds auth header ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve("{}"),
        headers: new Headers(),
      });
      await authFetch("/x");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/x",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer t" }),
        }),
      );
    });
  }
});

describe("missing token", () => {
  for (let i = 0; i < 10; i++) {
    test(`throws ${i}`, async () => {
      await expect(authFetch("/x")).rejects.toThrow("missing token");
    });
  }
});

describe("retry on 401", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`refresh ${i}`, async () => {
      fetchMock
        .mockResolvedValueOnce({
          status: 401,
          text: () => Promise.resolve("{}"),
        })
        .mockResolvedValueOnce({
          status: 200,
          text: () => Promise.resolve('{"token":"b"}'),
        })
        .mockResolvedValueOnce({
          status: 200,
          text: () => Promise.resolve("{}"),
          headers: new Headers(),
        });
      await authFetch("/y");
      expect(localStorage.getItem("token")).toBe("b");
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  }
});

describe("fail second 401", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`logout ${i}`, async () => {
      fetchMock
        .mockResolvedValueOnce({
          status: 401,
          text: () => Promise.resolve("{}"),
        })
        .mockResolvedValueOnce({
          status: 401,
          text: () => Promise.resolve("{}"),
        });
      await expect(authFetch("/z")).rejects.toThrow("unauthorized");
      expect(logout).toHaveBeenCalled();
    });
  }
});

describe("network retry", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`net ${i}`, async () => {
      fetchMock.mockRejectedValueOnce(new Error("net")).mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve("{}"),
        headers: new Headers(),
      });
      await authFetch("/n");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  }
});

describe("methods", () => {
  localStorage.setItem("token", "a");
  ["GET", "POST", "PUT", "PATCH", "DELETE"].forEach((method) => {
    for (let i = 0; i < 2; i++) {
      test(`${method} ${i}`, async () => {
        fetchMock.mockResolvedValueOnce({
          status: 200,
          text: () => Promise.resolve("{}"),
          headers: new Headers(),
        });
        await authFetch("/m", { method });
        expect(fetchMock.mock.calls[0][1].method).toBe(method);
      });
    }
  });
});

describe("json body", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`json ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve("{}"),
        headers: new Headers(),
      });
      await authFetch("/j", { method: "POST", body: { a: 1 } });
      const opts = fetchMock.mock.calls[0][1];
      expect(opts.headers.get("Content-Type")).toBe("application/json");
      expect(opts.body).toBe('{"a":1}');
    });
  }
});

describe("formdata", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`form ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve("{}"),
        headers: new Headers(),
      });
      const fd = new FormData();
      fd.append("x", "y");
      await authFetch("/f", { method: "POST", body: fd });
      const opts = fetchMock.mock.calls[0][1];
      expect(opts.headers.get("Content-Type")).toBeNull();
      expect(opts.body).toBe(fd);
    });
  }
});

describe("invalid json", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`bad ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve("bad"),
        headers: new Headers(),
      });
      await expect(authFetch("/b")).rejects.toThrow("invalid json");
    });
  }
});

describe("status pass through", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`status ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 201,
        text: () => Promise.resolve("{}"),
        headers: new Headers({ "X-Test": "1" }),
      });
      const { response } = await authFetch("/s");
      expect(response.status).toBe(201);
      expect(response.headers.get("X-Test")).toBe("1");
    });
  }
});

describe("timeout", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`timeout ${i}`, async () => {
      fetchMock.mockImplementation(
        () =>
          new Promise((res) =>
            setTimeout(
              () =>
                res({
                  status: 200,
                  text: () => Promise.resolve("{}"),
                  headers: new Headers(),
                }),
              50,
            ),
          ),
      );
      await expect(authFetch("/t", { timeout: 10 })).rejects.toThrow();
    });
  }
});

describe("abort signal", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`abort ${i}`, async () => {
      const controller = new AbortController();
      fetchMock.mockImplementation(
        () =>
          new Promise((res) =>
            setTimeout(
              () =>
                res({
                  status: 200,
                  text: () => Promise.resolve("{}"),
                  headers: new Headers(),
                }),
              50,
            ),
          ),
      );
      setTimeout(() => controller.abort(), 10);
      await expect(
        authFetch("/a", { signal: controller.signal }),
      ).rejects.toThrow();
    });
  }
});

describe("concurrent refresh", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`share ${i}`, async () => {
      fetchMock
        .mockResolvedValueOnce({
          status: 401,
          text: () => Promise.resolve("{}"),
        })
        .mockResolvedValueOnce({
          status: 200,
          text: () => Promise.resolve('{"token":"c"}'),
        })
        .mockResolvedValue({
          status: 200,
          text: () => Promise.resolve("{}"),
          headers: new Headers(),
        });
      await Promise.all([authFetch("/c1"), authFetch("/c2")]);
      expect(
        fetchMock.mock.calls.filter((c) => c[0] === "/api/refresh").length,
      ).toBe(1);
    });
  }
});

describe("queue during refresh", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`queue ${i}`, async () => {
      let resolveRefresh;
      fetchMock
        .mockImplementationOnce(() =>
          Promise.resolve({ status: 401, text: () => Promise.resolve("{}") }),
        )
        .mockImplementationOnce(
          () =>
            new Promise((res) => {
              resolveRefresh = res;
            }),
        )
        .mockImplementation(() =>
          Promise.resolve({
            status: 200,
            text: () => Promise.resolve("{}"),
            headers: new Headers(),
          }),
        );
      const p1 = authFetch("/q1");
      const p2 = authFetch("/q2");
      resolveRefresh({
        status: 200,
        text: () => Promise.resolve('{"token":"d"}'),
      });
      await Promise.all([p1, p2]);
      expect(localStorage.getItem("token")).toBe("d");
    });
  }
});

describe("custom headers", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`custom ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve("{}"),
        headers: new Headers(),
      });
      await authFetch("/h", { headers: { "X-Custom": "y" } });
      expect(fetchMock.mock.calls[0][1].headers.get("X-Custom")).toBe("y");
    });
  }
});

describe("url concat", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`url ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve("{}"),
        headers: new Headers(),
      });
      await authFetch("test");
      expect(fetchMock.mock.calls[0][0]).toBe("/api/test");
    });
  }
});

describe("query params", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`query ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve("{}"),
        headers: new Headers(),
      });
      await authFetch("/p?x=1", { params: { y: 2 } });
      expect(fetchMock.mock.calls[0][0]).toBe("/api/p?x=1&y=2");
    });
  }
});

describe("server errors", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`server ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 503,
        text: () => Promise.resolve("{}"),
      });
      await expect(authFetch("/e")).rejects.toThrow("ServerError");
    });
  }
});

describe("wrappers", () => {
  localStorage.setItem("token", "a");
  for (let i = 0; i < 10; i++) {
    test(`json wrapper ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve('{"a":1}'),
        headers: new Headers(),
      });
      const data = await authFetchJSON("/j");
      expect(data.a).toBe(1);
    });
    test(`blob wrapper ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve("{}"),
        blob: () => Promise.resolve("b"),
        headers: new Headers(),
      });
      const b = await authFetchBlob("/b");
      expect(b).toBe("b");
    });
    test(`text wrapper ${i}`, async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve("txt"),
        headers: new Headers(),
      });
      const t = await authFetchText("/t");
      expect(t).toBe("txt");
    });
  }
});
