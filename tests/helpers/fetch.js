export function makeFetch(responses = {}) {
  return jest.fn((url) => {
    const key = String(url);
    if (!(key in responses)) {
      return Promise.reject(new Error(`Unhandled fetch: ${key}`));
    }
    const res = responses[key];
    if (typeof res === "function") {
      return res(url);
    }
    return Promise.resolve({
      ok: res.ok !== undefined ? res.ok : true,
      status: res.status || 200,
      json: async () => res.body ?? res,
    });
  });
}
